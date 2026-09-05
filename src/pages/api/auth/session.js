/* 세션 조회와 종료.
 *
 * GET 은 지금 로그인한 아이디를 돌려준다. 화면이 로그인 칸을 그릴지 진도 요약을
 * 그릴지 정하는 데만 쓴다.
 *
 * DELETE 는 저장소의 세션을 지우고 쿠키를 비운다. 쿠키만 비우면 값이 남아 있어
 * 다른 곳에서 그대로 쓸 수 있다. */

import { clearedCookie, endSession, json, readSession } from '../../../lib/server/auth.js';

export const prerender = false;

export async function GET({ request }) {
	const session = await readSession(request);
	return json({ id: session ? session.id : null });
}

export async function DELETE({ request }) {
	const session = await readSession(request);
	if (session) await endSession(session.sid);
	return json({ id: null }, { headers: { 'set-cookie': clearedCookie() } });
}
