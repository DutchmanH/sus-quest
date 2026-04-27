import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SusQuest — trust no one.",
  description: "Multiplayer party game — elke ronde heeft iemand een geheime opdracht. Wie is de sus?",
  manifest: "/manifest.json",
  metadataBase: new URL("https://susquest.app"),
  openGraph: {
    title: "SusQuest — trust no one.",
    description: "Multiplayer party game — elke ronde heeft iemand een geheime opdracht. Wie is de sus?",
    url: "https://susquest.app",
    siteName: "SusQuest",
    locale: "nl_NL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SusQuest — trust no one.",
    description: "Multiplayer party game — elke ronde heeft iemand een geheime opdracht. Wie is de sus?",
  },
  keywords: ["party game", "multiplayer", "sus", "drinkspel", "gezelschapsspel"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0D1F1A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${spaceGrotesk.variable} h-full`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('susquest-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased" style={{ background: "var(--bg-primary)" }}>
        {children}
      </body>
    </html>
  );
}
