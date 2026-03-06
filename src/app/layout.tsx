import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { RTLProvider } from "@/components/layout/direction-provider";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "מחברת המתכונים",
  description: "פנקס המתכונים האישי שלך",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.variable} font-sans antialiased`}>
        <RTLProvider>{children}</RTLProvider>
      </body>
    </html>
  );
}
