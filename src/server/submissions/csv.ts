import { parse } from "csv-parse/sync";

import type { DatasetLabel } from "@/server/submissions/types";

const allowedLabels = new Set<DatasetLabel>([
  "strong_match",
  "good_match",
  "weak_match",
  "failed_to_process",
]);

export interface ParsedDatasetRow {
  id: string;
  label: DatasetLabel;
}

export class CsvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvValidationError";
  }
}

export function parseDatasetCsv(content: string): ParsedDatasetRow[] {
  let headers: string[] = [];

  const records = parse(content, {
    bom: true,
    columns: (headerRow: string[]) => {
      headers = headerRow.map((value) => value.trim());
      return headers;
    },
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  validateHeaders(headers);

  if (records.length === 0) {
    throw new CsvValidationError("The CSV file must contain at least one data row.");
  }

  const seenIds = new Set<string>();

  return records.map((record, index) => {
    const rowNumber = index + 2;
    const id = record.id?.trim();
    const label = record.label?.trim();

    if (!id) {
      throw new CsvValidationError(`Row ${rowNumber} is missing an id value.`);
    }

    if (seenIds.has(id)) {
      throw new CsvValidationError(`Row ${rowNumber} repeats the id "${id}".`);
    }

    if (!label || !allowedLabels.has(label as DatasetLabel)) {
      throw new CsvValidationError(
        `Row ${rowNumber} has an unsupported label "${label ?? ""}".`,
      );
    }

    seenIds.add(id);

    return { id, label: label as DatasetLabel };
  });
}

function validateHeaders(headers: string[]): void {
  const idMatches = headers.filter((value) => value === "id").length;
  const labelMatches = headers.filter((value) => value === "label").length;

  if (idMatches !== 1 || labelMatches !== 1) {
    throw new CsvValidationError(
      'The CSV header must contain exactly one "id" column and one "label" column.',
    );
  }
}
