---
paths:
  - "astro.config.mjs"
  - "src/styles/**"
  - "package.json"
---

사이트 설정. 여기서 낸 회귀는 빌드가 아니라 브라우저에서만 드러난다 — 고쳤으면 대표 페이지를 다크·라이트 양쪽에서 확인한다.

## 전국판에서 가져온 것과 뺀 것

`skills-guide`(전국판)의 설정을 그대로 복사하지 않았다. 이 저장소는 문서 12편에 컴포넌트가 없으므로 다음만 가져왔다.

| 가져온 것 | 이유 |
| --- | --- |
| `starlight-theme-exquisitus` | 전국판과 같은 외형 |
| `korean-fonts.css` + 서체 서브셋 4벌 | 한글 글리프. 테마 라틴 서체에는 없다 |
| `markdown.gfm: false` + `remark-gfm({singleTilde:false})` | 홑물결 취소선 차단 |
| `rehype-external-links` | 외부 링크 새 탭 |
| `astro-mermaid` (`autoTheme:false`) | 도식이 생겼을 때 바로 쓰려고 |
| `starlight-links-validator` | 죽은 내부 링크에서 빌드를 깨뜨린다 |

뺀 것: Vercel 어댑터(API 라우트 없음), Tailwind·Svelte(컴포넌트 없음), `starlight-sidebar-topics`(문서 12편이라 평평한 사이드바로 충분), quiz·llm-actions·fullview, AWS·k8s 자체 아이콘 팩(도식 없음).

**필요해지면 그때 전국판에서 가져온다.** 미리 붙여 두지 않는다.

## 되돌리지 않을 것

- **`markdown.gfm: false` + `remark-gfm` 을 `singleTilde: false` 로 직접 넣은 것.** GFM 기본값은 홑물결(`~`)도 취소선 구분자로 먹어 `3~4h` 같은 범위 표기 사이가 통째로 취소선이 된다. 표·작업 목록 등 나머지 GFM 은 그대로 산다.
- **mermaid 의 `autoTheme: false`.** 켜면 `data-theme` 가 바뀔 때마다 모든 도식의 `data-processed` 를 떼고 mermaid 를 통째로 다시 돌린다 — 테마를 누를 때마다 도식이 빈 칸이 됐다 수백 ms 뒤 돌아온다. 같은 값을 다시 써도 재렌더가 걸리고, Starlight 의 ThemeSelect 가 헤더·모바일 두 곳에서 같은 값을 쓰므로 페이지를 열 때마다 렌더가 여러 벌 돈다.
- **`starlightLinksValidator({ errorOnRelativeLinks: false })`.** 상대 링크를 금지하진 않되 죽은 내부 링크에서 빌드를 깨뜨린다. 예전의 셸 링크 검사 스크립트를 이게 대체했다.

## Starlight 버전이 걸리는 곳

- **`autogenerate` 에 `label` 을 직접 붙일 수 없다**(v0.39.0에서 제거됨). 그룹을 만들고 그 안 `items` 배열에 autogenerate 를 넣는다.

  ```js
  sidebar: [{ label: '가이드', items: [{ autogenerate: { directory: 'guide' } }] }]
  ```

- `social` 은 객체가 아니라 배열이다(`[{ icon, label, href }]`).

## 서체

`korean-fonts.css` 의 `@font-face` 선언은 캐스케이드 레이어 밖에 있어 `@layer exquisitus` 안의 테마 토큰보다 우선한다 — `customCss` 순서와 무관하게 적용된다.

- 제목·본문 → Chosun Sm(조선일보명조), UI 크롬 → Pretendard, 코드 → Elice Digital Coding.
- Chosun Sm 은 단일 굵기 파일이라 **`font-weight: 400` 만 선언한다.** `400 700` 으로 범위를 주면 브라우저 합성이 꺼져 제목이 본문 굵기로 주저앉는다.
- 서브셋 파일은 skills-guide 에서 가져왔다. 다시 만들려면 그쪽 `scripts/subset-font.py` 를 쓴다.

## 배포

정적 빌드다. `npm run build` 가 `dist/` 를 내고 어느 정적 호스팅에나 그대로 올라간다. 도메인을 붙이면 `astro.config.mjs` 의 `site` 를 채운다 — 사이트맵과 canonical URL 이 그걸 쓴다(지금은 빌드 때 sitemap 경고가 나는 이유다).
