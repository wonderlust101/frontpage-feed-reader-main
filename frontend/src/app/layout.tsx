import type { Metadata } from 'next';
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque, JetBrains_Mono, Lexend, Onest } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
    variable: '--font-bricolage',
    subsets: ['latin'],
    axes: ['opsz', 'wdth'],
});

const jetbrainsMono = JetBrains_Mono({
    variable: '--font-jetbrains-mono',
    subsets: ['latin'],
});

const onest = Onest({
    variable: '--font-onest',
    subsets: ['latin'],
});

// Reading faces readers can switch to; not preloaded, so they download only when chosen.
const atkinson = Atkinson_Hyperlegible_Next({
    variable: '--font-atkinson',
    subsets: ['latin'],
    preload: false,
});

const lexend = Lexend({
    variable: '--font-lexend',
    subsets: ['latin'],
    preload: false,
});

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: { default: 'Frontpage', template: '%s · Frontpage' },
    description: 'Your personalized front page for tech content.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
    return (
        <html
            lang="en"
            className={`${bricolage.variable} ${onest.variable} ${jetbrainsMono.variable} ${atkinson.variable} ${lexend.variable} h-full antialiased`}
        >
            <body className="flex min-h-full flex-col">{children}</body>
        </html>
    );
}
