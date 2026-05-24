import type { Metadata } from "next";
import AuthProvider from "@/components/layout/SessionProvider";
import "./globals.css";

/**
 * Global Brand SEO Metadata parameters.
 */
export const metadata: Metadata = {
  title: "AIMS - AURXON Internal Management System",
  description: "Elite enterprise workspace for managing AURXON internal records, attendance rolls, active task flows, and document compliance verification.",
  icons: {
    icon: "/Logo-AIMS/Dark-Mode-Logo.png",
    shortcut: "/Logo-AIMS/Dark-Mode-Logo.png",
    apple: "/Logo-AIMS/Dark-Mode-Logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth select-none">
      <head>
        <meta name="theme-color" content="#070a13" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-full font-sans antialiased text-foreground bg-background">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
