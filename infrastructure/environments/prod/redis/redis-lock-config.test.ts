import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), "infrastructure/environments/prod/redis", relativePath), "utf8");

test("redis template includes secure cache settings for lock backend", () => {
  const bicep = read("redis-cache.bicep");
  assert.match(bicep, /Microsoft\.Cache\/Redis/);
  assert.match(bicep, /minimumTlsVersion/);
  assert.match(bicep, /enableNonSslPort/);
});

test("redis deployment script performs group deployment", () => {
  const script = read("deploy-prod-redis.sh");
  assert.match(script, /az deployment group create/);
  assert.match(script, /--template-file/);
  assert.match(script, /--parameters/);
});
