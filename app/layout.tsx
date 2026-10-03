import type {Metadata} from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css'; // Global styles

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
    <html lang="en">
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
