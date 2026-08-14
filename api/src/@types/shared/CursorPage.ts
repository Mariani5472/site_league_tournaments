export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;
export type CursorParams = { cursor?: string; limit: number };
export type CursorPage<T> = { items: T[]; nextCursor: string | null };
export function toCursorPage<T extends { id: string }>(rows: T[], limit: number): CursorPage<T> {
    const items = rows.length > limit ? rows.slice(0, limit) : rows;
    return { items, nextCursor: rows.length > limit ? items.at(-1)!.id : null };
}
