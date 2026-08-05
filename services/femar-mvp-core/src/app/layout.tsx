import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FEMAR - Asistencia y Prenómina",
  description: "Plataforma de gestión de fuerza laboral",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
