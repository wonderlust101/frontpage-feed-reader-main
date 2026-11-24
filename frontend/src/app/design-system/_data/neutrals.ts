// The neutral and status tokens as documented on the design system page. The values live in src/styles/tokens.css;
// these hex strings only label the swatches, so keep them in step when a token changes.

export const NEUTRALS = [
    { token: 'ground', light: '#F4F2EC', dark: '#1C1C1A', job: 'Page ground and the reading column' },
    { token: 'ground-2', light: '#E9E7E0', dark: '#2A2A27', job: 'Panels: AI summaries, code, row hover' },
    { token: 'ink', light: '#0A0A0A', dark: '#F3F3EE', job: 'Everything a reader must read' },
    { token: 'ink-2', light: '#3D3D3A', dark: '#C9C9C1', job: 'Intros and supporting text; ink in high contrast' },
    { token: 'meta', light: '#64645F', dark: '#9B9B93', job: 'Times, counts and source names only; ink-2 in high contrast' },
    { token: 'rail', light: '#D9D7CE', dark: '#0D0D0C', job: "The app shell's rail: logo, views and account" },
    { token: 'panel', light: '#E9E7E0', dark: '#171716', job: "The app shell's category panel and drawer" },
    { token: 'workspace', light: '#FAFAF7', dark: '#232220', job: "The app shell's workspace, its toolbar and its menus" },
    { token: 'rule-soft', light: '#DCDAD2', dark: '#42423D', job: 'Row rules between items; ink in high contrast' },
    { token: 'warning', light: '#8A5300', dark: '#F2B13B', job: 'Stale feeds and cautions, always with a label' },
    { token: 'error', light: '#B42318', dark: '#FF7A70', job: 'Failing feeds and form errors, always with an icon' },
];
