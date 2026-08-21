package com.app.airmesh

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Native Android BLE peripheral for the Air-Mesh service. It intentionally has a
 * small bridge surface: advertise, stop, notify a connected peer, disconnect,
 * and events for real server-side connections and characteristic writes.
 */
class AirMeshGattModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  companion object {
    private val SERVICE_UUID: UUID = UUID.fromString("4fafc201-1fb5-459e-8fcc-c5c9c331914b")
    private val DEVICE_INFO_UUID: UUID = UUID.fromString("4fafc202-1fb5-459e-8fcc-c5c9c331914b")
    private val ROUTING_TABLE_UUID: UUID = UUID.fromString("4fafc203-1fb5-459e-8fcc-c5c9c331914b")
    private val MESSAGE_OUTBOX_UUID: UUID = UUID.fromString("4fafc204-1fb5-459e-8fcc-c5c9c331914b")
    private val MESSAGE_INBOX_UUID: UUID = UUID.fromString("4fafc205-1fb5-459e-8fcc-c5c9c331914b")
    private val SYNC_CONTROL_UUID: UUID = UUID.fromString("4fafc206-1fb5-459e-8fcc-c5c9c331914b")
    private val CLIENT_CONFIG_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
  }

  private val bluetoothManager: BluetoothManager? = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
  private var gattServer: BluetoothGattServer? = null
  private var advertiser: BluetoothLeAdvertiser? = null
  private var startPromise: Promise? = null
  private val connectedDevices = ConcurrentHashMap<String, BluetoothDevice>()
  private val notificationSubscribers = ConcurrentHashMap.newKeySet<String>()

  override fun getName(): String = "AirMeshGatt"

  @ReactMethod
  fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {}

  @ReactMethod
  fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Double) {}

  @ReactMethod
  fun isSupported(promise: Promise) {
    val adapter = bluetoothManager?.adapter
    val supported = adapter != null && adapter.isEnabled && adapter.isMultipleAdvertisementSupported
    val result = Arguments.createMap().apply {
      putBoolean("supported", supported)
      putBoolean("bluetoothEnabled", adapter?.isEnabled == true)
      putBoolean("multipleAdvertisementSupported", adapter?.isMultipleAdvertisementSupported == true)
      putString("reason", when {
        adapter == null -> "Bluetooth adapter is unavailable on this device."
        !adapter.isEnabled -> "Bluetooth is disabled. Enable it before advertising Air-Mesh."
        !adapter.isMultipleAdvertisementSupported -> "This device does not support BLE peripheral advertising."
        else -> "BLE peripheral advertising is available."
      })
    }
    promise.resolve(result)
  }

  @ReactMethod
  fun startAdvertising(promise: Promise) {
    if (startPromise != null) {
      promise.reject("E_GATT_STARTING", "Air-Mesh BLE advertising is already starting.")
      return
    }
    val permissionError = requiredPermissionError()
    if (permissionError != null) {
      promise.reject("E_GATT_PERMISSION", permissionError)
      return
    }
    val adapter = bluetoothManager?.adapter
    if (adapter == null || !adapter.isEnabled) {
      promise.reject("E_GATT_BLUETOOTH", "Bluetooth is unavailable or disabled.")
      return
    }
    if (!adapter.isMultipleAdvertisementSupported) {
      promise.reject("E_GATT_UNSUPPORTED", "This Android device cannot advertise a BLE peripheral service.")
      return
    }
    if (advertiser != null && gattServer != null) {
      promise.resolve(null)
      return
    }

    startPromise = promise
    try {
      gattServer = bluetoothManager?.openGattServer(reactContext, gattCallback)
      if (gattServer == null) {
        rejectStart("E_GATT_SERVER", "Unable to open the Air-Mesh GATT server.")
        return
      }
      if (!gattServer!!.addService(createAirMeshService())) {
        rejectStart("E_GATT_SERVICE", "Unable to register the Air-Mesh GATT service.")
      }
    } catch (error: SecurityException) {
      rejectStart("E_GATT_PERMISSION", error.message ?: "Nearby-device permission was denied.")
    } catch (error: Exception) {
      rejectStart("E_GATT_START", error.message ?: "Unable to start Air-Mesh BLE advertising.")
    }
  }

  @ReactMethod
  fun stopAdvertising(promise: Promise) {
    try {
      advertiser?.stopAdvertising(advertiseCallback)
      advertiser = null
      notificationSubscribers.clear()
      connectedDevices.clear()
      gattServer?.close()
      gattServer = null
      emit("airMeshGattStatus", Arguments.createMap().apply { putString("state", "stopped") })
      promise.resolve(null)
    } catch (error: SecurityException) {
      promise.reject("E_GATT_PERMISSION", error.message, error)
    }
  }

  @ReactMethod
  fun sendPacket(deviceId: String, payloadBase64: String, promise: Promise) {
    val server = gattServer
    val device = connectedDevices[deviceId]
    val characteristic = server?.getService(SERVICE_UUID)?.getCharacteristic(MESSAGE_INBOX_UUID)
    if (server == null || device == null || characteristic == null) {
      promise.resolve(false)
      return
    }
    if (!notificationSubscribers.contains(deviceId)) {
      promise.resolve(false)
      return
    }
    try {
      characteristic.value = Base64.decode(payloadBase64, Base64.NO_WRAP)
      promise.resolve(server.notifyCharacteristicChanged(device, characteristic, false))
    } catch (error: Exception) {
      promise.reject("E_GATT_NOTIFY", error.message, error)
    }
  }

  @ReactMethod
  fun disconnectPeer(deviceId: String, promise: Promise) {
    try {
      val device = connectedDevices[deviceId]
      if (device != null) gattServer?.cancelConnection(device)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_GATT_DISCONNECT", error.message, error)
    }
  }

  private fun createAirMeshService(): BluetoothGattService {
    val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
    val deviceInfo = BluetoothGattCharacteristic(
      DEVICE_INFO_UUID,
      BluetoothGattCharacteristic.PROPERTY_READ,
      BluetoothGattCharacteristic.PERMISSION_READ,
    )
    deviceInfo.value = "Air-Mesh GATT bridge".toByteArray()
    val routingTable = BluetoothGattCharacteristic(
      ROUTING_TABLE_UUID,
      BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_WRITE,
      BluetoothGattCharacteristic.PERMISSION_READ or BluetoothGattCharacteristic.PERMISSION_WRITE,
    )
    val messageOutbox = BluetoothGattCharacteristic(
      MESSAGE_OUTBOX_UUID,
      BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE,
      BluetoothGattCharacteristic.PERMISSION_WRITE,
    )
    val messageInbox = BluetoothGattCharacteristic(
      MESSAGE_INBOX_UUID,
      BluetoothGattCharacteristic.PROPERTY_NOTIFY or BluetoothGattCharacteristic.PROPERTY_READ,
      BluetoothGattCharacteristic.PERMISSION_READ,
    )
    messageInbox.addDescriptor(BluetoothGattDescriptor(CLIENT_CONFIG_UUID, BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE))
    val syncControl = BluetoothGattCharacteristic(
      SYNC_CONTROL_UUID,
      BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_WRITE,
      BluetoothGattCharacteristic.PERMISSION_READ or BluetoothGattCharacteristic.PERMISSION_WRITE,
    )
    service.addCharacteristic(deviceInfo)
    service.addCharacteristic(routingTable)
    service.addCharacteristic(messageOutbox)
    service.addCharacteristic(messageInbox)
    service.addCharacteristic(syncControl)
    return service
  }

  private val gattCallback = object : BluetoothGattServerCallback() {
    override fun onServiceAdded(status: Int, service: BluetoothGattService?) {
      if (service?.uuid != SERVICE_UUID) return
      if (status != BluetoothGatt.GATT_SUCCESS) {
        rejectStart("E_GATT_SERVICE", "Android rejected the Air-Mesh GATT service (status $status).")
        return
      }
      beginAdvertising()
    }

    override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
      val connected = newState == BluetoothGatt.STATE_CONNECTED && status == BluetoothGatt.GATT_SUCCESS
      if (connected) connectedDevices[device.address] = device else {
        connectedDevices.remove(device.address)
        notificationSubscribers.remove(device.address)
      }
      emitPeer(device.address, if (connected) "connected" else "disconnected", status)
    }

    override fun onCharacteristicReadRequest(device: BluetoothDevice, requestId: Int, offset: Int, characteristic: BluetoothGattCharacteristic) {
      val value = characteristic.value ?: ByteArray(0)
      gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
    }

    override fun onCharacteristicWriteRequest(device: BluetoothDevice, requestId: Int, characteristic: BluetoothGattCharacteristic, preparedWrite: Boolean, responseNeeded: Boolean, offset: Int, value: ByteArray) {
      if (characteristic.uuid == MESSAGE_OUTBOX_UUID || characteristic.uuid == SYNC_CONTROL_UUID || characteristic.uuid == ROUTING_TABLE_UUID) {
        emit("airMeshGattPacket", Arguments.createMap().apply {
          putString("deviceId", device.address)
          putString("payloadBase64", Base64.encodeToString(value, Base64.NO_WRAP))
          putString("characteristicUuid", characteristic.uuid.toString())
        })
      }
      if (responseNeeded) gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null)
    }

    override fun onDescriptorWriteRequest(device: BluetoothDevice, requestId: Int, descriptor: BluetoothGattDescriptor, preparedWrite: Boolean, responseNeeded: Boolean, offset: Int, value: ByteArray) {
      if (descriptor.uuid == CLIENT_CONFIG_UUID && descriptor.characteristic.uuid == MESSAGE_INBOX_UUID) {
        val subscribed = value.contentEquals(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE) || value.contentEquals(BluetoothGattDescriptor.ENABLE_INDICATION_VALUE)
        if (subscribed) notificationSubscribers.add(device.address) else notificationSubscribers.remove(device.address)
      }
      if (responseNeeded) gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null)
    }

    override fun onMtuChanged(device: BluetoothDevice, mtu: Int) {
      emit("airMeshGattMtu", Arguments.createMap().apply { putString("deviceId", device.address); putInt("mtu", mtu) })
    }
  }

  private val advertiseCallback = object : AdvertiseCallback() {
    override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
      emit("airMeshGattStatus", Arguments.createMap().apply { putString("state", "advertising") })
      startPromise?.resolve(null)
      startPromise = null
    }

    override fun onStartFailure(errorCode: Int) {
      rejectStart("E_GATT_ADVERTISE", "Android BLE advertising failed with error code $errorCode.")
    }
  }

  private fun beginAdvertising() {
    val adapter = bluetoothManager?.adapter ?: run {
      rejectStart("E_GATT_BLUETOOTH", "Bluetooth adapter is unavailable.")
      return
    }
    advertiser = adapter.bluetoothLeAdvertiser ?: run {
      rejectStart("E_GATT_UNSUPPORTED", "This Android device does not expose a BLE advertiser.")
      return
    }
    val settings = AdvertiseSettings.Builder()
      .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
      .setConnectable(true)
      .setTimeout(0)
      .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
      .build()
    val data = AdvertiseData.Builder().addServiceUuid(android.os.ParcelUuid(SERVICE_UUID)).setIncludeDeviceName(false).build()
    try {
      advertiser?.startAdvertising(settings, data, advertiseCallback)
    } catch (error: SecurityException) {
      rejectStart("E_GATT_PERMISSION", error.message ?: "Nearby-device permission was denied.")
    }
  }

  private fun requiredPermissionError(): String? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return null
    if (reactContext.checkSelfPermission(Manifest.permission.BLUETOOTH_ADVERTISE) != PackageManager.PERMISSION_GRANTED) return "Bluetooth advertising permission is required."
    if (reactContext.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) return "Bluetooth connection permission is required."
    return null
  }

  private fun rejectStart(code: String, message: String) {
    gattServer?.close()
    gattServer = null
    startPromise?.reject(code, message)
    startPromise = null
    emit("airMeshGattStatus", Arguments.createMap().apply { putString("state", "failed"); putString("reason", message) })
  }

  private fun emitPeer(deviceId: String, state: String, status: Int) {
    emit("airMeshGattPeerState", Arguments.createMap().apply { putString("deviceId", deviceId); putString("state", state); putInt("status", status) })
  }

  private fun emit(eventName: String, payload: com.facebook.react.bridge.WritableMap) {
    if (reactContext.hasActiveReactInstance()) {
      reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(eventName, payload)
    }
  }
}
