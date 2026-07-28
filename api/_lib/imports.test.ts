/**
 * Import hygiene for the serverless functions.
 *
 * `package.json` sets `"type": "module"`, so the compiled functions are ESM and
 * Node's ESM loader will not resolve an extensionless relative specifier. An
 * extensionless import type-checks, builds and deploys perfectly happily, then
 * fails at runtime with ERR_MODULE_NOT_FOUND and a 500 — which is exactly how
 * `/api/priority-access/session` broke in production.
 *
 * This test fails fast on the mistake instead.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const API_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function typescriptFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return typescriptFiles(path);
    // Tests are never deployed as functions, and this file contains a
    // deliberately extensionless fixture string.
    return path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });
}

/** Matches the specifier of any static or dynamic relative import/export. */
const RELATIVE_SPECIFIER = /(?:from|import)\s*\(?\s*["'](\.[^"']*)["']/g;

test("every relative import under api/ carries an explicit .js extension", () => {
  const offenders: string[] = [];

  for (const file of typescriptFiles(API_DIR)) {
    const source = readFileSync(file, "utf8");
    for (const [, specifier] of source.matchAll(RELATIVE_SPECIFIER)) {
      if (!specifier.endsWith(".js")) {
        offenders.push(`${file.replace(API_DIR, "api")} → "${specifier}"`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Relative imports under api/ must end in ".js" or the function 500s at runtime:\n  ${offenders.join("\n  ")}`,
  );
});

test("the guard actually detects an extensionless specifier", () => {
  const sample = `import { a } from "../_lib/http";\nimport { b } from "./session.js";`;
  const found = [...sample.matchAll(RELATIVE_SPECIFIER)].map(([, s]) => s);
  assert.deepEqual(found, ["../_lib/http", "./session.js"]);
  assert.equal(found.filter((s) => !s.endsWith(".js")).length, 1);
});
