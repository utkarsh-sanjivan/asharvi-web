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
