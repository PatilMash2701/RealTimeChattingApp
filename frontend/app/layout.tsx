import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { SocketProvider } from "@/context/SocketContext";
import { CallProvider } from "@/context/CallContext";
import { IdentityVerificationProvider } from "@/context/IdentityVerificationContext";
import ThemeToggle from "@/components/ThemeToggle";
import PushNotifications from "@/components/PushNotifications";
import CallOverlay from "@/components/CallOverlay";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/brand";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} — Real-time messaging`,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${plusJakarta.variable} font-sans antialiased`}
        style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
      >
        <AppProvider>
          <SocketProvider>
            <CallProvider>
              <IdentityVerificationProvider>
                <ThemeToggle />
                <PushNotifications />
                <CallOverlay />
                {children}
              </IdentityVerificationProvider>
            </CallProvider>
          </SocketProvider>
        </AppProvider>
      </body>
    </html>
  );
}
