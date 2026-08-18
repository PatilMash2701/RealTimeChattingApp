# Redis Caching Implementation Plan

## Goal
Use Redis to improve read performance for the application by caching read-heavy, relatively stable data while keeping invalidation correct and simple.

---

## 1) Cache Targets (what to cache first)
- `user:{id}` — user profile (`GET /api/v1/user/me`, `GET /api/v1/user/:id`)
- `users:list` — results for user list / search used in sidebars
- `chat:summary:{userId}` — per-user recent chat summaries / sidebar list
- static/config values — rarely changing values loaded often

Notes: avoid caching highly dynamic chat message streams; prefer caching chat summaries, not raw message streams.

---

## 2) Cache Module (single reusable helper)
Create `backend/{user,chat}/src/config/cache.ts` (start in `backend/user`) with API:
- `connectRedis()` — establish a single client
- `getCache(key)` — return parsed JSON or null
- `setCache(key, value, ttlSeconds)` — stringify and set TTL
- `delCache(key)` — delete one key
- `invalidatePattern(pattern)` — (optional) delete keys by pattern

Implementation details:
- Use the existing `redis` client already in `backend/user/src/index.ts` (reuse `createClient`).
- Use JSON serialization for values.
- Keep a short default TTL for most keys (60–300s) and longer TTL for stable data.

Example API (pseudo):
```ts
export async function getCache(key:string){
	const v = await redisClient.get(key);
	return v ? JSON.parse(v) : null;
}

export async function setCache(key:string, value:any, ttl=60){
	await redisClient.set(key, JSON.stringify(value), { EX: ttl });
}
```

---

## 3) Use cache in controllers (cache-aside pattern)
Pattern for read endpoints:
1. Try `getCache(key)`
2. If present → return cached response
3. Else query DB → `setCache(key, result, ttl)` → return result

Examples to add in `backend/user/src/controllers/user.ts`:
- `myProfile`: key `user:{userId}` with TTL 60–300s
- `getAUser`: key `user:{id}`
- `getAllUsers`: key `users:list` (or parameterized cache keys for search)

---

## 4) Invalidation strategy (critical)
- On user update (name, profile pic): `delCache('user:{id}')` and `delCache('users:list')`.
- On create/delete: invalidate list caches.
- On chat metadata changes: invalidate `chat:summary:{userId}` for affected users.
- Use short TTLs as a safety net for eventual consistency.

Best practice: explicit invalidation + TTL fallback.

---

## 5) Key design and TTLs
- Keep keys human readable and unique: `user:123`, `users:list:page:1`, `chat:summary:123`
- TTL suggestions:
	- user profile: 60–300 seconds
	- users list / search: 30–120 seconds
	- chat summary: 10–60 seconds (depends on activity)

---

## 6) Safety and edge cases
- Always handle JSON parse errors (treat as cache miss and delete corrupted key).
- Consider cache stampede protection later (mutex, early recompute, probabilistic early expiration).
- Beware of storing sensitive fields in cache; do not cache secrets.

---

## 7) Interview talking points (concise)
- Use Redis as cache-aside for read-heavy endpoints and keep writes authoritative in MongoDB.
- Emphasize explicit invalidation and short TTL to avoid stale data.
- Mention other Redis roles you already use: OTP storage and rate limiting — reuse same Redis instance.
- For scaling real-time Socket.IO, suggest Redis adapter (pub/sub).

---

## 8) Next steps (implementation checklist)
1. Add `backend/user/src/config/cache.ts` (helper wrapper) — create + connect to existing `redisClient`.
2. Implement cache reads in `myProfile`, `getAUser`, `getAllUsers`.
3. Add invalidation calls in `updateName`, `updateProfilePic`, user create/delete flows.
4. Add basic tests to assert caching and invalidation behavior.
5. Monitor Redis memory usage and hit/miss ratio in staging.

---

If you want, I can now implement the `cache.ts` helper and patch `myProfile` to use it as a concrete example.
