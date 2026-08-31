import type { Metadata } from "next";
import { I18nProvider } from "@/contexts/I18nContext";
import { InnerOSLangProvider } from "@/contexts/InnerOSLangContext";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "InnerSpark Workforce AI",
  description: "Intelligent workforce management platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-white min-h-screen flex flex-col md:flex-row bg-background bg-fixed bg-cover">
        <AuthProvider>
          <InnerOSLangProvider>
            <I18nProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </I18nProvider>
          </InnerOSLangProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
