import type { Metadata, Viewport } from "next";
import { Heebo, Secular_One } from "next/font/google";
import { RTLProvider } from "@/components/layout/direction-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

const secularOne = Secular_One({
  variable: "--font-display",
  weight: "400",
  subsets: ["hebrew", "latin"],
});

export const viewport: Viewport = {
  themeColor: "#E85D2C",
};

export const metadata: Metadata = {
  title: "מחברת המתכונים",
  description: "פנקס המתכונים האישי שלך",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "מחברת המתכונים",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.variable} ${secularOne.variable} font-sans antialiased`}>
        <RTLProvider>{children}</RTLProvider>
        <Toaster position="bottom-center" dir="rtl" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;var m=window.matchMedia('(prefers-color-scheme:dark)');function u(){d.classList.toggle('dark',m.matches)}u();m.addEventListener('change',u);if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}})()`,
          }}
        />
      </body>
    </html>
  );
}
