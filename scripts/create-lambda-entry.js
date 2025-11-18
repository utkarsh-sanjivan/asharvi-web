#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const targetDir = process.argv[2] ?? ".open-next/server-functions/default";
const entryPath = path.join(targetDir, "index.js");

const stubLines = [
  "const handlerPromise = import('./index.mjs');",
  "let cachedHandler;",
  "",
  "const getHandler = async () => {",
  "  if (!cachedHandler) {",
  "    const mod = await handlerPromise;",
  "    cachedHandler = mod.handler;",
  "  }",
  "  return cachedHandler;",
  "};",
  "",
  "module.exports.handler = async (...args) => {",
  "  const handler = await getHandler();",
  "  return handler(...args);",
  "};",
  "",
];

fs.mkdirSync(targetDir, { recursive: true });
fs.writeFileSync(entryPath, stubLines.join("\n"), "utf8");
console.log(`Created Lambda entry proxy at ${entryPath}`);

const nodeModulesDir = path.join(targetDir, "node_modules");
fs.mkdirSync(nodeModulesDir, { recursive: true });

const pnpmDir = path.join(nodeModulesDir, ".pnpm");
const linkedPackages = new Set();

function ensureSymlink(moduleName, sourceDir) {
  const destPath = path.join(nodeModulesDir, ...moduleName.split("/"));
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  if (fs.existsSync(destPath)) {
    fs.rmSync(destPath, { recursive: true, force: true });
  }
  const relativeTarget = path.relative(path.dirname(destPath), sourceDir);
  try {
    fs.symlinkSync(relativeTarget, destPath, "dir");
  } catch (err) {
    if (err.code === "EPERM" && process.platform === "win32") {
      fs.cpSync(sourceDir, destPath, { recursive: true, dereference: true });
    } else {
      throw err;
    }
  }
  linkedPackages.add(moduleName);
}

function linkFromDirectory(dir, prefix = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;
    const entryPath = path.join(dir, entry.name);
    if (entry.name.startsWith("@")) {
      linkFromDirectory(entryPath, entry.name);
      continue;
    }
    const moduleName = prefix ? `${prefix}/${entry.name}` : entry.name;
    ensureSymlink(moduleName, entryPath);
  }
}

if (fs.existsSync(pnpmDir)) {
  for (const entry of fs.readdirSync(pnpmDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const moduleNodeModules = path.join(pnpmDir, entry.name, "node_modules");
    if (fs.existsSync(moduleNodeModules)) {
      linkFromDirectory(moduleNodeModules);
    }
  }
  const pnpmNodeModules = path.join(pnpmDir, "node_modules");
  if (fs.existsSync(pnpmNodeModules)) {
    linkFromDirectory(pnpmNodeModules);
  }
}

console.log(`Linked ${linkedPackages.size} pnpm packages into node_modules`);
