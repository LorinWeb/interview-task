import { closeAppContext, createAppContext, type AppContext } from "@/server/app-context";
import { loadConfig } from "@/server/config";
import { resetRuntimeFiles, seedDemoData } from "@/server/dev/seed-data";

async function main() {
  const config = loadConfig();

  await resetRuntimeFiles(config);

  const context = createAppContext(config);

  try {
    const seededSubmissions = await seedDemoData(context);

    console.table(
      seededSubmissions.map((submission) => ({
        filename: submission.filename,
        status: submission.status,
        progress: submission.progress,
        canCancel: submission.canCancel,
        canRetry: submission.canRetry,
        error: submission.error ?? "",
      })),
    );

    console.log(`Seeded ${seededSubmissions.length} submissions.`);
    console.log(`Database: ${config.localDbPath}`);
    console.log(`Uploads: ${config.uploadsDir}`);
    console.log("Run `npm run dev` to start the app with fresh seeded data.");
  } finally {
    closeAppContext(context);
  }
}

main().catch((error) => {
  console.error("[seed:data] Failed to seed runtime", error);
  process.exitCode = 1;
});
