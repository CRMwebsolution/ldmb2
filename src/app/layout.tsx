import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/supabase/auth-context";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Little Doo Mud Bog — Newport, NC",
    template: "%s | Little Doo Mud Bog",
  },
  description:
    "Family-friendly mud racing in Newport, North Carolina. Monthly events Feb–Dec. Gates open 2 PM, racing at 4 PM. Adults $10, kids 12 & under free.",
  keywords: ["mud bog", "mud racing", "Newport NC", "off-road", "family events"],
  icons: {
    icon: [{ url: "/ldmbfav.png", type: "image/png", sizes: "1024x1024" }],
    apple: [{ url: "/ldmbfav.png", type: "image/png", sizes: "1024x1024" }],
  },
  openGraph: {
    title: "Little Doo Mud Bog",
    description: "Family-friendly mud racing in Newport, North Carolina.",
    url: "https://littledoomudbog.com",
    siteName: "Little Doo Mud Bog",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased bg-background text-foreground">
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1 pt-16">{children}</main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
