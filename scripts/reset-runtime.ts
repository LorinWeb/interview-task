import { loadConfig } from "@/server/config";
import { resetRuntimeFiles } from "@/server/dev/seed-data";

async function main() {
  const config = loadConfig();

  await resetRuntimeFiles(config);

  console.log(`Reset runtime data at ${config.localDbPath}`);
  console.log(`Reset uploaded files at ${config.uploadsDir}`);
}

main().catch((error) => {
  console.error("[reset:runtime] Failed to clear runtime data", error);
  process.exitCode = 1;
});
