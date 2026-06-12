import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from '../lib/i18n/LanguageContext'

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
        {/* Redirect magiclink tokens to set-password before any JS bundle runs */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var h = window.location.hash;
            if (h.indexOf('access_token') !== -1 && h.indexOf('type=magiclink') !== -1) {
              window.location.replace('/auth/set-password' + h);
            }
          })();
        `}} />
      </head>
      <body className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
