"use client";

import React from "react";
import GlassWidget from "@/components/GlassWidget";
import ExcelUploader from "@/components/ExcelUploader";
import { Building2, Download, FileSpreadsheet } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import * as XLSX from "xlsx";

export default function ClientsPage() {
  const { t } = useI18n();

  const handleDownloadTemplate = () => {
    // Definimos los campos exactos solicitados por el cliente
    const templateData = [
      {
        "Nombre del Cliente": "Empresa Ejemplo S.A.",
        "Cédula / RUC": "1790000000001",
        "Dirección": "Av. Principal 123 y Secundaria",
        "Teléfono": "0999999999",
        "Correo Electrónico": "contacto@empresa.com",
        "URL_Foto_o_Logo": "https://link-a-foto.com/logo.jpg"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PlantillaClientes");

    // Descargar el archivo
    XLSX.writeFile(workbook, "Plantilla_Importacion_Clientes.xlsx");
  };

  return (
    <main className="p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          {t("clients")}
        </h1>
        <p className="text-sm md:text-base text-zinc-400">
          Gestión de clientes y facturación
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassWidget title="Importar Nuevos Clientes" icon={Building2}>
          <div className="flex flex-col h-full justify-between">
            <ExcelUploader onDataLoaded={() => {}} />
            
            <div className="mt-4 p-4 border-t border-zinc-700/50 flex flex-col gap-3">
              <p className="text-sm text-zinc-400">¿No tienes el formato correcto?</p>
              <button 
                onClick={handleDownloadTemplate}
                className="flex items-center justify-center gap-2 py-3 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-xl transition-colors font-medium text-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Descargar Plantilla Base
              </button>
            </div>
          </div>
        </GlassWidget>

        <GlassWidget title="Exportar Base de Clientes" icon={Download}>
          <div className="p-6 flex flex-col gap-4 text-zinc-300">
            <p className="text-sm">Descargue la base de datos actual para revisiones offline o contabilidad.</p>
            <div className="flex flex-wrap gap-3">
              <button className="flex-1 min-w-[120px] py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-colors font-medium">Excel (.xlsx)</button>
              <button className="flex-1 min-w-[120px] py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors font-medium">PDF</button>
              <button className="flex-1 min-w-[120px] py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl transition-colors font-medium">CSV</button>
            </div>
          </div>
        </GlassWidget>
      </div>
    </main>
  );
}
