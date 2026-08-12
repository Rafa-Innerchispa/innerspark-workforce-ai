"use client";

import React, { useCallback, useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface ExcelUploaderProps {
  onDataLoaded: (data: any[]) => void;
}

export default function ExcelUploader({ onDataLoaded }: ExcelUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileStatus, setFileStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [fileName, setFileName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const processFile = async (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setFileStatus("processing");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      
      if (json.length === 0) {
        throw new Error("El archivo está vacío o no tiene el formato correcto.");
      }
      
      setFileStatus("success");
      onDataLoaded(json);
    } catch (error: any) {
      console.error(error);
      setFileStatus("error");
      setErrorMessage(error.message || "Error al procesar el archivo Excel.");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative w-full rounded-2xl border-2 border-dashed p-8 transition-all duration-300 flex flex-col items-center justify-center text-center
        ${isDragging ? "border-blue-400 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)]" : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/30"}
        ${fileStatus === "success" ? "border-green-500/50 bg-green-500/5" : ""}
        ${fileStatus === "error" ? "border-red-500/50 bg-red-500/5" : ""}
      `}
    >
      <input 
        type="file" 
        accept=".xlsx, .xls, .csv" 
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={fileStatus === "processing"}
      />
      
      {fileStatus === "idle" && (
        <>
          <div className="p-4 rounded-full bg-zinc-800/50 mb-4 text-zinc-400">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-1 items-center">
            <h3 className="text-lg font-semibold text-zinc-200 mb-1">Cargar Plantilla Excel</h3>
            <p className="text-sm text-zinc-400 max-w-sm">
              Haz clic para subir o arrastra tu archivo Excel
            </p>
            <p className="text-xs text-zinc-500">Soporta .xlsx, .xls y .csv (Máximo 5 MB)</p>
          </div>
        </>
      )}

      {fileStatus === "processing" && (
        <>
          <div className="p-4 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
            <FileSpreadsheet className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-blue-300 mb-1">Procesando {fileName}...</h3>
          <p className="text-sm text-blue-400/70">Extrayendo datos de nómina</p>
        </>
      )}

      {fileStatus === "success" && (
        <>
          <div className="p-4 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-green-300 mb-1">¡Archivo cargado!</h3>
          <p className="text-sm text-green-400/70">{fileName}</p>
          <button 
            onClick={(e) => { e.preventDefault(); setFileStatus("idle"); }}
            className="mt-4 text-xs z-10 relative text-green-300 hover:text-green-200 underline"
          >
            Cargar otro archivo
          </button>
        </>
      )}

      {fileStatus === "error" && (
        <>
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-red-300 mb-1">Error</h3>
          <p className="text-sm text-red-400/70">{errorMessage}</p>
          <button 
            onClick={(e) => { e.preventDefault(); setFileStatus("idle"); }}
            className="mt-4 text-xs z-10 relative text-red-300 hover:text-red-200 underline"
          >
            Intentar nuevamente
          </button>
        </>
      )}
    </div>
  );
}
