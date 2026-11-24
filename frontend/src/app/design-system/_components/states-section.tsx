import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/notice';
import { FeedItemSkeleton } from '@/features/items/components/feed-item-row';
import { SAMPLE_ITEMS } from '../_data/sample-data';
import { DocSection, Specimen } from './doc-section';
import { ConfirmDemo, ToastDemo } from './feedback-demo';
import { SampleItemRow } from './sample-item-row';

const SELECTION_ITEMS = SAMPLE_ITEMS.slice(0, 3);

export function StatesSection() {
    return (
        <DocSection
            id="states"
            title="States"
            intro="A list is rarely just full. It is empty because you caught up, waiting on the network, or missing a feed that broke. Each state says which, in plain words, and offers one next step. Anything that can be undone happens at once with Undo; only what cannot be undone asks first."
        >
            <div className="grid gap-14 xl:grid-cols-2 xl:gap-x-10">
                <Specimen
                    title="Empty"
                    stage="frame"
                    description="Caught up is a good outcome, so it reads like one. No results says what was searched and how to widen it."
                >
                    <EmptyState icon="caught-up" title="You're all caught up" action={<Button variant="quiet">Show read items</Button>}>
                        Nothing new since 09:42. Frontpage checks your feeds every 30 minutes.
                    </EmptyState>
                    <div className="border-t border-rule-soft">
                        <EmptyState icon="no-results" title="No items match “kubernetes”" action={<Button variant="quiet">Search all categories</Button>}>
                            You searched Design and Frontend only.
                        </EmptyState>
                    </div>
                </Specimen>

                <Specimen
                    title="Loading"
                    stage="frame"
                    description="Rows keep their shape while items load, so nothing jumps when they arrive. Rule-soft bars, no shimmer."
                >
                    <ul aria-busy="true" className="rule-t">
                        <li className="sr-only">Loading items</li>
                        <FeedItemSkeleton />
                        <FeedItemSkeleton />
                        <FeedItemSkeleton />
                    </ul>
                </Specimen>

                <Specimen
                    title="Notices"
                    stage="frame"
                    description="Inline, at the top of what they are about. Status color marks the icon and lead only; the sentence stays in ink."
                >
                    <div className="flex flex-col gap-6">
                        <Notice icon="offline" lead="You're offline.">
                            Showing items saved on this device. New items arrive when you reconnect.
                        </Notice>
                        <Notice
                            tone="error"
                            icon="failing"
                            lead="Netlify Blog hasn't loaded since Monday."
                            action={
                                <Button variant="secondary">
                                    <Icon name="refresh" size="action" />
                                    Try again
                                </Button>
                            }
                        >
                            The address returns an error.
                        </Notice>
                    </div>
                </Specimen>

                <Specimen
                    title="Selected and focused rows"
                    stage="frame"
                    description="The open item sits in an ink frame on ground-2. Keyboard focus draws the focus ring around the whole row."
                >
                    <ul className="rule-t">
                        {SELECTION_ITEMS.map((item, index) => (
                            <SampleItemRow key={item.id} item={item} href="#states" isSelected={index === 1} />
                        ))}
                    </ul>
                </Specimen>

                <Specimen
                    title="Toast with Undo"
                    description="For actions that can be taken back. Solid ink, one line, Undo first. Errors never go in a toast."
                >
                    <ToastDemo />
                </Specimen>

                <Specimen title="Confirm" description="Only for what cannot be undone. The safe choice has focus; Escape cancels.">
                    <ConfirmDemo />
                </Specimen>
            </div>
        </DocSection>
    );
}
