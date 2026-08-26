import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DAPP - Luxury Jewelry Store & Gold Loan Ledger',
  description: 'Voice-first gold and silver loan accounting, Girvi Khata, pawn receipts, and live metal rates for jewelry store owners.',
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
      <body className="antialiased selection:bg-gold-500 selection:text-purple-950">
        {children}
      </body>
    </html>
  );
}
