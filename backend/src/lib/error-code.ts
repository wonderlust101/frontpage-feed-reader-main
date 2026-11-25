// Node's system errors (and some libraries') carry a string `code`, e.g. ENOTFOUND.
export function hasCode(err: unknown, code: string): boolean {
    return typeof err === 'object' && err !== null && 'code' in err && err.code === code;
}
