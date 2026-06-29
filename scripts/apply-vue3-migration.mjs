#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const kitRoot = path.resolve(__dirname, '..')
const replacementRoot = path.join(kitRoot, 'replacement-files')
const repoRoot = process.cwd()

function exists(file) {
  return fs.existsSync(file)
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true })
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item))
    }
    return
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

function backup(file) {
  if (!exists(file)) return
  const backupFile = `${file}.react-backup`
  if (!exists(backupFile)) fs.copyFileSync(file, backupFile)
}

function renameIfExists(from, to) {
  if (!exists(from) || exists(to)) return
  fs.renameSync(from, to)
}

if (!exists(path.join(repoRoot, 'package.json')) || !exists(path.join(repoRoot, 'src'))) {
  console.error('请在 sc-datav 仓库根目录执行：node scripts/apply-vue3-migration.mjs')
  process.exit(1)
}

console.log('1/5 备份 React 入口与配置...')
for (const file of ['package.json', 'vite.config.ts', 'index.html', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']) {
  backup(path.join(repoRoot, file))
}
for (const file of ['src/main.tsx', 'src/App.tsx']) {
  backup(path.join(repoRoot, file))
}

console.log('2/5 写入 Vue3 package/config/入口/路由...')
copyRecursive(path.join(kitRoot, 'package.vue3.json'), path.join(repoRoot, 'package.json'))
copyRecursive(replacementRoot, repoRoot)

console.log('3/5 将原 TSX 文件保留为 .react-backup，避免被 vue-tsc 构建...')
const tsxFiles = []
function collectTsx(dir) {
  if (!exists(dir)) return
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) collectTsx(full)
    else if (full.endsWith('.tsx')) tsxFiles.push(full)
  }
}
collectTsx(path.join(repoRoot, 'src'))
for (const file of tsxFiles) renameIfExists(file, `${file}.react-backup`)

console.log('4/5 清理旧入口文件名...')
if (exists(path.join(repoRoot, 'src/main.tsx.react-backup'))) {
  // 新入口是 src/main.ts，不需要处理。
}

console.log('5/5 完成。下一步执行：')
console.log('  pnpm install')
console.log('  pnpm dev')
console.log('  pnpm build')
console.log('\n注意：本脚本已覆盖 Vue3 基础框架、Demo1 地图/面板模块，并修复 useRenderLoop 兼容问题；Demo0/Demo2/Demo3 已替换为 Vue3 可运行页面框架。')
