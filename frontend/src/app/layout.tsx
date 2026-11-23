// The root layout: fonts, metadata, and the reader's saved theme and contrast. Those two are reader settings stored in
// localStorage (features/preferences); a tiny inline script copies them onto <html> before the first paint, so every
// page, including one opened from an email link, starts in the reader's choice instead of flashing the default. The
// Content Security Policy allows inline scripts (next.config.ts). React leaves the attributes alone (suppressHydrationWarning).

import type { Metadata } from 'next';
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque, JetBrains_Mono, Lexend, Onest } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
    variable: '--font-bricolage',
    subsets: ['latin'],
    axes: ['opsz', 'wdth'],
});

// Only used for code and data, which few pages show, so it isn't preloaded.
const jetbrainsMono = JetBrains_Mono({
    variable: '--font-jetbrains-mono',
    subsets: ['latin'],
    preload: false,
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

// Keep the keys and values in step with theme-switch.tsx and reading-controls.tsx.
const SAVED_PREFERENCES_SCRIPT = `try{var d=document.documentElement,t=localStorage.getItem('frontpage-theme'),c=localStorage.getItem('frontpage-contrast');if(t==='light'||t==='dark')d.dataset.theme=t;if(c==='standard'||c==='more')d.dataset.contrast=c}catch(e){}`;

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL),
    title: { default: 'Frontpage', template: '%s · Frontpage' },
    description: 'Your personalized front page for tech content.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={`${bricolage.variable} ${onest.variable} ${jetbrainsMono.variable} ${atkinson.variable} ${lexend.variable} h-full antialiased`}
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: SAVED_PREFERENCES_SCRIPT }} />
            </head>
            <body className="flex min-h-full flex-col">{children}</body>
        </html>
    );
}
