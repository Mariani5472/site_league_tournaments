export const defaultLocale = "pt-BR" as const;

export const formatNumber = (value: number) => new Intl.NumberFormat(defaultLocale).format(value);
export const formatPercent = (value: number) =>
    new Intl.NumberFormat(defaultLocale, {
        style: "percent",
        maximumFractionDigits: 0,
    }).format(value);
export const formatDateTime = (value: string | number | Date) =>
    new Intl.DateTimeFormat(defaultLocale, {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
export const formatDate = (value: string | number | Date) =>
    new Intl.DateTimeFormat(defaultLocale, { dateStyle: "long" }).format(new Date(value));
export const formatList = (values: string[]) =>
    new Intl.ListFormat(defaultLocale, {
        style: "long",
        type: "conjunction",
    }).format(values);
export const pluralCategory = (value: number) => new Intl.PluralRules(defaultLocale).select(value);
