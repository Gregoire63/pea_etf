import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://etf.gregoire-raturat.fr";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: "%s | PEA ETF",
    default: "PEA ETF — Classement & Analyse",
  },
  description:
    "Classement, comparaison et analyse des ETF éligibles PEA en France. Scores composites, performances, frais, ratio de Sharpe et stratégie portfolio personnalisée.",
  keywords: [
    "ETF PEA",
    "plan épargne actions",
    "ETF France",
    "MSCI World PEA",
    "S&P 500 PEA",
    "investissement bourse",
    "classement ETF",
    "Amundi ETF",
    "analyse ETF",
    "portefeuille PEA",
  ],
  authors: [{ name: "Grégoire Raturat", url: "https://gregoire-raturat.fr" }],
  creator: "Grégoire Raturat",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: BASE_URL,
    siteName: "PEA ETF",
    title: "PEA ETF — Classement & Analyse",
    description: "Classement et analyse des ETF éligibles PEA en France.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PEA ETF — Classement & Analyse",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PEA ETF — Classement & Analyse",
    description: "Classement et analyse des ETF éligibles PEA en France.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC : applique la classe dark avant le rendu React */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pea_theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t!=='light'&&d)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <TooltipProvider>
            <NavigationProgress />
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:pb-8">{children}</main>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
