/* 진도 — 문서의 체크박스를 살리고 브라우저에 남긴다.
 *
 * GFM 이 만드는 task list 는 전부 `disabled` 로 렌더된다. 사이트에는 그런 항목이
 * 1,600개 넘게 있고 전부 학습 목표·자가진단·검증 항목이다. 표시를 못 하면 4주 동안
 * 어디까지 했는지를 종이에 옮겨 적게 된다. 그래서 문서를 고치지 않고 렌더된 뒤에
 * 되살린다 — 항목 하나를 더 쓸 때 문법을 따로 외울 필요가 없다.
 *
 * 저장 키는 항목의 순서가 아니라 글자다. 문서는 자주 고쳐지고, 목록 가운데에 항목
 * 하나가 끼어들면 순서 기반 저장은 그 아래 전부를 어긋나게 복원한다. 글자가 같은
 * 항목은 같은 항목으로 본다. 글자를 고친 항목만 표시가 풀린다.
 *
 * 값은 이 브라우저에 남는다. 로그인하면 그 값이 계정에도 올라가 다른 기기에서 이어진다.
 */

import { loadChecks as load, saveChecks as save, stampQuiz } from '../lib/progress-store.js';
import { schedulePush, start as startSync } from './sync.js';

/* 항목 글자의 짧은 지문(djb2). 충돌해도 같은 문서 안에서만 문제가 되고,
   문서당 항목이 수십 개라 실질 위험이 없다. */
function fingerprint(text) {
	let h = 5381;
	for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
	return h.toString(36);
}

function labelOf(box) {
	const li = box.closest('li');
	return (li ? li.textContent : '').replace(/\s+/g, ' ').trim().slice(0, 200);
}

function el(tag, className, parent) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (parent) parent.append(node);
	return node;
}

function meter() {
	const root = el('div', 'doc-progress not-content');
	el('i', null, el('span', 'doc-progress__bar', root));
	el('span', 'doc-progress__count', root);
	const reset = el('button', 'doc-progress__reset', root);
	reset.type = 'button';
	reset.textContent = '초기화';
	return root;
}

function scan() {
	const root = document.querySelector('.sl-markdown-content');
	if (!root || root.dataset.progressReady === '1') return;

	const boxes = [...root.querySelectorAll('input[type="checkbox"][disabled]')];
	if (!boxes.length) return;
	root.dataset.progressReady = '1';

	const path = location.pathname;
	const store = load();
	const done = new Set((store[path] && store[path].done) || []);

	/* 같은 글자가 두 번 나오면 뒤엣것에 번호를 붙인다. 없으면 둘이 함께 켜진다. */
	const seen = new Map();
	const items = boxes.map((box) => {
		const base = fingerprint(labelOf(box));
		const n = (seen.get(base) || 0) + 1;
		seen.set(base, n);
		return { box, id: n === 1 ? base : `${base}.${n}` };
	});

	/* 사람이 누른 것만 시각을 올린다. 문서를 열기만 해도 시각이 올라가면, 다른 기기에서
	   한 최신 표시를 이 탭이 그냥 열려 있었다는 이유로 덮는다. */
	function persist(touched) {
		const next = load();
		const prev = next[path] || {};
		next[path] = {
			done: [...done],
			total: items.length,
			updatedAt: touched ? Date.now() : prev.updatedAt || 0,
		};
		save(next);
		if (touched) schedulePush();
	}

	const bar = items.length >= 3 ? meter() : null;
	if (bar) root.prepend(bar);

	function render() {
		if (!bar) return;
		const pct = Math.round((done.size / items.length) * 100);
		bar.querySelector('.doc-progress__bar i').style.width = `${pct}%`;
		bar.querySelector('.doc-progress__count').textContent =
			`체크 ${done.size} / ${items.length}`;
		bar.querySelector('.doc-progress__reset').hidden = done.size === 0;
	}

	for (const { box, id } of items) {
		box.disabled = false;
		box.checked = done.has(id);
		/* GFM 은 체크박스를 <label> 로 감싸지 않는다. 화면 낭독기가 읽을 이름을 넣어 준다. */
		if (!box.getAttribute('aria-label')) box.setAttribute('aria-label', labelOf(box));
		box.addEventListener('change', () => {
			if (box.checked) done.add(id);
			else done.delete(id);
			persist(true);
			render();
		});
	}

	if (bar) {
		bar.querySelector('.doc-progress__reset').addEventListener('click', () => {
			done.clear();
			for (const { box } of items) box.checked = false;
			persist(true);
			render();
		});
	}

	/* 아직 하나도 안 눌러도 총 개수는 남긴다 — 랜딩의 주차 척도가 분모로 쓴다. */
	persist(false);
	render();

	/* 다른 기기에서 받은 값이 도착하면 화면을 그 값으로 맞춘다. */
	window.addEventListener('skills-guide:progress-synced', () => {
		const fresh = new Set((load()[path] || {}).done || []);
		done.clear();
		for (const id of fresh) done.add(id);
		for (const { box, id } of items) box.checked = done.has(id);
		render();
	});
}

/* 퀴즈는 starlight-quiz 가 알아서 저장한다. 여기서는 고친 시각만 남긴다 —
   기기 두 대의 답이 갈릴 때 어느 쪽이 나중인지 정할 근거가 그것뿐이다. */
window.addEventListener('starlight-quiz:progress', () => {
	stampQuiz(location.pathname);
	schedulePush();
});

startSync();

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', scan);
} else {
	scan();
}
/* Starlight 의 뷰 트랜지션으로 페이지가 갈릴 때도 다시 건다. */
document.addEventListener('astro:page-load', scan);
