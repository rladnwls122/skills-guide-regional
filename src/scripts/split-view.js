/* 스플릿 뷰 — 인덱스·목차 레일 폭을 스플릿 바 드래그로 조절한다.
 *
 * 레일 폭은 토큰 두 개(--sl-sidebar-width, --sl-exquisitus-toc-width)가 전부이고
 * band(3단 전체 폭)를 고정해 뒀으므로(src/styles/layout.css) 토큰만 바꾸면 읽는
 * 칸이 그만큼 줄고 늘어난다. 바깥 여백은 움직이지 않는다 — 스플릿 뷰가 기대하는
 * 동작이다.
 *
 * 폭은 연속이 아니라 레일마다 정해진 세 단계(닫기·좁게·기본)로만 간다. 드래그하면
 * 가장 가까운 단계로 붙는다. 단계가 곧 상·하한이므로 따로 클램프하지 않는다.
 *
 * 접기는 새로 만들지 않고 인덱스 토글이 쓰던 상태(html[data-sidebar="closed"] +
 * localStorage 'sl-sidebar-collapsed')를 그대로 쓴다. 목차 쪽만 같은 모양으로
 * 하나 더 뒀다.
 *
 * 폭 복원은 head 의 인라인 스크립트가 맡는다(astro.config.mjs) — 여기서 하면
 * 페이지를 넘길 때마다 기본 폭이 한 프레임 보였다가 바뀐다.
 */

/* 폭이 연속이던 시절의 저장값은 프리셋에 없는 값이라 그대로 복원하면 어느
   단계와도 맞지 않는다. 키를 바꿔 옛 값을 버린다 — 한 번 기본 폭으로 돌아갈 뿐이다. */
const WIDTH_KEY = 'sl-split-steps';

const RAILS = {
  sidebar: {
    prop: '--sl-sidebar-width',
    attr: 'sidebar',
    key: 'sl-sidebar-collapsed',
    /* 이 레일이 실제로 있는 페이지에서만 손잡이를 만든다.
     * 랜딩(template: splash)에는 인덱스도 목차도 없다. */
    target: 'nav.sidebar',
    /* 닫기 · 좁게 · 기본. 0 은 접힘이다. */
    steps: [0, 11, 16.5],
    /* 오른쪽으로 끌면 넓어진다 */
    sign: 1,
  },
  toc: {
    prop: '--sl-exquisitus-toc-width',
    attr: 'toc',
    key: 'sl-toc-collapsed',
    target: '.right-sidebar',
    steps: [0, 10, 15],
    /* 왼쪽으로 끌면 넓어진다 */
    sign: -1,
  },
};

const root = document.documentElement;
const rem = () => parseFloat(getComputedStyle(root).fontSize) || 16;

const readWidths = () => {
  try {
    return JSON.parse(localStorage.getItem(WIDTH_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeWidths = (widths) => {
  try {
    localStorage.setItem(WIDTH_KEY, JSON.stringify(widths));
  } catch {}
};

const isClosed = (rail) => root.dataset[rail.attr] === 'closed';

const setClosed = (rail, closed) => {
  root.dataset[rail.attr] = closed ? 'closed' : 'open';
  /* 인라인 커스텀 속성은 html[data-*='closed'] 의 0rem 규칙을 이긴다. 접을 때
     지워 주지 않으면 패널만 숨고 폭은 남아 읽는 칸이 넓어지지 않는다.
     다시 열 때는 localStorage 에 남은 값으로 setWidth 가 되살린다. */
  if (closed) root.style.removeProperty(rail.prop);
  try {
    localStorage.setItem(rail.key, closed ? '1' : '0');
  } catch {}
  /* 헤더의 인덱스 토글 버튼과 상태를 맞춘다 */
  for (const btn of document.querySelectorAll(`[aria-controls="starlight__${rail.attr}"]`)) {
    btn.setAttribute('aria-expanded', String(!closed));
  }
};

/** 화면에 지금 적용된 레일 폭(rem). 접혀 있으면 0 이다. */
const currentWidth = (rail) =>
  isClosed(rail) ? 0 : parseFloat(getComputedStyle(root).getPropertyValue(rail.prop)) || 0;

const setWidth = (name, value) => {
  const rail = RAILS[name];
  root.style.setProperty(rail.prop, `${value}rem`);
  const widths = readWidths();
  widths[name] = value;
  writeWidths(widths);
};

/** 끌어놓은 위치에서 가장 가까운 단계. */
const nearestStep = (steps, value) =>
  steps.reduce((a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a));

const reset = (name) => {
  const rail = RAILS[name];
  const widths = readWidths();
  delete widths[name];
  writeWidths(widths);
  root.style.removeProperty(rail.prop);
  if (isClosed(rail)) setClosed(rail, false);
};

function startDrag(name, handle, event) {
  const rail = RAILS[name];
  const px = rem();
  const startX = event.clientX;
  const startWidth = currentWidth(rail);

  handle.setPointerCapture(event.pointerId);
  handle.dataset.dragging = '';
  /* 드래그 중에는 본문 텍스트가 딸려 선택되지 않게 한다 */
  root.style.userSelect = 'none';

  /* 마지막으로 적용한 단계. pointermove 는 자주 오지만 단계는 가끔 바뀐다 —
     같은 단계면 아무것도 하지 않아 localStorage 쓰기와 스타일 재계산을 아낀다. */
  let applied = null;

  const onMove = (moveEvent) => {
    const delta = ((moveEvent.clientX - startX) * rail.sign) / px;
    const step = nearestStep(rail.steps, startWidth + delta);
    if (step === applied) return;
    applied = step;

    if (step === 0) {
      setClosed(rail, true);
      return;
    }
    if (isClosed(rail)) setClosed(rail, false);
    setWidth(name, step);
  };

  const onUp = () => {
    delete handle.dataset.dragging;
    root.style.removeProperty('user-select');
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onUp);
  };

  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp);
  handle.addEventListener('pointercancel', onUp);
}

for (const [name, rail] of Object.entries(RAILS)) {
  if (!document.querySelector(rail.target)) continue;

  const handle = document.createElement('div');
  handle.className = `split-handle split-handle--${name}`;
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-orientation', 'vertical');
  handle.setAttribute(
    'aria-label',
    name === 'sidebar' ? '인덱스 패널 폭 조절' : '목차 패널 폭 조절',
  );

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    startDrag(name, handle, event);
  });
  handle.addEventListener('dblclick', () => reset(name));

  document.body.append(handle);
}
