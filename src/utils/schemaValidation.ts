import { nanoid } from "nanoid";
import { type ParsedRow, REQUIRED_HEADERS } from "./parseCSV";
import { addTransaction } from "../services/idb/transactionsRepo";

// Define validation rules for each column
const COLUMN_RULES: Record<
  Exclude<keyof ParsedRow, "id">,
  { type: "string" | "number" | "date"; allowEmpty: boolean }
> = {
  "Account Type": { type: "string", allowEmpty: false },
  "Account Number": { type: "string", allowEmpty: false },
  "Transaction Date": { type: "date", allowEmpty: false },
  "Cheque Number": { type: "string", allowEmpty: true },
  "Description 1": { type: "string", allowEmpty: false },
  "Description 2": { type: "string", allowEmpty: true },
  "CAD$": { type: "number", allowEmpty: true },
  "USD$": { type: "number", allowEmpty: true },
};

/**
 * Validates a value against an expected type
 * @param value - The value to check
 * @param expectedType - The expected type of the value
 * @param allowEmpty - Whether empty values are allowed
 * @returns boolean - Whether the value is valid
 */
function checkType(
  value: string,
  expectedType: "string" | "number" | "date",
  allowEmpty: boolean
): boolean {
  // Allow empty values if specified
  if (allowEmpty && (value === "" || value === null || value === undefined)) {
    return true;
  }
  
  switch (expectedType) {
    case "string":
      return typeof value === "string";
    case "number":
      return !isNaN(Number(value));
    case "date":
      return !isNaN(Date.parse(value));
    default:
      return false;
  }
}

/**
 * Sanitizes a ParsedRow by cleaning up data and formatting dates
 * @param row - The row to sanitize
 * @returns ParsedRow - The sanitized row
 */
function sanitizeRow(row: ParsedRow): ParsedRow {
  // Parse the date properly
  const [month, day, year] = row["Transaction Date"].split('/');
  const date = new Date(+year, +month - 1, +day);
 
  return {
    ...row,
    "Transaction Date": date.toISOString().split('T')[0], // Will format as YYYY-MM-DD
    "CAD$": row["CAD$"].trim(),
    "USD$": row["USD$"].trim(),
    "Account Number": row["Account Number"].trim(),
    "Description 1": row["Description 1"].trim(),
    "Description 2": row["Description 2"].trim(),
    "Account Type": row["Account Type"].trim(),
    "Cheque Number": row["Cheque Number"].trim()
  };
}

export async function validateRows(rows: ParsedRow[]): Promise<ParsedRow[]> {
  if (rows.length === 0) {
    throw new Error("No data to validate");
  }

  // Validate headers
  const firstRowKeys = Object.keys(rows[0])
    .filter(k => k !== "id" && k !== "__parsed_extra");
  
  if (
    firstRowKeys.length !== REQUIRED_HEADERS.length ||
    !REQUIRED_HEADERS.every((h, i) => h === firstRowKeys[i])
  ) {
    throw new Error("Invalid headers detected during validation");
  }

  const validated: ParsedRow[] = [];

  // First sanitize and validate all rows
  for (const row of rows) {
    // Create clean row structure
    const cleanRow: ParsedRow = {
      id: row.id || nanoid(),
      "Account Type": row["Account Type"] || "",
      "Account Number": row["Account Number"] || "",
      "Transaction Date": row["Transaction Date"] || "",
      "Cheque Number": row["Cheque Number"] || "",
      "Description 1": row["Description 1"] || "",
      "Description 2": row["Description 2"] || "",
      "CAD$": row["CAD$"] || "",
      "USD$": row["USD$"] || ""
    };

    // Sanitize the row first
    const sanitizedRow = sanitizeRow(cleanRow);

    // Validate each required field using the sanitized data
    for (const col of REQUIRED_HEADERS) {
      const { type, allowEmpty } = COLUMN_RULES[col];
      if (!checkType(sanitizedRow[col], type, allowEmpty)) {
        throw new Error(`Invalid type for column "${col}": ${sanitizedRow[col]}`);
      }
    }

    validated.push(sanitizedRow);
  }

  // Then store each validated row in IndexedDB
  for (const validatedRow of validated) {
    try {
      // The addTransaction function will handle the conversion to DBTransaction format internally
      await addTransaction(validatedRow);
      console.log(`Successfully stored transaction with ID: ${validatedRow.id}`);
    } catch (error) {
      console.log(`Failed to store transaction:`, validatedRow, error);
      console.error(`Failed to store transaction with ID: ${validatedRow.id}`, error);
      throw new Error(`Failed to store transaction: ${(error as Error).message}`);
    }
  }

  return validated;
}