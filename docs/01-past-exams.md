# 기출 분해 — 2023 · 2024 · 2025 · 2026 지방

> 문서 유형: reference

4년치 과제지를 과제별로 분해한다. 아래 내용은 전부 실제 과제지·채점기준에서 왔다.

## 1. 축 대조표

| 축 | 2023 | 2024 | 2025 | 2026 | 판정 |
| --- | --- | --- | --- | --- | --- |
| VPC·서브넷·라우팅 | 10.0.0.0/16, pub/priv ×2AZ | 10.100.0.0/16, pub/priv/protected ×2AZ | 10.101.0.0/16, pub/priv ×2AZ | **VPC 2개 + Peering** 10.0/16, 10.100/16 | **매년** |
| Bastion | t3.small, EIP, PowerUser | t4g.large, EIP, SSH 포트 변경, kubectl | t3.micro, EIP, SSH | t3.micro, SSH 또는 SSM, Administrator 급 | **매년** (2026 2과제만 없음) |
| 컨테이너/앱 배포 | ECS Fargate ×2 서비스 | EKS(Nodegroup 2 + Fargate Profile) | ECS on EC2 + Service Connect | **ASG + EC2** (컨테이너 아님) | **매년** |
| 로드밸런서 | ALB 경로 라우팅 /about /projects | ALB internet-facing | ALB + /health | ALB + Fixed response 403 | **매년** |
| 이미지 레지스트리 | ECR, 스캔, latest 태그 | ECR, KMS, 스캔, immutable | ECR, 스캔, immutable, 암호화 | 없음 | 3/4년 |
| 관계형 DB | 없음 | 없음 | 없음 | Aurora MySQL 8.0, 포트 3307 | 2026 |
| NoSQL·기타 DB | 없음 | DocumentDB 5.0 + ElastiCache Redis 7.0 | DynamoDB PAY_PER_REQUEST | DynamoDB(2과제) | 3/4년 |
| 비기본 포트 강제 | 없음 | MongoDB·Redis 둘 다 | 없음 | RDS 3307 | 2/4년 |
| 암호화(KMS/CMK) | 없음 | ECR·EKS Secret·DocumentDB·ElastiCache | DynamoDB SSE CMK | RDS·Secret·DynamoDB·EFS·Lambda 코드 | 3/4년 |
| Secrets Manager | 없음 | JWT 시크릿 | 없음 | DB 접속 정보 + CMK + admin 금지 | 2/4년 |
| CDN | CloudFront 캐시 분기 | CloudFront + S3 정적 호스팅 | 없음 | 없음 | 2/4년 |
| CloudWatch 대시보드 | 없음 | 없음 | ProductService 대시보드 + 알람 | worldpay-dashboard | 2/4년 |
| CloudWatch Logs | 없음 | /aws/app/user, /aws/app/token | /ws/ecs/gateway, /ws/ecs/product | worldpay-log-group + 보관 30일 | 3/4년 |
| 오토스케일링 | 없음 | HPA + Cluster Autoscaler (Pod·Node 둘 다) | 없음 | ASG CPU 70% 정책 | 2/4년 |
| 앱 동작 검증 (curl POST→GET) | about/projects 페이지 | user→token JWT 발행 | POST /v1/item → GET ?uuid | POST /v1/users → GET ?uid | **매년** |
| 2과제 성격 | ETL 파이프라인 | CI/CD 파이프라인 | 독립 4문제 | 독립 4문제 | 2025 전환 |

**읽는 법.** "매년"이 붙은 다섯 축 — VPC, Bastion, 앱 배포, 로드밸런서, 앱 동작 검증 — 은 도구가 바뀌어도 반드시 나온다. 2026이 컨테이너를 버리고 ASG로 간 것이 좋은 예다. 배포 수단은 ECS·EKS·ASG 중 무엇이든 될 수 있지만 "앱을 여러 대 띄워 ALB 뒤에 붙이고 curl로 검증한다"는 안 바뀐다.

---

## 2. 2023 지방

### 2-1. 1과제 — Web Service Provisioning (60점)

