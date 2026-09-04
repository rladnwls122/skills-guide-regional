---
title: 2과제 유형 카탈로그
description: 네 해 2과제 16개 유형 전부 — 요구, 왜 막히나, 핵심 조각.
sidebar:
  order: 8
---

> 문서 유형: reference

4년치 2과제 전부다. 2023·2024는 파이프라인 한 줄기, 2025·2026은 독립 소문제 4개다. → [지형도 2-1절](/guide/00-competition-map/)

각 유형마다 **요구 / 왜 막히나 / 핵심 조각** 셋으로 정리한다.

---

## A. 2025·2026 형 — 독립 소문제 (각 12.5점)

### A-1. Client VPN (2025 ①)

**요구.** VPC `ws-vpn-vpc` 10.99.0.0/16, private 서브넷 두 곳에 웹 서버 EC2 두 대. Client VPN `ws-client-vpn`, 클라이언트 CIDR 10.254.0.0/16, 상호 인증, 인가 규칙은 VPC CIDR만. 선수 PC에서 AWS VPN Client로 실제 연결해 브라우저로 프라이빗 IP 접속.

**왜 막히나.** 인증서 체인을 손으로 만들어야 한다. 상호 인증(mutual authentication)은 서버 인증서와 **클라이언트 인증서를 같은 CA로 서명**해야 한다.

**핵심 조각.**

```bash
# easy-rsa 로 CA, 서버, 클라이언트 인증서
git clone https://github.com/OpenVPN/easy-rsa.git
cd easy-rsa/easyrsa3
./easyrsa init-pki && ./easyrsa build-ca nopass
./easyrsa --san=DNS:server build-server-full server nopass
./easyrsa build-client-full client1.domain.tld nopass
# ACM 에 서버·클라이언트 인증서 업로드 → 엔드포인트 생성 시 지정
```

- 클라이언트 CIDR(10.254.0.0/16)은 **VPC CIDR과 겹치면 안 된다.** `/22` 보다 크거나 같아야 한다.
- 대상 네트워크(associate)를 **AZ별로 두 개** 걸어야 HA 항목(1-6)이 통과한다.
- 인가 규칙(authorize)의 목적지는 `10.99.0.0/16` 만. `0.0.0.0/0` 을 주면 1-7이 실패한다.
- 다운로드한 설정 파일에 **클라이언트 인증서와 키를 직접 붙여 넣어야** AWS VPN Client가 붙는다.
- 웹 서버는 프라이빗 IP로 접속하므로 보안 그룹이 클라이언트 CIDR로부터 80을 받아야 한다.

**시간 배분.** 인증서 20분 + 엔드포인트 15분 + 연결 검증 15분. 검증에 실패하면 4개 문제 중 가장 빨리 손절할 후보다.

---

### A-2. KEDA 이벤트 오토스케일링 (2025 ②)

**요구.** EKS `order-cluster` 1.31, 네임스페이스 `order`, Deployment `order-processor` 1 Pod, SQS `order-queue`. KEDA로 메시지 수 기준 스케일링. **종료 시점에 Pod 정확히 1개.**

**왜 막히나.** EKS 클러스터 생성에만 15~20분이 걸린다. 그 위에 KEDA 설치, IRSA 권한, ScaledObject까지 쌓아야 한다. 2과제 4문제 중 가장 오래 걸린다.

**핵심 조각.**

```bash
eksctl create cluster --name order-cluster --version 1.31 \
  --region ap-northeast-2 --nodes 2 --node-type t3.medium

helm repo add kedacore https://kedacore.github.io/charts && helm repo update
helm install keda kedacore/keda --namespace keda --create-namespace
```

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata: { name: order-scaler, namespace: order }
spec:
  scaleTargetRef: { name: order-processor }
  minReplicaCount: 1
  maxReplicaCount: 10
  cooldownPeriod: 60
  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: https://sqs.ap-northeast-2.amazonaws.com/<계정>/order-queue
        queueLength: "5"
        awsRegion: ap-northeast-2
