import type { MessageKey } from "./pt-BR";

// Catálogo incremental: chaves ausentes usam pt-BR até a tradução ser concluída.
export const enUS: Partial<Record<MessageKey, string>> = {
    "common.loading": "Loading…",
    "common.retry": "Try again",
    "auth.login": "Sign in",
    "sidebar.leagues": "Leagues",
    "sidebar.profile": "Profile",
};