Python/Flask 앱 두 개(about, projects)를 ECS에 올리고 ALB 경로 라우팅과 CloudFront 캐시 분기를 건다.

| 주요항목 | 배점 | 세부 |
| --- | --- | --- |
| 네트워킹 | 7.5 | VPC 1.5 / Subnet 1.5 / IGW 1.5 / NAT 1.5 / HA 1.5 |
| Bastion | 3 | EC2 1.5 / EIP 1.5 |
| ECR | 6 | 생성 3 / 스캔 3 |
| ECS | 16.5 | Cluster 1.5 / TaskDef 4.5 / Service 3 / Task 1.5 / HA 3 / Security 3 |
| ALB | 7.5 | 생성 3 / Listener 3 / Security 1.5 |
| Target Group | 9 | 생성 3 / Healthy 3 / HA 3 |
| CloudFront | 10.5 | 생성 3 / 연결 3 / 캐시 3 / Edge 1.5 |

- VPC `wsi-vpc` 10.0.0.0/16, public a/b(10.0.1·2.0/24), private a/b(10.0.3·4.0/24). **NAT를 AZ별로 하나씩 두 개** — 채점 1-4가 `wsi-private-rtb-a` 와 `-rtb-b` 의 NAT ID가 서로 다른지 본다.
- Bastion `wsi-bastion` t3.small, Amazon Linux 2, EIP, PowerUserAccess.
- ECR `wsi-about` / `wsi-projects`, 태그 `latest`, 스캔 결과에 CRITICAL·HIGH·MEDIUM·LOW 가 하나도 없어야 한다.
- ECS 클러스터 `wsi-ecs`. 문제지 본문은 "모든 컨테이너는 EC2에서 실행"과 "모든 서비스는 Fargate(Linux)에서 실행"을 **둘 다** 적고 있어 모순이다. 채점 4-1은 `clusters[].capacityProviders[]` 가 `FARGATE`, `FARGATE_SPOT` 인지 본다 — **채점 쪽이 정본이다.**
- ALB `wsi-alb`, `/about` → `wsi-about-tg`, `/projects` → `wsi-projects-tg`. ALB는 CloudFront 경유 요청만 허용.
- CloudFront: about은 캐시, projects는 캐시 안 함. IPv6 비활성화, CloudFront는 하나만 생성.

### 2-2. 2과제 — Automation, ETL 파이프라인 (40점 추정)

`API Gateway(REST) → Kinesis Data Streams → Kinesis Data Firehose → S3 → Glue 크롤러 → Glue Job → Glue 워크플로` 한 줄기.

- S3 `wsi-<비번호>-<4자리 영문>-etl`, 지급 파일을 `data/ref/titles.json` 과 `data/raw/2022/01/01/samplelog.json` 에 업로드.
- API Gateway `wsi-api`, 리소스 `/api`, 스테이지 `prod`. POST 본문의 단일 레코드를 Kinesis에 쓴다.
- Data Stream `wsi-data-stream`, 프로비저닝 모드 샤드 1.
- Firehose `wsi-delivery-stream`, 저장 위치 `<버킷>/data/raw/<YYYY>/<MM>/<dd>/<HH>/`, 동적 파티셔닝·압축·암호화 전부 끄기.
- Glue 크롤러 `wsi-glue-crawler` → DB `wsi-glue-database`, 테이블 `ref`·`raw`.
- Glue Job `wsi-glue-job`: raw와 ref를 조인해 `title_id`, `title`, `uuid`, `device_ts`, `device_id`, `device_type` 형태로 변환 후 `<버킷>/result/` 에 JSON 저장, 테이블 `result` 로 갱신.
- 워크플로 `wsi-glue-workflow`: 크롤러 성공 → Job 실행.

---

## 3. 2024 지방

### 3-1. 1과제 — Web Service Provisioning (60점)

MSA 인증 시스템. Golang 바이너리 두 개(user는 ARM64, token은 x86_64)를 **Private EKS** 위에 올린다. 4년 중 1과제 난도가 가장 높다.

