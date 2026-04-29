"""Concurrency simulation: many users play game simultaneously.

Usage:
  python scripts/game_concurrency_sim.py --base http://localhost:8000/api --event-id 1 --users 500
"""

from __future__ import annotations

import argparse
import asyncio
from dataclasses import dataclass

import httpx


@dataclass
class Result:
    ok: int = 0
    failed: int = 0


async def run_user(client: httpx.AsyncClient, event_id: int) -> bool:
    # This script assumes token/captcha bootstrap done externally.
    payload = {
        "event_id": event_id,
        "game_type": "wheel",
        "nonce": "sim-nonce-12345678",
        "timestamp": 0,
        "signed_payload": "invalid",
    }
    resp = await client.post("/game/play", json=payload)
    return resp.status_code in {200, 400, 403, 429}


async def main(base: str, event_id: int, users: int) -> None:
    result = Result()
    async with httpx.AsyncClient(base_url=base, timeout=15) as client:
        tasks = [run_user(client, event_id) for _ in range(users)]
        for ok in await asyncio.gather(*tasks, return_exceptions=True):
            if ok is True:
                result.ok += 1
            else:
                result.failed += 1
    print({"ok": result.ok, "failed": result.failed})


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:8000/api")
    parser.add_argument("--event-id", type=int, required=True)
    parser.add_argument("--users", type=int, default=500)
    args = parser.parse_args()
    asyncio.run(main(args.base, args.event_id, args.users))

