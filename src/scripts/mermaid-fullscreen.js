/**
 * mermaid 도식 전체화면 뷰어.
 *
 * astro-mermaid 는 `<pre class="mermaid">` 안의 텍스트를 클라이언트에서 SVG 로
 * 바꾼다. 아키텍처 도식이 커서 본문 폭에 눌리면 라벨이 안 읽히므로, 도식마다
 * 확대 버튼을 붙이고 오버레이에서 확대·이동해 볼 수 있게 한다.
 *
 * Fullscreen API 대신 고정 오버레이를 쓴다 — iOS Safari 는 video 가 아닌 요소의
 * 전체화면을 지원하지 않아 모바일에서 그대로 죽는다.
 */

const RENDERED = "data-mfs-ready";
const SIZED = "data-mfs-sized";
const ICONBOX = "data-mfs-iconbox";
const SVGNS = "http://www.w3.org/2000/svg";

/*
 * mermaid 는 svg 에 width="100%" 만 박아둔다(height 는 없음). viewBox 만 있고
 * width/height 속성이 없는 인라인 svg 는, width:auto 를 줘도 "고유 크기 없음 +
 * 고유 비율 있음" 규칙에 따라 컨테이너 폭을 그대로 채워버린다 — CSS 만으로는
 * 못 막는다. viewBox 폭을 그대로 읽어 실제 픽셀 width 로 박아야 도식이 원래
 * 크기로 그려지고, 넘치는 부분은 프레임의 overflow-x:auto 가 스크롤한다.
 */
function sizeSvg(svg) {
	if (svg.hasAttribute(SIZED)) return;
	const box = svg.viewBox?.baseVal;
	if (box && box.width) {
		svg.style.width = `${box.width}px`;
	}
	svg.setAttribute(SIZED, "");
}

/*
 * `@{ icon: ..., form: "square" }` 노드의 테두리를 <rect> 한 장으로 갈아끼운다.
 *
 * mermaid 는 그 사각형을 roughjs 로 그린다 — 채움용 path 와 선용 path 두 장이고,
 * 모서리 반경은 코드에 0.1px 로 박혀 있어 사실상 각진 네모다. 색도 렌더 시점에
 * fill/stroke '속성'으로 들어간다. 즉 CSS 로는 둥글게 만들 수도, 테마에 따라 바꿀
 * 수도 없다(속성 자체는 CSS 로 덮이지만, 두 path 의 역할이 갈려 있어 테두리만
 * 따로 칠할 수가 없다 — 선용 path 의 d 는 손그림용 겹선이다).
 *
 * 같은 자리·같은 크기의 rect 로 바꾸면 rx 와 색이 전부 CSS 몫이 된다.
 * 색은 src/styles/mermaid-theme.css 의 `.mfs-icon-box` 가 낸다.
 *
 * 부모 <g> 는 그대로 두고 자식만 바꾼다 — 거기 붙은 translate 가 배치의 전부다.
 */
function roundIconBox(shape) {
	if (shape.hasAttribute(ICONBOX)) return;
	const box = shape.firstElementChild;
	if (!box || box.tagName !== "g") return;
	// 아직 안 그려진 도식에서는 0 이 나온다 — 표시를 남기지 말고 다음 훑기를 기다린다.
	const b = box.getBBox();
	if (!b.width || !b.height) return;
	shape.setAttribute(ICONBOX, "");

	const rect = document.createElementNS(SVGNS, "rect");
	rect.setAttribute("class", "mfs-icon-box");
	rect.setAttribute("x", b.x);
	rect.setAttribute("y", b.y);
	rect.setAttribute("width", b.width);
	rect.setAttribute("height", b.height);
	box.replaceChildren(rect);
}

