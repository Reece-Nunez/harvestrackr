import type { Metadata, Viewport } from "next";
import { Poppins, Montserrat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/providers/query-provider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["200", "700"],
  variable: "--font-logo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "HarvesTrackr - Farm Management Made Simple",
    template: "%s | HarvesTrackr",
  },
  description:
    "Professional farm expense tracking, income management, livestock records, and invoicing. Manage your farm operations efficiently with HarvesTrackr.",
  keywords: [
    "farm management",
    "expense tracking",
    "farm accounting",
    "livestock management",
    "farm invoicing",
    "agricultural software",
    "farm records",
  ],
  authors: [{ name: "HarvesTrackr" }],
  creator: "HarvesTrackr",
  publisher: "HarvesTrackr",
  applicationName: "HarvesTrackr",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HarvesTrackr",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://harvestrackr.com",
    siteName: "HarvesTrackr",
    title: "HarvesTrackr - Farm Management Made Simple",
    description:
      "Professional farm expense tracking, income management, livestock records, and invoicing.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "HarvesTrackr - Farm Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HarvesTrackr - Farm Management Made Simple",
    description:
      "Professional farm expense tracking, income management, livestock records, and invoicing.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#369c36" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} ${montserrat.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
