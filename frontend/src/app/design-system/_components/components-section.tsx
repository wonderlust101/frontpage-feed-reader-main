import { AiSummary } from '@/components/ui/ai-summary';
import { Button } from '@/components/ui/button';
import { FormNotice } from '@/components/ui/form-notice';
import { Icon } from '@/components/ui/icon';
import { HealthMark } from '@/components/ui/health-mark';
import { PasswordField } from '@/components/ui/password-field';
import { CategoryTag, NewTag } from '@/components/ui/tags';
import { TextField } from '@/components/ui/text-field';
import { CATEGORIES } from '../_data/sample-data';
import { CategoryFilterDemo } from './category-filter-demo';
import { FormControlsDemo } from './form-controls-demo';
import { DocSection, Specimen } from './doc-section';

export function ComponentsSection() {
    return (
        <DocSection
            id="components"
            title="Components"
            intro="Controls are softly rounded ink outlines; color appears only for categories and for Frontpage's own Lemon. Each component below is the one the app uses, in its real states."
        >
            <div className="grid gap-14 2xl:grid-cols-2 2xl:gap-x-10">
                <Specimen
                    title="Buttons"
                    description="One primary per view. Destructive actions are drawn in the error color, never filled, and sit apart from everything else, so they are never hit by accident."
                >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-6">
                        <Button>Add feed</Button>
                        <Button variant="secondary">Import OPML</Button>
                        <Button variant="quiet">View all sources</Button>
                        <Button disabled>
                            <Icon name="loading" size="action" className="animate-spin" />
                            Saving…
                        </Button>
                        <span className="ml-auto pl-12">
                            <Button variant="destructive">Unsubscribe</Button>
                        </span>
                    </div>
                </Specimen>

                <Specimen
                    title="Capsules"
                    description="Category filters. Fully rounded, smaller than buttons. Off, an outlined chip with a dot in the category color. On, filled with the category field and a check mark, so the state never rests on color alone."
                >
                    <CategoryFilterDemo />
                </Specimen>

                <Specimen title="Text field" description="Errors name the problem and the fix in red, with an icon and a heavier border.">
                    <div className="grid max-w-3xl gap-8 md:grid-cols-2">
                        <TextField
                            id="feed-url"
                            label="Feed or site URL"
                            hint="Paste a blog, newsletter or RSS address."
                            placeholder="https://css-tricks.com"
                        />
                        <TextField
                            id="feed-url-error"
                            label="Feed or site URL"
                            defaultValue="https://example.com/blog"
                            error="No feed found at that address. Try the site's homepage."
                        />
                    </div>
                </Specimen>

                <Specimen
                    title="Password field"
                    description="The text field with a show/hide toggle inside its edge. The toggle is a pressed button with one name, so screen readers hear whether the password is showing."
                >
                    <div className="grid max-w-3xl gap-8 md:grid-cols-2">
                        <PasswordField id="demo-password" label="Password" hint="At least 8 characters." autoComplete="off" />
                        <PasswordField id="demo-password-error" label="Password" defaultValue="short" autoComplete="off" error="Use at least 8 characters." />
                    </div>
                </Specimen>

                <Specimen
                    title="Form notice"
                    description="A message at the top of a form, in the fields' language: a field's edge (red and heavier for errors), the icon lined up with the text inside the fields, and the lead on its own line. One brought in by a step takes focus; an error offers the way out."
                >
                    <div className="grid max-w-3xl gap-8 md:grid-cols-2">
                        <FormNotice icon="newsletter" lead="Sent to ada@example.com">
                            If that address has an account, the link is waiting there now.
                        </FormNotice>
                        <FormNotice tone="error" icon="error" lead="Couldn't sign you in.">
                            That email and password don&apos;t match. Check both and try again.
                        </FormNotice>
                    </div>
                </Specimen>

                <Specimen
                    title="Choices and fields"
                    description="Checkboxes for settings saved together, a switch for one that applies at once, a native select for a short list, and search with a clear button. All share the 1.5px ink edge."
                >
                    <FormControlsDemo />
                </Specimen>

                <Specimen
                    title="Tags"
                    description="Category tags are flat labels: filled with the category color, no outline, square-ish corners, because they are not clickable. The solid New tag pairs with a bolder title."
                >
                    <div className="flex flex-wrap items-center gap-2">
                        {CATEGORIES.map((category) => (
                            <CategoryTag key={category.id} name={category.name} field={category.field} />
                        ))}
                        <span className="mx-2 h-6 w-px bg-rule-soft" aria-hidden="true" />
                        <NewTag />
                    </div>
                </Specimen>

                <Specimen
                    title="Feed health"
                    description="Healthy stays neutral because it needs nothing from you. Stale turns amber, failing turns red, and each keeps its own line form and label, so it reads in grayscale too."
                >
                    <div className="flex flex-wrap gap-x-10 gap-y-4">
                        <HealthMark health="healthy" />
                        <HealthMark health="stale" />
                        <HealthMark health="failing" />
                    </div>
                </Specimen>

                <Specimen
                    title="AI summary"
                    stage="none"
                    description="Generated text is never set like the author's words: its own panel, a drawn mark and a plain warning."
                >
                    <div className="max-w-xl">
                        <AiSummary>
                            A month of using a small local model as a first reviewer: good at style and naming, unreliable on logic, and fast enough to run on
                            every commit.
                        </AiSummary>
                    </div>
                </Specimen>
            </div>
        </DocSection>
    );
}
