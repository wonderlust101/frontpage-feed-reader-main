// Keyboard shortcuts stay out of the way while the reader is typing in a field.
export function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement))
        return false;

    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
