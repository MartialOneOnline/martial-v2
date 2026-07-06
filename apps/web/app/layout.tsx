import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from '../lib/i18n/LanguageContext'
import { resolveAuthHashRedirect } from '../lib/authHashRedirect'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Martial — The Global Martial Arts Platform",
  description: "Innovative Management Software for Martial Arts Academies and Business & Users interaction Worldwide.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Redirect invite/magiclink/error hashes before any JS bundle runs — see
            resolveAuthHashRedirect() for the decision logic (unit tested in
            __tests__/authHashRedirect.test.ts). Catches Supabase falling back to the
            Site URL (this page) when redirect_to isn't allow-listed. */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var resolve = ${resolveAuthHashRedirect.toString()};
            var to = resolve(window.location.hash);
            if (to) window.location.replace(to);
          })();
        `}} />
      </head>
      <body className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
