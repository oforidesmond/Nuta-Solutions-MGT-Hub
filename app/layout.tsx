import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { HubTooltipProvider } from "@/components/providers/tooltip-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NutaPOS — Management Hub",
  description: "Business owner dashboard for NutaPOS",
  icons: {
    icon: [{ url: "/favicon-light.png", type: "image/png" }],
    apple: [{ url: "/favicon-light.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <AuthProvider>
            <HubTooltipProvider>
              {children}
              <Toaster richColors position="top-center" />
            </HubTooltipProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
