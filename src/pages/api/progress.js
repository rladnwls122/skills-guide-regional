/* 진도 읽기·쓰기.
 *
 * 두 기기가 같은 계정을 쓸 수 있으므로 통째로 덮어쓰지 않는다. 문서 경로마다 시각을
 * 들고 있다가 더 나중에 고친 쪽을 남긴다. 통째 덮어쓰기로 두면 오래된 탭이 하나
 * 열려 있는 것만으로 다른 기기에서 한 일이 사라진다.
 *
 * 들어오는 값은 전부 사용자가 만든 것이다. 크기와 모양을 먼저 자른다 — 무료 등급
 * 저장소에 아무 값이나 얼마든지 밀어 넣을 수 있으면 그것이 곧 고장이다. */

import { json, progressKey, readSession } from '../../lib/server/auth.js';
import { store } from '../../lib/server/store.js';

export const prerender = false;

const MAX_BODY = 256 * 1024;
const MAX_PAGES = 400;
const MAX_ITEMS = 400;
const MAX_PATH = 200;
const MAX_ID = 64;

const isPath = (p) => typeof p === 'string' && p.startsWith('/') && p.length <= MAX_PATH;
const stamp = (v) => (Number.isFinite(v) && v > 0 ? Math.min(v, Date.now() + 60_000) : 0);

/** 저장할 수 있는 모양만 남긴다. 걸러진 것은 조용히 버린다. */
function clean(payload) {
	const checks = {};
	const quiz = {};

	for (const [path, entry] of Object.entries(payload.checks || {}).slice(0, MAX_PAGES)) {
		if (!isPath(path) || !entry || typeof entry !== 'object') continue;
		const done = (Array.isArray(entry.done) ? entry.done : [])
			.filter((v) => typeof v === 'string' && v.length <= MAX_ID)
			.slice(0, MAX_ITEMS);
		checks[path] = {
			done,
			total: Number.isFinite(entry.total) ? Math.min(entry.total, MAX_ITEMS) : done.length,
			updatedAt: stamp(entry.updatedAt),
		};
	}

	for (const [path, entry] of Object.entries(payload.quiz || {}).slice(0, MAX_PAGES)) {
		if (!isPath(path) || !entry || typeof entry.data !== 'object' || entry.data === null) continue;
		const data = {};
		for (const [qid, state] of Object.entries(entry.data).slice(0, MAX_ITEMS)) {
			if (qid.length > MAX_ID || !state || typeof state !== 'object') continue;
			data[qid] = {
				answered: !!state.answered,
				correct: !!state.correct,
				selected: (Array.isArray(state.selected) ? state.selected : [])
					.filter((v) => typeof v === 'string' && v.length <= MAX_ID)
					.slice(0, 32),
			};
		}
		quiz[path] = { data, updatedAt: stamp(entry.updatedAt) };
	}

	return { checks, quiz };
}

/** 경로마다 나중에 고친 쪽을 남긴다. */
function merge(mine, theirs) {
	const out = { checks: { ...mine.checks }, quiz: { ...mine.quiz } };
	for (const kind of ['checks', 'quiz']) {
		for (const [path, entry] of Object.entries(theirs[kind] || {})) {
			const held = out[kind][path];
			if (!held || entry.updatedAt >= held.updatedAt) out[kind][path] = entry;
		}
	}
	return out;
}

async function read(id) {
	const raw = await store().get(progressKey(id));
	if (!raw) return { checks: {}, quiz: {} };
	const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
	return { checks: parsed.checks || {}, quiz: parsed.quiz || {} };
}

export async function GET({ request }) {
	const session = await readSession(request);
	if (!session) return json({ error: '로그인이 필요하다' }, { status: 401 });
	return json(await read(session.id));
}

export async function PUT({ request }) {
	const session = await readSession(request);
	if (!session) return json({ error: '로그인이 필요하다' }, { status: 401 });

	const text = await request.text();
	if (text.length > MAX_BODY) {
		return json({ error: '보낸 값이 너무 크다' }, { status: 413 });
	}

	let payload;
	try {
		payload = JSON.parse(text);
	} catch {
		return json({ error: '본문을 읽지 못했다' }, { status: 400 });
	}
	if (!payload || typeof payload !== 'object') {
		return json({ error: '본문을 읽지 못했다' }, { status: 400 });
	}

	const merged = merge(await read(session.id), clean(payload));
	await store().set(progressKey(session.id), JSON.stringify(merged));
	return json(merged);
}
