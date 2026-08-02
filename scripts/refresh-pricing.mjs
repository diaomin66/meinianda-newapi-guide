import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = "https://meinianda.top";
const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(
  scriptDir,
  "..",
  "outputs",
  "meinianda-newapi-guide",
  "data",
  "live.json",
);

async function readJson(path) {
  const response = await fetch(sourceRoot + path, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(path + " returned HTTP " + response.status);
  }

  return response.json();
}

const [status, pricing] = await Promise.all([
  readJson("/api/status"),
  readJson("/api/pricing"),
]);

if (!status?.data || !Array.isArray(pricing?.data) || pricing.data.length === 0) {
  throw new Error("The upstream payload is missing public status or pricing data.");
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  source: sourceRoot,
  status: status.data,
  pricing,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
console.log("Wrote " + pricing.data.length + " models to " + outputPath);
