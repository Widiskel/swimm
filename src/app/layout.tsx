import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PrivyAuthProvider } from "@/providers/privy-provider";
import { LanguageProvider } from "@/providers/language-provider";
import { HistoryProvider } from "@/providers/history-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SWIMM | Soon You Will Make Money",
  description:
    "SWIMM (Soon You Will Make Money) delivers multi-pair crypto intelligence with bilingual insights. SWIMM menyajikan analisa kripto multi-pair dengan insight dwibahasa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PrivyAuthProvider>
          <LanguageProvider>
            <HistoryProvider>{children}</HistoryProvider>
          </LanguageProvider>
        </PrivyAuthProvider>
      </body>
    </html>
  );
}
