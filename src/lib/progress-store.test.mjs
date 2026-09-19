/* 진도 동기화 자체 점검. `node src/lib/progress-store.test.mjs` 로 돌린다. */

import assert from 'node:assert/strict';
import { applyRemote } from './progress-store.js';

const values = new Map();
globalThis.localStorage = {
	get length() {
		return values.size;
	},
	key(index) {
		return [...values.keys()][index] ?? null;
	},
	getItem(key) {
		return values.get(key) ?? null;
	},
	setItem(key, value) {
		values.set(key, String(value));
	},
	removeItem(key) {
		values.delete(key);
	},
};
globalThis.location = { pathname: '/basics/03-iam/' };

const remoteQuiz = {
	checks: {},
	quiz: {
		'/basics/03-iam/': {
			data: {
				'quiz-policy': { answered: true, correct: true, selected: ['0'] },
			},
			updatedAt: 100,
		},
	},
};

assert.deepEqual(applyRemote(remoteQuiz), { changed: true, currentPageQuizChanged: true });
assert.equal(
	localStorage.getItem('starlight-quiz:/basics/03-iam/'),
	JSON.stringify(remoteQuiz.quiz['/basics/03-iam/'].data),
);

globalThis.location = { pathname: '/basics/02-vpc/' };
assert.deepEqual(applyRemote({
	checks: {},
	quiz: {
		'/basics/03-iam/': { ...remoteQuiz.quiz['/basics/03-iam/'], updatedAt: 200 },
	},
}), { changed: true, currentPageQuizChanged: false });

console.log('퀴즈 동기화 상태 점검 통과');