```

- KEDA 오퍼레이터가 SQS를 읽을 권한이 필요하다. **IRSA** 로 `keda-operator` 서비스 계정에 role을 붙인다. 노드 인스턴스 role에 SQS 권한을 주는 방법도 통하지만 IRSA가 정석이다.
- 앱(`order-v1.py`)은 30초마다 메시지 하나를 소비한다. 채점 2-8은 메시지 20개를 넣고 **최대 5분** 기다린다. `cooldownPeriod` 를 기본값 300초로 두면 2-9(축소)가 5분 안에 안 끝난다 — **60초로 줄인다.**
- `minReplicaCount: 1` — 0으로 두면 채점 2-3(Pod 1개)이 실패한다.
- 과제 종료 전 큐를 비우고 Pod가 1개로 돌아온 것을 확인한다.

---

### A-3. Terraform IaC (2025 ③)

**요구.** `/home/ec2-user/korea/` 에 Terraform 코드. 채점자가 `init → destroy → apply` 를 돌린다. VPC `korea-vpc` 10.0.0.0/16, public 서브넷 1개, EC2 1대(EBS 암호화, SSM role), 모든 리소스에 `Project=KoreaSkills`.

**왜 막히나.** `destroy` 후 `apply` 가 **처음부터 끝까지** 성공해야 한다. state에 없는 리소스를 콘솔로 만들어 두면 이름 충돌로 apply가 깨진다.

**핵심 조각.**

```hcl
provider "aws" {
  region = "ap-northeast-2"
  default_tags { tags = { Project = "KoreaSkills" } }
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = { Name = "korea-vpc" }
}

resource "aws_instance" "app" {
  ami                  = data.aws_ami.al2023.id
  instance_type        = "t3.micro"
  subnet_id            = aws_subnet.public_a.id
  iam_instance_profile = aws_iam_instance_profile.ssm.name
  root_block_device { encrypted = true }
  tags = { Name = "korea-instance" }
}
```

- `default_tags` 를 쓰면 모든 리소스에 `Project=KoreaSkills` 가 자동으로 붙는다. 리소스마다 손으로 넣지 않는다.
- **IAM role 이름이 계정에 이미 있으면 apply가 실패한다.** 채점 전 Default VPC와 Bastion을 제외한 모든 리소스를 지우라는 지시가 이것 때문이다.
- `terraform destroy` 는 자기가 만든 것만 지운다. 콘솔로 만든 잔해는 안 지워지고 그대로 충돌 원인이 된다.
- **연습 사이클마다 `destroy` → `apply` 를 한 번 돌려 본다.** 한 번 성공한 코드가 두 번째에 깨지는 일이 흔하다(의존 순서, `depends_on` 누락).
- SSM 연결 확인(3-9)까지 하려면 인스턴스가 인터넷으로 나갈 길이 있어야 한다 — public 서브넷 + 퍼블릭 IP 자동 할당.

---

### A-4. EC2 삭제 자동화 (2025 ④)

**요구.** 도쿄 리전. `/home/ec2-user/ec2-automation/` 에 스크립트 둘. `delete_old_instance.sh` 는 `Project=skills2022` 태그만, `delete_all_instance.sh` 는 Bastion 제외 전부.

**왜 막히나.** 스크립트가 자기 Bastion을 지우면 이후 채점이 전부 불가하다. → [축 2, 6절](/guide/04-axis-bastion/)

**핵심 조각.**

```bash
#!/bin/bash
# delete_old_instance.sh
IDS=$(aws ec2 describe-instances \
  --filters Name=tag:Project,Values=skills2022 \
            Name=instance-state-name,Values=running,stopped \
  --query "Reservations[].Instances[].InstanceId" --output text)
