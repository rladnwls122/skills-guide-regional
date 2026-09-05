/* 동기화 — 로그인했을 때만 돈다.
 *
 * 로그인하지 않은 사람에게는 아무 요청도 보내지 않는다. 진도는 여전히 이 브라우저에
 * 남고, 로그인은 그것을 기기 사이로 옮기는 기능일 뿐이다.
 *
 * 받기는 탭마다 한 번이다. 문서를 넘길 때마다 다시 받으면 값은 거의 그대로인데
 * 요청만 는다. 보내기는 바뀐 뒤 잠깐 기다렸다가 한 번 보낸다 — 체크를 연달아
 * 누르는 것이 정상이라 누를 때마다 보내면 요청이 그 수만큼 늘어난다.
 *
 * 합치는 규칙은 서버와 같다: 문서 경로마다 나중에 고친 쪽을 남긴다.
 */

import { applyRemote, snapshot } from '../lib/progress-store.js';

const PUSH_DELAY = 1500;
const CHANGED_EVENT = 'skills-guide:progress-synced';

const SESSION_EVENT = 'skills-guide:session';

let pulled = false;
/** undefined = 아직 묻지 않았다. null = 로그아웃. 문자열 = 아이디. */
let cached;
let pending = null;
let timer = null;

/** 로그인한 아이디. 탭마다 한 번만 묻고 그 뒤로는 기억한 값을 준다. */
export async function sessionId() {
	if (cached !== undefined) return cached;
	/* 헤더와 진도 화면이 동시에 물어도 요청은 하나만 나간다. */
	if (!pending) {
		pending = (async () => {
			try {
				const res = await fetch('/api/auth/session', { headers: { accept: 'application/json' } });
				cached = res.ok ? (await res.json()).id || null : null;
			} catch {
				cached = null;
			}
			pending = null;
			return cached;
		})();
	}
	return pending;
}

async function session() {
	return Boolean(await sessionId());
}

/** 로그인·로그아웃 뒤에 부른다. 화면 곳곳이 같은 값을 보게 맞춘다. */
export function setSession(id) {
	cached = id || null;
	window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: cached }));
}


export async function pull() {
	if (!(await session())) return false;
	try {
		const res = await fetch('/api/progress', { headers: { accept: 'application/json' } });
		if (!res.ok) return false;
		const changed = applyRemote(await res.json());
		if (changed) window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
		return changed;
	} catch {
		return false;
	}
}

export async function push() {
	if (!(await session())) return false;
	try {
		const res = await fetch('/api/progress', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(snapshot()),
		});
		return res.ok;
	} catch {
		return false;
	}
}

export function schedulePush() {
	clearTimeout(timer);
	timer = setTimeout(push, PUSH_DELAY);
}

/**
 * 브라우저에 붙인다. 이 모듈은 화면 컴포넌트도 불러오므로 최상위에서 `document` 를
 * 건드리지 않는다 — 그러면 서버 렌더에 끌려 들어가 빌드가 깨진다. 부수 효과는 전부
 * 여기에 모아 두고, 페이지 스크립트가 한 번 부른다.
 */
export function start() {
	if (pulled) return;
	pulled = true;

	/* 탭을 닫거나 숨길 때 아직 안 보낸 것이 있으면 마저 보낸다. */
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden' && timer) {
			clearTimeout(timer);
			timer = null;
			push();
		}
	});

	pull();
}
