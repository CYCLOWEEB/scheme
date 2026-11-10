import type {Metadata} from 'next';
import localFont from 'next/font/local';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import './cinematic.css';
import './transitions.css';
import './motion.css';

const nunitoSans = localFont({
  src: '../public/fonts/nunito-sans-variable.ttf',
  variable: '--font-nunito-sans',
  weight: '200 900',
  style: 'normal',
  display: 'swap',
  adjustFontFallback: false,
});

const notoSansDevanagari = localFont({
  src: '../public/fonts/noto-sans-devanagari-variable.ttf',
  variable: '--font-noto-sans-devanagari',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: 'Scheme Lens | AI-Powered Scheme Guidance',
  description: 'Discover government scheme options with AI-assisted explanations, comparisons, repayment guidance, document planning, and voice chat. Explore the facts and follow official application links.',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Scheme Lens | AI-Powered Scheme Guidance',
    description: 'Discover government scheme options with AI-assisted explanations, comparisons, repayment guidance, document planning, and voice chat. Explore the facts and follow official application links.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scheme Lens | AI-Powered Scheme Guidance',
    description: 'Discover government scheme options with AI-assisted explanations, comparisons, repayment guidance, document planning, and voice chat. Explore the facts and follow official application links.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${nunitoSans.variable} ${notoSansDevanagari.variable}`}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-sky-500 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
