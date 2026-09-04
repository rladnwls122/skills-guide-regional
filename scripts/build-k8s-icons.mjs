/**
 * 쿠버네티스 생태계 아이콘을 mermaid 용 자산으로 만든다. 공식 세트(kubernetes/community)에서
 * 필요한 것만 받고, 거기 없는 프로젝트 로고는 src/assets/icons/ 의 원본에서 굽는다.
 *
 * Iconify 에는 `logos:kubernetes` 로고 하나뿐이라 Deployment·Pod·Service 같은
 * 리소스를 구분할 수 없다. 공식 세트를 쓰면 리소스별로 다른 아이콘이 붙는다.
 *
 * 라벨이 그려진 변형(labeled)은 쓰지 않는다 — 도식이 이미 노드 라벨을 갖고 있어
 * 글자가 두 번 나온다. unlabeled 만 받는다. 그래서 control_plane_components
 * (api·sched·kubelet 등, unlabeled 변형이 없다)는 목록에 없다.
 *
 * 출력 1: src/icons/k8s.json — mermaid iconPacks 에 넘길 IconifyJSON
 * 출력 2: src/styles/mermaid-k8s-icons.css — subgraph 라벨의 <span> 용 클래스
 *
 * 실행: node scripts/build-k8s-icons.mjs
 * 결과물이 커밋되어 있으므로 아이콘을 늘릴 때만 다시 돌린다.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const BASE = 'https://raw.githubusercontent.com/kubernetes/community/master/icons/svg';

/**
 * 공식 세트에 없어 따로 받아 둔 생태계 프로젝트 로고. `src/assets/icons/` 의 원본을
 * 96×96 PNG 로 굽고 데이터 URI 로 담는다.
 *
 * 왜 벡터를 그대로 안 쓰나: KEDA 로고는 `<defs>` 안에 `.cls-1` 같은 일반적인 클래스명과
 * 그라디언트를 쓴다. mermaid 는 아이콘 body 를 페이지 SVG 안에 그대로 인라인하므로
 * 클래스명이 다른 도식과 충돌한다. 46px 로 그려지는 아이콘이라 96px 래스터로 충분하다.
 */
const LOCAL = {
  karpenter: 'src/assets/icons/karpenter.png',
  keda: 'src/assets/icons/keda.svg',
};
const RASTER = 96;

/** 아이콘 이름 → 저장소 안 경로. 도식에서 `k8s:이름` 으로 쓴다. */
const WANTED = {
  deploy: 'resources/unlabeled/deploy.svg',
  pod: 'resources/unlabeled/pod.svg',
  svc: 'resources/unlabeled/svc.svg',
  ns: 'resources/unlabeled/ns.svg',
  cm: 'resources/unlabeled/cm.svg',
  secret: 'resources/unlabeled/secret.svg',
  sa: 'resources/unlabeled/sa.svg',
  etcd: 'infrastructure_components/unlabeled/etcd.svg',
  'control-plane': 'infrastructure_components/unlabeled/control-plane.svg',
};

/**
 * Inkscape 로 만든 파일이라 편집기 메타데이터가 잔뜩 붙어 있다. 그리기와 무관한
 * 것을 걷어내야 데이터 URI 크기가 몇 배로 줄고, mermaid 가 body 를 그대로 인라인해도
 * 문서의 다른 요소와 id 가 충돌하지 않는다.
 */
function toIconifyIcon(svg) {
  const viewBox = svg.match(/viewBox="([\d.\-\s]+)"/);
  if (!viewBox) throw new Error('viewBox 를 못 읽었다');
  const [, , w, h] = viewBox[1].trim().split(/\s+/).map(Number);

  const body = svg
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/g, '')
    .replace(/<defs[\s\S]*?<\/defs>/g, '')
    .replace(/<defs[^>]*\/>/g, '')
    .replace(/<sodipodi:namedview[\s\S]*?(?:\/>|<\/sodipodi:namedview>)/g, '')
    .replace(/<svg[\s\S]*?>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/\s(?:inkscape|sodipodi):[\w-]+="[^"]*"/g, '')
    .replace(/\sid="[^"]*"/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { body, width: w, height: h };
}

const icons = {};
for (const [name, path] of Object.entries(WANTED)) {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`${name}: ${res.status} ${path}`);
  icons[name] = toIconifyIcon(await res.text());
}

for (const [name, file] of Object.entries(LOCAL)) {
  // density 는 svg 원본을 크게 렌더시켜 축소 전 계단현상을 없앤다. png 원본에는 무해하다.
  const png = await sharp(file, { density: 300 })
    .resize(RASTER, RASTER, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  icons[name] = {
    body: `<image width="${RASTER}" height="${RASTER}" href="data:image/png;base64,${png.toString('base64')}"/>`,
    width: RASTER,
    height: RASTER,
  };
}

await mkdir('src/icons', { recursive: true });
await writeFile('src/icons/k8s.json', JSON.stringify({ prefix: 'k8s', icons }) + '\n');

const css = [
  '/* kubernetes 공식 아이콘 — scripts/build-k8s-icons.mjs 가 생성한다. 직접 고치지 말 것. */',
  '',
  '.icon--k8s {',
  '\tdisplay: inline-block;',
  '\twidth: 1em;',
  '\theight: 1em;',
  '\tbackground-repeat: no-repeat;',
  '\tbackground-size: 100% 100%;',
  '\tfont-size: 18px;',
  '\tvertical-align: -0.2em;',
  '}',
  '',
];
for (const [name, icon] of Object.entries(icons)) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${icon.width} ${icon.height}'>` +
    `${icon.body}</svg>`;
  css.push(
    `.icon--k8s--${name} {`,
    `\tbackground-image: url("data:image/svg+xml,${encodeURIComponent(svg)}");`,
    '}',
    ''
  );
}
await writeFile('src/styles/mermaid-k8s-icons.css', css.join('\n'));

console.log(`아이콘 ${Object.keys(icons).length}개 생성: src/icons/k8s.json + src/styles/mermaid-k8s-icons.css`);
