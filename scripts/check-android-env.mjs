import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const android = `${root}/android`;
const required = [
  'android/gradlew',
  'android/app/build.gradle',
  'android/app/src/main/AndroidManifest.xml',
  'android/app/src/main/java/com/app/airmesh/MainActivity.kt',
  'android/app/src/main/java/com/app/airmesh/MainApplication.kt',
];

function command(name, args = ['--version']) {
  try { return execFileSync(name, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim().split('\n')[0]; }
  catch { return 'not found'; }
}

console.log(`Java: ${command('java', ['--version'])}`);
console.log(`Node: ${process.version}`);
console.log(`ADB: ${command('adb')}`);
console.log(`SDK root: ${process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || 'not configured'}`);
console.log(`Gradle wrapper: ${existsSync(`${android}/gradlew`) ? 'present' : 'missing'}`);

const missing = required.filter((relative) => !existsSync(`${root}/${relative}`));
if (missing.length) {
  console.error(`Missing Android project files:\n${missing.join('\n')}`);
  process.exitCode = 1;
}

const manifest = readFileSync(`${android}/app/src/main/AndroidManifest.xml`, 'utf8');
for (const permission of ['BLUETOOTH_SCAN', 'BLUETOOTH_CONNECT', 'NEARBY_WIFI_DEVICES', 'POST_NOTIFICATIONS']) {
  console.log(`${permission}: ${manifest.includes(permission) ? 'declared' : 'missing'}`);
}
console.log('APK build: use the managed mobile Publish/GitHub Actions release flow; this diagnostic intentionally does not compile an APK.');
