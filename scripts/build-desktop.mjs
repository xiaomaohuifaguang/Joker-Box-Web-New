// 桌面包一条命令构建：同步版本 → tauri build（签名）→ 生成 latest.json 更新清单。
//
// 版本号唯一权威来源是 src-tauri/tauri.conf.json 的 version——本脚本会先把它同步进
// Cargo.toml（Cargo 必填字段，但应用版本只认 tauri.conf.json），发版只需改 tauri.conf.json。
//
// 更新签名私钥在构建机本地（~/.tauri/joker-box.key），不进仓库——泄露=别人可推恶意更新，丢失=更新链断裂。
// 重新生成密钥：npx tauri signer generate -w ~/.tauri/joker-box.key（公钥要同步换 tauri.conf.json 的 plugins.updater.pubkey）
//
// 产物（src-tauri/target/release/bundle/nsis/）：
//   joker-box_<版本>_x64-setup.exe      安装包
//   joker-box_<版本>_x64-setup.exe.sig  更新验签签名
//   latest.json                        更新清单
// 发布（两步）：
//   1. Gitee 新建 release（tag 用版本号，归档该版本），上传 setup.exe（.sig 仅本地备份，签名已内联进清单）
//   2. 编辑固定 release（tag「desktop」），替换 latest.json —— endpoint 不变，客户端零改动
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tauriConfPath = join(root, "src-tauri/tauri.conf.json");
const cargoTomlPath = join(root, "src-tauri/Cargo.toml");
const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf8"));
const version = tauriConf.version;
const productName = tauriConf.productName;
// 更新说明：npm run build:desktop -- "本次更新内容..."，不传用默认文案（会显示在更新弹窗里）。
const notes = process.argv[2] ?? "功能更新与问题修复。";

// 1. 同步 Cargo.toml 版本（只替换 [package] 段的第一个 version，依赖版本不受影响）。
const cargoToml = readFileSync(cargoTomlPath, "utf8");
const synced = cargoToml.replace(/^version = ".*"$/m, `version = "${version}"`);
if (synced !== cargoToml) {
  writeFileSync(cargoTomlPath, synced);
  console.log(`[build:desktop] Cargo.toml 版本已同步为 ${version}`);
}

// 2. 签名私钥。bundler 只认 TAURI_SIGNING_PRIVATE_KEY（内容），_PATH 变量它不看。
const keyPath = join(homedir(), ".tauri", "joker-box.key");
if (!existsSync(keyPath)) {
  console.error(
    `[build:desktop] 找不到更新签名私钥: ${keyPath}\n` +
      `  生成：npx tauri signer generate -w ~/.tauri/joker-box.key\n` +
      `  注意：重新生成必须同步更新 src-tauri/tauri.conf.json 的 plugins.updater.pubkey，否则旧版本无法升级。`,
  );
  process.exit(1);
}
process.env.TAURI_SIGNING_PRIVATE_KEY = readFileSync(keyPath, "utf8");
// 假设私钥无密码（生成时 -p ""）。若重新生成了带密码的密钥，构建前自行设置该环境变量。
process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ??= "";

// 3. 构建 + 签名。直接调 CLI 的 JS 入口（不经过 shell，避免 DEP0190 与转义问题）。
const tauriCli = join(root, "node_modules/@tauri-apps/cli/tauri.js");
const result = spawnSync(
  process.execPath,
  [tauriCli, "build", "--bundles", "nsis"],
  { stdio: "inherit" },
);
if (result.error) {
  console.error(`[build:desktop] 无法启动 tauri CLI: ${result.error.message}（先 npm install？）`);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);

// 4. 生成 latest.json（附件地址与 tauri.conf.json 的 updater endpoints 同一个 release）。
const nsisDir = join(root, "src-tauri/target/release/bundle/nsis");
const exeName = `${productName}_${version}_x64-setup.exe`;
const sigPath = join(nsisDir, `${exeName}.sig`);
if (!existsSync(sigPath)) {
  console.error(
    `[build:desktop] 构建成功但未生成签名文件 ${exeName}.sig\n` +
      `  检查 TAURI_SIGNING_PRIVATE_KEY 是否有效、密钥密码是否正确。`,
  );
  process.exit(1);
}
const manifest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: readFileSync(sigPath, "utf8").trim(),
      url: `https://gitee.com/xiaomaohuifaguang/Joker-Box-Web-New/releases/download/${version}/${exeName}`,
    },
  },
};
writeFileSync(join(nsisDir, "latest.json"), JSON.stringify(manifest, null, 2));
console.log(
  `\n[build:desktop] 完成。发布两步：\n` +
    `  1. Gitee 新建 release（tag: ${version}），上传 ${exeName}\n` +
    `     （.sig 仅本地备份，签名已内联进 latest.json，可不上传）\n` +
    `  2. 编辑固定 release（tag: desktop），替换 latest.json`,
);
