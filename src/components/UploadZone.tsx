import React, { useCallback, useState } from "react";
import Papa from "papaparse";
import { nanoid } from "nanoid";

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

function validateHeaders(headers: string[]): boolean {
  return JSON.stringify(headers) === JSON.stringify(REQUIRED_HEADERS);
}

const UploadZone: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const parseFile = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const headers = results.meta.fields || [];
        if (!validateHeaders(headers)) {
          console.error("Invalid CSV schema:", headers);
          alert("CSV headers do not match required schema.");
          return;
        }

        const rowsWithId = (results.data as Record<string, string | string[]>[]).map((row) => {
          delete row.__parsed_extra;
          return { id: nanoid(), ...row };
        });

        console.log("Parsed rows with IDs:", rowsWithId);

        setSelectedFile(null);
        const input = document.getElementById("csvInput") as HTMLInputElement;
        if (input) input.value = "";
      },
      error: (err) => {
        console.error("Parse error:", err);
      },
    });
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  const onSelectFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-400 rounded p-8 text-center cursor-pointer hover:bg-gray-50 w-full"
        onClick={() => document.getElementById("csvInput")?.click()}
      >
        <p className="mb-2">
          {selectedFile
            ? `Selected File: ${selectedFile.name}`
            : "Drag & drop your CSV file here, or click to select."}
        </p>
        <input
          id="csvInput"
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onSelectFile}
        />
      </div>

      <button
        onClick={() => selectedFile && parseFile(selectedFile)}
        disabled={!selectedFile}
        className={`px-4 py-2 rounded text-white transition-all duration-300 ${
          selectedFile
            ? "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-400/50"
            : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        Parse File
      </button>
    </div>
  );
};

export default UploadZone;