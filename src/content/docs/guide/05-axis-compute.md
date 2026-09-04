---
title: 축 3 — 앱 배포와 로드밸런서
description: 수단은 ECS·EKS·ASG 로 회전해도 뼈대는 4년 내내 같다.
sidebar:
  order: 5
---

> 문서 유형: explanation

배포 수단은 매년 바뀌었다. ECS Fargate(2023) → EKS(2024) → ECS on EC2(2025) → ASG + EC2(2026). 그런데 요구의 뼈대는 4년 내내 같다.

> **앱을 2대 이상 띄워 AZ에 나눠 놓고, ALB 뒤에 붙이고, curl로 응답을 확인한다.**

수단을 외우는 게 아니라 이 뼈대를 어느 수단으로든 만들 줄 알아야 한다.

## 1. 네 가지 배포 수단 대조

| | ECS Fargate (2023) | EKS (2024) | ECS on EC2 (2025) | ASG + EC2 (2026) |
| --- | --- | --- | --- | --- |
| 실행 단위 | Task | Pod | Task | 인스턴스 |
| 컴퓨팅 관리 | AWS | 노드그룹 + Fargate | 선수가 EC2 관리 | 선수가 AMI/user data |
| 앱 배치 방법 | Task Definition | Deployment | Task Definition | user data 또는 커스텀 AMI |
| HA 수단 | 서비스 desiredCount + 다중 서브넷 | replicas + 노드 분산 | 동일 | ASG min 2 + 다중 서브넷 |
| ALB 연결 | 서비스 ↔ 타깃 그룹 | AWS Load Balancer Controller Ingress | 서비스 ↔ 타깃 그룹 | ASG ↔ 타깃 그룹 |
| 스케일링 | Service Auto Scaling | HPA + Cluster Autoscaler | — | ASG 정책 |
| 로그 | awslogs 드라이버 | Fluent Bit / CloudWatch Agent | awslogs 드라이버 | **CloudWatch Agent 직접 설치** |

**2026이 가장 손이 많이 가는 방식이다.** 컨테이너 런타임이 없으니 앱 기동·로그 전송·secret 조회를 전부 user data 스크립트로 짜야 한다.

## 2. 매년 나오는 요구 다섯

### 2-1. 최소 2대, 서로 다른 AZ

| 해 | 요구 | 채점 |
| --- | --- | --- |
| 2023 | 가용영역 하나가 죽어도 서비스 정상 | Target Group HA 3점 |
| 2024 | 노드그룹 각 2개, Pod 각 2개 | EKS 구성 확인 |
| 2025 | 서비스 서브넷 2개 이상 | `services[].networkConfiguration...subnets[]` 가 2개 이상 |
| 2026 | ASG MinSize 2 | `AutoScalingGroups[].MinSize` == 2 |

**"2대"는 인스턴스 수가 아니라 AZ 분산을 본다.** 같은 AZ에 2대면 요구를 못 채운다.

### 2-2. ALB는 반드시 서브넷 2개 이상

ALB 자체가 최소 2 AZ를 요구한다. 채점도 본다.

```bash
# 2026 5-2
aws elbv2 describe-load-balancers --names worldpay-alb \
  --query LoadBalancers[].AvailabilityZones[].ZoneName --output text
# → ap-northeast-2a, ap-northeast-2c
```

### 2-3. 헬스 체크가 통과해야 한다

타깃 그룹이 unhealthy면 ALB가 503을 반환하고 앱 검증 항목이 통째로 죽는다.

헬스 체크 경로를 앱이 실제로 여는 경로로 맞춘다. 2025는 `/health`, 2026은 `/health` 다. 기본값 `/` 로 두면 앱이 404를 반환해 unhealthy가 된다.

```bash
aws elbv2 describe-target-health --target-group-arn <arn> \
  --query "TargetHealthDescriptions[].TargetHealth.State"
```

`unhealthy` 일 때 볼 순서: 앱이 인스턴스 안에서 뜨는가(`curl localhost:8080/health`) → 보안 그룹이 ALB에서 8080을 받는가 → 헬스 체크 경로·포트 → 성공 코드.

### 2-4. 정의되지 않은 경로 처리

| 해 | 요구 |
| --- | --- |
| 2023 | `/about` → about TG, `/projects` → projects TG (경로 기반 라우팅) |
| 2024 | `/api/*` 는 CloudFront가 ALB로, 캐시 없음 |
| 2026 | **정의 안 된 경로는 Fixed response 403** |

