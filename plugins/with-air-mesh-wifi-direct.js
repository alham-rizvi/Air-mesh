const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');

const PERMISSIONS = [
  'android.permission.ACCESS_WIFI_STATE',
  'android.permission.CHANGE_WIFI_STATE',
  'android.permission.CHANGE_NETWORK_STATE',
  'android.permission.INTERNET',
  'android.permission.NEARBY_WIFI_DEVICES',
  'android.permission.ACCESS_FINE_LOCATION',
];

/** Preserves the native, no-internet Wi-Fi Direct bridge after `expo prebuild --clean`. */
function withAirMeshWifiDirect(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    for (const name of PERMISSIONS) {
      if (!manifest['uses-permission'].some((entry) => entry.$?.['android:name'] === name)) {
        manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    }
    return config;
  });
  config = withMainApplication(config, (config) => {
    const anchor = 'PackageList(this).packages.apply {';
    if (!config.modResults.contents.includes('AirMeshWifiDirectPackage()')) {
      config.modResults.contents = config.modResults.contents.replace(anchor, `${anchor}\n              add(AirMeshWifiDirectPackage())`);
    }
    return config;
  });
  return withDangerousMod(config, ['android', async (config) => {
    const packagePath = (config.android?.package || 'com.app.airmesh').replace(/\./g, path.sep);
    const sourceDir = path.join(config.modRequest.projectRoot, 'native', 'air-mesh-wifi-direct');
    const destinationDir = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', packagePath);
    fs.mkdirSync(destinationDir, { recursive: true });
    for (const filename of ['AirMeshWifiDirectModule.kt', 'AirMeshWifiDirectPackage.kt']) {
      fs.copyFileSync(path.join(sourceDir, filename), path.join(destinationDir, filename));
    }
    return config;
  }]);
}

module.exports = withAirMeshWifiDirect;
