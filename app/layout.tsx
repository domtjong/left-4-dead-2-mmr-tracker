import { Oxanium, Open_Sans } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const oxanium = Oxanium({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-oxanium",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-open-sans",
});

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "L4D2 MMR Tracker",
  description: "Track your Left 4 Dead 2 matchmaking rating",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${oxanium.variable} ${openSans.variable} dark`}
    >
      <body className="bg-l4d2-ink text-foreground font-sans">
        <main className="min-h-screen flex flex-col items-center">
          {children}
        </main>
        <SpeedInsights />
      </body>
    </html>
  );
}
