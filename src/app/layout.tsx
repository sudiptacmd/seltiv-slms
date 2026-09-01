import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import { env } from "@/lib/env";
import { Providers } from "./providers";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${env.school.name} — SLMS`,
    template: `%s · ${env.school.code} SLMS`,
  },
  description: "Student Lifecycle Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sourceSerif.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
