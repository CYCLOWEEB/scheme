import type {Metadata} from 'next';
import localFont from 'next/font/local';
import 'leaflet/dist/leaflet.css';
import './globals.css'; // Global styles

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
  title: 'Scheme Lens | Independent Scheme Planning Aid',
  description: 'Explore selected government loans, subsidies, guarantees, and business support programmes. Compare loan estimates where terms are published and follow official scheme links.',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Scheme Lens | Independent Scheme Planning Aid',
    description: 'Explore selected government loans, subsidies, guarantees, and business support programmes. Compare loan estimates where terms are published and follow official scheme links.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scheme Lens | Independent Scheme Planning Aid',
    description: 'Explore selected government loans, subsidies, guarantees, and business support programmes. Compare loan estimates where terms are published and follow official scheme links.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${nunitoSans.variable} ${notoSansDevanagari.variable}`}>
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
