package com.app.airmesh

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.NetworkInfo
import android.net.wifi.WpsInfo
import android.net.wifi.p2p.WifiP2pConfig
import android.net.wifi.p2p.WifiP2pDevice
import android.net.wifi.p2p.WifiP2pGroup
import android.net.wifi.p2p.WifiP2pInfo
import android.net.wifi.p2p.WifiP2pManager
import android.os.Build
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Android-only phone-to-phone transport using Wi-Fi Direct. The module never
 * turns on internet routing; INTERNET is the Android socket permission only.
 * It supports one active encrypted mesh stream per group in this first release.
 */
class AirMeshWifiDirectModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  companion object { private const val PORT = 39217; private const val MAX_PACKET_BYTES = 1_048_576 }

  private val manager = reactContext.getSystemService(Context.WIFI_P2P_SERVICE) as? WifiP2pManager
  private val channel = manager?.initialize(reactContext, reactContext.mainLooper, null)
  private val executor: ExecutorService = Executors.newCachedThreadPool()
  @Volatile private var receiverRegistered = false
  @Volatile private var discovering = false
  @Volatile private var connectingPeerId: String? = null
  @Volatile private var activePeerId: String? = null
  @Volatile private var connectionPromise: Promise? = null
  @Volatile private var socket: Socket? = null
  @Volatile private var serverSocket: ServerSocket? = null
  @Volatile private var writer: DataOutputStream? = null

  override fun getName(): String = "AirMeshWifiDirect"

  @ReactMethod fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {}
  @ReactMethod fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Double) {}

  @ReactMethod
  fun isSupported(promise: Promise) {
    val feature = reactContext.packageManager.hasSystemFeature(PackageManager.FEATURE_WIFI_DIRECT)
    val ready = feature && manager != null && channel != null
    promise.resolve(Arguments.createMap().apply {
      putBoolean("supported", ready)
      putBoolean("wifiDirectFeature", feature)
      putString("reason", if (ready) "Wi-Fi Direct is available for local phone-to-phone messaging." else "This Android device does not expose Wi-Fi Direct.")
    })
  }

  @ReactMethod
  fun startDiscovery(promise: Promise) {
    val error = permissionError()
    if (error != null) { promise.reject("E_WIFI_PERMISSION", error); return }
    val wifiManager = manager
    val wifiChannel = channel
    if (wifiManager == null || wifiChannel == null) { promise.reject("E_WIFI_UNSUPPORTED", "Wi-Fi Direct is unavailable on this device."); return }
    registerReceiverIfNeeded()
    try {
      wifiManager.discoverPeers(wifiChannel, actionListener(
        onSuccess = { discovering = true; emitStatus("discovering"); promise.resolve(null) },
        onFailure = { reason -> promise.reject("E_WIFI_DISCOVERY", "Wi-Fi Direct discovery failed (reason $reason).") },
      ))
    } catch (error: SecurityException) { promise.reject("E_WIFI_PERMISSION", error.message, error) }
  }

  @ReactMethod
  fun stopDiscovery(promise: Promise) {
    val wifiManager = manager
    val wifiChannel = channel
    if (wifiManager == null || wifiChannel == null) { promise.resolve(null); return }
    try {
      wifiManager.stopPeerDiscovery(wifiChannel, actionListener(
        onSuccess = { discovering = false; emitStatus("idle"); promise.resolve(null) },
        onFailure = { _ -> discovering = false; promise.resolve(null) },
      ))
    } catch (_: SecurityException) { discovering = false; promise.resolve(null) }
  }

  @ReactMethod
  fun connect(deviceId: String, promise: Promise) {
    val error = permissionError()
    if (error != null) { promise.reject("E_WIFI_PERMISSION", error); return }
    val wifiManager = manager
    val wifiChannel = channel
    if (wifiManager == null || wifiChannel == null) { promise.reject("E_WIFI_UNSUPPORTED", "Wi-Fi Direct is unavailable on this device."); return }
    registerReceiverIfNeeded()
    if (connectionPromise != null) { promise.reject("E_WIFI_CONNECTING", "An Air-Mesh Wi-Fi Direct connection is already in progress."); return }
    connectingPeerId = deviceId
    connectionPromise = promise
    emitPeer(deviceId, "connecting")
    val config = WifiP2pConfig().apply {
      deviceAddress = deviceId
      wps.setup = WpsInfo.PBC
    }
    try {
      wifiManager.connect(wifiChannel, config, actionListener(
        onSuccess = { emitStatus("group-forming") },
        onFailure = { reason -> failConnection(deviceId, "E_WIFI_CONNECT", "Wi-Fi Direct connection failed (reason $reason).") },
      ))
    } catch (error: SecurityException) { failConnection(deviceId, "E_WIFI_PERMISSION", error.message ?: "Nearby Wi-Fi permission was denied.", error) }
  }

  @ReactMethod
  fun disconnect(deviceId: String, promise: Promise) {
    closeStream(deviceId)
    val wifiManager = manager
    val wifiChannel = channel
    if (wifiManager == null || wifiChannel == null) { promise.resolve(null); return }
    try {
      wifiManager.removeGroup(wifiChannel, actionListener(
        onSuccess = { promise.resolve(null) },
        onFailure = { _ -> promise.resolve(null) },
      ))
    } catch (_: SecurityException) { promise.resolve(null) }
  }

  @ReactMethod
  fun sendPacket(deviceId: String, payloadBase64: String, promise: Promise) {
    val currentWriter = writer
    if (currentWriter == null || activePeerId != deviceId) { promise.resolve(false); return }
    val payload = Base64.decode(payloadBase64, Base64.NO_WRAP)
    if (payload.size > MAX_PACKET_BYTES) { promise.reject("E_WIFI_PACKET", "Air-Mesh packet is too large for the local Wi-Fi transport."); return }
    executor.execute {
      try {
        synchronized(currentWriter) { currentWriter.writeInt(payload.size); currentWriter.write(payload); currentWriter.flush() }
        promise.resolve(true)
      } catch (error: Exception) { closeStream(deviceId); promise.reject("E_WIFI_SEND", error.message, error) }
    }
  }

  private val receiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      when (intent.action) {
        WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION -> {
          val enabled = intent.getIntExtra(WifiP2pManager.EXTRA_WIFI_STATE, -1) == WifiP2pManager.WIFI_P2P_STATE_ENABLED
          emitStatus(if (enabled) "available" else "disabled")
        }
        WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION -> requestPeers()
        WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION -> {
          val network = intent.getParcelableExtra<NetworkInfo>(WifiP2pManager.EXTRA_NETWORK_INFO)
          if (network?.isConnected == true) requestConnectionInfo() else closeStream(activePeerId ?: connectingPeerId)
        }
      }
    }
  }

  private fun requestPeers() {
    val wifiManager = manager ?: return
    val wifiChannel = channel ?: return
    try {
      wifiManager.requestPeers(wifiChannel) { peers ->
        for (device in peers.deviceList) emitPeerDevice(device)
      }
    } catch (_: SecurityException) { emitStatus("permission-denied") }
  }

  private fun requestConnectionInfo() {
    val wifiManager = manager ?: return
    val wifiChannel = channel ?: return
    try {
      wifiManager.requestConnectionInfo(wifiChannel) { info ->
        if (!info.groupFormed) return@requestConnectionInfo
        if (info.isGroupOwner) requestGroupAndAccept() else connectToGroupOwner(info)
      }
    } catch (_: SecurityException) { emitStatus("permission-denied") }
  }

  private fun requestGroupAndAccept() {
    val wifiManager = manager ?: return
    val wifiChannel = channel ?: return
    try {
      wifiManager.requestGroupInfo(wifiChannel) { group ->
        val peer = group?.clientList?.firstOrNull()?.deviceAddress ?: return@requestGroupInfo
        activePeerId = peer
        emitPeer(peer, "connected")
        if (serverSocket == null && socket == null) acceptClient(peer)
      }
    } catch (_: SecurityException) { emitStatus("permission-denied") }
  }

  private fun connectToGroupOwner(info: WifiP2pInfo) {
    val peer = connectingPeerId ?: return
    if (socket != null) return
    val host = info.groupOwnerAddress ?: return
    executor.execute {
      try {
        val opened = Socket()
        opened.connect(InetSocketAddress(host, PORT), 10_000)
        establishStream(opened, peer)
      } catch (error: Exception) { emitPeer(peer, "failed"); emitStatus("connection-failed", error.message) }
    }
  }

  private fun acceptClient(peer: String) {
    executor.execute {
      try {
        val server = ServerSocket(PORT)
        serverSocket = server
        establishStream(server.accept(), peer)
      } catch (error: Exception) { emitPeer(peer, "failed"); emitStatus("connection-failed", error.message) }
    }
  }

  private fun establishStream(opened: Socket, peer: String) {
    socket = opened
    activePeerId = peer
    writer = DataOutputStream(BufferedOutputStream(opened.getOutputStream()))
    emitPeer(peer, "connected")
    connectionPromise?.resolve(null)
    connectionPromise = null
    val input = DataInputStream(BufferedInputStream(opened.getInputStream()))
    try {
      while (!opened.isClosed) {
        val size = input.readInt()
        if (size <= 0 || size > MAX_PACKET_BYTES) throw IllegalStateException("Invalid Air-Mesh Wi-Fi packet size.")
        val payload = ByteArray(size)
        input.readFully(payload)
        emit("airMeshWifiDirectPacket", Arguments.createMap().apply {
          putString("deviceId", peer)
          putString("payloadBase64", Base64.encodeToString(payload, Base64.NO_WRAP))
        })
      }
    } catch (_: Exception) { closeStream(peer) }
  }

  private fun registerReceiverIfNeeded() {
    if (receiverRegistered) return
    val filter = IntentFilter().apply {
      addAction(WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION)
      addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION)
      addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION)
    }
    reactContext.registerReceiver(receiver, filter)
    receiverRegistered = true
  }

  private fun closeStream(deviceId: String?) {
    val peer = activePeerId ?: deviceId
    try { writer?.close() } catch (_: Exception) {}
    try { socket?.close() } catch (_: Exception) {}
    try { serverSocket?.close() } catch (_: Exception) {}
    writer = null
    socket = null
    serverSocket = null
    activePeerId = null
    connectingPeerId = null
    val pending = connectionPromise
    connectionPromise = null
    pending?.reject("E_WIFI_DISCONNECTED", "Wi-Fi Direct disconnected before the Air-Mesh socket was ready.")
    if (peer != null) emitPeer(peer, "disconnected")
  }

  private fun failConnection(deviceId: String, code: String, message: String, error: Throwable? = null) {
    emitPeer(deviceId, "failed")
    connectingPeerId = null
    val pending = connectionPromise
    connectionPromise = null
    if (error == null) pending?.reject(code, message) else pending?.reject(code, message, error)
  }

  private fun permissionError(): String? {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && reactContext.checkSelfPermission(Manifest.permission.NEARBY_WIFI_DEVICES) != PackageManager.PERMISSION_GRANTED) return "Nearby Wi-Fi permission is required for local Wi-Fi Direct messaging."
    if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.S_V2 && reactContext.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return "Android requires location permission for local Wi-Fi Direct discovery on this version."
    return null
  }

  private fun actionListener(onSuccess: () -> Unit, onFailure: (Int) -> Unit) = object : WifiP2pManager.ActionListener {
    override fun onSuccess() = onSuccess()
    override fun onFailure(reason: Int) = onFailure(reason)
  }
  private fun emitPeerDevice(device: WifiP2pDevice) = emit("airMeshWifiDirectDevice", Arguments.createMap().apply { putString("deviceId", device.deviceAddress); putString("name", device.deviceName ?: "Nearby Air-Mesh phone"); putNull("rssi") })
  private fun emitPeer(deviceId: String, state: String) = emit("airMeshWifiDirectPeerState", Arguments.createMap().apply { putString("deviceId", deviceId); putString("state", state) })
  private fun emitStatus(state: String, reason: String? = null) = emit("airMeshWifiDirectStatus", Arguments.createMap().apply { putString("state", state); if (reason != null) putString("reason", reason) })
  private fun emit(eventName: String, payload: com.facebook.react.bridge.WritableMap) { if (reactContext.hasActiveReactInstance()) reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(eventName, payload) }

  override fun invalidate() {
    closeStream(activePeerId)
    if (receiverRegistered) try { reactContext.unregisterReceiver(receiver) } catch (_: Exception) {}
    receiverRegistered = false
    executor.shutdownNow()
    super.invalidate()
  }
}
