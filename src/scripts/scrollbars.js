/* 스크롤 중인 요소에 `data-scrolling` 을 붙인다 — 스크롤바를 그 동안만 보이게
 * 하려는 것이고, 모양은 전부 src/styles/scrollbar.css 가 정한다.
 *
 * CSS 에는 "지금 스크롤 중"에 걸리는 선택자가 없다. 손잡이를 겨냥한 경우만 :hover 로
 * 되므로 스크립트가 맡을 일은 이 상태 하나뿐이다.
 *
 * scroll 이벤트는 버블링하지 않는다. 캡처 단계로 받아야 본문·인덱스·목차·코드 블록을
 * 하나의 리스너로 덮는다.
 */

/* 멈춘 뒤 스크롤바가 남아 있는 시간. 짧으면 손잡이를 잡으러 가는 사이에 사라진다. */
const IDLE = 900;

const timers = new WeakMap();

addEventListener(
	'scroll',
	(event) => {
		/* 문서 스크롤은 target 이 document 다 — 속성은 <html> 에 붙여야 한다. */
		const el = event.target === document ? document.documentElement : event.target;
		if (!(el instanceof HTMLElement)) return;

		el.dataset.scrolling = '';
		clearTimeout(timers.get(el));
		timers.set(
			el,
			setTimeout(() => delete el.dataset.scrolling, IDLE),
		);
	},
	{ capture: true, passive: true },
);
