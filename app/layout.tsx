import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import settingsServiceServer from "@/modules/settings/services/setting-service.server";
import { ThemeProviderWrapper } from "@/context/theme-provider-wrapper";
import PointerEventsFix from "@/utils/pointer-events";
import { ClientProviders } from "@/components/providers/client-providers";
import { ErrorBoundary } from "@/components/error-boundary";
import { logger } from '@/lib/services/logger';

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Force dynamic for root layout due to settings service using cookies
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontSans.variable} font-sans antialiased`}>
      <body>
        <ErrorBoundary
          fallbackTitle="Application Error"
          fallbackDescription="Something went wrong with the application. Please refresh the page to continue."
        >
          <ThemeProviderWrapper>
            <ClientProviders>
              {children}
              <Toaster position="top-center" duration={3000} richColors />
              <PointerEventsFix />
            </ClientProviders>
          </ThemeProviderWrapper>
        </ErrorBoundary>
      </body>
    </html>
  );
}

export async function generateMetadata() {
  try {
    // For metadata, we use default settings (without project_id)
    // Project-specific metadata will be handled at the page level
    // Note: getProjectId() will return null on server-side
    let settings;
    settings = await settingsServiceServer.getSettingsById();

    return {
      title: {
        template: `%s | ${settings?.site_name || process.env.THEME_SITE_NAME || "Kaizen Developers"}`,
        default:
          settings?.site_name ||
          process.env.THEME_SITE_NAME ||
          "Kaizen Developers",
      },
      description:
        settings?.site_description || "Manage your projects efficiently",
      icons: {
        icon:
          settings?.favicon_url || process.env.THEME_FAV_ICON || "/favicon.ico",
        apple:
          settings?.favicon_url || process.env.THEME_FAV_ICON || "/favicon.ico",
      },
      manifest: "/manifest.json",
    };
  } catch (error) {
    logger.error("Failed to load settings:", { error: error instanceof Error ? error.message : String(error) });
    return {
      title: {
        template: `%s | ${process.env.THEME_SITE_NAME || "Kaizen Developers"}`,
        default: process.env.THEME_SITE_NAME || "Kaizen Developers",
      },
      description: "Manage your projects efficiently",
      icons: {
        icon: process.env.THEME_FAV_ICON || "/favicon.ico",
        apple: process.env.THEME_FAV_ICON || "/favicon.ico",
      },
      manifest: "/manifest.json",
    };
  }
}

export async function generateViewport() {
  try {
    let settings;
    settings = await settingsServiceServer.getSettingsById();

    return {
      themeColor: settings?.primary_color || "#0070f3",
    };
  } catch (error) {
    logger.error("Failed to load settings for viewport:", { error: error instanceof Error ? error.message : String(error) });
    return {
      themeColor: "#0070f3",
    };
  }
}