| 주요항목 | 배점 | 주요항목 | 배점 |
| --- | --- | --- | --- |
| In-Memory Database | 13.5 | Container Orchestration | 6.0 |
| NoSQL Database | 12.0 | Auto Scaling | 6.0 |
| Image Repository | 6.0 | Networking | 4.5 |
| Application | 4.5 | Bastion Server | 3.0 |
| Logging | 3.0 | Load Balancing | 1.5 |

- VPC `skills-vpc` 10.100.0.0/16. **3단 서브넷** — public(10.100.1·2.0/24) / private(11·12) / **protected(21·22, 인터넷 접근 없음)**. 라우팅 테이블 4개.
- Bastion `skills-bastion-ec2` t4g.large, **SSH 기본 포트 금지**, root 계정에서 AWS 전체 권한 + 해당 EKS 전체 권한, 패키지 AWS CLI v2·cURL·jq·kubectl.
- DocumentDB `skills-mongodb-cluster` 5.0.0, db.t4g.medium, **기본 포트 변경**, HA, 암호화, audit·profiler 로깅, 백업, 인터넷 미연결.
- ElastiCache Redis `skills-redis-cluster` 7.0, t4g.small, **기본 포트 변경**, HA, at-rest·transit 암호화, 로깅, 백업, **샤딩 활성화**.
- ECR `user`·`token`, KMS 암호화, 스캔, immutable 태그.
- EKS `skills-eks-cluster` 최신 버전, **Private 클러스터**(API 외부 접근 불가, Bastion만 접근), 컨트롤 플레인 전 로그 CloudWatch, K8s Secret KMS 암호화.
  - `skills-eks-addon-nodegroup` t4g.large ×2 — 애드온 전용
  - `skills-eks-app-nodegroup` m6g.large ×2 — user 전용
  - `skills-eks-app-profile` Fargate 0.5vCPU/1GB — token 전용
  - DaemonSet은 Fargate를 제외한 모든 노드에서
- ALB `skills-user-alb` internet-facing HTTP 80.
- 오토스케일링: Pod CPU 10% 기준, **user는 Pod가 늘면 Node도 늘어야 한다**(Cluster Autoscaler), token은 Fargate Pod만. Scale-out 5분 이내, Scale-in 20분 이내.
- 로깅: `/aws/app/user`, `/aws/app/token`.

앱 환경 변수(부록 2)가 그대로 채점 전제다. user는 `MONGODB_HOST/PORT/USERNAME/PASSWORD`, `AWS_REGION`, `AWS_SECRET_NAME`, `TOKEN_ENDPOINT`. token은 `REDIS_HOST`, `REDIS_PORT`. 둘 다 8080. Secret은 `{"secretValue":"..."}` 형식.

### 3-2. 2과제 — Automation, CI/CD 파이프라인 (40점)

| 주요항목 | 배점 | 주요항목 | 배점 |
| --- | --- | --- | --- |
| Content Delivery Network | 7.5 | Bastion Server | 4.5 |
| Version Control | 6.0 | Networking | 4.0 |
| Application | 6.0 | Continuous Integration | 3.0 |
| Continuous Delivery | 3.0 | CI/CD Pipeline | 3.0 |
| Application Load Balancer | 3.0 | | |

- VPC `skills-vpc` **172.16.0.0/16** (1과제와 CIDR이 다르다). public a/b, private a/b.
- Bastion `skills-bastion-ec2` t3a.small.
- S3 `skills-frontend-<랜덤 4자리>` + CloudFront. HTTPS 접근, 오리진 두 개(S3, ELB), 전 세계 Edge. **프런트는 캐시하되 배포 후 최신 화면이 나와야 하고, `/api/*` 는 캐시 금지.**
- ECS Fargate `skills-ecs-cluster`, 서비스 `backend` 0.5vCPU/1GB, Task 2개, Private Subnet.
- ALB `skills-backend-alb` internet-facing HTTP 80.
- CodeCommit `skills-frontend-code`, `skills-backend-code`, 기본 브랜치 `main`.
- CodeBuild `skills-backend-build`, **로깅 필수**.
- CodeDeploy `skills-backend-app` / `skills-backend-dg`, **Blue/Green**, 대상은 ECS `backend` 서비스.
- CodePipeline `skills-frontend-pipeline`(Source→Deploy to S3), `skills-backend-pipeline`(**Source→Build→Deploy 정확히 3단계, 다른 스테이지 금지**). main 푸시 후 15분 이내 배포 완료.

