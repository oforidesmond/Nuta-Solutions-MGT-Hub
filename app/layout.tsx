import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavigationLoadingProvider } from "@/components/loading/navigation-loading-provider";
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
  title: "NutaPOS - Management Hub",
  description: "Business owner dashboard for NutaPOS",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png", type: "image/png" }],
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
            <NavigationLoadingProvider>
              <HubTooltipProvider>
                {children}
                <Toaster richColors position="top-center" />
              </HubTooltipProvider>
            </NavigationLoadingProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
