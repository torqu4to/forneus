"""Tool packages. Importing this registers every available tool."""
from . import amigatos  # noqa: F401  (import for the registration side effect)

__all__ = ['amigatos']

# Announced on the site, not built yet. Registering them here keeps the
# "coming soon" cards on the landing page driven by the registry rather
# than hardcoded in the frontend.
from ..registry import planned  # noqa: E402

planned('fantasmas', 'tool.fantasmas.title', 'tool.fantasmas.description')
planned('florais', 'tool.florais.title', 'tool.florais.description')
