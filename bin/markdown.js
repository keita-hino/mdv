#!/usr/bin/env node
// CLI エントリ: `markdown <file|dir>` でビューアを起動する。
// 例: markdown README.md / markdown ./docs / markdown （引数なし=カレントディレクトリ）

const { spawn, spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const appPath = path.resolve(__dirname, '..')
const electron = require('electron') // electron 実行ファイルへの絶対パス

// 対象パス（未指定ならカレントディレクトリ）。
const rawArg = process.argv[2]
const target = rawArg ? path.resolve(process.cwd(), rawArg) : process.cwd()

if (!fs.existsSync(target)) {
  console.error(`エラー: パスが見つかりません: ${target}`)
  process.exit(1)
}

// ビルド成果物が無ければビルドする。
const mainEntry = path.join(appPath, 'out', 'main', 'index.js')
if (!fs.existsSync(mainEntry)) {
  console.log('初回起動のためビルドします (electron-vite build)...')
  const build = spawnSync('npm', ['run', 'build'], { cwd: appPath, stdio: 'inherit' })
  if (build.status !== 0) {
    console.error('ビルドに失敗しました。')
    process.exit(build.status ?? 1)
  }
}

// Electron をデタッチ起動し、ターミナルをすぐ解放する。
const child = spawn(electron, [appPath, `--open=${target}`], {
  cwd: appPath,
  detached: true,
  stdio: 'ignore'
})
child.unref()
