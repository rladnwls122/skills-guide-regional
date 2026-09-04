---
title: 종료 전 체크리스트
description: 과제 종료 30분 전에 여는 문서. 전부 실제 채점기준에서 나온 항목이다.
sidebar:
  order: 10
---

> 문서 유형: how-to

과제 종료 30분 전에 이 문서를 연다. 여기 있는 항목은 전부 **실제 채점기준에서 나온 것**이고, 대부분 몇 분 안에 고칠 수 있는데 안 고치면 확실히 점수를 잃는다.

## 1. 채점 불가를 막는다 (최우선)

이 넷 중 하나라도 어긋나면 과제 전체가 위험하다.

- [ ] **Bastion 이 running 이다.** 종료하지 않았고 stop 상태도 아니다.
- [ ] **Bastion 에 SSH(또는 SSM)로 붙는다.** 새 터미널을 열어 실제로 붙어 본다. 지금 세션이 살아 있는 것은 증거가 아니다.
- [ ] **`aws sts get-caller-identity` 가 내 계정을 반환한다.** 다른 계정 자격 증명이 남아 있으면 부정행위로 의심받는다.
- [ ] **`sudo aws sts get-caller-identity` 도 같은 결과다.** (2024형 요구)

```bash
aws sts get-caller-identity
sudo aws sts get-caller-identity
ls -la ~/.aws/ /root/.aws/ 2>/dev/null    # credentials 파일이 있으면 확인
```

SSH 포트를 바꿨다면 **채점자에게 포트를 알린다.**

## 2. 잔여 리소스를 지운다

계정 전체를 훑는 채점 명령이 있어서, 연습 잔해가 정답을 밀어낸다. → [채점 해부 3절](/guide/02-scoring/)

```bash
# ASG — 과제가 요구한 것 하나만 남아야 한다
aws autoscaling describe-auto-scaling-groups --query AutoScalingGroups[].AutoScalingGroupName --output text

# RDS 인스턴스 — 클래스와 퍼블릭 액세스를 전칭으로 본다
aws rds describe-db-instances --query "DBInstances[].[DBInstanceIdentifier,DBInstanceClass,PubliclyAccessible]" --output text

# Flow Logs — 요구한 VPC 수만큼만
aws ec2 describe-flow-logs --query FlowLogs[].ResourceId --output text

# DynamoDB 테이블
aws dynamodb list-tables --query TableNames --output text

# EFS
aws efs describe-file-systems --query "FileSystems[].[Name,FileSystemId]" --output text

# 로드밸런서
aws elbv2 describe-load-balancers --query LoadBalancers[].LoadBalancerName --output text

# 실행 중인 인스턴스 전체
aws ec2 describe-instances --filters Name=instance-state-name,Values=running \
  --query "Reservations[].Instances[].[InstanceId,InstanceType,Tags[?Key=='Name']|[0].Value]" --output text
```

각 출력에 **과제가 요구한 것만** 있어야 한다.

## 3. 이름표를 대조한다

과제지의 이름 목록과 실제 리소스를 한 줄씩 맞춘다. **철자 하나가 항목 하나다.**

```bash
# VPC·서브넷·라우팅 테이블·NACL 이름표 일괄 확인
aws ec2 describe-vpcs --query "Vpcs[].[VpcId,CidrBlock,Tags[?Key=='Name']|[0].Value]" --output text
aws ec2 describe-subnets --query "Subnets[].[CidrBlock,AvailabilityZone,Tags[?Key=='Name']|[0].Value]" --output text
aws ec2 describe-route-tables --query "RouteTables[].[RouteTableId,Tags[?Key=='Name']|[0].Value]" --output text
```

특히 확인할 것:

- [ ] 같은 Name 태그를 두 리소스에 쓰지 않았다 (`Subnets[0]` 함정)
- [ ] 하이픈·대소문자가 과제지와 동일하다 (`pub` vs `public`, `rt` vs `rtb`)
- [ ] **ASG 인스턴스에 Name 태그가 붙어 있다** (Launch Template 태그 스펙 또는 PropagateAtLaunch)

## 4. 리전을 확인한다

- [ ] 1과제 리소스가 전부 `ap-northeast-2` 에 있다
- [ ] 2과제에서 도쿄를 쓰라고 한 문제의 리소스가 `ap-northeast-1` 에 있다
- [ ] 서울에 만들었다가 옮긴 잔해가 남아 있지 않다

```bash
for r in ap-northeast-1 ap-northeast-2; do
  echo "== $r"
  aws ec2 describe-instances --region $r --filters Name=instance-state-name,Values=running \
    --query "Reservations[].Instances[].Tags[?Key=='Name']|[][].Value" --output text
done
```

## 5. 앱이 살아 있는지 다시 본다

채점의 연쇄 항목이 여기 걸린다. → [채점 해부 6절](/guide/02-scoring/)