2026 방식이 리스너 규칙의 기본 동작을 쓴다.

```
리스너 기본 동작(default action) = fixed-response 403
규칙 1 (우선순위 1): path-pattern /v1/users, /health → forward to TG
```

채점 5-3은 `Listeners[].DefaultActions[].FixedResponseConfig.StatusCode` 가 `403` 인지 본다. **기본 동작이 forward이고 별도 규칙으로 403을 주면 이 항목이 0이다.** 기본 동작 자체가 403이어야 한다.

그리고 6-3이 실제로 확인한다.

```bash
curl -sI http://$ALB_ENDPOINT/v1/users123 | head -n1   # 403 을 포함해야 함
```

### 2-5. curl POST → GET 왕복

4년 내내 나온 항목이다. 앞의 모든 게 살아 있어야 통과한다. → [채점 해부 6절](/guide/02-scoring/)

## 3. 수단별 함정

### 3-1. ECS 공통

- **`latest` 태그 금지** (2025). 채점이 `taskDefinition.containerDefinitions[].image` 끝이 latest 가 아닌지 본다. `v1.0.0` 같은 명시 태그를 쓴다.
- **ECR 스캔 결과 취약점 0** (2023·2024·2025). `alpine` 최신 태그 기반으로 최소 이미지를 만들면 대개 통과한다. 베이스가 무거우면(예: `ubuntu:20.04`) MEDIUM 이상이 잔뜩 나온다.

  ```bash
  aws ecr describe-image-scan-findings --repository-name product \
    --image-id imageTag=v1.0.0 --query "imageScanFindings.findingSeverityCounts"
  # → {} 여야 한다
  ```

- **immutable 태그** (2024·2025). 켜면 같은 태그 재푸시가 막힌다. **먼저 이미지를 올리고 나중에 immutable을 켜는 편이 안전하다** — 순서를 반대로 하면 수정할 때마다 태그를 바꿔야 한다.
- **ECS Exec** (2025). 컨테이너 SHELL 접근 요구. Task Role에 `ssmmessages:*` 권한과 서비스의 `enableExecuteCommand` 가 필요하다.

  ```bash
  aws ecs execute-command --cluster ws-cluster --task <id> \
    --container gateway --interactive --command "/bin/sh"
  ```

- **Service Connect** (2025). 같은 네임스페이스 안에서 `http://<서비스 이름>` 으로 부른다. 채점 2-13이 gateway 컨테이너 안에서 `export | grep -i CONN_PRODUCT` 로 환경 변수를 확인하고, 2-14가 `curl http://product/health` 를 부른다. **채점기준에 "편법으로 풀었다고 판단될 시 ECS namespace와 proxy-container 추가 여부를 확인한다"고 적혀 있다** — `/etc/hosts` 조작 같은 우회는 잡힌다.

### 3-2. EKS (2024)

- **Private 클러스터**: `endpointPublicAccess: false`, `endpointPrivateAccess: true`. 이렇게 하면 Bastion이 같은 VPC 안에 있고 보안 그룹이 열려야 `kubectl` 이 된다.
- **노드그룹 분리**: 애드온 전용·앱 전용을 나누려면 taint + toleration + nodeSelector 조합이다. label만으로는 애드온이 앱 노드로 흘러간다.
- **Fargate Profile**: 네임스페이스+라벨 셀렉터로 매칭한다. **DaemonSet은 Fargate에서 못 돈다** — 문제지도 "DaemonSet은 Fargate를 제외한 모든 Node에서"라고 적었다.
- **Cluster Autoscaler**: Pod가 늘 때 Node도 늘어야 하는 요구(2024)는 HPA만으로 안 된다. Cluster Autoscaler 또는 Karpenter가 필요하다.

### 3-3. ASG + EC2 (2026)

컨테이너가 없으니 다음을 user data로 직접 짠다.

```bash
#!/bin/bash
# 1) secret 읽기
SECRET=$(aws secretsmanager get-secret-value --secret-id worldpay-secret \
  --query SecretString --output text --region ap-northeast-2)
export DB_USER=$(echo "$SECRET" | jq -r .username)
export DB_PASS=$(echo "$SECRET" | jq -r .password)
export DB_HOST=$(echo "$SECRET" | jq -r .host)

# 2) 앱 실행 (지급 바이너리를 그대로 쓴다 — 수정하면 0점)
# 3) CloudWatch Agent 로 로그를 worldpay-log-group 으로 보낸다
```

