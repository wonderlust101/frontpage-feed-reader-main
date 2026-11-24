# App shell: design brief

The frame around guest mode and the signed-in home: a rail, a category panel and the workspace the pages sit in. The pages inside it (feed list, article view, saved, digest, reading stats) are out of scope and designed later. How it is built is in `app-shell-architecture.md`.

Chosen on 2026-11-23 through the Impeccable decision page. A first version (an ink header with a Lemon stripe) was built, used and replaced: it felt heavy, worst in dark mode. The sidebar-first rounds went Rail and panel → Colour thread → Inset sheet → Floating sheet → no inset → Two-step sidebar → **Pronounced steps**, then the **Command palette** for search. The chosen sketches are in `frontend/.impeccable/mocks/decision/` (`ts-pronounced.html`, `search-palette.html`; git-ignored).

## 1. Job and audience

- **Who arrives:** daily readers (signed in, at `/user`) and reviewers trying the product as guests (at `/guest`), who judge it on the first screen without signing up.
- **Mode:** Operate. Readers come back once or twice a day, scan what's new, switch categories and read. A safe, familiar SaaS structure, with the brand in precise details; light and dark, desktop and mobile get equal weight.
- **Three areas, nothing duplicated:** the sidebar navigates, the workspace toolbar holds the global utilities (search, reader settings), and the account menu at the sidebar's foot holds personal account management.

## 2. Selected direction

**Three neutral steps toward the content, colour marks the place.**

- **Rail (64px, `--color-rail`):** the Lemon logo tile linking home, the views as icon links with tooltips (the current one a Lemon square with an ink edge; a guest's account-only views, Saved, Weekly digest and Reading, show muted with a lock and lead to sign-up), the toggle for the category panel, and the account at the foot.
- **Category panel (232px, `--color-panel`):** "Categories" (a Bricolage title, clearly bigger than the rows), an "All categories" row (a stack of the category dots) that returns home, then each category with its field dot and unread count. The panel marks the current category, or "All categories" on the home page; the rail marks the current view. Guests see the five sample categories, each with its own page. It collapses away, leaving the rail (the toggle in the rail, or the `[` key), remembered per device with no flash on load.
- **Workspace (`--color-workspace`):** a hairline toolbar above the page, in three columns so the search button stays centred and never moves: the location tag ("Viewing:" and the category or view) on the left, search in the middle, Aa on the right.
- **Tones:** light rail `#d9d7ce`, panel `#e9e7e0`, workspace `#fafaf7`; dark rail `#0d0d0c`, panel `#171716`, workspace `#232220`. Each step is lighter toward what you read, in both themes.
- **Colour thread:** the selected category's field shows three times: its row in the panel is tinted with the field and carries a 3px field bar (with bold text and `aria-current`); the toolbar's location tag is filled with it; and the page title takes a field underline (pages pick this up as they are designed). Views use Lemon.

## 3. Search: the command palette

- Ctrl/Cmd + K from anywhere, or the toolbar's "Search and jump" button, opens a centred palette (a native modal `<dialog>`): the query field, one "Search in" select (starting on All, so nothing is hidden; the current category's sources rank first), and results grouped as Go to (views and categories), Articles and Sources, matches marked in solid Lemon, with keycap hints (↑ ↓ move, ↵ open, Esc close). On touch, a Cancel button replaces the keycaps.
- **Data:** "Go to" always works; guests' sources come from the curated catalogue. Article search waits for the items, and the palette says so ("Article search arrives with the feeds"). `/design-system` shows articles too, with sample data.
- Below md the button is a search icon; the palette sits near the top of the screen.

## 4. Reader settings: Aa

- The Aa button at the toolbar's right opens a light popover: a sample line that reflows as you change things, text size (17 / 19 / 21 / 23px, with smaller and larger buttons), line height (Tight, Normal, Loose), reading width (Narrow, Standard, Wide), density (Compact, Comfortable, Spacious), typeface (Onest, Atkinson, Lexend) under "Reading"; theme, contrast and density sit in a collapsed "Display" section; "Reset to defaults" at the foot.
- Every change applies at once and is saved; an early script copies the choices onto `<html>` before the first paint. The same popover replaces the old reading-controls bar on `/design-system`, so there is one settings UI across the site.

## 5. Account

- **Readers:** an avatar button (initials on Lemon) at the rail's foot opens the account menu: name and email, Verify email (until verified), Change password, Sign out.
- **Guests:** a "Guest" button in the same place opens what an account keeps, Create account and Sign in. A gentle nudge; nothing is gated.

## 6. Below lg

The rail and panel move into a drawer (native modal `<dialog>`, from the left, panel tone): the logo, the views with names, the categories, and the account row at the foot (avatar, name and email, or Guest). The compact toolbar keeps the menu button, the location tag, a search button and Aa. The drawer closes on Escape, the backdrop or any link.

## 7. Feedback and motion

Small and quick, all off under reduced motion: the palette and menus scale in (120–140ms); a newly current row's field bar grows into place; the panel's width animates as it collapses; the Aa sample line reflows smoothly; tool buttons fill on hover.

## 8. States and ranges

| What           | Range / state                            | Behaviour                                                                                                                     |
| -------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Categories     | 0 (readers today), 5 (guest sample), 20+ | 0: "Your categories line up here, colors and all, once you add feeds." All counts 0: "All caught up." 20+: the panel scrolls. |
| Category names | short to long                            | One line, ellipsis; the full name stays the accessible name.                                                                  |
| Unread counts  | none, 1–99, 100+                         | None (or 0): nothing. 100+: "99+". Tabular figures.                                                                           |
| Search         | empty query, results, no match           | "Jump anywhere"; Go to, Articles and Sources; "Nothing matches …" with "Search every category" when a category is chosen.     |
| Account        | loading, signed in, API down, signed out | A skeleton circle; the avatar menu; a "Try again" control (the page shows its own error); nothing (the page redirects).       |
| Sidebar        | expanded, collapsed                      | Remembered per device; `[` toggles it outside text fields.                                                                    |

## 9. Constraints

- **Tokens:** `--color-rail`, `--color-panel`, `--color-workspace` (light and dark), and the reader settings as data attributes on `<html>` (`data-text-size`, `data-leading`, `data-measure`, `data-density`, `data-reading-face`). The old shell tokens and the Lemon stripe are gone.
- **Flat:** menus are panels with a 1.5px control edge, no shadow, like every other layer.
- **High contrast:** edges and rules turn to ink; the tonal steps still separate the areas.
- **Open decisions:** where reader settings live beyond Aa (a settings page?); how signed-in readers' category colours are stored (the `categories` table has no colour column yet).
