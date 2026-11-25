// A tiny inline script copies the saved preferences onto <html> before the first paint, so no page flashes the
// default; React leaves those attributes alone (suppressHydrationWarning).

import type { Metadata } from 'next';
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque, JetBrains_Mono, Lexend, Onest } from 'next/font/google';
import { CATEGORY_FIELDS_SCRIPT } from '@/features/categories/category-field-vars';
import { SAVED_PREFERENCES_SCRIPT } from '@/lib/saved-preferences';
import { SITE_NAME } from '@/lib/site';
import './globals.css';

const bricolage = Bricolage_Grotesque({
    variable: '--font-bricolage',
    subsets: ['latin'],
    axes: ['opsz', 'wdth'],
});

// Not preloaded: only code and data use it, and few pages show those.
const jetbrainsMono = JetBrains_Mono({
    variable: '--font-jetbrains-mono',
    subsets: ['latin'],
    preload: false,
});

const onest = Onest({
    variable: '--font-onest',
    subsets: ['latin'],
});

// Not preloaded: they download only when a reader picks them.
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
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL),
    title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
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
                <script dangerouslySetInnerHTML={{ __html: SAVED_PREFERENCES_SCRIPT + CATEGORY_FIELDS_SCRIPT }} />
            </head>
            <body className="flex min-h-full flex-col">{children}</body>
        </html>
    );
}