**인스턴스 프로파일에 `secretsmanager:GetSecretValue` 와 CMK의 `kms:Decrypt` 가 둘 다 있어야 한다.** CMK로 암호화한 secret은 KMS 권한이 없으면 조회가 거부된다. 여기서 막혀 앱이 안 뜨는 게 2026형의 대표 실패다.

로그 전송은 CloudWatch Agent 설정 파일에 로그 파일 경로와 그룹 이름을 적는다.

```json
{"logs":{"logs_collected":{"files":{"collect_list":[
  {"file_path":"/var/log/worldpay/app.log",
   "log_group_name":"worldpay-log-group",
   "log_stream_name":"{instance_id}"}
]}}}}
```

채점 7-3이 `aws logs tail worldpay-log-group --since 0 | grep marking-user` 다. **앱이 요청 내용을 로그로 찍어야 한다** — 접근 로그가 없으면 이 항목이 0이다.

## 4. Launch Template과 ASG

2026·2026 2과제 ① 둘 다 ASG를 요구한다. 손에 붙여야 할 순서.

```
Launch Template
 ├ AMI (Amazon Linux 2023)
 ├ 인스턴스 타입 (t3.micro)
 ├ IAM 인스턴스 프로파일        ← 빼먹기 1위
 ├ 보안 그룹
 ├ user data (base64)
 └ 태그 스펙 (instance 에 Name=worldpay-app)   ← 빼먹기 2위
ASG
 ├ Launch Template 지정
 ├ VPC 서브넷 여러 개
 ├ Min 2 / Desired 2 / Max n
 ├ 타깃 그룹 연결
 └ 스케일 정책 (Target tracking, ASGAverageCPUUtilization = 70)
```

**인스턴스 Name 태그는 ASG 태그가 아니라 Launch Template의 태그 스펙 또는 ASG 태그의 `PropagateAtLaunch=true` 로 붙는다.** 2026 채점 2-3이 `Reservations[].Instances[].Tags[?Key=='Name'].Value` 에서 `worldpay-app` 을 찾는다. ASG 이름만 맞고 인스턴스에 태그가 없으면 1.5점을 잃는다.

스케일 정책은 존재만 확인한다.

```bash
aws autoscaling describe-policies --auto-scaling-group-name worldpay-asg \
  --query ScalingPolicies[].AutoScalingGroupName --output text
```

## 5. 드릴

### 5-1. 드릴 A — 같은 앱을 네 방식으로

작은 HTTP 앱 하나(`/health` 200, `POST /item` → `GET /item?id=`)를 만들어 두고 순서대로 배포한다.

1. ASG + EC2 + ALB (2026형) — 60분
2. ECS on EC2 + Service Connect (2025형) — 60분
3. ECS Fargate + 경로 라우팅 (2023형) — 45분
4. EKS + ALB Ingress (2024형) — 90분

목표는 **같은 뼈대를 네 수단으로 만드는 감각**이다. 어느 해 형태가 나와도 뼈대가 먼저 떠오르면 절반은 끝났다.

### 5-2. 드릴 B — 헬스 체크 고장 진단

일부러 다음 넷을 하나씩 심고 5분 안에 원인을 찾는다.

- 헬스 체크 경로를 `/`로 되돌림
- 인스턴스 보안 그룹에서 8080 인바운드 제거
- 앱 프로세스 종료
- 타깃 그룹 포트를 80으로 잘못 지정

### 5-3. 드릴 C — 403 기본 동작

ALB 리스너 기본 동작을 fixed-response 403으로 두고, 규칙으로 `/v1/users` 와 `/health` 만 통과시킨다. `curl -sI` 로 세 경로(`/health`, `/v1/users`, `/aaa`)의 상태 코드를 확인한다.

## 6. 참고 문서

- [ALB 리스너 규칙](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-update-rules.html) — fixed-response 와 기본 동작
- [ALB 대상 그룹 상태 확인](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html)
- [ASG 시작 템플릿](https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html) — 태그 전파 절
- [ASG 대상 추적 정책](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html)
- [ECS Service Connect](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html)
- [ECS Exec 사용](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html) — 필요한 IAM 권한 절
- [ECR 이미지 스캔](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html)
- [CloudWatch Agent 설정 파일](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html) — logs 절만
