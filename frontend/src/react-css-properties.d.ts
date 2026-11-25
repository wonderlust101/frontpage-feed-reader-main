// Lets style objects set CSS custom properties (style={{ '--row-field': color }}) without casting to CSSProperties.

import 'react';

declare module 'react' {
    interface CSSProperties {
        [customProperty: `--${string}`]: string | number | undefined;
    }
}
