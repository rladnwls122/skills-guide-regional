/* clientIp 자체 점검. `node src/lib/server/auth.test.mjs` 로 돌린다.
 *
 * 이 함수 하나가 시도 제한의 기준을 정한다. 여기서 클라이언트가 넣은 값을 그대로
 * 믿으면 주소별 제한이 통째로 무력해지므로, 위조 시도를 막는지만 따로 확인한다. */

import assert from 'node:assert/strict';
import { clientIp } from './auth.js';

const req = (headers) => new Request('https://example.test/', { headers });

// 플랫폼이 넣는 헤더가 있으면 클라이언트가 주장한 값을 무시한다.
assert.equal(
	clientIp(req({ 'x-vercel-forwarded-for': '203.0.113.9', 'x-forwarded-for': '1.2.3.4' })),
	'203.0.113.9',
);
assert.equal(clientIp(req({ 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '1.2.3.4' })), '203.0.113.9');

// 그 헤더가 없으면 목록의 끝을 쓴다 — 앞쪽은 클라이언트가 적어 넣을 수 있다.
assert.equal(clientIp(req({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9' })), '203.0.113.9');
assert.equal(clientIp(req({ 'x-forwarded-for': '203.0.113.9' })), '203.0.113.9');

// 위조한 값이 버킷을 바꾸지 못한다 — 두 요청이 같은 주소로 집계돼야 한다.
const spoofed = clientIp(req({ 'x-forwarded-for': '9.9.9.9, 203.0.113.9' }));
const honest = clientIp(req({ 'x-forwarded-for': '203.0.113.9' }));
assert.equal(spoofed, honest);

// 아무것도 없으면 하나의 버킷으로 모은다. 제한이 사라지지는 않는다.
assert.equal(clientIp(req({})), 'unknown');
assert.equal(clientIp(req({ 'x-forwarded-for': '  ,  ' })), 'unknown');

console.log('clientIp 점검 통과');
