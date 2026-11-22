// The neutral and status tokens as documented on the design system page. The values live in src/styles/tokens.css;
// these hex strings only label the swatches, so keep them in step when a token changes.

export const NEUTRALS = [
    { token: 'ground', light: '#F9F9F7', dark: '#1C1C1A', job: 'Page ground and the reading column' },
    { token: 'ground-2', light: '#EFEFEB', dark: '#2A2A27', job: 'Panels: AI summaries, code, row hover' },
    { token: 'ink', light: '#0A0A0A', dark: '#F3F3EE', job: 'Everything a reader must read' },
    { token: 'ink-2', light: '#3D3D3A', dark: '#C9C9C1', job: 'Intros and supporting text; ink in high contrast' },
    { token: 'meta', light: '#64645F', dark: '#9B9B93', job: 'Times, counts and source names only; ink-2 in high contrast' },
    { token: 'rule-soft', light: '#E2E2DC', dark: '#42423D', job: 'Row rules between items; ink in high contrast' },
    { token: 'warning', light: '#8A5300', dark: '#F2B13B', job: 'Stale feeds and cautions, always with a label' },
    { token: 'error', light: '#B42318', dark: '#FF7A70', job: 'Failing feeds and form errors, always with an icon' },
];
