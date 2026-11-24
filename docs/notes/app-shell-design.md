# App shell: design brief

The frame around guest mode and the signed-in home: a rail, a category panel and the workspace the pages sit in. The pages inside it (feed list, article view, saved, digest, reading stats) are out of scope and designed later. How it is built is in `app-shell-architecture.md`.

Chosen on 2026-11-23 through the Impeccable decision page. A first version (an ink header with a Lemon stripe) was built, used and replaced: it felt heavy, worst in dark mode. The sidebar-first rounds went Rail and panel → Colour thread → Inset sheet → Floating sheet → no inset → Two-step sidebar → **Pronounced steps**, then the **Command palette** for search. The chosen sketches are in `frontend/.impeccable/mocks/decision/` (`ts-pronounced.html`, `search-palette.html`; git-ignored).

## 1. Job and audience

- **Who arrives:** daily readers (signed in, at `/user`) and reviewers trying the product as guests (at `/guest`), who judge it on the first screen without signing up.
- **Mode:** Operate. Readers come back once or twice a day, scan what's new, switch categories and read. A safe, familiar SaaS structure, with the brand in precise details; light and dark, desktop and mobile get equal weight.
- **Three areas, nothing duplicated:** the sidebar navigates, the workspace toolbar holds search and says where you are, and the account menu at the sidebar's foot holds personal account management.

## 2. Selected direction

**Three neutral steps toward the content, colour marks the place.**

- **Rail (64px, `--color-rail`):** the Lemon logo tile linking home, the views as icon links with tooltips (the current one a Lemon square with an ink edge; a guest's account-only views, Saved, Weekly digest and Reading, show muted with a lock and lead to sign-up), the toggle for the category panel, and the account at the foot.
- **Category panel (256px, `--color-panel`):** "Categories" (a Bricolage `h2`, clearly bigger than the rows), an "All items" row that returns home, always Lemon (Frontpage's own field: it can't be recoloured, though a category may still choose Lemon), then each category with its field dot, unread count and quick actions. One place is current: the category inside one, or "All items" on the home page, marked by the panel's row (the rail's Lemon square for it shows only while the panel is collapsed). "No color" stays a finished field: in light mode its tint, bar and title underline are drawn darker, since a near-neutral stone would otherwise vanish. Guests see the five sample categories, each with its own page, and may recolour them on this device; the colours are painted from CSS properties an early script sets, so a recoloured category never flashes its preset. It collapses away, leaving the rail (the toggle in the rail, or the `[` key), remembered per device with no flash on load.
- **Workspace (`--color-workspace`):** a hairline toolbar above the page. Search leads at the left at a fixed width (an icon button when the toolbar itself is narrow), so it sits in the same place on every page; the location tag ("Viewing:" for screen readers, then the category or view) follows after a hairline, so a long name only moves the tag, and a name too long for the toolbar ends in an ellipsis.
- **Tones:** light rail `#d9d7ce`, panel `#e9e7e0`, workspace `#fafaf7`; dark rail `#0a0a09`, panel `#1a1a18`, workspace `#232220`. Each step is lighter toward what you read, in both themes.
- **Colour thread:** the selected category's field shows three times: its row in the panel is tinted with the field and carries a 3px field bar (with bold text and `aria-current`); the toolbar's location tag is filled with it; and the page title takes a field underline (pages pick this up as they are designed). Views use Lemon.

## 3. Search: the command palette

- Ctrl/Cmd + K from anywhere, or the toolbar's "Search and jump" button, opens a large centred palette (a native modal `<dialog>`, 52rem wide): the query field (the last query selected on reopening, so typing replaces it), every view and category listed before you type (so arrow keys and Enter work at once), an "in [category]" select inside the query row once there is a query (so results never move) (starting on All, so nothing is hidden; the current category's sources rank first), and results grouped as Go to (views and categories), Articles and Sources, matches marked in solid Lemon, a guest's account-only views marked with a lock and "with an account", with keycap hints (↑ ↓ move, ↵ open, Esc close). On touch, a Cancel button replaces the keycaps.
- **Data:** "Go to" always works; guests' sources come from the curated catalogue. Article search waits for the items, and the palette says so ("Article search arrives with the feeds"). `/design-system` shows articles too, with sample data.
- Below md the button is a search icon; the palette sits near the top of the screen.

