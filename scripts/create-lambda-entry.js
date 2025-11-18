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

const extraModules = ["@swc/helpers", "styled-jsx"];
const rootNodeModules = path.join(process.cwd(), "node_modules");
const destNodeModules = path.join(targetDir, "node_modules");

fs.mkdirSync(destNodeModules, { recursive: true });

for (const moduleName of extraModules) {
  const sourcePath = path.join(rootNodeModules, moduleName);
  const destinationPath = path.join(destNodeModules, moduleName);

  if (!fs.existsSync(sourcePath)) {
    console.warn(`Skipping ${moduleName}; not found at ${sourcePath}`);
    continue;
  }

  if (fs.existsSync(destinationPath)) {
    fs.rmSync(destinationPath, { recursive: true, force: true });
  }

  fs.cpSync(sourcePath, destinationPath, { recursive: true, dereference: true });
  console.log(`Injected ${moduleName} into server bundle`);
}
