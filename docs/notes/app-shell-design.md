# App shell: design brief

The frame around guest mode and the signed-in home: header, sidebar and the sheet the pages sit on. The pages inside it (feed list, article view, saved, digest, reading stats) are out of scope and designed later. How it is built is in `app-shell-architecture.md`.

Chosen on 2026-11-23 through the Impeccable decision page, over six rounds: App header → Ink frame → Ink top, tinted side → Lemon stripe → Outlined marker → **Field-coloured marker**. The chosen sketch is `frontend/.impeccable/mocks/decision/shell-outlined-field.html` (1440 × 900, guest view, Frontend selected).

## 1. Job and audience

- **Who arrives:** daily readers (signed in, at `/user`) and reviewers trying the product as guests (at `/guest`). Reviewers judge the product on the first screen without signing up, so the guest view is the shop window.
- **Mode:** Operate. Readers come back once or twice a day, scan what's new, switch categories and read. Knowing where everything is comes before any expression.
- **What the shell does:** says where you are (view or category), what's waiting (unread counts), and gives the tools that work on every page: search, add a feed, refresh, layout, reading controls, account (or the guest nudge).

## 2. Outcome and proof

- A reader can see where they are and switch views or categories with one look and one click, on any page.
- The sections are separated by tone, not by more lines. This was the main note from the rounds: the all-paper base didn't separate the header, sidebar and content clearly enough.
- Real content only: views and categories come from the reader's data (or the curated sample feeds for guests). Counts are real or absent, never made up.

## 3. Selected direction

**Three neutral steps, one brand line, colour marks the place.**

- **Ink header:** a fixed near-black bar across the window (72px), with a **4px Lemon stripe** along its bottom edge. Logo lockup on the left (the Lemon mark with an on-ink edge), then search, "Updated 4 min ago", refresh, reading controls (Aa), the account control (or "Create account" for guests) and **Add feed** as the one primary action, drawn inverted (ground fill, ink text) on the ink.
- **Ground-2 sidebar** (256px): the views (All items, Saved, Weekly digest, Reading) with counts, then "Categories" opened by the 1.5px ink rule, each category with its field dot and unread count, then "Manage feeds". Its foot holds the guest card ("Reading as a guest", one line on what an account keeps, Create account) or, for signed-in readers, the feed health summary ("19 feeds · 2 stale").
- **Paper sheet:** the content area is a ground sheet inset 12px from the header and the right edge, with 14px top corners and a 1px edge, like a page on a tray. The page's title sits at the top of the sheet at display size, with its count and the layout switch (List · Cards · Split) on the right.
- **Signature: the field-coloured marker.** The current entry is a bold paper row that runs to the sheet, with a small bar on its left edge: an ink outline (1.5px) around a core in the entry's own field. All items, Saved, Weekly digest and Reading use Lemon; a category uses its field (Coral for Frontend); a No color category uses the stone field. The ink outline makes the marker readable on any ground (the reason this beat the plain Lemon marker, which was about 1.3:1 against paper); the field says which world you're in, so the marker, the category tags in the list and the title all agree.

Why this one: it keeps the familiar arrangement (header, sidebar, content) that a feed reader needs, separates the three areas by tone in a way that holds in both themes, and puts the brand in two precise places (the stripe and the marker) instead of in big fields.

## 4. Scope and boundaries

- **In scope:** the header, the sidebar (expanded and collapsed), the sheet frame and its title row (title, count, layout switch), the phone and tablet versions, the guest nudge, the account menu, the reading-controls popover, and every state below.
- **Untouched:** what goes inside the sheet. The shell wraps today's `/guest` and `/user` content as it is, until those pages are designed. The auth pages and the landing page stay outside the shell.
- **Anti-goals:** no stickers anywhere in the shell (the Sticker Rule), no shadows or gradients, no colour as the only sign of state, no badge counts over 99 ("99+"), no dead controls (a control whose page doesn't exist yet isn't shown in the live app; see the architecture plan).

## 5. States and ranges

