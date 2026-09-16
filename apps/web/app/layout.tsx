import type { Metadata } from 'next';
import Shell from '../components/layout/Shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Open Social Scheduler — Local-first Social Media Scheduler',
  description: 'Self-hostable, local-first social media scheduling for LinkedIn and X with an MCP-native interface.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
