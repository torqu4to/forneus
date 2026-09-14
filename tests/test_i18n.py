"""pt-BR and en-US are equal citizens; neither may drift ahead of the other."""
import json
import re

import pytest

from forneus_core import i18n
from forneus_core.registry import all_specs

SOURCE_ROOT = None


@pytest.mark.parametrize('locale', i18n.SUPPORTED_LOCALES)
def test_every_catalog_has_the_same_keys(locale):
    assert i18n.missing_keys(locale) == []
    assert set(i18n.catalog(locale)) == set(i18n.catalog(i18n.DEFAULT_LOCALE))


@pytest.mark.parametrize('locale', i18n.SUPPORTED_LOCALES)
def test_placeholders_match_across_locales(locale):
    """A translation that drops {max} would render a misleading message."""
    default = i18n.catalog(i18n.DEFAULT_LOCALE)
    translated = i18n.catalog(locale)
    for key, template in default.items():
        assert (set(re.findall(r'{(\w+)}', template))
                == set(re.findall(r'{(\w+)}', translated[key]))), key


@pytest.mark.parametrize('accept,expected', [
    ('en-US,en;q=0.9', 'en-US'),
    ('pt-BR,pt;q=0.9,en;q=0.8', 'pt-BR'),
    ('en', 'en-US'),
    ('fr-FR', 'pt-BR'),
    ('', 'pt-BR'),
    (None, 'pt-BR'),
])
def test_accept_language_negotiation(accept, expected):
    assert i18n.negotiate(accept) == expected


def test_unknown_key_degrades_to_the_key_instead_of_crashing():
    assert i18n.translate('no.such.key') == 'no.such.key'


def test_registered_tools_all_have_translations():
    for spec in all_specs():
        for locale in i18n.SUPPORTED_LOCALES:
            for key in (spec.title_key, spec.description_key):
                assert i18n.translate(key, locale=locale) != key, (key, locale)
