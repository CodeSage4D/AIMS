import type { Metadata } from "next";
import "./globals.css";

/**
 * Global Brand SEO Metadata parameters.
 */
export const metadata: Metadata = {
  title: "AIMS - AURXON Internal Management System",
  description: "Elite enterprise workspace for managing AURXON internal records, attendance rolls, active task flows, and document compliance verification.",
  icons: {
    icon: "/favicon.ico",
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
      </head>
      <body className="min-h-full font-sans antialiased text-foreground bg-background">
        {children}
      </body>
    </html>
  );
}
