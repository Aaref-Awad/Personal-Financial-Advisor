import React, { useCallback, useState } from "react";
import { parseCSV, type ParsedRow } from "../utils/parseCSV";
import { validateRows } from "../utils/schemaValidation";

const UploadZone: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [,setRows] = useState<ParsedRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetFileInput = () => {
    setSelectedFile(null);
    const input = document.getElementById("csvInput") as HTMLInputElement;
    if (input) input.value = "";
  };

  const handleParse = useCallback(async () => {
    if (!selectedFile) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      const parsedRows = await parseCSV(selectedFile);
      const validatedRows = await validateRows(parsedRows);
      setRows(validatedRows);
    } catch (error) {
      setRows([]);
      setErrorMsg((error as Error).message);
    } finally {
      setLoading(false);
      resetFileInput();
    }
  }, [selectedFile]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      setSelectedFile(file);
    } else {
      setErrorMsg("Please upload a valid .csv file");
    }
  }, []);

  const onSelectFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      setSelectedFile(file);
    } else if (file) {
      setErrorMsg("Please upload a valid .csv file");
    }
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4 max-w-5xl mx-auto">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`border-2 border-dashed rounded p-8 text-center cursor-pointer w-full transition-colors duration-200 ${
          selectedFile
            ? "border-blue-500 bg-blue-50"
            : "border-gray-400 hover:bg-gray-50"
        }`}
        onClick={() => document.getElementById("csvInput")?.click()}
      >
        <p className="mb-2 font-medium">
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

      {/* Inline error */}
      {errorMsg && (
        <div className="w-full text-red-700 bg-red-50 border border-red-200 px-4 py-2 rounded">
          {errorMsg}
        </div>
      )}

      {/* Parse + Validate button */}
      <button
        onClick={handleParse}
        disabled={!selectedFile || loading}
        className={`px-4 py-2 rounded text-white transition-all duration-300 ${
          selectedFile && !loading
            ? "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-400/50"
            : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        {loading ? "Processing..." : "Parse & Validate"}
      </button>
    </div>
  );
};

export default UploadZone;