"""Amigatos tool: optimal Fish Jelly allocation across assist-slot catpals."""
from .optimizer import optimize, OptimizationResult, Allocation
from .profiles import optimize_profile
from .tool import SPEC, solve, data_notices

__all__ = ['optimize', 'OptimizationResult', 'Allocation', 'optimize_profile',
           'SPEC', 'solve', 'data_notices']
