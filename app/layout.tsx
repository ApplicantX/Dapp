import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DAPP - Gold & Silver Lending Ledger',
  description: 'Clean Scandinavian-designed gold and silver loan accounting, Girvi Khata, pawn receipts, and compound interest calculator.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💎</text></svg>" />
      </head>
      <body className="antialiased selection:bg-purple-100 selection:text-purple-900 bg-[#fafafa] text-zinc-900">
        {children}
      </body>
    </html>
  );
}
