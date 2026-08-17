import { ptBR, type MessageKey } from "./catalogs/pt-BR";
import { pluralCategory } from "./format";

type Params = Record<string, string | number>;

export function t(key: MessageKey, params: Params = {}) {
    return Object.entries(params).reduce<string>(
        (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
        ptBR[key]
    );
}

export function tp(
    value: number,
    keys: { one: MessageKey; other: MessageKey },
    params: Params = {}
) {
    return t(pluralCategory(value) === "one" ? keys.one : keys.other, { ...params, count: value });
}

export {
    defaultLocale,
    formatDate,
    formatDateTime,
    formatList,
    formatNumber,
    formatPercent,
} from "./format";
