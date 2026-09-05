/* 로그인.
 *
 * 아이디가 없을 때와 비밀번호가 틀렸을 때의 응답을 같게 둔다. 다르게 두면 아이디가
 * 존재하는지를 밖에서 확인할 수 있고, 그게 다음 공격의 목록이 된다.
 *
 * 아이디가 없어도 해시 검증을 한 번 돌린다 — 없는 아이디만 눈에 띄게 빨리 답하면
 * 응답 시간만으로 같은 목록을 만들 수 있다. */

import {
	clearThrottle,
	clientIp,
	json,
	normalizeId,
	readUser,
	sessionCookie,
	startSession,
	throttle,
	verifyPassword,
} from '../../../lib/server/auth.js';

export const prerender = false;

/* 존재하지 않는 아이디에도 같은 일을 시키기 위한 더미. 어떤 비밀번호와도 맞지 않는다. */
const DUMMY_HASH =
	'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$' +
	'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function POST({ request }) {
	if (!(request.headers.get('content-type') || '').includes('application/json')) {
		return json({ error: 'JSON 으로 보낸다' }, { status: 415 });
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: '본문을 읽지 못했다' }, { status: 400 });
	}

	const id = normalizeId(body.id);
	const password = String(body.password || '');
	const ip = clientIp(request);

	if (await throttle(id || 'unknown', ip)) {
		return json({ error: '시도가 많다. 15분 뒤에 다시 한다' }, { status: 429 });
	}

	const user = id ? await readUser(id) : null;
	const ok = await verifyPassword(password, user ? user.hash : DUMMY_HASH);

	if (!user || !ok) {
		return json({ error: '아이디나 비밀번호가 맞지 않는다' }, { status: 401 });
	}

	await clearThrottle(id, ip);
	const sid = await startSession(id);
	return json({ id }, { headers: { 'set-cookie': sessionCookie(sid) } });
}