function openViewer(svg, caption) {
	const overlay = document.createElement("div");
	overlay.className = "mfs-overlay";
	overlay.innerHTML = `
		<div class="mfs-bar">
			<span class="mfs-caption"></span>
			<div class="mfs-actions">
				<button type="button" class="mfs-btn" data-act="out" aria-label="축소">−</button>
				<button type="button" class="mfs-btn" data-act="reset" aria-label="원래 크기">100%</button>
				<button type="button" class="mfs-btn" data-act="in" aria-label="확대">+</button>
				<button type="button" class="mfs-btn mfs-close" data-act="close" aria-label="닫기">✕</button>
			</div>
		</div>
		<div class="mfs-stage"><div class="mfs-canvas"></div></div>
	`;
	overlay.querySelector(".mfs-caption").textContent = caption || "";
	const canvas = overlay.querySelector(".mfs-canvas");
	const stage = overlay.querySelector(".mfs-stage");
	const clone = svg.cloneNode(true);
	// mermaid 가 박아둔 고정 크기를 걷어내야 자유롭게 키울 수 있다(viewBox 는 남긴다).
	clone.removeAttribute("width");
	clone.removeAttribute("height");
	clone.style.maxWidth = "none";
	clone.style.maxHeight = "none";
	canvas.appendChild(clone);
	// 무대 크기를 재려면 먼저 문서에 붙어 있어야 한다.
	document.documentElement.classList.add("mfs-open");
	document.body.appendChild(overlay);

	/*
	 * 기준 크기는 **도식의 원래 크기(viewBox)** 다. 예전처럼 화면 폭에 맞추면
	 * 가로로 긴 아키텍처 도식이 좁은 화면에서 그대로 쪼그라들어(모바일에선 1/5 토막)
	 * 확대해 보려고 연 전체화면이 오히려 더 작아진다.
	 */
	const box = clone.viewBox?.baseVal;
	const natW = box && box.width ? box.width : clone.getBoundingClientRect().width || 1;
	const natH = box && box.height ? box.height : 1;

	/*
	 * 확대는 transform: scale() 이 아니라 **레이아웃 폭**으로 한다.
	 * scale() 은 이미 그려진 래스터를 늘리는 합성 연산이라 SVG 인데도 확대하면
	 * 뭉개진다. 폭을 바꾸면 브라우저가 벡터를 그 해상도로 다시 그려서 몇 배를
	 * 키워도 선과 글자가 또렷하다.
	 */
	const apply = () => {
		clone.style.width = `${natW * scale}px`;
		clone.style.height = "auto";
	};

	// 화면보다 작은 도식만 무대에 꽉 차게 키운다. 큰 도식은 원래 크기(1배)로 두고
	// 넘치는 만큼은 스크롤·드래그로 본다 — 축소해서 안 보이게 만드는 것보다 낫다.
	const fitScale = () => {
		const r = stage.getBoundingClientRect();
		return Math.min(r.width / natW, r.height / natH);
	};
	let scale = Math.max(1, fitScale());
	apply();
	// 원래 크기가 무대보다 크면 가운데부터 보여준다(왼쪽 위 귀퉁이는 대개 여백).
	const center = () => {
		stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) / 2;
		stage.scrollTop = (stage.scrollHeight - stage.clientHeight) / 2;
	};
	center();

	/*
	 * 이동은 무대의 **네이티브 스크롤**로 한다. 예전엔 canvas 를 translate 로 밀었는데,
	 * 가운데 정렬된 채로 넘친 영역은 스크롤로 되돌아올 수 없어서 넓은 도식의 좌우가
	 * 잘린 채 못 보는 구간이 생겼다. 스크롤이면 스크롤바가 곧 "여기 더 있다" 는 표시다.
	 */
	const zoom = (factor, originX, originY) => {
		const next = Math.min(8, Math.max(0.1, scale * factor));
		const r = stage.getBoundingClientRect();
		// 커서(또는 두 손가락 가운데) 아래 지점을 고정한 채 확대한다.
		const px = (originX ?? r.left + r.width / 2) - r.left;
		const py = (originY ?? r.top + r.height / 2) - r.top;
		const cx = (stage.scrollLeft + px) / scale;
		const cy = (stage.scrollTop + py) / scale;
		scale = next;
		apply();
		stage.scrollLeft = cx * scale - px;
		stage.scrollTop = cy * scale - py;
	};
	const reset = () => {
		scale = Math.max(1, fitScale());
		apply();
		center();
	};

	const close = () => {
		overlay.remove();
		document.removeEventListener("keydown", onKey);
		document.documentElement.classList.remove("mfs-open");
	};
	const onKey = (e) => {
		if (e.key === "Escape") close();
		else if (e.key === "+" || e.key === "=") zoom(1.25);
		else if (e.key === "-") zoom(0.8);
		else if (e.key === "0") reset();
	};

	overlay.addEventListener("click", (e) => {
		const act = e.target.closest("[data-act]")?.dataset.act;
		// stage 는 드래그로 도식을 옮기는 영역이다 — 빈 배경을 그냥 눌러도
		// 닫히면 안 된다(닫기는 ✕ 버튼이나 Esc 로만). act==="close" 만 닫는다.
		if (act === "close") close();
		else if (act === "in") zoom(1.25);
		else if (act === "out") zoom(0.8);
		else if (act === "reset") reset();
	});

	stage.addEventListener(
		"wheel",
		(e) => {
			e.preventDefault();
			zoom(e.deltaY < 0 ? 1.12 : 0.89, e.clientX, e.clientY);
		},
		{ passive: false },
	);

	// 드래그 이동 + 두 손가락 핀치. 포인터 이벤트라 마우스·터치·펜이 같은 경로다.
	const pointers = new Map();
	let pinchDist = 0;
	stage.addEventListener("pointerdown", (e) => {
		pointers.set(e.pointerId, e);
		stage.setPointerCapture(e.pointerId);
		if (pointers.size === 2) pinchDist = 0;
	});
	stage.addEventListener("pointermove", (e) => {
		if (!pointers.has(e.pointerId)) return;
		const prev = pointers.get(e.pointerId);
		pointers.set(e.pointerId, e);

		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
			if (pinchDist) {
				zoom(dist / pinchDist, (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
			}
			pinchDist = dist;
		} else if (pointers.size === 1) {
			// 잡아끄는 방향으로 도식이 따라오도록 스크롤은 반대로 민다.
			stage.scrollLeft -= e.clientX - prev.clientX;
			stage.scrollTop -= e.clientY - prev.clientY;
		}
	});
	const release = (e) => {
		pointers.delete(e.pointerId);
		if (pointers.size < 2) pinchDist = 0;
	};
	stage.addEventListener("pointerup", release);
	stage.addEventListener("pointercancel", release);

	document.addEventListener("keydown", onKey);
	overlay.querySelector(".mfs-close").focus();
}

