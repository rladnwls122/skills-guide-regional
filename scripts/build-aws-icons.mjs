/**
 * AWS 공식 아키텍처 아이콘 패키지에서 필요한 SVG 만 골라 mermaid 용 자산 두 개를 만든다.
 *
 * Iconify 의 `logos` 팩에는 ECR·CloudShell 처럼 없는 서비스가 있고, 서브넷·라우팅
 * 테이블 같은 리소스는 아예 브랜드 로고가 아니라 mdi 로 때워야 했다. 공식 패키지를
 * 쓰면 그 자리들이 실제 AWS 아이콘으로 채워진다.
 *
 * 출력 1: src/icons/aws.json  — mermaid iconPacks 에 넘길 IconifyJSON
 * 출력 2: src/styles/mermaid-aws-icons.css — subgraph 라벨의 <span> 용 클래스
 *
 * 실행: node scripts/build-aws-icons.mjs [패키지경로]
 * 패키지 경로 기본값은 아래 DEFAULT_PACKAGE. 다시 뽑을 일이 없으면 안 돌려도 된다 —
 * 결과물이 레포에 커밋되어 있다.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const DEFAULT_PACKAGE =
  'C:/Users/kryuk/Downloads/Asset-Package_07312025.49d3aab7f9e6131e51ade8f7c6c8b961ee7d3bb1';

/**
 * 아이콘 이름 → 패키지 안 파일명(확장자 제외).
 * 이름은 도식에서 `aws:이름` 으로 쓴다.
 */
const WANTED = {
  // Iconify logos 팩에 아예 없는 서비스
  ecr: 'Arch_Amazon-Elastic-Container-Registry_64',
  cloudshell: 'Arch_AWS-CloudShell_64',
  flink: 'Arch_Amazon-Managed-Service-for-Apache-Flink_64',
  msk: 'Arch_Amazon-Managed-Streaming-for-Apache-Kafka_64',
  opensearch: 'Arch_Amazon-OpenSearch-Service_64',
  cli: 'Arch_AWS-Command-Line-Interface_64',

  // 지금까지 mdi 로 때우던 네트워크 리소스
  'nat-gateway': 'Res_Amazon-VPC_NAT-Gateway_48',
  'internet-gateway': 'Res_Amazon-VPC_Internet-Gateway_48',
  'route-table': 'Res_Amazon-Route-53_Route-Table_48',

  // subgraph 용 그룹 아이콘
  vpc: 'Virtual-private-cloud-VPC_32',
  'public-subnet': 'Public-subnet_32',
  'private-subnet': 'Private-subnet_32',
  region: 'Region_32',
};

const packageRoot = process.argv[2] || DEFAULT_PACKAGE;

/** 패키지 전체를 훑어 파일명 → 전체 경로 색인을 만든다. 폴더 구조가 종류마다 다르다. */
async function indexSvgs(dir, index = new Map()) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await indexSvgs(path, index);
    else if (entry.name.endsWith('.svg')) index.set(entry.name.replace(/\.svg$/, ''), path);
  }
  return index;
}

/**
 * IconifyJSON 의 body 는 <svg> 껍데기를 벗긴 알맹이다. 크기는 viewBox 에서 읽는다 —
 * width/height 속성은 80px 처럼 viewBox 와 다른 값이 박혀 있어 그대로 쓰면 안 된다.
 */
function toIconifyIcon(svg) {
  const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!viewBox) throw new Error('viewBox 를 못 읽었다');
  const body = svg
    .replace(/<\?xml[^>]*\?>/, '')
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .trim();
  return { body, width: Number(viewBox[1]), height: Number(viewBox[2]) };
}

const index = await indexSvgs(packageRoot);
const icons = {};
const missing = [];

for (const [name, file] of Object.entries(WANTED)) {
  const path = index.get(file);
  if (!path) {
    missing.push(`${name} (${file})`);
    continue;
  }
  icons[name] = toIconifyIcon(await readFile(path, 'utf8'));
}

if (missing.length) {
  console.error(`패키지에서 못 찾은 아이콘 ${missing.length}개:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

await mkdir('src/icons', { recursive: true });
await writeFile('src/icons/aws.json', JSON.stringify({ prefix: 'aws', icons }) + '\n');

/* subgraph 라벨은 <span class='icon--aws--vpc'> 로 아이콘을 붙인다. Iconify CDN 이
   모르는 팩이므로 CSS 를 직접 만든다 — 데이터 URI 라 추가 요청이 없다. */
const css = [
  '/* AWS 공식 아이콘 — scripts/build-aws-icons.mjs 가 생성한다. 직접 고치지 말 것. */',
  '',
  '.icon--aws {',
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
  css.push(`.icon--aws--${name} {`, `\tbackground-image: url("data:image/svg+xml,${encodeURIComponent(svg)}");`, '}', '');
}
await writeFile('src/styles/mermaid-aws-icons.css', css.join('\n'));

console.log(`아이콘 ${Object.keys(icons).length}개 생성: src/icons/aws.json + src/styles/mermaid-aws-icons.css`);
