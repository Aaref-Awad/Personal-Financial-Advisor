import Papa from "papaparse";
import { nanoid } from "nanoid";

export interface ParsedRow {
  id: string;
  "Account Type": string;
  "Account Number": string;
  "Transaction Date": string;
  "Cheque Number": string;
  "Description 1": string;
  "Description 2": string;
  "CAD$": string;
  "USD$": string;
}

// Add this interface for IndexedDB storage
export interface DBTransaction {
  id: string;
  accountType: string;
  accountNumber: string;
  transactionDate: string;
  chequeNumber: string;
  description1: string;
  description2: string;
  cadAmount: string;
  usdAmount: string;
}

export const REQUIRED_HEADERS: (Exclude<keyof ParsedRow, "id">)[] = [
  "Account Type",
  "Account Number", 
  "Transaction Date",
  "Cheque Number",
  "Description 1",
  "Description 2",
  "CAD$",
  "USD$",
];

// Add conversion function
export function convertToDBFormat(row: ParsedRow): DBTransaction {
  return {
    id: row.id,
    accountType: row["Account Type"],
    accountNumber: row["Account Number"],
    transactionDate: row["Transaction Date"],
    chequeNumber: row["Cheque Number"],
    description1: row["Description 1"],
    description2: row["Description 2"],
    cadAmount: row["CAD$"],
    usdAmount: row["USD$"]
  };
}

// Utility to normalize header values
function normalizeHeader(header: string) {
  return header.replace(/^\uFEFF/, "").trim();
}

export function parseCSV(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Omit<ParsedRow, "id">>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      complete: (results) => {
        const rowsWithId: ParsedRow[] = results.data.map((row) => ({
          id: nanoid(),
          ...row,
        }));
        resolve(rowsWithId);
      },
      error: (err) => reject(err),
    });
  });
}