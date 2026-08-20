import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const env = { ...process.env };
const cargoBin = resolve(process.env.HOME ?? "/home/ubuntu", ".cargo/bin");
if (existsSync(cargoBin)) {
  env.PATH = `${cargoBin}:${env.PATH ?? ""}`;
}

const checks = [
  { name: "TypeScript", command: "pnpm", args: ["check"] },
  { name: "Lint", command: "pnpm", args: ["lint"] },
  { name: "Vitest", command: "pnpm", args: ["test"] },
  { name: "Android preflight", command: "pnpm", args: ["android:env"] },
  {
    name: "Gradle wrapper",
    command: resolve(root, "android/gradlew"),
    args: ["--version"],
  },
  {
    name: "Rust format",
    command: "cargo",
    args: ["fmt", "--", "--check"],
    cwd: resolve(root, "base-laptop"),
  },
  {
    name: "Rust tests",
    command: "cargo",
    args: ["test"],
    cwd: resolve(root, "base-laptop"),
  },
  {
    name: "Rust build",
    command: "cargo",
    args: ["build"],
    cwd: resolve(root, "base-laptop"),
  },
];

let failed = false;
for (const check of checks) {
  console.log(`\n=== ${check.name} ===`);
  const result = spawnSync(check.command, check.args, {
    cwd: check.cwd ?? root,
    env,
    stdio: "inherit",
  });
  if (result.error) {
    console.error(`${check.name} could not start: ${result.error.message}`);
    failed = true;
    continue;
  }
  if (result.status !== 0) {
    console.error(`${check.name} failed with exit code ${result.status}`);
    failed = true;
  }
}

if (failed) {
  console.error("\nVerification failed. Review the first failing section above.");
  process.exit(1);
}

console.log("\nAll local verification checks passed. APK compilation remains a managed GitHub Actions/Publish step.");