```bash
ALB=$(aws elbv2 describe-load-balancers --names <alb-name> --query LoadBalancers[].DNSName --output text)

curl -s http://$ALB/health                        # 200
curl -s -X POST http://$ALB/v1/users -H "Content-type: application/json" \
     -d '{"name":"selfcheck","age":1}'            # {"uid":n}
curl -s "http://$ALB/v1/users?uid=<위 uid>"        # {"name":"selfcheck","age":1}
curl -sI http://$ALB/nonexistent | head -n1        # 403 (2026형)
```

- [ ] 타깃 그룹의 타깃이 전부 `healthy`
- [ ] 인스턴스/Task 가 요구 개수만큼 running
- [ ] 방금 보낸 요청이 로그 그룹에 도착했다

```bash
aws elbv2 describe-target-health --target-group-arn <arn> \
  --query "TargetHealthDescriptions[].TargetHealth.State" --output text
aws logs tail <log-group> --since 5m | tail -5
```

## 6. 부하와 임시 상태를 정리한다

과제지가 매년 요구한다.

> 과제 종료 전 실행 중인 테스트 및 부하를 중지하여 서버에 문제가 없도록 해야 합니다.

- [ ] 부하 생성 스크립트·`for` 루프를 전부 종료했다
- [ ] **KEDA 문제(2025 ②): SQS 큐가 비었고 `order-processor` Pod 가 정확히 1개다**

  ```bash
  kubectl get po -n order | grep order-processor | wc -l   # 1
  aws sqs get-queue-attributes --queue-url <url> \
    --attribute-names ApproximateNumberOfMessages
  ```

- [ ] CloudWatch 알람이 `OK` 상태다 (2025 채점 4-3은 채점 시작 시 OK를 전제한다)

  ```bash
  aws cloudwatch describe-alarms --query "MetricAlarms[].[AlarmName,StateValue]" --output text
  ```

## 7. 옵션 훑기 — 놓치기 쉬운 것

배점 대비 시간이 가장 적게 드는 항목들이다. 하나씩 짚는다.

### 데이터 저장소

- [ ] 저장 시 암호화 (생성 시에만 가능한 것이 많다 — 지금 꺼져 있으면 시간 계산)
- [ ] 전송 중 암호화
- [ ] 백업 — **PITR만 켜고 온디맨드 백업을 안 만들면 `list-backups` 가 비어 있다**
- [ ] 삭제 방지
- [ ] 포트가 기본값이 아닌지
- [ ] 퍼블릭 액세스 비활성
- [ ] 로깅(audit·profiler·slow log)이 CloudWatch 로 나가는지

### 네트워크

- [ ] NACL allow 규칙에 `0.0.0.0/0` 이 없다 (inbound·outbound 둘 다)
- [ ] NACL 이 서브넷에 **연결**돼 있다
- [ ] Peering DNS resolution 이 **양쪽 다** True
- [ ] 양쪽 라우팅 테이블에 상대 VPC CIDR 경로가 있다
- [ ] Flow Logs 가 요구한 VPC 전부에 켜져 있다
- [ ] VPC 엔드포인트의 보안 그룹이 443 을 받는다

### 관측

- [ ] 로그 그룹 이름·보관 기간
- [ ] 대시보드 위젯의 네임스페이스·메트릭·차원이 정확
- [ ] 대시보드에 **데이터가 그려져 있다** (빈 그래프면 확인 불가로 판정될 수 있다)
- [ ] Container Insights 를 켠 뒤 Task 를 새로 띄웠다

### 컨테이너

- [ ] 이미지 태그가 `latest` 가 아니다
- [ ] ECR 스캔 결과가 비어 있다

  ```bash
  aws ecr describe-image-scan-findings --repository-name <repo> \
    --image-id imageTag=<tag> --query "imageScanFindings.findingSeverityCounts"
  ```

- [ ] 태그 immutable 이 켜져 있다

### IAM

- [ ] 요구된 role 에 요구된 정책이 **정확히 그것만** 붙어 있다 (디버깅용 정책 제거)

  ```bash
  aws iam list-attached-role-policies --role-name <role> --query AttachedPolicies[].PolicyName --output text
  ```

## 8. 자가 채점

시간이 남으면 반드시 한다.

```bash
bash mark.sh 2>&1 | tee /tmp/self-mark.txt
```

**빈 출력부터 고친다.** 빈 출력은 확실한 0점이고 원인은 대개 이름표·리전·필터 대상이라 몇 분이면 잡힌다.

`mark.sh` 가 없으면 채점기준표의 명령을 위에서부터 손으로 돌린다. 항목 번호 옆에 O/X 를 적어 두면 남은 시간에 무엇을 고칠지가 바로 보인다.

## 9. 마지막 1분

- [ ] Bastion 이 살아 있다
- [ ] 새 터미널로 Bastion 접속이 된다
- [ ] 부하가 멈췄다
- [ ] 아무것도 삭제 중이 아니다

**과제 종료 직전에 리소스를 지우지 않는다.** 삭제는 되돌릴 수 없고, 채점기준도 "삭제된 내용은 되돌릴 수 없으므로 유의하여 채점을 진행한다"고 적혀 있다. 애매하면 남긴다 — 다만 2절의 잔여 리소스는 예외다.
