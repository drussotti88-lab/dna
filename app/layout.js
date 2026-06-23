import "./globals.css";
import { DM_Sans, Syne, DM_Mono } from "next/font/google";
import { APP_VERSION } from "@/lib/version";

// The 3 typefaces, each with a job (see DESIGN.md):
// DM Sans = body/UI, Syne = headings/wordmark/big numbers, DM Mono = data (prices, stats).
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "DNA Card Vault",
  description: "The serious collector's command center for trading cards as assets.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-accent="purple"
      className={`${dmSans.variable} ${syne.variable} ${dmMono.variable}`}
    >
      <head>
        {/* Tabler icon font — one icon set, used consistently (ti ti-…). */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.11.0/dist/tabler-icons.min.css"
        />
      </head>
      <body data-app-version={APP_VERSION}>{children}</body>
    </html>
  );
}
