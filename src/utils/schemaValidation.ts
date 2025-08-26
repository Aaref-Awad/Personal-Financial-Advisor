import { nanoid } from "nanoid";
import { type ParsedRow, REQUIRED_HEADERS } from "./parseCSV";

const COLUMN_RULES: Record<
  Exclude<keyof ParsedRow, "id">,
  { type: "string" | "number" | "date"; allowEmpty: boolean }
> = {
  "Account Type":     { type: "string", allowEmpty: true },
  "Account Number":   { type: "string", allowEmpty: true },
  "Transaction Date": { type: "date",   allowEmpty: true },
  "Cheque Number":    { type: "string", allowEmpty: false },
  "Description 1":    { type: "string", allowEmpty: false },
  "Description 2":    { type: "string", allowEmpty: false },
  "CAD$":             { type: "number", allowEmpty: true },
  "USD$":             { type: "number", allowEmpty: true },
};

function checkType(
  value: string,
  expectedType: "string" | "number" | "date",
  allowEmpty: boolean
): boolean {
  if (allowEmpty && value === "") return true;

  if (expectedType === "string") return typeof value === "string";
  if (expectedType === "number") return !isNaN(Number(value));
  if (expectedType === "date") return !isNaN(Date.parse(value));

  return false;
}

export async function validateRows(rows: ParsedRow[]): Promise<ParsedRow[]> {
  if (rows.length === 0) {
    throw new Error("No data to validate");
  }

  // Validate headers (thanks to parseCSV transformHeader, these are already normalized)
  const firstRowKeys = Object.keys(rows[0])
  .filter((k) => k !== "id" && k !== "__parsed_extra");

  if (
    firstRowKeys.length !== REQUIRED_HEADERS.length ||
    !REQUIRED_HEADERS.every((h, i) => h === firstRowKeys[i])
  ) {
    throw new Error("Invalid headers detected during validation");
  }

  const validated: ParsedRow[] = [];

  for (const row of rows) {
    for (const col of REQUIRED_HEADERS) {
      const { type, allowEmpty } = COLUMN_RULES[col];
      if (!checkType(row[col], type, allowEmpty)) {
        throw new Error(`Invalid type for column "${col}": ${row[col]}`);
      }
    }

    // Add ID if missing — safety net
    if (!row.id) {
      row.id = nanoid();
    }

    validated.push(row);
  }

  return validated;
}