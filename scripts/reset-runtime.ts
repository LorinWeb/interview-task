import { rm } from "node:fs/promises";
import { dirname } from "node:path";

import { loadConfig } from "@/server/config";

async function main() {
  const config = loadConfig();

  await rm(dirname(config.localDbPath), { force: true, recursive: true });
  await rm(config.uploadsDir, { force: true, recursive: true });
}

main().catch((error) => {
  console.error("[reset-runtime] Failed to clear runtime data", error);
  process.exitCode = 1;
});
