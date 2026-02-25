import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), "infrastructure/environments/prod", relativePath), "utf8");

test("prod bicep defines compute network secrets and observability baseline", () => {
  const bicep = read("main.bicep");
  assert.match(bicep, /Microsoft\.App\/containerApps/);
  assert.match(bicep, /Microsoft\.App\/managedEnvironments/);
  assert.match(bicep, /Microsoft\.Network\/virtualNetworks/);
  assert.match(bicep, /Microsoft\.KeyVault\/vaults/);
  assert.match(bicep, /Microsoft\.OperationalInsights\/workspaces/);
  assert.match(bicep, /Microsoft\.Insights\/components/);
  assert.match(bicep, /Microsoft\.Cdn\/profiles/);
});

test("deployment scripts include deploy validate and rollback paths", () => {
  const deploy = read("deploy-prod-infra.sh");
  const validate = read("validate-prod-infra.sh");
  const rollback = read("rollback-prod-infra.sh");

  assert.match(deploy, /az deployment group create/);
  assert.match(validate, /az resource list/);
  assert.match(validate, /jq -e/);
  assert.match(rollback, /deploy-prod-infra\.sh/);
});

test("example parameters include backend image and production naming inputs", () => {
  const parameters = read("main.parameters.example.json");
  assert.match(parameters, /"backendImage"/);
  assert.match(parameters, /"serviceName"/);
  assert.match(parameters, /"environmentName"/);
});
