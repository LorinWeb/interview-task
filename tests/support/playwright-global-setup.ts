import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

export default async function globalSetup() {
  const e2eRoot = join(process.cwd(), "tests", ".tmp", "e2e");

  await rm(e2eRoot, { force: true, recursive: true });
  await mkdir(join(e2eRoot, "uploads"), { recursive: true });
}