## 4. Reader settings: deferred

The Aa popover (text size, line height, reading width, typeface, theme, contrast, density) has left the shell; its new home in the app is designed later, somewhere more accessible than a toolbar popover. The preferences still apply from the early script, and `/design-system` keeps the control in its header.

## 5. Account

- On the rail, the account and guest buttons have tooltips ("Guest · Create account or sign in", the reader's name), like the views.
- **Readers:** an avatar button (initials on Lemon) at the rail's foot opens the account menu: name and email, Verify email (until verified), Change password, Sign out.
- **Guests:** a "Guest" button in the same place opens what an account keeps, Create account and Sign in. A gentle nudge; nothing is gated.

## 6. Category quick actions; adding feeds and managing deferred

- **Quick actions** on each category row: a "⋯" button that, with a mouse, takes the count's place while the row is hovered or focused (on touch it is always there). It is 44px on touch. It opens a narrower panel beside the row (above it near the bottom of the screen, never over the panel; the swatches sit five and four): rename (with a Rename button), colour from the brand field swatches, and, set apart, Delete category ("feeds stay": they move to Uncategorized). After a rename, focus stays in the field; after a delete, it moves to the neighbouring row; a toast offers Undo, also on Ctrl/Cmd + Z.
- **Guests** get the colour swatches only, with "Saved on this device." under them; the new colour shows in the row, the toolbar tag and the page title. What only an account adds is listed as it would be for a reader (Saved, Weekly digest, Reading stats), each with a lock; selecting one opens a preview of the feature (what it does, "Comes with an account", and Create account) instead of leaving the page.** Add feed will live in the search palette (paste a site or feed address and it offers to add it) and in empty states; managing categories and feeds (order, moving and removing feeds, OPML) will live on a Settings page with the reader settings.
- **Readers** get the quick actions when the categories endpoints exist; until then they work on `/design-system` with sample data.

## 7. Below lg

The rail and panel move into a drawer (native modal `<dialog>`, from the left, panel tone): the logo, the views with names, the categories, and the account row at the foot (avatar, name and email, or Guest). The compact toolbar keeps the menu button, a search button and the location tag, in that order. The drawer's views leave out All items, which leads the categories, and its close button shares the logo's row. The drawer closes on Escape, the backdrop or any link.

## 8. Feedback and motion

Small and quick, all off under reduced motion: the palette and menus scale in (120–140ms); a newly current row's field bar grows into place; the panel's width animates as it collapses; tool buttons fill on hover.

## 9. States and ranges

| What           | Range / state                            | Behaviour                                                                                                                     |
| -------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Categories     | 0 (readers today), 5 (guest sample), 20+ | 0: "Your categories line up here, colors and all, once you add feeds." All counts 0: "All caught up." 20+: the panel scrolls. |
| Category names | short to long, empty, taken              | One line, ellipsis; the full name stays the accessible name. Renaming to nothing or to a taken name (any case) says why.      |
| Unread counts  | none, 1–99, 100+                         | None (or 0): nothing. 100+: "99+". Tabular figures.                                                                           |
| Search         | empty query, results, no match           | "Jump anywhere"; Go to, Articles and Sources; "Nothing matches …" with "Search every category" when a category is chosen.     |
| Account        | loading, signed in, API down, signed out | A skeleton circle; the avatar menu; a "Try again" control (the page shows its own error); nothing (the page redirects).       |
| Sidebar        | expanded, collapsed                      | Remembered per device; `[` toggles it outside text fields.                                                                    |

## 10. Constraints

- **Tokens:** `--color-rail`, `--color-panel`, `--color-workspace` (light and dark), and the reader settings as data attributes on `<html>` (`data-text-size`, `data-leading`, `data-measure`, `data-density`, `data-reading-face`). The old shell tokens and the Lemon stripe are gone.
- **Flat:** menus are panels with a 1.5px control edge, no shadow, like every other layer.
- **High contrast:** edges and rules turn to ink; the tonal steps still separate the areas.
- **Open decisions** are tracked in Jira: the Settings page that will hold the reader settings and category management ([KAN-29](https://sergeiborja.atlassian.net/browse/KAN-29)), and storing signed-in readers' category colours ([KAN-27](https://sergeiborja.atlassian.net/browse/KAN-27)).
