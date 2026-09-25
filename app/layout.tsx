import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bazzaro — Good things, gathered.',
  description: 'A considered marketplace for Nepal. Discover thoughtful products from local makers and trusted brands.',
  metadataBase: new URL('https://bazzaro.example'),
  openGraph: {
    title: 'Bazzaro — Good things, gathered.',
    description: 'Thoughtful products from local makers and trusted brands across Nepal.',
    type: 'website'
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
