// Patterns section of the design system page: the feed list and the article view, rendered with the app's own
// item components and sample data.

import { ArticleView } from '@/features/items/components/article-view';
import { FeedItemRow } from '@/features/items/components/feed-item-row';
import { SAMPLE_ITEMS, getCategory } from '../_data/sample-data';
import { AppShellDemo } from './app-shell-demo';
import { DocSection, Specimen } from './doc-section';

const frontend = getCategory('frontend');

const CODE_SAMPLE = `.card-grid {
  container-type: inline-size;
}

@container (min-width: 36rem) {
  .card {
    grid-template-columns: 8rem 1fr;
  }
}`;

// Renders the feed list and the article specimen; both follow the reader settings.
export function PatternsSection() {
    return (
        <DocSection
            id="patterns"
            title="Patterns"
            intro="The feed is a ruled list, newest first, with the time leading each row. Unread rows carry the New tag and a bold title; read rows fall back to regular weight. Change the density in the reader settings at the top of this page and watch the rows breathe."
        >
            <Specimen
                title="App shell"
                stage="frame"
                description="Sidebar first: a rail for the views and your account, a category panel that collapses away ([), and the workspace, three neutral steps lighter toward what you read. The selected category shows its color in its row, the toolbar tag and the title. Search with Ctrl or ⌘ + K. Each category row has quick actions: rename, recolor and delete (Undo, or Ctrl or ⌘ + Z) when signed in, recolor as a guest. Below lg it all moves into a drawer."
            >
                <AppShellDemo />
            </Specimen>

            <div className="grid gap-14 xl:grid-cols-2 xl:gap-x-10">
                <Specimen title="Feed list" stage="frame" description="Sample data. Titles are illustrative; sources and categories are the guest feeds.">
                    <ul className="rule-t">
                        {SAMPLE_ITEMS.map((item) => {
                            const category = getCategory(item.category);

                            return (
                                <FeedItemRow
                                    key={item.id}
                                    title={item.title}
                                    href="#article"
                                    source={item.source}
                                    time={item.time}
                                    isNew={item.isNew}
                                    health={item.health}
                                    category={category}
                                />
                            );
                        })}
                    </ul>
                </Specimen>

                <Specimen
                    title="Article view"
                    stage="frame"
                    description="The reading column: one face, the measure capped at 66 characters, everything else out of the way."
                >
                    <ArticleView
                        id="article"
                        titleAs="h4"
                        title="Container queries in practice: three real layouts"
                        category={frontend}
                        source="CSS-Tricks"
                        meta="Today, 09:15 · 6 min read"
                        summary="Three layouts that respond to their own width instead of the viewport, with the CSS for each and the cases where media queries still win."
                    >
                        <p>
                            For years a card had to guess how wide it would be from the size of the window. Container queries let it ask its own container
                            instead, so the same component can sit in a sidebar and in a full-width grid without a single breakpoint override.
                        </p>
                        <p>The pattern is short. Mark the parent as a container, then write the rule against the container&apos;s width:</p>
                        <pre className="overflow-x-auto rounded-panel bg-ground-2 px-5 py-4 font-mono text-small leading-[1.6]">
                            <code>{CODE_SAMPLE}</code>
                        </pre>
                        <p>
                            Start with the components that appear in more than one place: cards, media objects, navigation. Those are where viewport breakpoints
                            have been lying to you the longest.
                        </p>
                    </ArticleView>
                    <p className="mt-6 text-meta text-muted">Sample article written for this page.</p>
                </Specimen>
            </div>
        </DocSection>
    );
}
