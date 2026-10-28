import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import "./globals.css";
import { InlineScript } from "@ui/inline-script";
import { AppProviders } from "@/providers";

const beVietnamSans = Be_Vietnam_Pro({
  variable: "--font-bevietnam-sans",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart PPE Monitoring",
  description: "Hệ thống giám sát an toàn lao động Smart PPE",
};

// Đặt data-theme trước first paint để tránh flash sai theme (hệ thống tự động theo ngày 06:00-18:00 và đêm 18:00-06:00)
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="dark"&&t!=="light"){var h=new Date().getHours();t=(h>=6&&h<18)?"light":"dark"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      data-theme="light"
      suppressHydrationWarning
      className={`${beVietnamSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
