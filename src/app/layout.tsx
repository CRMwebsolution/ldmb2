import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/next";
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
  metadataBase: new URL("https://littledoomudbog.com"),
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
  appleWebApp: {
    capable: true,
    title: "Little Doo",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Little Doo Mud Bog",
    description: "Family-friendly mud racing in Newport, North Carolina.",
    url: "https://littledoomudbog.com",
    siteName: "Little Doo Mud Bog",
    locale: "en_US",
    type: "website",
    images: [{
      url: "/social-card.png",
      width: 1200,
      height: 630,
      alt: "Little Doo Mud Bog race nights, schedule, and results in Newport, North Carolina",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Little Doo Mud Bog",
    description: "Family-friendly mud racing in Newport, North Carolina.",
    images: [{
      url: "/social-card.png",
      alt: "Little Doo Mud Bog race nights, schedule, and results in Newport, North Carolina",
    }],
  },
};

export const viewport: Viewport = {
  themeColor: "#d97706",
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
        <Analytics />
        <GoogleAnalytics gaId="G-T5CLWGTTNR" />
      </body>
    </html>
  );
}
