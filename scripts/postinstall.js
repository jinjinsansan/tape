const { existsSync, mkdirSync, writeFileSync } = require("fs");
const { dirname, join } = require("path");

const target = join(
  __dirname,
  "..",
  "node_modules",
  "es-abstract",
  "2024",
  "IsArray.js"
);

const ensureIsArray = () => {
  const dir = dirname(target);
  if (!existsSync(dir)) {
    return;
  }

  if (existsSync(target)) {
    return;
  }

  const contents = `'use strict';

module.exports = function IsArray(argument) {
  return Array.isArray(argument);
};
`;

  mkdirSync(dir, { recursive: true });
  writeFileSync(target, contents, "utf8");
  console.log("Patched es-abstract with missing IsArray helper.");
};

ensureIsArray();
