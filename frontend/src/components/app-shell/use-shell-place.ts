import { usePathname } from 'next/navigation';
import { shellPlace, type ShellCategory, type ShellPlace, type ShellView } from './nav-entries';

export function useShellPlace(homeHref: string, views: ShellView[], categories: ShellCategory[]): ShellPlace {
    return shellPlace(
        usePathname(),
        homeHref,
        views.map((view) => view.href),
        categories.map((category) => category.href),
    );
}
