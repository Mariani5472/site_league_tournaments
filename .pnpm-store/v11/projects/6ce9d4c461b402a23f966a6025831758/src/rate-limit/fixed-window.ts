export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterMs: number };

type Entry = { count: number; resetAt: number };

export class FixedWindowRateLimiter {
    private readonly entries = new Map<string, Entry>();

    constructor(
        private readonly limit: number,
        private readonly windowMs: number,
        private readonly now: () => number = Date.now
    ) {}

    consume(key: string): RateLimitDecision {
        const currentTime = this.now();
        const existing = this.entries.get(key);
        const entry = !existing || existing.resetAt <= currentTime
            ? { count: 0, resetAt: currentTime + this.windowMs }
            : existing;
        entry.count += 1;
        this.entries.set(key, entry);

        if (this.entries.size > 10_000) {
            this.prune(currentTime);
            while (this.entries.size > 10_000) {
                const oldestKey = this.entries.keys().next().value;
                if (oldestKey === undefined) break;
                this.entries.delete(oldestKey);
            }
        }
        return entry.count <= this.limit
            ? { allowed: true }
            : { allowed: false, retryAfterMs: Math.max(1, entry.resetAt - currentTime) };
    }

    private prune(currentTime: number) {
        for (const [key, entry] of this.entries) {
            if (entry.resetAt <= currentTime) this.entries.delete(key);
        }
    }
}

export function positiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
