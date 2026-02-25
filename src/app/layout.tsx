import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'X Tracker - Follow & Summarize',
  description: 'Track X accounts and get AI-powered summaries of their content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
