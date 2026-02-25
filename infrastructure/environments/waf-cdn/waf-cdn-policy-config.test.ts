import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), "infrastructure/environments/waf-cdn", relativePath), "utf8");

test("waf policy includes OWASP managed baseline and bot manager rules", () => {
  const bicep = read("azure-frontdoor-waf-policy.bicep");
  assert.match(bicep, /Microsoft_DefaultRuleSet/);
  assert.match(bicep, /Microsoft_BotManagerRuleSet/);
  assert.match(bicep, /ruleSetVersion:\s+'2\.1'/);
});

test("waf policy enforces rate limiting on critical API paths", () => {
  const bicep = read("azure-frontdoor-waf-policy.bicep");
  assert.match(bicep, /RateLimitCriticalMutations/);
  assert.match(bicep, /criticalApiRateLimitPerMinute/);
  assert.match(bicep, /'\/api\/v3\/admin\/'/);
  assert.match(bicep, /'\/api\/v3\/system\/'/);
  assert.match(bicep, /'\/api\/v3\/auth\/'/);
  assert.match(bicep, /'\/api\/v3\/observability\/'/);
});

test("deployment workflow includes explicit deploy and rollback scripts", () => {
  const deploy = read("deploy-azure-frontdoor-waf-policy.sh");
  const rollback = read("rollback-azure-frontdoor-waf-policy.sh");

  assert.match(deploy, /az deployment group create/);
  assert.match(deploy, /--template-file/);
  assert.match(rollback, /deploy-azure-frontdoor-waf-policy\.sh/);
});
