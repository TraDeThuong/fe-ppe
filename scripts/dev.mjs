#!/usr/bin/env node
// Chạy đồng thời 2 server dev: app chính (3000) và design system (3001).
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const nextBin = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url)
);

const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const RESET = "\x1b[0m";

const targets = [
  { name: "app", args: ["dev"], color: CYAN, url: "http://localhost:3000" },
  {
    name: "design-system",
    args: ["dev", "design-system", "-p", "3001"],
    color: MAGENTA,
    url: "http://localhost:3001",
  },
];

console.log("─".repeat(58));
for (const { name, color, url } of targets) {
  console.log(`  ${color}${name.padEnd(14)}${RESET} ${url}`);
}
console.log("─".repeat(58));

const children = [];
let shuttingDown = false;

function killAll(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(exitCode), 300);
}

for (const { name, args, color } of targets) {
  const child = spawn(process.execPath, [nextBin, ...args], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  for (const [stream, out] of [
    [child.stdout, process.stdout],
    [child.stderr, process.stderr],
  ]) {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        out.write(`${color}[${name}]${RESET} ${line}\n`);
      }
    });
  }

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.log(
      `\n${color}[${name}]${RESET} đã dừng (${code ?? signal}) — tắt cả hai server.`
    );
    killAll(typeof code === "number" ? code : 1);
  });

  children.push(child);
}

process.on("SIGINT", () => {
  console.log("\nĐã nhận Ctrl+C — dừng cả hai server.");
  killAll(0);
});
process.on("SIGTERM", () => killAll(0));
