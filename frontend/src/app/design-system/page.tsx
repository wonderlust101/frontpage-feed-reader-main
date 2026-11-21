// The Frontpage design system page: every token and component, live, framed by the category color field.

import type { Metadata } from 'next';
import { ContentsNav } from './_components/contents-nav';
import { ComponentsSection } from './_components/components-section';
import { ColorSection } from './_components/color-section';
import { SpaceSection } from './_components/space-section';
import { TypeSection } from './_components/type-section';
import { HeroField } from './_components/hero-field';
import { IconsSection } from './_components/icons-section';
import { ImagerySection } from './_components/imagery-section';
import { LogoSection } from './_components/logo-section';
import { PatternsSection } from './_components/patterns-section';
import { StatesSection } from './_components/states-section';
import { ReadingControls } from '@/features/preferences/components/reading-controls';
import { SECTIONS } from './_data/sections';

export const metadata: Metadata = {
    title: 'Design system · Frontpage',
    description: "Frontpage's tokens, type and components, shown working.",
};

export default function DesignSystemPage() {
    return (
        <div className="flex flex-1 flex-col">
            <HeroField />
            <ReadingControls>
                <div className="mx-auto grid w-full max-w-page gap-x-16 px-gutter pt-16 lg:grid-cols-[11rem_minmax(0,1fr)]">
                    <ContentsNav entries={SECTIONS} />
                    <main id="main" className="min-w-0">
                        <LogoSection />
                        <ColorSection />
                        <ImagerySection />
                        <TypeSection />
                        <SpaceSection />
                        <IconsSection />
                        <ComponentsSection />
                        <StatesSection />
                        <PatternsSection />
                    </main>
                </div>
                <footer className="mx-auto w-full max-w-page border-t border-rule-soft px-gutter py-8 text-meta text-muted">
                    Frontpage design system · Sources and categories from the guest sample feeds; item titles are illustrative.
                </footer>
            </ReadingControls>
        </div>
    );
}