[ -n "$IDS" ] && aws ec2 terminate-instances --instance-ids $IDS
```

- `instance-state-name` 필터를 넣지 않으면 이미 terminated 된 인스턴스까지 잡아 에러가 난다.
- 리전을 스크립트 안에 박아 둔다(`--region ap-northeast-1` 또는 `aws configure set region`). 채점자가 다른 리전 셸에서 실행할 수 있다.
- 실행 권한을 미리 준다(`chmod +x`). 채점 4-2가 `chmod +x` 를 하긴 하지만 미리 해 두는 게 안전하다.

---

### A-5. EFS 공유 스토리지 (2026 ①)

**요구.** 도쿄. `sharing-vpc`, ASG `sharing-asg` min 2, EFS `sharing-efs` (KMS 암호화, 30일 IA), `/mnt/efs` 자동 마운트, SSM 접근.

**왜 막히나.** 채점 1-8이 **인스턴스를 전부 종료하고** ASG가 새로 띄운 것에서 마운트를 확인한다. 손으로 마운트한 것은 사라진다.

**핵심 조각.** → [축 4, 4-5절](/guide/06-axis-data/)

- user data에 `amazon-efs-utils` 설치 + `/etc/fstab` 등록.
- 마운트 타깃 보안 그룹이 인스턴스 보안 그룹으로부터 **2049** 를 받아야 한다.
- 인스턴스가 SSM으로 붙으려면 인터넷 경로(NAT 또는 엔드포인트)가 필요하다. **서브넷 두 개만 만들면 IGW·라우팅을 빼먹기 쉽다** — 문제지가 라우팅을 명시하지 않았어도 SSM이 안 되면 1-8~1-10 4.5점이 통째로 날아간다.
- EFS 마운트 헬퍼의 `tls` 옵션은 `stunnel` 을 쓴다. 설치가 안 되면 마운트가 조용히 실패한다.

---

### A-6. Athena 분석 (2026 ②)

**요구·핵심 조각.** → [축 4, 4-6절](/guide/06-axis-data/)

가장 중요한 두 가지만 다시 적는다.

1. Glue 테이블에 `skip.header.line.count = 1`
2. saved query 결과 컬럼 이름은 `AS result`

---

### A-7. 세밀한 IAM 정책 (2026 ③)

**요구.** `employee-policy` 하나가 `catalog` 테이블만, **키 이름이 `name`·`type` 인 요청만** 허용.

| 채점 | 요청 | 기대 |
| --- | --- | --- |
| 3-7 | `put-item catalog {"name","type"}` → `get-item {"name"}` | 성공, `fruit` 출력 |
| 3-8 | `put-item secret {"name"}` | 권한 오류 |
| 3-9 | `put-item catalog {"name","price"}` → `get-item` | **둘 다 실패**, `None` 출력 |

**왜 막히나.** 테이블 단위 제한은 쉽지만 "속성 이름 제한"은 DynamoDB의 세분화된 액세스 제어(fine-grained access control) 조건 키를 알아야 한다.

**핵심 조각.**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["dynamodb:PutItem", "dynamodb:GetItem",
               "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query"],
    "Resource": "arn:aws:dynamodb:ap-northeast-2:<계정>:table/catalog",
    "Condition": {
      "ForAllValues:StringEquals": { "dynamodb:Attributes": ["name", "type"] }
    }
  }]
}
```

- `dynamodb:Attributes` 는 요청에 등장한 **모든 속성 이름**의 집합이다. `ForAllValues:StringEquals` 는 그 집합의 원소가 전부 허용 목록 안에 있을 때만 참이다.
  - `{"name","type"}` → 둘 다 목록에 있음 → 허용
  - `{"name"}` → 부분집합 → 허용
  - `{"name","price"}` → `price` 가 없음 → 거부
- **`dynamodb:Select` 조건을 넣지 않는다.** AWS 문서는 GetItem이 허용되지 않은 속성을 반환하지 못하도록 `"StringEqualsIfExists": {"dynamodb:Select": "SPECIFIC_ATTRIBUTES"}` 를 함께 쓰라고 권한다. 그런데 채점 3-7의 `get-item` 은 `--projection-expression` 없이 호출한다. Select 조건을 넣으면 이 호출이 거부돼 3-7이 실패한다.
- **`secret` 테이블은 Resource에 없으므로 자동으로 거부된다.** 별도 Deny 문을 쓸 필요 없다.
- `employee-role` 의 신뢰 정책은 계정 전체가 assume 가능해야 한다.

  ```json
  { "Version": "2012-10-17", "Statement": [{
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::<계정>:root" },
      "Action": "sts:AssumeRole" }] }
  ```

- **정책이 정확히 하나만 붙어 있어야 한다**(채점 3-6). 디버깅하려고 `ReadOnlyAccess` 를 임시로 붙였다면 반드시 뗀다.

---

### A-8. Lambda + RDS (2026 ④)

**요구.** Lambda `store-manager` (Python, **코드 KMS 암호화**, VPC 안), Layer `store-mysql`, Aurora MySQL `store-rds`(암호화, 퍼블릭 차단).

**왜 막히나.** 조각이 넷 다 서로 얽힌다 — Layer 빌드, VPC 배치, 보안 그룹, 테이블 생성.

**핵심 조각.**