| What               | Range / state                                                 | Behaviour                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Categories         | 0 (new reader), 5 (guest sample), 20+ (power reader)          | 0: "No categories yet" with Add feed. 20+: the sidebar scrolls on its own; header and sheet stay put.                                                                                                                            |
| Category names     | short to long ("Backend & DevOps", "World news and politics") | One line, ellipsis, full name as the link's accessible name.                                                                                                                                                                     |
| Unread counts      | none, 1–99, 100+                                              | None: nothing shown. 100+: "99+". Tabular figures.                                                                                                                                                                               |
| Guest vs signed in |                                                               | Guest: "Create account" in the header and the guest card in the sidebar foot. Signed in: account menu (name, email, Verify email when unverified, Change password, Sign out) and the health summary.                             |
| Loading            | first paint of a signed-in page                               | Header and views paint at once. Categories show as rule-soft bars in their row shape until the data arrives.                                                                                                                     |
| API down           | categories can't load                                         | Views stay usable; the categories group shows an inline notice ("Couldn't load your categories" with Try again).                                                                                                                 |
| Refresh            | idle, refreshing, new items, failed                           | Idle: "Updated 4 min ago". Refreshing: the icon spins (no spin under reduced motion) and the text says "Refreshing…". New items: "5 new items" with a Show action. Failed: the text turns into the warning line form with Retry. |
| Collapsed sidebar  | desktop, reader's choice                                      | A 72px rail: view icons, category field dots, the same outlined marker on the current entry; the names appear as tooltips and in the accessible name. Remembered per device.                                                     |

## 6. Interaction and layout

- **Wide (lg, 1024px, and up):** header, sidebar and sheet as above. From 2xl the sheet's content keeps its own max width; the sidebar stays 256px.
- **Below lg (tablet and phone): settled, a drawer.** The header keeps the ink bar and the Lemon stripe and holds a menu button, the logo and the actions (Aa and account, or Create account from `sm` up). The sidebar becomes a drawer from the left, the same component and order, ground-2, with focus kept inside it while open and closed by Escape, the backdrop or a choice. The sheet goes full width with no tray margins.
- **Keyboard:** a skip link to the sheet ("Skip to content"); `/` focuses search; sidebar links are plain links in tab order, the current one with `aria-current="page"`. The shortcuts in core requirement 18 (`g a`, `g s`…) come with the feed pages.
- **Focus on ink:** the two-tone focus ring (2px ink outline over a 3px ground halo) shows its halo on the dark bar, so no new focus style is needed.
- **Motion:** the drawer slides in 200ms ease-out; the collapse animates the sidebar width over 200ms; neither runs under reduced motion.

## 7. Constraints and open decisions

**Design system changes this brings (to add to DESIGN.md, tokens.css and `/design-system` together):**

- A fixed near-black for the header (`--color-shell`, `#0a0a0a` in both themes, like the stickers' fixed ink) with `--color-on-shell` (`#f3f3ee`) and a supporting text colour (about `#b9b9b1`, 10:1 on the bar). It must not flip with the theme, or the bar turns light in dark mode.
- Dark controls on the bar: icon buttons on `#2a2a27` with the dark-mode control edge (`#8a8a83`); the search field stays an opaque ground field.
- The marker as a named component rule ("the current entry is marked by an ink-outlined bar in its field").
- DESIGN.md's "App shell" paragraph is replaced with this structure.

**Dark mode and high contrast:** the header stays near-black; the sidebar is ground-2 (`#2a2a27`) and the sheet ground (`#1c1c1a`), so in dark mode the sheet sits a step darker than the sidebar and its 1px edge does the separating. High contrast turns the sheet edge and rules to ink at 2px; the marker's outline is already ink.

**Open decisions:**

1. ~~Phones and tablets~~: settled on the drawer (it reuses one sidebar and keeps the category colours visible).
2. Where the reading controls live for signed-in readers: only the Aa popover, or also a settings page (the user-page note asks where account settings end up).
3. How signed-in readers' category colours are stored: guests keep them in localStorage today, and the `categories` table has no colour column yet.
