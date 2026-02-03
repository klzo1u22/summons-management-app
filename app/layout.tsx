import { Inter, JetBrains_Mono } from 'next/font/google';
import './main.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});
import { ClientLayout } from '@/components/layout/ClientLayout';
import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Summons Management System',
  description: 'Comprehensive summons and case management system with Notion sync',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
