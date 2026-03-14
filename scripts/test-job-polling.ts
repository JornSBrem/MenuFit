/**
 * E2E test: start een background job en poll tot klaar.
 * Simuleert wat de admin UI doet.
 *
 * Vereist: server moet draaien op localhost:3000
 * Gebruik: npx tsx scripts/test-job-polling.ts
 */

const BASE_URL = "http://localhost:3000";

async function main() {
  // Lees token
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const ROOT = fileURLToPath(new URL("../", import.meta.url));
  const token = readFileSync(join(ROOT, "out", "dev-admin-token.txt"), "utf8").trim();
  console.log(`Token: ${token.slice(0, 20)}...`);

  // 1. Start fetch-recipe-images job
  console.log("\n=== Start: fetch-recipe-images ===");
  const startRes = await fetch(`${BASE_URL}/api/v3/admin/fetch-recipe-images`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const startData = (await startRes.json()) as { ok: boolean; data?: { jobId: string }; error?: unknown };
  console.log("Response:", JSON.stringify(startData));

  if (!startData.ok || !startData.data?.jobId) {
    console.error("Job starten mislukt!");
    process.exit(1);
  }

  const jobId = startData.data.jobId;
  console.log(`Job ID: ${jobId}`);

  // 2. Poll tot klaar
  let attempts = 0;
  const maxAttempts = 30;
  while (attempts < maxAttempts) {
    attempts++;
    await new Promise((r) => setTimeout(r, 1000));

    const statusRes = await fetch(`${BASE_URL}/api/v3/admin/job-status/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const statusData = (await statusRes.json()) as { ok: boolean; data?: { status: string; phase: string; processed: number; total: number; errors: string[]; meta?: unknown } };
    const job = statusData.data;
    if (!job) {
      console.log(`  Poll ${attempts}: geen data (status ${statusRes.status})`);
      continue;
    }

    console.log(`  Poll ${attempts}: status=${job.status} phase="${job.phase}" ${job.processed}/${job.total} errors=${job.errors.length}`);

    if (job.status !== "running") {
      console.log("\nJob voltooid!");
      console.log("Meta:", JSON.stringify(job.meta));
      if (job.errors.length > 0) {
        console.log("Errors:", job.errors.slice(0, 5).join("\n  "));
      }
      break;
    }
  }

  if (attempts >= maxAttempts) {
    console.error("Timeout: job niet voltooid na 30 seconden!");
    process.exit(1);
  }

  // 3. Test download-recipe-images
  console.log("\n=== Start: download-recipe-images ===");
  const dlRes = await fetch(`${BASE_URL}/api/v3/admin/download-recipe-images`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const dlData = (await dlRes.json()) as { ok: boolean; data?: { jobId: string } };
  console.log("Response:", JSON.stringify(dlData));

  if (dlData.ok && dlData.data?.jobId) {
    const dlJobId = dlData.data.jobId;
    let dlAttempts = 0;
    while (dlAttempts < 10) {
      dlAttempts++;
      await new Promise((r) => setTimeout(r, 1000));
      const sr = await fetch(`${BASE_URL}/api/v3/admin/job-status/${dlJobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sd = (await sr.json()) as { ok: boolean; data?: { status: string; phase: string; processed: number; total: number; meta?: unknown } };
      const j = sd.data;
      if (!j) continue;
      console.log(`  Poll ${dlAttempts}: status=${j.status} phase="${j.phase}" ${j.processed}/${j.total}`);
      if (j.status !== "running") {
        console.log("Meta:", JSON.stringify(j.meta));
        break;
      }
    }
  }

  // 4. Test image serving endpoint
  console.log("\n=== Test: image serving ===");
  const imgRes = await fetch(`${BASE_URL}/api/v3/images/aardappelpuree-met-paprika-en-knoflook.jpg`);
  console.log(`GET /api/v3/images/aardappelpuree-met-paprika-en-knoflook.jpg -> ${imgRes.status} ${imgRes.headers.get("content-type")} (${imgRes.headers.get("content-length") ?? "?"} bytes)`);

  console.log("\nAlle tests klaar!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
