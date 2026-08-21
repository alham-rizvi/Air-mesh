const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');

const PERMISSIONS = [
  'android.permission.BLUETOOTH',
  'android.permission.BLUETOOTH_ADMIN',
  'android.permission.BLUETOOTH_SCAN',
  'android.permission.BLUETOOTH_CONNECT',
  'android.permission.BLUETOOTH_ADVERTISE',
];

/** Keeps custom Air-Mesh BLE peripheral files and registration intact after `expo prebuild --clean`. */
function withAirMeshGatt(config) {
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
    if (!config.modResults.contents.includes('AirMeshGattPackage()')) {
      config.modResults.contents = config.modResults.contents.replace(anchor, `${anchor}\n              add(AirMeshGattPackage())`);
    }
    return config;
  });

  return withDangerousMod(config, ['android', async (config) => {
    const packagePath = (config.android?.package || 'com.app.airmesh').replace(/\./g, path.sep);
    const sourceDir = path.join(config.modRequest.projectRoot, 'native', 'air-mesh-gatt');
    const destinationDir = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', packagePath);
    fs.mkdirSync(destinationDir, { recursive: true });
    for (const filename of ['AirMeshGattModule.kt', 'AirMeshGattPackage.kt']) {
      fs.copyFileSync(path.join(sourceDir, filename), path.join(destinationDir, filename));
    }
    return config;
  }]);
}

module.exports = withAirMeshGatt;
