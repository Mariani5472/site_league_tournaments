import { ParsedQs } from 'qs';

export function parseStringArray(value: string | ParsedQs | (string | ParsedQs)[] | undefined): string[] | undefined {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    const stringArray = value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
    return stringArray.length > 0 ? stringArray : undefined;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return [value.trim()];
  }

  return undefined;
}