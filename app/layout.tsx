import type { Metadata } from "next";
import "./globals.css";
import { Geist, Instrument_Serif } from "next/font/google";
import { cn } from "~/lib/utils";
import { Providers } from "~/app/providers";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-artifact-title",
});

export const metadata: Metadata = {
  title: "🍊 Agent C",
  description:
    "Internal lookup-and-synthesis assistant for CodeBase. Chat on the web or Slack — look across Drive, HubSpot, and Slack, and turn it into case studies and reports.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", geist.variable, instrumentSerif.variable)}
    >
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
