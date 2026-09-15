"""The limiter is plain Python and testable without a server.

Time is injected rather than slept: a test that sleeps is a test nobody runs.
"""
import pytest

from forneus_core.api.ratelimit import RateLimiter


def test_burst_is_allowed_then_refused():
    limiter = RateLimiter(rate=0.5, burst=3)
    assert [limiter.allow('a', now=0) for _ in range(3)] == [True, True, True]
    assert limiter.allow('a', now=0) is False


def test_tokens_refill_over_time():
    limiter = RateLimiter(rate=0.5, burst=2)
    assert limiter.allow('a', now=0) and limiter.allow('a', now=0)
    assert limiter.allow('a', now=0) is False
    assert limiter.allow('a', now=1) is False      # 0.5 tokens: not yet one
    assert limiter.allow('a', now=2) is True       # 1.0 token


def test_refill_never_exceeds_burst():
    limiter = RateLimiter(rate=1, burst=2)
    assert limiter.allow('a', now=0)
    assert [limiter.allow('a', now=10_000) for _ in range(3)] == [True, True, False]


def test_clients_are_independent():
    limiter = RateLimiter(rate=0.5, burst=1)
    assert limiter.allow('a', now=0) is True
    assert limiter.allow('a', now=0) is False
    assert limiter.allow('b', now=0) is True


def test_retry_after_is_a_usable_number():
    limiter = RateLimiter(rate=0.5, burst=1)
    limiter.allow('a', now=0)
    assert limiter.retry_after('a', now=0) == 2     # 1 token at 0.5/s
    assert limiter.retry_after('unseen', now=0) == 0


def test_memory_is_bounded_against_spoofed_clients():
    """A flood of distinct addresses must not grow without limit."""
    limiter = RateLimiter(rate=0.5, burst=5, max_clients=100)
    for index in range(1000):
        limiter.allow(f'client-{index}', now=index)
    assert len(limiter._buckets) <= 100


def test_a_refused_client_is_never_silently_let_through():
    limiter = RateLimiter(rate=0.1, burst=1)
    limiter.allow('a', now=0)
    for now in range(1, 10):
        assert limiter.allow('a', now=now) is False
