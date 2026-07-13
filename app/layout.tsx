import type { Metadata } from "next";
import { Anton, Antonio, Pixelify_Sans } from "next/font/google";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const antonio = Antonio({
  weight: ["100", "300", "400", "700"],
  subsets: ["latin"],
  variable: "--font-antonio",
});
const pixelify = Pixelify_Sans({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-pixelify",
});

export const metadata: Metadata = {
  title: "PixelRent",
  description: "Rent games. Play more. Spend less.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${anton.variable} ${antonio.variable} ${pixelify.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
