import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Metro Polis - Dedektif Oyunu",
  description: "Yapay zeka destekli interaktif dedektiflik oyunu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className="antialiased font-sans"
      >
        {children}
      </body>
    </html>
  );
}