레이어는 Lambda 런타임과 같은 아키텍처로 빌드한다.

```bash
mkdir -p python && pip install pymysql -t python/
zip -r store-mysql.zip python
aws lambda publish-layer-version --layer-name store-mysql \
  --zip-file fileb://store-mysql.zip --compatible-runtimes python3.12
```

`pymysql` 은 순수 파이썬이라 아키텍처를 안 탄다. `mysqlclient` 나 `psycopg2` 는 컴파일된 바이너리라 Amazon Linux 환경에서 빌드해야 한다 — **pymysql 을 권장하는 이유가 이것이다.**

핸들러:

```python
import os, pymysql

def _conn():
    return pymysql.connect(
        host=os.environ["DB_HOST"], user=os.environ["DB_USER"],
        passwd=os.environ["DB_PASS"], db="store", connect_timeout=3)

def lambda_handler(event, context):
    op = event["op"].lower()
    with _conn() as c, c.cursor() as cur:
        if op == "post":
            cur.execute("INSERT INTO product VALUES (%s, %s)",
                        (event["product_id"], event["name"]))
            c.commit()
            return {"product_id": event["product_id"]}
        cur.execute("SELECT product_id, name FROM product WHERE product_id = %s",
                    (event["product_id"],))
        pid, name = cur.fetchone()
        return {"product_id": pid, "name": name}
```

지급된 `lambda_function.py` 는 **모듈 최상단에서 DB에 접속하고 실패하면 `sys.exit()`** 한다. 그대로 두면 초기화 단계에서 함수가 죽는다. 그리고 마지막 줄에 문법 오류(`select_data(event)` 뒤 여분의 따옴표)가 있다. **뼈대는 참고만 하고 새로 쓴다** — 문제지도 "주어진 코드를 활용하지 않아도 무방하다"고 적었다.

체크 항목:

- **VPC 안의 Lambda는 인터넷이 없다.** RDS에만 붙으면 되므로 NAT은 필요 없지만, Secrets Manager를 쓰려면 엔드포인트가 필요하다. 이 문제는 환경 변수로 충분하다.
- Lambda 보안 그룹 → RDS 보안 그룹 3306 인바운드.
- **코드 KMS 암호화**는 함수 생성/수정 시 `--kms-key-arn` 으로 지정한다. 채점 4-2가 `Code.SourceKMSKeyArn` 을 본다. Lambda 실행 역할에 `kms:Decrypt` 가 있어야 한다.
- 테이블은 선수가 미리 만든다. Lambda로 `CREATE TABLE` 을 한 번 돌리는 게 CloudShell에서 붙는 것보다 빠를 수 있다(CloudShell은 VPC 밖이다).
- 채점 payload가 base64로 들어온다. **AWS CLI v2는 기본이 base64 입력이라 그대로 동작한다.**

---

## B. 2023·2024 형 — 파이프라인 한 줄기

### B-1. ETL 파이프라인 (2023)

`API Gateway → Kinesis Data Streams → Firehose → S3 → Glue 크롤러 → Glue Job → 워크플로`

막히는 지점 순서대로:

1. **API Gateway → Kinesis 통합.** Lambda 없이 AWS 서비스 통합(`PutRecord`)으로 연결한다. 매핑 템플릿에서 본문을 base64로 감싸고 파티션 키를 넣어야 한다.

   ```
   {
     "StreamName": "wsi-data-stream",
     "Data": "$util.base64Encode($input.body)",
     "PartitionKey": "$context.requestId"
   }
   ```

   통합 역할에 `kinesis:PutRecord` 권한 필요. `Content-Type: application/x-amz-json-1.1` 헤더도 매핑한다.

2. **Firehose 저장 경로.** `data/raw/!{timestamp:yyyy}/!{timestamp:MM}/!{timestamp:dd}/!{timestamp:HH}/` 형식 접두사. 동적 파티셔닝은 끈다.
3. **크롤러 테이블 이름.** `data/` 하위 폴더 이름(`ref`, `raw`)이 테이블이 되도록 크롤러 대상 경로를 `s3://<버킷>/data` 로 잡는다. 하위 폴더마다 따로 잡으면 이름이 달라진다.
4. **Glue Job 조인.** raw의 `title_id` 와 ref의 `title` 을 붙인다. Glue Studio 시각 편집기로 Join 노드를 쓰는 게 빠르다.
5. **워크플로.** 크롤러 성공 트리거 → Job.

