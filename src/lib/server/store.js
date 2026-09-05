/* 저장소 — Upstash Redis.
 *
 * REST 호출이라 서버리스 함수에서 커넥션 풀을 걱정하지 않아도 된다. 호출마다 새로
 * 만들어도 값이 싸다.
 *
 * 개발에서는 환경변수 없이도 돌아가도록 메모리 저장소로 떨어진다 — 진도 하나 붙이자고
 * 로컬에서까지 계정을 만들게 하지 않는다. 배포에서는 떨어지지 않고 즉시 실패한다.
 * 조용히 메모리로 도는 배포는 사용자가 저장됐다고 믿는 값을 함수가 식을 때 버린다.
 */

import { Redis } from '@upstash/redis';

/** 개발용. 프로세스가 살아 있는 동안만 남는다. */
const memory = new Map();
const expiry = new Map();

function memoryStore() {
	const alive = (key) => {
		const at = expiry.get(key);
		if (at !== undefined && at <= Date.now()) {
			memory.delete(key);
			expiry.delete(key);
			return false;
		}
		return memory.has(key);
	};
	return {
		async get(key) {
			return alive(key) ? memory.get(key) : null;
		},
		async set(key, value, ttlSeconds) {
			memory.set(key, value);
			if (ttlSeconds) expiry.set(key, Date.now() + ttlSeconds * 1000);
			else expiry.delete(key);
		},
		async setIfAbsent(key, value) {
			if (alive(key)) return false;
			memory.set(key, value);
			return true;
		},
		async del(key) {
			memory.delete(key);
			expiry.delete(key);
		},
		async incrWithTtl(key, ttlSeconds) {
			const next = (alive(key) ? Number(memory.get(key)) : 0) + 1;
			memory.set(key, next);
			if (next === 1) expiry.set(key, Date.now() + ttlSeconds * 1000);
			return next;
		},
	};
}

function redisStore(redis) {
	return {
		async get(key) {
			return await redis.get(key);
		},
		async set(key, value, ttlSeconds) {
			if (ttlSeconds) await redis.set(key, value, { ex: ttlSeconds });
			else await redis.set(key, value);
		},
		/* 계정 생성의 경쟁 조건을 막는다. 같은 아이디로 두 요청이 동시에 들어와도
		   하나만 통과한다 — 뒤엣것이 앞의 비밀번호를 덮어쓰면 계정을 빼앗기는 것과 같다. */
		async setIfAbsent(key, value) {
			const ok = await redis.set(key, value, { nx: true });
			return ok === 'OK';
		},
		async del(key) {
			await redis.del(key);
		},
		async incrWithTtl(key, ttlSeconds) {
			const next = await redis.incr(key);
			if (next === 1) await redis.expire(key, ttlSeconds);
			return next;
		},
	};
}

let cached = null;

export function store() {
	if (cached) return cached;

	const url = import.meta.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL;
	const token = import.meta.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

	if (url && token) {
		cached = redisStore(new Redis({ url, token }));
		return cached;
	}

	if (import.meta.env.PROD) {
		throw new Error(
			'UPSTASH_REDIS_REST_URL 과 UPSTASH_REDIS_REST_TOKEN 이 없다. 배포에서는 메모리로 떨어지지 않는다.',
		);
	}

	console.warn('[progress] Upstash 환경변수가 없어 메모리 저장소로 돈다. 개발에서만 쓴다.');
	cached = memoryStore();
	return cached;
}
