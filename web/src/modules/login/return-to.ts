export function safeReturnTo(value: string | null, fallback = "/main") {
    if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
    try {
        const url = new URL(value, "https://local.invalid");
        return url.origin === "https://local.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
    } catch {
        return fallback;
    }
}
