/**
 * 도식이 쓰는 아이콘이 src/mermaid-icons.mjs 목록에 있는지 검사한다.
 *
 * 목록에 없는 아이콘을 쓰면 그 노드가 조용히 깨진다 — 빌드는 통과하고
 * 브라우저에서만 티가 나므로 자동 검사가 필요하다.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MERMAID_ICONS } from '../src/mermaid-icons.mjs';

const CONTENT_DIR = 'src/content/docs';

/* CDN 팩(logos·mdi·simple-icons)에 자체 팩(aws)을 합쳐 하나의 목록으로 본다.
   자체 팩은 생성물이라 이름 목록을 따로 관리하지 않고 파일에서 바로 읽는다. */
const localPack = async (name) =>
  Object.keys(JSON.parse(await readFile(`src/icons/${name}.json`, 'utf8')).icons);
const DECLARED = {
  ...MERMAID_ICONS,
  aws: await localPack('aws'),
  k8s: await localPack('k8s'),
};

/* 팩 이름에 하이픈이 들어가면(simple-icons) 팩과 아이콘 경계가 모호해진다 —
   아는 팩 이름만 후보로 두고 가장 긴 것부터 맞춘다. */
const PACKS = Object.keys(DECLARED).sort((a, b) => b.length - a.length).join('|');

/* 노드 아이콘: icon: "logos:aws-s3" · subgraph 아이콘: icon--logos--aws-s3
   이름 부분은 일부러 느슨하게 잡는다 — `[a-z0-9-]` 로 좁히면 `aws-s3X` 같은 오타가
   매칭 자체를 안 해서 "없는 아이콘"이 아니라 "아이콘이 아닌 것"으로 조용히 넘어간다. */
const NODE_ICON = /icon:\s*["']([^"':\s]+):([^"']+)["']/g;
const SPAN_ICON = new RegExp(`icon--(${PACKS})--([^\\s'"<]+)`, 'g');
/* 위 패턴이 못 알아본 icon-- 표기(팩 이름 오타 등)를 따로 잡는다. */
const SPAN_ANY = /icon--([^\s'"<]+)/g;

async function* mdxFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* mdxFiles(path);
    else if (entry.name.endsWith('.mdx')) yield path;
  }
}

const used = new Map(); // "pack:name" -> Set<file>

const record = (key, file) => {
  if (!used.has(key)) used.set(key, new Set());
  used.get(key).add(file);
};

for await (const file of mdxFiles(CONTENT_DIR)) {
  const text = await readFile(file, 'utf8');
  for (const re of [NODE_ICON, SPAN_ICON]) {
    for (const [, pack, name] of text.matchAll(re)) record(`${pack}:${name}`, file);
  }
  /* `icon--` 표기 중 위에서 팩을 못 알아본 것. 팩 이름 자체가 오타면 여기 걸린다.
     기본 클래스(`icon--logos` 처럼 `--` 가 한 번뿐)는 아이콘 참조가 아니므로 건너뛴다. */
  for (const [, rest] of text.matchAll(SPAN_ANY)) {
    if (!rest.includes('--')) continue;
    const [pack, ...tail] = rest.split('--');
    if (DECLARED[pack]) continue; // 위 SPAN_ICON 이 이미 잡았다
    record(`${pack}:${tail.join('--')}`, file);
  }
}

const missing = [];
for (const [key, files] of used) {
  const [pack, name] = key.split(':');
  if (!DECLARED[pack]?.includes(name)) {
    missing.push(`  ${key}  ←  ${[...files].join(', ')}`);
  }
}

const declared = Object.entries(DECLARED).flatMap(([p, names]) => names.map((n) => `${p}:${n}`));
const unused = declared.filter((key) => !used.has(key));

if (unused.length) {
  console.warn(`목록에만 있고 아무 도식도 안 쓰는 아이콘 ${unused.length}개:\n  ${unused.join(', ')}`);
}

if (missing.length) {
  console.error(`목록에 없는 아이콘 ${missing.length}개 — src/mermaid-icons.mjs 에 추가할 것:\n${missing.join('\n')}`);
  process.exit(1);
}

console.log(`아이콘 ${used.size}종 전부 목록에 있음.`);
