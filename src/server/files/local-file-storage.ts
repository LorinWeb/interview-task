import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export class LocalFileStorage {
  constructor(private readonly uploadsDir: string) {}

  async saveUpload(file: File): Promise<string> {
    await mkdir(this.uploadsDir, { recursive: true });

    const fileKey = `${crypto.randomUUID()}.csv`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(join(this.uploadsDir, fileKey), buffer);

    return fileKey;
  }

  async readUpload(fileKey: string): Promise<string> {
    return readFile(join(this.uploadsDir, fileKey), "utf8");
  }
}
