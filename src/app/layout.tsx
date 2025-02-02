import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoiceNavigator",
  description: "A Voice Navigator, helping people to navigate through the world.",
  icons: "VoiceNavigatorIcon.png",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
