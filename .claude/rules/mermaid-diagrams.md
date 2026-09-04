---
paths:
  - "src/content/docs/**/*.mdx"
---

```` ```mermaid ```` 블록을 건드릴 때만 해당한다. 원본 규약은 skills-guide(전국판)의 `src/content/docs/reference/style.mdx` "D. 도식" 절이다.

## 문법

- 라벨 줄바꿈은 `<br/>` 다. `\n` 은 mermaid 11 에서 줄바꿈이 아니라 **글자로 렌더된다**.
- AWS 서비스·제품 노드는 아이콘 셰이프로 쓴다. 규격은 전 도식 공통:

  ```
  S3@{ icon: "logos:aws-s3", form: "square", label: "S3 버킷<br/>정적 호스팅", pos: "b", h: 46, w: 46 }
  ```

- **아이콘 셰이프는 엣지 문장 안에 못 쓴다.** `A["x"] -->|"라벨"| B["y"]` 를 아이콘화하려면 노드를 각자 줄에 선언하고 엣지는 id 로만 잇는다.
- subgraph 에는 `@{ icon: }` 문법이 없다. 클래스로 붙인다:

  ```
  subgraph EKS["<span class='icon--logos icon--logos--aws-eks'></span> EKS 클러스터"]
  ```

- 개념·데이터·판단 노드(`{"…?"}` 마름모, `"실제 데이터"` 등)는 아이콘 없이 둔다.
- `sequenceDiagram` 은 mermaid 가 아이콘을 지원하지 않는다. 손대지 않는다.
- `graph` 와 `flowchart` 는 아이콘 문법을 똑같이 처리한다. 둘을 통일하려고 기존 도식을 고치지 않는다.

## 아이콘 고르는 순서

1. `aws:*` — AWS 서비스·리소스. 공식 아키텍처 아이콘 패키지에서 뽑은 자체 팩
2. `logos:aws-*` — 자체 팩에 없는 AWS 로고
3. `k8s:*` — 쿠버네티스 리소스. Deployment·Pod·Service·ConfigMap 처럼 종류를 구분해야 할 때. `logos:kubernetes` 는 로고 하나뿐이라 전부 같아 보인다
4. `logos:*` — docker-icon·terraform-icon·helm·prometheus·grafana 등 제품 로고
5. `simple-icons:*` — `logos` 에 없는 브랜드 (fluentbit 등)
6. `mdi:*` — 위 어디에도 없는 **개념**일 때만 (서브넷·계층·라우팅 등)

## 어디에도 없는 아이콘이 필요할 때

CDN 팩(`logos`·`mdi`·`simple-icons`)에 없으면 **외부 공식 소스에서 받아 자체 팩으로 만들어
`astro.config.mjs` 가 `.json` 을 import 하는 방식**으로 붙인다. CDN 에 없다고 비슷한 걸로
때우거나 아이콘을 생략하지 않는다.

| 팩 | 출처 | 생성 스크립트 | 산출물 |
|---|---|---|---|
| `aws` | AWS 공식 아키텍처 아이콘 패키지 (로컬 zip) | `scripts/build-aws-icons.mjs` | `src/icons/aws.json` · `src/styles/mermaid-aws-icons.css` |
| `k8s` | `kubernetes/community` 저장소 (원격 fetch) + `src/assets/icons/` 의 로컬 원본 | `scripts/build-k8s-icons.mjs` | `src/icons/k8s.json` · `src/styles/mermaid-k8s-icons.css` |

공식 세트에도 없는 생태계 프로젝트 로고(Karpenter·KEDA 등)는 원본 파일을 `src/assets/icons/` 에 두고 생성 스크립트의 `LOCAL` 에 등록한다. 스크립트가 96×96 PNG 로 구워 데이터 URI 로 담는다 — 벡터를 그대로 인라인하면 로고가 쓰는 `.cls-1` 같은 일반적인 클래스명이 페이지의 다른 도식과 충돌한다.

절차:

1. 생성 스크립트의 `WANTED` 에 `이름: 소스경로` 를 추가한다. **필요한 것만** 넣는다 — 안 쓰는 아이콘은 데이터 URI 로 CSS 를 불린다.
2. 스크립트를 돌린다. `.json`(노드용)과 `.css`(subgraph `<span>` 용)가 함께 나온다.
3. 산출물을 커밋한다. 빌드 때 다시 받지 않는다.
4. 새 팩이면 `astro.config.mjs` 의 `iconPacks` 와 `customCss` 양쪽에 등록한다.

k8s 아이콘은 **`unlabeled` 변형만** 쓴다. `labeled` 은 아이콘 안에 글자가 그려져 있어 노드
라벨과 겹쳐 두 번 나온다. 그래서 `control_plane_components`(unlabeled 변형이 없다)의
api·sched·kubelet 은 팩에 없다.

CDN 팩(`logos`·`mdi`·`simple-icons`)에서 새 이름을 쓸 때는 `src/mermaid-icons.mjs` 목록에 추가한다.

## 확인

```bash
npm run check:icons
```

목록에 없는 아이콘을 쓰면 그 노드만 조용히 깨지고 **빌드는 통과한다**. 이 스크립트가 유일한 방어선이다.

렌더는 클라이언트에서 일어난다. 노드 개수만 세는 확인으로는 "아이콘이 빈 사각형으로 그려지는" 실패를 못 잡는다 — 실제로 그 사고가 있었다. 브라우저로 볼 때는 아이콘의 `path` 가 실제로 들어있는지까지 본다.
