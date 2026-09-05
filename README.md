# skills-guide-regional

지방기능경기대회 클라우드컴퓨팅 훈련 문서 — Astro Starlight 문서 사이트. [skills-guide](https://skills-2026-learn-module.vercel.app/)(전국대회판)의 지방대회 버전이다.

전국판이 "한 달에 걸쳐 개념부터 쌓는다"라면 이 문서는 **네 해 기출을 축으로 분해해 반복 출제 지점을 훈련한다**에 가깝다. 지방대회는 4시간 × 2과제이고, 과제 하나가 다루는 서비스 수는 많지만 각 항목의 깊이는 전국보다 얕다. 그래서 훈련 전략이 다르다 — 깊이보다 **속도와 누락 없음**이다.

**AWS 를 처음 만지는 사람(고1 기준)을 독자로 쓴다.** 서버·네트워크가 뭔지부터 궁금하면 `basics/` 15편을 먼저 본다.

- 콘텐츠: `src/content/docs/` — `basics/`(사전 지식 15) · `exam/`(대회 이해 3) · `axis/`(과제 축 6) · `drill/`(훈련 3)
- 디자인: [starlight-theme-exquisitus](https://github.com/anaxite/starlight-theme-exquisitus) — 팔레트·서체는 테마가 전담
- 한글 서체: 제목·본문 조선일보명조 · UI Pretendard · 코드 Elice Digital Coding — `src/styles/korean-fonts.css`

## 근거

모든 수치·명령·이름표는 실제로 시행된 과제지·채점기준·채점 스크립트에서 왔다.

| 해 | 자료 | 1과제 | 2과제 |
| --- | --- | --- | --- |
| 2023 | 과제지 PDF, 1과제 채점기준(답지) | Web Service Provisioning | Automation (ETL) |
| 2024 | 과제지·채점기준표·mark.sh·배포파일 | Web Service Provisioning | Automation (CI/CD) |
| 2025 | 과제지·채점기준·배포파일 | Solution Architecture | Small Challenge ×4 |
| 2026 | 과제지·채점기준·mark.sh·배포파일 | Solution architecture | Small challenge ×4 |

추론한 내용에는 문서에서 "추정"이라고 적었다. 근거가 있는 것과 없는 것을 섞지 않는다.

## 문서

사이드바는 네 주제로 갈린다.

| 주제 | 문서 | 무엇 |
| --- | --- | --- |
| 사전 지식 | `basics/00`~`15` | AWS 가 처음이면 여기부터. 지방 기출에 나온 것만 남기고 EFS·Athena 를 새로 넣었다 |
| 대회 이해 | `exam/00`~`02` | 지형도 · 기출 분해 · 채점 해부 |
| 과제 축 | `axis/03`~`08` | 매년 나오는 다섯 축 + 2과제 유형 카탈로그 |
| 훈련 | `drill/09`~`11` | 훈련 계획 · 종료 전 체크리스트 · 공식 문서 링크 맵 |

| 순서 | 문서 | 무엇을 얻나 |
| --- | --- | --- |
| 1 | [지방대회 지형도](src/content/docs/exam/00-competition-map.mdx) | 형식·시간·배점·채점 흐름이 4년간 어떻게 바뀌었나 |
| 2 | [기출 분해](src/content/docs/exam/01-past-exams.mdx) | 2023~2026 과제 전문 요약과 축 대조표 |
| 3 | [채점 해부](src/content/docs/exam/02-scoring.mdx) | 채점 스크립트가 실제로 보는 것과 감점 지뢰 |
| 4 | [축 1 — 네트워크](src/content/docs/axis/03-axis-network.mdx) | 매년 나오고 배점이 가장 큰 축 |
| 5 | [축 2 — Bastion·IAM](src/content/docs/axis/04-axis-bastion.mdx) | 틀리면 나머지 전부가 0이 되는 축 |
| 6 | [축 3 — 앱 배포와 ALB](src/content/docs/axis/05-axis-compute.mdx) | 형태만 바뀌고 매년 나오는 축 |
| 7 | [축 4 — 데이터 저장소](src/content/docs/axis/06-axis-data.mdx) | 서비스는 바뀌어도 요구는 같은 축 |
| 8 | [축 5 — 관측](src/content/docs/axis/07-axis-observability.mdx) | 배점 대비 가장 싸게 얻는 축 |
| 9 | [2과제 유형 카탈로그](src/content/docs/axis/08-task2-catalog.mdx) | 4년치 2과제 16개 유형 전부 |
| 10 | [훈련 계획과 드릴](src/content/docs/drill/09-drills.mdx) | 무엇을 며칠에 어떤 순서로 |
| 11 | [종료 전 체크리스트](src/content/docs/drill/10-checklist.mdx) | 마지막 30분에 볼 것 |
| 12 | [공식 문서 링크 맵](src/content/docs/drill/11-links.mdx) | 축별로 어느 문서의 어느 절을 읽나 |

시간이 없으면 채점 해부 → 축 1 → 축 2 셋만 본다. 이 셋이 2026 1과제 배점의 절반 가까이(VPC 15.5 + 채점 전제인 Bastion)를 차지한다.

## 개발

Node 버전은 [mise](https://mise.jdx.dev) 로 고정한다(`.mise.toml`). 설치 후:

```bash
mise install     # .mise.toml 이 지정한 node 버전을 받아 프로젝트 전용으로 고정
mise trust       # 최초 1회 — 이 디렉터리의 .mise.toml 을 신뢰
```

**mise 설치**

| OS | 명령 |
| --- | --- |
| macOS | `brew install mise` |
| Linux | `curl https://mise.run \| sh` |
| Windows | `winget install jdx.mise` |

```bash
npm install
npm run dev      # 로컬 미리보기
npm run build    # 프로덕션 빌드 (starlight-links-validator 포함)
```

mise 셸 통합(`mise activate`)이 없으면 명령 앞에 `mise exec --` 를 붙인다.