---

## 4. 2025 지방

### 4-1. 1과제 — Solution Architecture (50점)

Golang 앱 두 개(gateway, product)를 ECS on EC2에 올리고 Service Connect로 잇는다.

| 주요항목 | 배점 |
| --- | --- |
| Container | 20 |
| Network | 10 |
| Database | 10 |
| Monitoring | 10 |

- VPC `ws-vpc` 10.101.0.0/16. 서브넷 `ws-pub-a/c`, `ws-priv-a/c`, 라우팅 `ws-pub-rt`, `ws-priv-rt-a`, `ws-priv-rt-c`. **서브넷 마스크는 자유** — 4년 중 유일하게 서브넷 CIDR을 안 준 해다.
- Bastion `ws-bastion` t3.micro, Amazon Linux 2, EIP, 패키지 awscli·curl·docker·jq.
- ALB `gateway-alb-pub` (public).
- 앱: gateway(NGINX 등으로 직접 구성, `/health` 200 반환) → product(REST, DynamoDB 읽고 쓰기). 포트 8080.
  - `POST /v1/item {"name","owner"}` → `{"result":"added","uuid":"xxxx"}`
  - `GET /v1/item?uuid=xxxx` → `{"uuid","name"}`
  - `GET /health` → `{"status":"OK","app":"product"}`
- ECR `gateway`, `product`. Private, 업로드 시 스캔, **취약점 0**, 같은 태그 재업로드 금지(immutable), 암호화. `v1.0.0` 태그로 업로드.
- ECS `ws-cluster`, 서비스 `gateway-svc`·`product-svc`, TaskDef `gateway-td`·`product-td`, EC2 t3.small. **컨테이너 SHELL 접근 가능(ECS Exec)**, latest 태그 금지.
  - Service Connect 환경 변수 `CONN_GATEWAY`, `CONN_PRODUCT`. gateway 컨테이너에서 `curl http://gateway` 가 되어야 한다.
- DynamoDB `product`, PAY_PER_REQUEST, 키 uuid·name·owner, CMK SSE 암호화, 백업, PITR, 삭제 방지.
- CloudWatch: 대시보드 `ProductService` (EC2 CPU·Network, ALB 4xx·5xx), **5분 내 4xx 10개 이상이면 알람**, Container Insights, 로그 그룹 `/ws/ecs/gateway`·`/ws/ecs/product`.

### 4-2. 2과제 — Small Challenge (50점, 12.5×4)

**① Secure Access via VPN** — VPC `ws-vpn-vpc` 10.99.0.0/16, public a/b(10.99.0·1.0/24), private a/b(10.99.10·11.0/24). private에 EC2 `ws-web-a`·`ws-web-b`, SSM 접근, `index.html` 에 `Welcome to the ws portal`. Client VPN `ws-client-vpn`, 클라이언트 CIDR 10.254.0.0/16, **상호 인증(mutual authentication)**, 대상 네트워크는 private 서브넷 둘, 인가 규칙은 VPC CIDR만. **VPN 프로필을 미리 만들어 둬야 한다** — 채점 1-8이 선수 PC의 AWS VPN Client로 실제 연결한다.

**② Event-driven Autoscaling** — EKS `order-cluster` 1.31, 네임스페이스 `order`, Deployment `order-processor` 최소 1 Pod, 환경 변수 `QUEUE_URL`·`REGION_NAME`. Bastion `order-bastion`. SQS `order-queue`. **KEDA** 설치(Pod 이름에 `keda-operator` 포함), ScaledObject로 SQS 메시지 수 기준 스케일링(권장 임계 5). **과제 종료 시점에 Pod가 정확히 1개여야 한다** — 2개 이상이면 채점 불가.

