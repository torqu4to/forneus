import { ui, DEFAULT_LOCALE, LOCALES, type Locale, type UIKey } from './ui';

export { LOCALES, DEFAULT_LOCALE, type Locale };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve a key for `locale`, substituting `{placeholders}`.
 *
 * A missing key falls back to the default locale and then to the key itself —
 * a page never renders `undefined`, and the raw key is a visible, greppable
 * signal that a translation is missing.
 */
export function useTranslations(locale: Locale) {
  return function t(key: UIKey, params?: Record<string, string | number>): string {
    const table = ui[locale] as Record<string, string>;
    const fallback = ui[DEFAULT_LOCALE] as Record<string, string>;
    const template = table[key] ?? fallback[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in params ? String(params[name]) : whole,
    );
  };
}

/** Same path, other locale — what the language switch links to. */
export function switchLocalePath(pathname: string, target: Locale): string {
  const rest = pathname.replace(/^\/(pt|en)(?=\/|$)/, '');
  return `/${target}${rest || '/'}`;
}

/** Locale-aware number formatting. Both locales group with a dot or comma. */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'pt' ? 'pt-BR' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}
