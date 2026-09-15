"""A small in-process token bucket.

Why this and not a real rate limiter: the site serves a small community from
a single process, so an in-memory bucket is the whole requirement. Its limits
are worth stating plainly rather than discovering later:

  * it resets when the process restarts;
  * it does NOT work across replicas — running two instances doubles the
    effective allowance, so scaling out means moving this to shared storage;
  * it keys on a client address, which behind a proxy is whatever the proxy
    reports.

Cost is charged per request, not per unit of work, because the solver's worst
case is bounded (~1 s) by the game data itself — see `solve_worst_case` in the
tests. If that ever stops being true, charge by budget instead.
"""
import threading
import time
from dataclasses import dataclass, field


@dataclass
class Bucket:
    tokens: float
    updated: float


@dataclass
class RateLimiter:
    """`rate` tokens per second, up to `burst` saved up."""
    rate: float = 0.5          # one request every 2 s sustained
    burst: float = 10.0        # ...but a burst of 10 is fine
    max_clients: int = 10_000  # bound memory against spoofed addresses
    _buckets: dict = field(default_factory=dict)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def allow(self, client: str, now: float = None) -> bool:
        now = time.monotonic() if now is None else now
        with self._lock:
            bucket = self._buckets.get(client)
            if bucket is None:
                if len(self._buckets) >= self.max_clients:
                    self._evict(now)
                bucket = self._buckets[client] = Bucket(self.burst, now)
            else:
                elapsed = max(0.0, now - bucket.updated)
                bucket.tokens = min(self.burst, bucket.tokens + elapsed * self.rate)
                bucket.updated = now

            if bucket.tokens < 1.0:
                return False
            bucket.tokens -= 1.0
            return True

    def retry_after(self, client: str, now: float = None) -> int:
        """Seconds until this client can send one more request."""
        now = time.monotonic() if now is None else now
        with self._lock:
            bucket = self._buckets.get(client)
            if bucket is None or bucket.tokens >= 1.0:
                return 0
            return max(1, int((1.0 - bucket.tokens) / self.rate + 0.999))

    def _evict(self, now: float):
        """Drop whoever is fullest — a full bucket is a client that is done."""
        for client in sorted(self._buckets,
                             key=lambda key: self._buckets[key].tokens,
                             reverse=True)[:max(1, self.max_clients // 10)]:
            del self._buckets[client]
