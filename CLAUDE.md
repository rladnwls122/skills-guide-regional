# CLAUDE.md

지방기능경기대회 클라우드컴퓨팅 훈련 가이드를 담은 Astro Starlight 문서 사이트. 애플리케이션 코드는 없고 `.mdx` 콘텐츠가 전부다 — 하는 일은 **문서 작성**과 **사이트 설정 조정** 둘 중 하나다.

**독자는 고등학교 1학년, AWS 를 처음 만지는 사람이다.** 문서를 고칠 때 이 전제를 유지한다 — 비유를 먼저 주고, 약어를 풀어 쓰고, 겁주는 대신 무엇을 보면 되는지를 준다. 자세한 것은 `.claude/rules/docs-style.md`.

전국대회판인 [`C:\Users\kryuk\skills-guide`](https://skills-learn.zenru.net/) 의 지방대회 버전이다. 문체·문서 유형 규칙은 그쪽 `src/content/docs/reference/style.mdx` 가 원본이고, 이 저장소는 그중 실제로 쓰는 부분만 `.claude/rules/docs-style.md` 로 줄여 두었다.

## 콘텐츠 근거

문서 내용의 근거는 레포 밖에 있다. 사이트 콘텐츠만 보고 판단하지 않는다.

- `C:\Users\kryuk\Downloads` 의 `37.*` 압축 파일들 — 2023·2024·2025·2026 지방 과제지·채점기준·채점 스크립트·배포파일
- `.hwp` 는 OLE 복합 문서다. `olefile` 로 `BodyText/SectionN` 을 열어 raw deflate 로 풀고 `HWPTAG_PARA_TEXT`(태그 67) 레코드를 UTF-16LE 로 읽으면 본문이 나온다. 제어문자 1~23 중 확장·인라인 컨트롤은 16바이트를 건너뛴다.
- `.pdf` 는 `pdftotext -enc UTF-8` 로 충분하다.

**근거의 층을 섞지 않는다.** 과제지·채점기준·채점 스크립트는 실제로 시행된 것이고, "다음에 나올 것" 같은 절은 추정이다. 문서에서 그 둘을 구분해 적었으니 고칠 때도 유지한다.

## 이 저장소가 특별히 붙잡고 있는 사실

문서 여러 곳이 이걸 전제로 쓰여 있다. 되돌리거나 뭉개지 않는다.

- **채점은 CLI 출력 대조다.** `mark.sh` 가 정해진 `aws` 명령을 돌리고 사람이 문자열을 눈으로 맞춘다. `docs/02-scoring` 이 이 사실에서 나머지를 전개하고 축 문서들이 그걸 참조한다.
- **2026 2과제 Athena 채점기준의 기대값(3.8·4.5)은 배포된 CSV와 안 맞는다.** 실제 계산은 4.05·4.333…이다. 이 불일치는 확인된 것이니 "오타 같다"며 지우지 않는다.
- **2026 2과제 IAM 문제에 `dynamodb:Select` 조건을 넣으면 채점 3-7이 오히려 실패한다.** 채점이 `--projection-expression` 없이 `get-item` 을 부르기 때문이다. AWS 문서 권장과 반대 방향이라 근거를 문서에 남겨 두었다.
- **2025 채점기준에는 클러스터 이름 오기 등 오류가 여럿 있다.** 목록은 `02-scoring` 7절이다.

## 함정

- **`npm run dev` 는 데몬화된다.** 이미 떠 있는지 먼저 확인한다. 종료는 `npx astro dev stop`. **새 문서를 추가하면 재시작해야 한다** — 콘텐츠 컬렉션이 갱신되지 않아 404 가 난다.
- Node 버전은 mise 로 고정한다(`.mise.toml`). 셸 통합이 없으면 `mise exec --` 를 앞에 붙인다.
- **콘텐츠는 `src/content/docs/` 다.** `starlight-sidebar-topics` 가 디렉터리별로 주제를 나눈다 — `basics/`(사전 지식) · `exam/`(대회 이해) · `axis/`(과제 축) · `drill/`(훈련). 순서는 각 문서 frontmatter 의 `sidebar.order` 다.
- **문서는 `.mdx` 다.** 퀴즈(`<Quiz>`)와 `<Aside>`·`<Steps>` 를 쓰기 때문이다. 다만 본문에 꺾쇠·중괄호가 그대로 나오면 JSX 로 파싱돼 빌드가 깨진다 — `<선수 비번호>`·`{"name": "..."}` 같은 것은 **반드시 백틱이나 코드 펜스 안에** 둔다.
- **퀴즈 import 경로는 `starlight-quiz/components` 다.** `starlight-quiz/components/Quiz.astro` 는 export 되어 있지 않아 빌드가 깨진다.
- **도식 아이콘은 `npm run check:icons` 로 검사한다.** 목록에 없는 아이콘을 쓰면 그 노드만 빈 사각형이 되고 빌드는 통과한다.
- **사이트 내부 링크는 절대 경로로 쓴다**(`/exam/02-scoring/`). 상대 링크는 검증기가 잡지 않는다.
- 한글 서체 파일은 skills-guide 에서 가져온 서브셋이다. 다시 만들려면 그쪽 `scripts/subset-font.py` 를 쓴다.

## 검증

```bash
mise exec -- npm run build       # 죽은 내부 링크에서 빌드가 깨진다
mise exec -- npm run check:icons # 도식 아이콘이 팩에 있는지
```

문서를 고쳤으면 둘 다 돌린다.

## 규칙

커밋 메시지는 한국어로 쓰고, 무엇을 왜 바꿨는지를 본문에 남긴다.

나머지는 파일을 건드릴 때 `.claude/rules/` 에서 자동으로 붙는다 — 문서는 `docs-style.md`, 사이트 설정은 `site-config.md`.
