"""Message catalogs and key resolution.

Rule for the whole codebase: no user-facing prose in Python. Solvers, the
API and the exporters emit `Notice` keys; this module turns a key plus its
parameters into text in a supported locale. That is what makes pt-BR and
en-US equal citizens instead of a translation bolted on later.
"""
from functools import lru_cache
import json
from pathlib import Path

LOCALES_ROOT = Path(__file__).resolve().parent / 'locales'
DEFAULT_LOCALE = 'pt-BR'
SUPPORTED_LOCALES = ('pt-BR', 'en-US')


@lru_cache(maxsize=None)
def catalog(locale):
    """Message catalog for a locale, falling back to the default."""
    if locale not in SUPPORTED_LOCALES:
        locale = DEFAULT_LOCALE
    path = LOCALES_ROOT / f'{locale}.json'
    return json.loads(path.read_text(encoding='utf-8'))


def negotiate(accept_language):
    """Pick a supported locale from an Accept-Language header."""
    if not accept_language:
        return DEFAULT_LOCALE
    for part in accept_language.split(','):
        tag = part.split(';')[0].strip()
        if not tag:
            continue
        for locale in SUPPORTED_LOCALES:
            if tag.lower() == locale.lower():
                return locale
        for locale in SUPPORTED_LOCALES:
            if tag.split('-')[0].lower() == locale.split('-')[0].lower():
                return locale
    return DEFAULT_LOCALE


def translate(key, params=None, locale=DEFAULT_LOCALE):
    """Resolve a key. An unknown key returns the key itself, never a crash."""
    template = catalog(locale).get(key)
    if template is None:
        template = catalog(DEFAULT_LOCALE).get(key, key)
    try:
        return template.format(**(params or {}))
    except (KeyError, IndexError):
        return template


def translate_notice(notice, locale=DEFAULT_LOCALE):
    return translate(notice.key, notice.params, locale)


def missing_keys(locale):
    """Keys present in the default catalog but absent here - used by CI."""
    return sorted(set(catalog(DEFAULT_LOCALE)) - set(catalog(locale)))
