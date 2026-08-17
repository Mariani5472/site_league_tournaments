export type CursorPage<T> = { items: T[]; nextCursor: string | null };

export function uniqueItems<T extends { id: string }>(pages: CursorPage<T>[] | undefined) {
    const seen = new Set<string>();
    return (pages ?? [])
        .flatMap(page => page.items)
        .filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
}
