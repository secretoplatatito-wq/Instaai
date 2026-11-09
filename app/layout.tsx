import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Biome Beat Studio — 3D Music Visualizer & Viral Reel Generator',
  description: 'AI-Powered 3D Music Visualizer & Viral Reel Generator. Transform audio into procedural reactive 3D biomes, physics playgrounds, and vertical videos.',
  openGraph: {
    title: 'Biome Beat Studio — 3D Music Visualizer & Viral Reel Generator',
    description: 'Transform audio into procedural reactive 3D biomes, physics playgrounds, and vertical videos.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Biome Beat Studio — 3D Music Visualizer & Viral Reel Generator',
    description: 'Transform audio into procedural reactive 3D biomes, physics playgrounds, and vertical videos.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
