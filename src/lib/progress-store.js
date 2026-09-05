/* 진도 저장소 — 체크박스와 퀴즈를 한 곳에서 읽는다.
 *
 * 두 가지가 브라우저에 남는다.
 *
 * - 체크박스: 이 파일의 `skills-guide:progress` 키. 경로마다 { done, total } 이다.
 * - 퀴즈: starlight-quiz 가 `starlight-quiz:<경로>` 에 이미 남긴다. 여기서는 읽기만 한다.
 *
 * 퀴즈의 전체 문항 수는 브라우저가 모른다 — 열어 본 적 없는 문서의 퀴즈는 저장소에
 * 흔적이 없다. 분모는 빌드가 내는 `/quiz-manifest.json` 에서 가져온다.
 */

export const CHECK_KEY = 'skills-guide:progress';
const QUIZ_PREFIX = 'starlight-quiz:';
/* 퀴즈를 고친 시각. starlight-quiz 는 시각을 남기지 않으므로 따로 센다 —
   기기 두 대의 값이 갈릴 때 어느 쪽이 나중인지 정하는 유일한 근거다. */
const QUIZ_STAMP_KEY = 'skills-guide:quiz-stamps';

export function loadChecks() {
	try {
		return JSON.parse(localStorage.getItem(CHECK_KEY)) || {};
	} catch {
		return {};
	}
}

export function saveChecks(store) {
	try {
		localStorage.setItem(CHECK_KEY, JSON.stringify(store));
	} catch {
		/* 저장 못 해도 화면은 살아 있게 둔다 — 사생활 보호 모드를 막지 않는다. */
	}
}

/** 한 문서의 퀴즈 상태. 답한 문항과 맞힌 문항을 센다. */
function readQuiz(path) {
	let raw;
	try {
		raw = localStorage.getItem(QUIZ_PREFIX + path);
	} catch {
		return { answered: 0, correct: 0 };
	}
	if (!raw) return { answered: 0, correct: 0 };

	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { answered: 0, correct: 0 };
	}
	if (!parsed || typeof parsed !== 'object') return { answered: 0, correct: 0 };

	let answered = 0;
	let correct = 0;
	for (const state of Object.values(parsed)) {
		if (!state || typeof state !== 'object' || !state.answered) continue;
		answered += 1;
		if (state.correct) correct += 1;
	}
	return { answered, correct };
}

/** 저장된 모든 경로. 체크박스 쪽과 퀴즈 쪽을 합친다. */
function paths() {
	const set = new Set(Object.keys(loadChecks()));
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith(QUIZ_PREFIX)) set.add(key.slice(QUIZ_PREFIX.length));
		}
	} catch {
		/* 접근이 막히면 체크박스 쪽만 센다. */
	}
	return [...set];
}

/**
 * 경로 접두사 하나의 집계.
 *
 * 체크박스의 분모는 지나온 문서만 센 값이다. 열어 본 적 없는 문서의 항목 수는
 * 브라우저가 알 방법이 없다. 퀴즈의 분모는 호출한 쪽이 매니페스트에서 넘긴다.
 */
export function summarize(prefix) {
	const checks = loadChecks();
	let checkDone = 0;
	let checkTotal = 0;
	let answered = 0;
	let correct = 0;
	let seen = 0;

	for (const path of paths()) {
		if (!path.startsWith(prefix)) continue;
		seen += 1;
		const entry = checks[path];
		if (entry) {
			checkDone += (entry.done || []).length;
			checkTotal += entry.total || 0;
		}
		const quiz = readQuiz(path);
		answered += quiz.answered;
		correct += quiz.correct;
	}

	return { seen, checkDone, checkTotal, answered, correct };
}

/* ── 동기화용 ─────────────────────────────────────────────────────────── */

function readJson(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch {
		return fallback;
	}
}

function writeJson(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* 저장 못 해도 화면은 살아 있게 둔다. */
	}
}

export function quizStamps() {
	const v = readJson(QUIZ_STAMP_KEY, {});
	return v && typeof v === 'object' ? v : {};
}

export function stampQuiz(path) {
	const stamps = quizStamps();
	stamps[path] = Date.now();
	writeJson(QUIZ_STAMP_KEY, stamps);
}

/** 이 브라우저가 가진 전부. 서버로 보내는 모양 그대로 만든다. */
export function snapshot() {
	const checks = loadChecks();
	const stamps = quizStamps();
	const quiz = {};

	try {
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (!key || !key.startsWith(QUIZ_PREFIX)) continue;
			const path = key.slice(QUIZ_PREFIX.length);
			const data = readJson(key, null);
			if (data && typeof data === 'object') {
				quiz[path] = { data, updatedAt: stamps[path] || 0 };
			}
		}
	} catch {
		/* 접근이 막히면 체크박스만 보낸다. */
	}

	return { checks, quiz };
}

/**
 * 서버가 돌려준 값을 이 브라우저에 얹는다. 경로마다 나중에 고친 쪽을 남긴다.
 * 바뀐 것이 있으면 true — 호출한 쪽이 화면을 다시 그릴지 정한다.
 */
export function applyRemote(remote) {
	if (!remote || typeof remote !== 'object') return false;
	let changed = false;

	const checks = loadChecks();
	for (const [path, entry] of Object.entries(remote.checks || {})) {
		const held = checks[path];
		if (held && (held.updatedAt || 0) >= (entry.updatedAt || 0)) continue;
		checks[path] = entry;
		changed = true;
	}
	if (changed) saveChecks(checks);

	const stamps = quizStamps();
	let stampsChanged = false;
	for (const [path, entry] of Object.entries(remote.quiz || {})) {
		if ((stamps[path] || 0) >= (entry.updatedAt || 0)) continue;
		writeJson(QUIZ_PREFIX + path, entry.data || {});
		stamps[path] = entry.updatedAt || Date.now();
		stampsChanged = true;
		changed = true;
	}
	if (stampsChanged) writeJson(QUIZ_STAMP_KEY, stamps);

	return changed;
}

/** 매니페스트를 경로 접두사별 퀴즈 문항 수로 바꾼다. */
export function quizTotals(manifest) {
	const totals = new Map();
	for (const quiz of (manifest && manifest.quizzes) || []) {
		const page = quiz.page || '';
		const prefix = '/' + page.split('/')[1] + '/';
		totals.set(prefix, (totals.get(prefix) || 0) + 1);
	}
	return totals;
}
