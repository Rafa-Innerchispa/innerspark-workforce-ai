import type { Metadata } from "next";
import { I18nProvider } from "@/contexts/I18nContext";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "FEMAR AI - Command Center",
  description: "Plataforma inteligente de gestión de fuerza laboral",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="font-sans antialiased text-white min-h-screen flex flex-col md:flex-row bg-background bg-fixed bg-cover">
        <AuthProvider>
          <I18nProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
