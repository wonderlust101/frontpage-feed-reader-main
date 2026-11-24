// A 3:2 list thumbnail for a feed item. With no image it shows the category field with the source initial, never a gray box.

import Image, { type StaticImageData } from 'next/image';

type ItemThumbnailProps = {
    image?: StaticImageData | string | null;
    source: string;
    field: { color: string; onColor: string };
};

// Renders the image (decorative: the row's title already says what it is) or, when `image` is missing, the fallback tile.
export function ItemThumbnail({ image, source, field }: ItemThumbnailProps) {
    if (image)
        return <Image src={image} alt="" width={144} height={96} sizes="6rem" className="aspect-[3/2] w-24 flex-none rounded-control object-cover" />;

    return (
        <span
            aria-hidden="true"
            className="fill-edge grid aspect-[3/2] w-24 flex-none place-items-center rounded-control font-display text-headline font-bold"
            style={{ background: field.color, color: field.onColor }}
        >
            {source.charAt(0).toUpperCase()}
        </span>
    );
}