**③ Infrastructure as Code** — Bastion `korea-bastion` (Default VPC, AdministratorAccess). Terraform 코드는 `/home/ec2-user/korea/` 에. 채점자가 `terraform init && terraform destroy -auto-approve && terraform apply -auto-approve` 를 돌린다. 생성물: VPC `korea-vpc` 10.0.0.0/16, `korea-public-subnet-a` 10.0.0.0/24(2a), EC2 `korea-instance` t3.micro, EBS 암호화, SSM 가능한 IAM role. 모든 리소스에 `Project=KoreaSkills` 태그.

**④ EC2 automation** — **도쿄(ap-northeast-1)**. Bastion `automation-bastion`, 종료 방지 활성화. `/home/ec2-user/ec2-automation/` 에 스크립트 둘.
- `delete_old_instance.sh` — `Project=skills2022` 태그 인스턴스만 삭제
- `delete_all_instance.sh` — Bastion 제외 전체 삭제

---

## 5. 2026 지방

### 5-1. 1과제 — Solution architecture (50점)

WorldPay 유저 관리. Python/FastAPI + Aurora MySQL. **컨테이너가 사라지고 ASG + EC2 로 돌아왔다.**

| 주요항목 | 배점 | 주요항목 | 배점 |
| --- | --- | --- | --- |
| VPC | 15.5 | Application | 4.5 |
| RDS | 7.0 | Secrets Manager | 4.5 |
| ASG | 6.5 | ALB | 4.0 |
| CW Logs | 4.0 | CloudWatch | 4.0 |

- **VPC 2개 + Peering.** `worldpay-app-vpc` 10.0.0.0/16, `worldpay-db-vpc` 10.100.0.0/16, Peering `worldpay-vpc-peering` 에서 **양방향 DNS resolution 활성화**.

  | Name tag | CIDR | Route table | VPC |
  | --- | --- | --- | --- |
  | worldpay-pub-subnet-a | 10.0.0.0/24 | worldpay-pub-rt | app |
  | worldpay-pub-subnet-c | 10.0.1.0/24 | worldpay-pub-rt | app |
  | worldpay-app-subnet-a | 10.0.10.0/24 | worldpay-app-rt-a | app |
  | worldpay-app-subnet-c | 10.0.11.0/24 | worldpay-app-rt-c | app |
  | worldpay-db-subnet-a | 10.100.0.0/24 | worldpay-db-rt | db |
  | worldpay-db-subnet-c | 10.100.1.0/24 | worldpay-db-rt | db |

- NACL `worldpay-db-nacl` — **inbound·outbound 어느 쪽 allow 규칙에도 `0.0.0.0/0` 이 있으면 안 된다.**
- 두 VPC 모두 Flow log. Secrets Manager 용 **VPC endpoint(PrivateLink)**.
- Bastion `worldpay-bastion` t3.micro, `worldpay-pub-subnet-a`, Administrator 급 IAM.
- ASG `worldpay-asg`, 인스턴스 Name tag `worldpay-app`, t3.micro, **min 2**, CPU 70% 스케일 정책.
- ALB `worldpay-alb`, public 서브넷 둘, HTTP 80. **정의되지 않은 경로는 Fixed response 403.**
- RDS `worldpay-rds` aurora-mysql 8.0, db.t3.medium, **포트 3307**, KMS 암호화, public access 끄기, db 서브넷.

  ```sql
  CREATE TABLE `worldpay`.`users` (
    uid INT AUTO_INCREMENT, name VARCHAR(255), age INT, PRIMARY KEY (uid)
  );
  ```

- Secrets Manager `worldpay-secret`, **CMK 암호화**, `{"username","password","host"}`, **username이 admin이면 안 된다.**
- CloudWatch Logs `worldpay-log-group`, **보관 30일**, 로그 5분 내 도달.
- 대시보드 `worldpay-dashboard`: ALB `HTTP_Fixed_Response_Count` + ASG 평균 CPU.

앱 API: `POST /v1/users {"name","age"}` → `{"uid":n}` / `GET /v1/users?uid=n` → `{"name","age"}` / `GET /health` → `{"status":"OK"}`. 포트 8080. **앱은 기동 시 `worldpay-secret` 을 읽어 MySQL에 붙는다 — secret이 틀리거나 DB에 못 붙으면 앱 자체가 안 뜬다.**

