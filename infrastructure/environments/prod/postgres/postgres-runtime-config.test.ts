import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), "infrastructure/environments/prod/postgres", relativePath), "utf8");

test("postgres provisioning template includes flexible server database and backup settings", () => {
  const bicep = read("postgres-flex-server.bicep");
  assert.match(bicep, /Microsoft\.DBforPostgreSQL\/flexibleServers/);
  assert.match(bicep, /Microsoft\.DBforPostgreSQL\/flexibleServers\/databases/);
  assert.match(bicep, /backupRetentionDays/);
  assert.match(bicep, /max_connections/);
});

test("postgres deploy script performs non-interactive group deployment", () => {
  const script = read("deploy-prod-postgres.sh");
  assert.match(script, /az deployment group create/);
  assert.match(script, /--template-file/);
  assert.match(script, /--parameters/);
});
