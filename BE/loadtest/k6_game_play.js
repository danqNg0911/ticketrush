import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '2m',
};

const BASE = __ENV.BASE_URL || 'http://localhost:8000/api';

export default function () {
  const payload = JSON.stringify({
    event_id: 1,
    game_type: 'wheel',
    nonce: 'k6-nonce-12345678',
    timestamp: 0,
    signed_payload: 'invalid',
  });
  const res = http.post(`${BASE}/game/play`, payload, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${__ENV.TOKEN || ''}` },
  });
  check(res, { 'status handled': (r) => [200, 400, 401, 403, 429].includes(r.status) });
  sleep(1);
}