function decorate(pre) {
	const svg = pre.querySelector("svg");
	if (!svg || pre.hasAttribute(RENDERED)) return;
	pre.setAttribute(RENDERED, "");

	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "mfs-open-btn";
	btn.setAttribute("aria-label", "도식 전체화면으로 보기");
	btn.innerHTML =
		"<span aria-hidden='true'>⤢</span><span class='mfs-label'>크게 보기</span>";
	// 도식 앞의 가장 가까운 문단을 설명 캡션으로 재활용한다.
	const caption = pre.previousElementSibling?.textContent?.trim().slice(0, 80) || "";
	btn.addEventListener("click", () => {
		const current = pre.querySelector("svg");
		if (current) openViewer(current, caption);
	});

	const frame = document.createElement("figure");
	frame.className = "mfs-frame";
	pre.replaceWith(frame);
	frame.append(pre, btn);

	// 도식 바로 뒤의 접이식 설명은 프레임 안으로 들인다 — 테두리 하나로 묶여야
	// 어느 도식의 설명인지가 눈으로 붙는다. 접는 대상은 설명 쪽이다. 도식을 접힌
	// <details> 안에 두면 렌더 시점 폭이 0 이라 viewBox 가 깨진다.
	const note = frame.nextElementSibling;
	if (note?.tagName === "DETAILS" && note.classList.contains("diagram-note")) {
		frame.append(note);
	}
}

/*
 * 여기 있던 syncTheme 은 걷어냈다. astro-mermaid 가 렌더 시작 시점의 data-theme 를
 * 한 번만 읽어 다크모드인데 라이트 색으로 굳던 버그를 보정하던 코드인데, autoTheme 를
 * 끄면서(astro.config.mjs) 도식은 늘 같은 테마로 그려지고 색은 CSS 변수가 낸다 —
 * 고칠 대상 자체가 사라졌다. 되살리지 않는다.
 */
function scan() {
	document.querySelectorAll("pre.mermaid").forEach(decorate);
	document.querySelectorAll("pre.mermaid svg").forEach(sizeSvg);
	document.querySelectorAll("pre.mermaid svg .icon-shape").forEach(roundIconBox);
}

/*
 * 관찰 대상이 body 전체라, 도식 6개짜리 페이지 한 번 렌더에 콜백이 100번 가까이
 * 뜬다(측정값: 도식 3개에 45회). scan() 은 매번 문서 전체를 querySelectorAll 로
 * 세 번 훑으므로 그대로 두면 렌더 도중 훑기만 300회다 — 모바일에서 특히 아깝다.
 * 한 태스크 안의 연속 변경을 한 번으로 묶는다.
 *
 * requestAnimationFrame 은 쓰지 않는다. 탭이 화면에 없으면 프레임이 돌지 않아
 * 콜백이 영영 안 뜨고, 백그라운드 탭에서 렌더가 끝난 도식은 프레임도 확대 버튼도
 * 없는 맨 svg 로 남는다(실제로 그렇게 깨졌다). setTimeout 은 스로틀은 걸려도 온다.
 */
let scanQueued = false;

function queueScan() {
	if (scanQueued) return;
	scanQueued = true;
	setTimeout(() => {
		scanQueued = false;
		scan();
	}, 0);
}

function init() {
	scan();
	// mermaid 는 비동기로 SVG 를 채워 넣는다 — 삽입될 때마다 다시 훑는다.
	const observer = new MutationObserver(queueScan);
	observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
// Starlight 의 뷰 트랜지션으로 페이지가 갈릴 때도 다시 건다.
document.addEventListener("astro:page-load", scan);