### B-2. CI/CD 파이프라인 (2024)

`CodeCommit → CodeBuild → CodeDeploy(Blue/Green) → ECS`, 그리고 프런트는 `CodeCommit → S3 → CloudFront`.

막히는 지점:

1. **CodeDeploy Blue/Green + ECS 는 준비물이 많다.** 타깃 그룹 2개, 리스너(프로덕션 + 테스트), `appspec.yaml`, ECS 서비스의 배포 컨트롤러를 `CODE_DEPLOY` 로 지정. **서비스를 만든 뒤에는 배포 컨트롤러를 못 바꾼다** — 처음부터 CODE_DEPLOY로 만든다.
2. **buildspec.yml** 에서 Java 17 + Gradle 빌드 후 이미지를 ECR에 푸시하고 `imagedefinitions.json` 또는 `imageDetail.json` 을 아티팩트로 낸다.
3. **파이프라인 스테이지 수 제한.** 백엔드는 Source·Build·Deploy 정확히 3개. Approval 같은 걸 넣으면 감점이다.
4. **CloudFront 캐시 분기.** 기본 동작은 S3 오리진 캐시, `/api/*` 동작은 ALB 오리진 + `CachingDisabled` 정책. 프런트가 배포 후 즉시 갱신되어야 하므로 **HTML은 짧은 TTL이나 무효화(invalidation)** 가 필요하다. 파이프라인 Deploy 단계에서 `create-invalidation` 을 돌리는 게 확실하다.
5. **CodeCommit 은 2024년 7월 이후 신규 계정에 생성이 막혔다.** 연습 계정에서 안 만들어지면 CodeConnections + GitHub 조합으로 대체해 흐름만 익힌다. 대회 계정은 대회 주최 측이 준비하므로 실제 시험에서는 쓸 수 있을 가능성이 높다.

---

## C. 2과제 시간 운영

### C-1. 독립형(2025·2026)

```
0:00  네 문제를 전부 읽고 난이도·확신도로 순위를 매긴다      (10분)
0:10  가장 확신 있는 것부터 시작
      한 문제에 60분을 넘기면 현재 상태로 두고 다음으로 간다
3:00  남은 시간에 미완성 문제의 '싼 항목'만 줍는다
        (리소스 생성·태그·암호화 체크박스 등 부분 점수)
3:30  전 문제 자가 채점, 잔여 리소스 정리
```

**부분 점수 구조를 이용한다.** 2026 2과제는 각 문제가 10개 세부 항목이다. Lambda 문제를 못 끝내도 함수 생성(1) + KMS(1.5) + 레이어(1) + 레이어 사용(1) + VPC(1.5) + RDS(1+1+1.5) = 9.5점이 실제 동작 없이도 들어온다. **동작 항목 2개(3점)를 못 해도 나머지는 챙긴다.**

### C-2. 파이프라인형(2023·2024)

```
앞에서부터 순서대로. 각 단계가 살아 있는지 그때그때 확인한다.
중간이 막히면 우회로를 찾기보다 그 단계의 '존재 항목'만 만들어 두고
뒤 단계를 독립적으로 구성한다 (예: 크롤러가 안 돌면 테이블을 수동 생성)
```

---

## D. 참고 문서

- [Client VPN 상호 인증](https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/authentication-authrization.html#mutual)
- [Client VPN 시작하기](https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-getting-started.html)
- [KEDA AWS SQS 스케일러](https://keda.sh/docs/latest/scalers/aws-sqs/)
- [KEDA 배포](https://keda.sh/docs/latest/deploy/)
- [Terraform AWS Provider — default_tags](https://registry.terraform.io/providers/hashicorp/aws/latest/docs#default_tags)
- [DynamoDB 세분화된 액세스 제어](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html) — `dynamodb:Attributes` 절
- [Lambda 레이어](https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html)
- [VPC의 Lambda](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html)
- [API Gateway와 Kinesis 통합](https://docs.aws.amazon.com/apigateway/latest/developerguide/integrating-api-with-aws-services-kinesis.html)
- [Firehose S3 접두사 형식](https://docs.aws.amazon.com/firehose/latest/dev/s3-prefixes.html)
- [CodeDeploy ECS Blue/Green](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-bluegreen.html)
