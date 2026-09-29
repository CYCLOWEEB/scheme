import type {Metadata} from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css'; // Global styles

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta',
});

export const metadata: Metadata = {
  title: 'Scheme Guide | Independent Scheme Planning Aid',
  description: 'Explore selected concessional credit schemes, estimate repayments, and follow official application links.',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Scheme Guide | Independent Scheme Planning Aid',
    description: 'Explore selected concessional credit schemes, estimate repayments, and follow official application links.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scheme Guide | Independent Scheme Planning Aid',
    description: 'AI-driven scheme recommender and concessional credit portal - Scheme for your benefit.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <head>
        <link rel="icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-sky-500 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