### 5-2. 2과제 — Small challenge (50점, 12.5×4)

**① Shared network storage — 도쿄(ap-northeast-1)** — VPC `sharing-vpc`, 서브넷 `sharing-subnet-a/b` 10.100.0·1.0/24 (1a, 1b). ASG `sharing-asg` t3.micro min 2, **새 인스턴스가 뜨면 자동으로 `/mnt/efs` 에 EFS 마운트**, SSM 접근. EFS `sharing-efs`, **30일 후 IA 전환**, KMS 암호화. 채점은 인스턴스를 전부 종료하고 새로 뜬 인스턴스에서 `df | grep /mnt/efs` 를 본 뒤, 한 인스턴스에서 만든 파일이 다른 인스턴스에서 보이는지 확인한다.

**② Query from S3 — 서울** — 버킷 `korea-skills-research-data-<비번호>` 에 `employee/`, `survey/` 로 CSV 업로드. Athena 워크그룹 `research`, **쿼리당 스캔 1GB 제한**, 결과는 `korea-skills-research-result-<비번호>`. Glue DB `research`, 테이블 `employee`(emp_id·name·salary)·`survey`(emp_id·response). Saved query 둘 — `research-query1`(전체 response 평균), `research-query2`(salary ≥ 70000 인 직원의 response 평균). 결과 컬럼은 `result` 하나뿐이어야 한다.

**③ Fine-grained IAM policy — 서울** — DynamoDB `catalog`·`secret`, 파티션 키 `name`(S), 삭제 방지 + KMS 암호화. IAM role `employee-role` + policy `employee-policy` **하나만** 붙임. role은 계정 내 모든 user·role이 assume 가능. 정책 요구:

- `catalog` 테이블만 접근
- **키 이름이 `name` 과 `type` 인 요청만 허용** — `{"name","type"}` 성공, `{"name"}` 성공, `{"name","size"}` 실패

**④ MySQL with Lambda — 서울** — Lambda `store-manager` (Python), **코드 KMS 암호화**, VPC 안. Layer `store-mysql` (pymysql 권장). Aurora MySQL `store-rds`, 스토리지 암호화, public access 금지.

```sql
CREATE TABLE `product` (product_id VARCHAR(255), name VARCHAR(255), PRIMARY KEY (product_id));
```

- `{"op":"POST","product_id":"p-123","name":"keyboard"}` → `{"product_id":"p-123"}`
- `{"op":"GET","product_id":"p-123"}` → `{"product_id":"p-123","name":"keyboard"}`

지급된 `lambda_function.py` 는 뼈대만 있고 `insert_data`·`select_data` 가 TODO다. **파일 끝줄에 문법 오류가 있으니 그대로 붙여넣으면 안 된다** — `result = select_data(event)` 뒤에 따옴표 하나가 더 붙어 있다.

---

## 6. 다음에 나올 것 — 근거 있는 추정

확정이 아니다. 축 대조표에서 읽히는 경향일 뿐이다.

| 예상 | 근거 |
| --- | --- |
| VPC + 서브넷 + 라우팅 + Name tag | 4년 연속. 2026엔 배점 31% |
| Bastion 또는 CloudShell 접근 전제 | 4년 연속 |
| 앱을 2대 이상 띄우고 ALB로 받아 curl 검증 | 4년 연속. 수단(ECS·EKS·ASG)만 회전 |
| KMS 암호화 옵션 3개 이상 | 2024·2025·2026 |
| CloudWatch 로그 그룹 + 대시보드 | 2024~2026 |
| 2과제는 독립 소문제 4개 | 2025·2026 연속. 2년째면 정착으로 본다 |
| 2과제에 서울 아닌 리전 1문제 | 2025 ④ 도쿄, 2026 ① 도쿄 |
| 2과제에 IaC 또는 스크립트 자동화 | 2025 ③④. 2026엔 없었으므로 확신 낮음 |

컨테이너는 2026에 1과제에서 빠졌지만 그 전 3년 연속 나왔던 축이다. **버리지 말고 유지한다.**
