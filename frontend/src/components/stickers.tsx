// Die-cut decals on brand fields. Pure decoration: hidden from assistive tech and never focusable. Each is tilted
// with a sticker edge, so none can pass for a capsule, tag or button.

import type { CSSProperties } from 'react';
import { ICONS, type IconName } from '@/components/ui/icon';

export type Sticker = {
    shape: 'circle' | 'square' | 'pill';
    field: string;
    icon?: IconName;
    label?: string;
    size: string;
    x: string;
    y: string;
    tilt: number;
    drift: [string, string];
    wideOnly?: boolean;
    narrowOnly?: boolean;
};

type StickersProps = {
    stickers: Sticker[];
    className?: string;
};

// Fills its positioned parent and clips stickers at its edges, like decals run off a page.
export function Stickers({ stickers, className = '' }: StickersProps) {
    return (
        <div aria-hidden="true" className={`stickers ${className}`}>
            {stickers.map((sticker, index) => {
                const Glyph = sticker.icon ? ICONS[sticker.icon] : null;
                const glyph = Glyph && <Glyph strokeWidth={2} />;
                const style = {
                    '--sticker-fill': sticker.field,
                    '--sticker-size': sticker.size,
                    '--sticker-tilt': `${sticker.tilt}deg`,
                    '--sticker-dx': sticker.drift[0],
                    '--sticker-dy': sticker.drift[1],
                    '--sticker-order': index,
                    left: sticker.x,
                    top: sticker.y,
                } as CSSProperties;

                return (
                    <span
                        key={`${sticker.shape}-${index}`}
                        className="sticker"
                        data-shape={sticker.shape}
                        data-wide-only={sticker.wideOnly || undefined}
                        data-narrow-only={sticker.narrowOnly || undefined}
                        style={style}
                    >
                        {sticker.shape === 'pill' ? (
                            <>
                                <span className="sticker-disc">{glyph}</span>
                                {sticker.label}
                            </>
                        ) : (
                            (glyph ?? sticker.label)
                        )}
                    </span>
                );
            })}
        </div>
    );
}
