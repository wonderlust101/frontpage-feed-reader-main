// Moodboard photos are Unsplash stock (credited below); in the app every image comes from the feeds themselves.

import Image, { type StaticImageData } from 'next/image';
import concert from '../_assets/concert.jpg';
import concourse from '../_assets/concourse.jpg';
import desk from '../_assets/desk.jpg';
import fog from '../_assets/fog.jpg';
import oranges from '../_assets/oranges.jpg';
import reading from '../_assets/reading.jpg';
import { DocSection, Specimen } from './doc-section';
import { ItemThumbnail } from '@/features/items/components/item-thumbnail';
import { getCategory } from '../_data/sample-data';

type MoodPhoto = {
    image: StaticImageData;
    alt: string;
    className: string;
};

const MOOD_PHOTOS: MoodPhoto[] = [
    { image: reading, alt: 'Hands holding an e-reader outdoors', className: 'col-span-2 row-span-2' },
    { image: fog, alt: 'A person in a mustard jacket and knit hat facing a foggy valley', className: 'row-span-2' },
    { image: desk, alt: 'A white laptop and a book on a white desk', className: '' },
    { image: concourse, alt: 'Commuters crossing the Grand Central Terminal concourse', className: 'col-span-2' },
    { image: concert, alt: 'Hands raised in a concert crowd under stage lights', className: '' },
    { image: oranges, alt: 'Oranges on a tree against a clear blue sky', className: '' },
];

const CREDITS = [
    { name: 'James Tarbotton', url: 'https://unsplash.com/photos/gm18kqu9TxQ' },
    { name: 'Luke Pamer', url: 'https://unsplash.com/photos/oUhr-qMTJoc' },
    { name: 'Nadir Balcikli', url: 'https://unsplash.com/photos/wE9nUW7tMmk' },
    { name: 'Nicolai Berntsen', url: 'https://unsplash.com/photos/2Qm47LI0W1c' },
    { name: 'Desi Mendoza', url: 'https://unsplash.com/photos/CuSHBGBdXc0' },
    { name: 'Brian Jimenez', url: 'https://unsplash.com/photos/ch-mPpglKjQ' },
];

const IMAGE_RULES = [
    'Photos keep their own color: never tinted, never under a gradient, never with text laid over them.',
    'Lists crop to 3:2, the article view to 16:9; corners match the controls at 10px.',
    'Alt text comes from the feed; when the feed has none, the image is decorative.',
    'No image? The item shows its category field with the source initial, never a gray box.',
];

export function ImagerySection() {
    const design = getCategory('design');

    return (
        <DocSection
            id="imagery"
            title="Imagery"
            intro="Frontpage's pictures come from the feeds, so the system never styles them away. They sit as they are, cut cleanly, next to flat fields and ink type. The moodboard sets the tone: everyday, crisp, calm, and about anything a reader follows."
        >
            <Specimen title="Moodboard" stage="none">
                <div className="grid auto-rows-[9rem] grid-cols-2 gap-3 [grid-auto-flow:dense] md:auto-rows-[12rem] md:grid-cols-4">
                    {MOOD_PHOTOS.slice(0, 2).map((photo) => (
                        <MoodTile key={photo.alt} photo={photo} />
                    ))}
                    <div className="flex flex-col justify-between rounded-control bg-field-lemon p-5 text-on-field">
                        <span className="font-display text-title leading-[1.05] font-bold md:text-headline tracking-[-0.03em]">Read at your own pace.</span>
                        <span className="text-meta font-semibold">Frontpage · Lemon</span>
                    </div>
                    {MOOD_PHOTOS.slice(2).map((photo) => (
                        <MoodTile key={photo.alt} photo={photo} />
                    ))}
                </div>
                <p className="mt-4 text-meta text-muted">
                    Moodboard photos from Unsplash by{' '}
                    {CREDITS.map((credit, index) => (
                        <span key={credit.name}>
                            <a href={credit.url} className="underline hover:text-ink">
                                {credit.name}
                            </a>
                            {index < CREDITS.length - 2 ? ', ' : index === CREDITS.length - 2 ? ' and ' : '.'}
                        </span>
                    ))}
                </p>
            </Specimen>

            <div className="grid gap-14 xl:grid-cols-2 xl:gap-x-10">
                <Specimen title="Rules">
                    <ul className="list-disc space-y-2 pl-5 text-ui text-ink-2 marker:text-ink">
                        {IMAGE_RULES.map((rule) => (
                            <li key={rule}>{rule}</li>
                        ))}
                    </ul>
                </Specimen>

                <Specimen title="In the feed" stage="frame" description="A 3:2 thumbnail at the row's end, and the fallback when a feed sends no image.">
                    <ul className="rule-t">
                        <li className="flex items-center gap-4 border-b border-rule-soft py-4">
                            <div className="min-w-0 flex-1">
                                <p className="type-title font-semibold">Designing for one-handed reading</p>
                                <p className="mt-1 text-meta text-ink-2">Figma Blog · 4h · sample</p>
                            </div>
                            <ItemThumbnail image={desk} source="Figma Blog" field={design.field} />
                        </li>
                        <li className="flex items-center gap-4 border-b border-rule-soft py-4">
                            <div className="min-w-0 flex-1">
                                <p className="type-title font-semibold">Progressive disclosure, revisited</p>
                                <p className="mt-1 text-meta text-ink-2">Nielsen Norman Group · yesterday · no image</p>
                            </div>
                            <ItemThumbnail source="Nielsen Norman Group" field={design.field} />
                        </li>
                    </ul>
                </Specimen>
            </div>
        </DocSection>
    );
}

function MoodTile({ photo }: { photo: MoodPhoto }) {
    return (
        <div className={`relative overflow-hidden rounded-control ${photo.className}`}>
            <Image src={photo.image} alt={photo.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" placeholder="blur" />
        </div>
    );
}
