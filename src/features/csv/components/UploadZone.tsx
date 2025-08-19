import React, { useCallback } from "react";
import Papa from "papaparse";
import { nanoid } from "zod";

const REQUIRED_HEADERS = [
  "Account Type",
  "Account Number",
  "Transaction Date",
  "Cheque Number",
  "Description 1",
  "Description 2",
  "CAD$",
  "USD$",
];

/** Validate header order and names exactly */
function validateHeaders(headers: string[]): boolean {
  return JSON.stringify(headers) === JSON.stringify(REQUIRED_HEADERS);
}

const UploadZone: React.FC = () => {
  const handleFile = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        if (!validateHeaders(headers)) {
          console.error("Invalid CSV schema:", headers);
          alert("CSV headers do not match required schema.");
          return;
        }

                // Add IDs to each row
        const rowsWithId = (results.data as Record<string, string>[])
          .map((row) => ({
            id: nanoid(),
            ...row,
          }));

        console.log("Parsed rows with IDs:", rowsWithId);

        // TODO: Phase 2 — encrypt and store in IndexedDB
      },
      error: (err) => {
        console.error("Parse error:", err);
      },
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onSelectFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-400 rounded p-8 text-center cursor-pointer hover:bg-gray-50"
      onClick={() => document.getElementById("csvInput")?.click()}
    >
      <p className="mb-2">Drag & drop your CSV file here, or click to select.</p>
      <input
        id="csvInput"
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={onSelectFile}
      />
    </div>
  );
};

export default UploadZone;