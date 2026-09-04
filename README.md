# skills-guide-regional

지방기능경기대회 클라우드컴퓨팅 훈련 문서. [skills-guide](https://skills-learn.zenru.net/)(전국대회판)의 지방대회 버전이다.

전국판이 "한 달에 걸쳐 개념부터 쌓는다"라면 이 문서는 **4년치 지방 기출을 축으로 분해해 반복 출제 지점을 훈련한다**에 가깝다. 지방대회는 4시간 × 2과제이고, 과제 하나가 다루는 서비스 수는 많지만 각 항목의 깊이는 전국보다 얕다. 그래서 훈련 전략이 다르다 — 깊이보다 **속도와 누락 없음**이다.

## 근거

이 문서의 모든 수치·명령·이름표는 실제로 시행된 과제지·채점기준·채점 스크립트에서 왔다.

| 해 | 자료 | 1과제 | 2과제 |
| --- | --- | --- | --- |
| 2023 | 과제지 PDF, 1과제 채점기준(답지) | Web Service Provisioning | Automation (ETL) |
| 2024 | 과제지·채점기준표·mark.sh·배포파일 | Web Service Provisioning | Automation (CI/CD) |
| 2025 | 과제지·채점기준·배포파일 | Solution Architecture | Small Challenge ×4 |
| 2026 | 과제지·채점기준·mark.sh·배포파일 | Solution architecture | Small challenge ×4 |

추론한 내용에는 문서에서 "추정"이라고 적었다. 근거가 있는 것과 없는 것을 섞지 않는다.

## 읽는 순서

| 순서 | 문서 | 무엇을 얻나 |
| --- | --- | --- |
| 1 | [지방대회 지형도](docs/00-competition-map.md) | 형식·시간·배점·채점 흐름이 4년간 어떻게 바뀌었나 |
| 2 | [기출 분해](docs/01-past-exams.md) | 2023~2026 과제 전문 요약과 축 대조표 |
| 3 | [채점 해부](docs/02-scoring.md) | 채점 스크립트가 실제로 보는 것과 감점 지뢰 |
| 4 | [축 1 — 네트워크](docs/03-axis-network.md) | 매년 나오고 배점이 가장 큰 축 |
| 5 | [축 2 — Bastion·IAM](docs/04-axis-bastion.md) | 틀리면 나머지 전부가 0이 되는 축 |
| 6 | [축 3 — 앱 배포와 ALB](docs/05-axis-compute.md) | 형태만 바뀌고 매년 나오는 축 |
| 7 | [축 4 — 데이터 저장소](docs/06-axis-data.md) | 서비스는 바뀌어도 요구는 같은 축 |
| 8 | [축 5 — 관측](docs/07-axis-observability.md) | 배점 대비 가장 싸게 얻는 축 |
| 9 | [2과제 유형 카탈로그](docs/08-task2-catalog.md) | 4년치 2과제 16개 유형 전부 |
| 10 | [훈련 계획과 드릴](docs/09-drills.md) | 무엇을 며칠에 어떤 순서로 |
| 11 | [종료 전 체크리스트](docs/10-checklist.md) | 마지막 30분에 볼 것 |
| 12 | [공식 문서 링크 맵](docs/11-links.md) | 축별로 어느 문서의 어느 절을 읽나 |

## 쓰는 법

시간이 없으면 [채점 해부](docs/02-scoring.md) → [축 1](docs/03-axis-network.md) → [축 2](docs/04-axis-bastion.md) 셋만 본다. 이 셋이 2026 1과제 배점의 절반 가까이(VPC 15.5 + 채점 전제인 Bastion)를 차지한다.
