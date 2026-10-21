import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif" });

export const metadata: Metadata = {
  title: "SR&ED Copilot",
  description: "Drafts an SR&ED claim from the records a startup already keeps. Every sentence cites its evidence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en-CA" className={`${plex.variable} ${serif.variable}`}>
        <body className="min-h-screen flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-rule px-6 py-4 text-sm text-meta">
            Synthetic demo data. Draft for professional review. Not tax advice.
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
