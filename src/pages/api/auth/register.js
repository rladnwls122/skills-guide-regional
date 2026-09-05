/* 가입. 아이디와 비밀번호만 받는다 — 이메일을 받지 않으므로 잃어버린 비밀번호는
 * 되돌릴 수 없다. 그 사실은 화면에 적어 둔다.
 *
 * 가입도 주소별로 횟수를 센다. 열어 둔 가입은 계정을 무한히 만들 수 있는 문이라
 * 제한이 없으면 저장소가 먼저 무너진다. */

import {
	ID_PATTERN,
	PASSWORD_MIN,
	clientIp,
	createUser,
	json,
	normalizeId,
	sessionCookie,
	startSession,
	throttleIp,
} from '../../../lib/server/auth.js';

export const prerender = false;

export async function POST({ request }) {
	/* JSON 만 받는다. 폼 전송은 다른 사이트에서도 보낼 수 있지만 JSON 은 못 보낸다 —
	   SameSite=Lax 와 함께 교차 사이트 요청을 두 겹으로 막는다. */
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

	if (await throttleIp('register', ip)) {
		return json({ error: '가입 시도가 많다. 15분 뒤에 다시 한다' }, { status: 429 });
	}

	if (!ID_PATTERN.test(id)) {
		return json(
			{ error: '아이디는 영소문자·숫자로 시작하는 3~32자다. 마침표·밑줄·붙임표를 쓸 수 있다' },
			{ status: 400 },
		);
	}
	if (password.length < PASSWORD_MIN) {
		return json({ error: `비밀번호는 ${PASSWORD_MIN}자 이상이다` }, { status: 400 });
	}

	if (!(await createUser(id, password))) {
		return json({ error: '이미 쓰는 아이디다' }, { status: 409 });
	}

	const sid = await startSession(id);
	return json({ id }, { status: 201, headers: { 'set-cookie': sessionCookie(sid) } });
}
