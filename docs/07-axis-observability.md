# 축 5 — 관측(CloudWatch)

> 문서 유형: explanation

2024·2025·2026 3년 연속 나왔다. 2025는 Monitoring 단독 10점, 2026은 CW Logs 4점 + CloudWatch 4점으로 **8점(전체 16%)** 이다.

배점 대비 시간이 가장 적게 드는 축이다. **다만 로그 전송 항목만은 연쇄라 앱이 살아 있어야 한다.**

## 1. 4년간 무엇이 요구됐나

| | 2024 | 2025 | 2026 |
| --- | --- | --- | --- |
| 로그 그룹 이름 | /aws/app/user, /aws/app/token | /ws/ecs/gateway, /ws/ecs/product | worldpay-log-group |
| 보관 기간 | 없음 | 없음 | **30일** |
| 실제 로그 도달 확인 | ● | ● (`mug` 검색) | ● (`marking-user` 검색) |
| 대시보드 | 없음 | ProductService | worldpay-dashboard |
| 대시보드 위젯 | | EC2 CPU·Network, ALB 4xx·5xx | ALB Fixed response 수, ASG 평균 CPU |
| 알람 | 없음 | **5분 내 4xx 10개 이상** | 없음 |
| Container Insights | 없음 | ● | 없음 |

## 2. 로그 그룹 세 항목

2026 CW Logs 4점이 세 항목으로 쪼개져 있다. 셋의 성격이 완전히 다르다.

| 항목 | 배점 | 성격 |
| --- | --- | --- |
| 7-1 로그 그룹 생성 | 1.5 | 이름만 맞으면 됨. 30초 |
| 7-2 보관 기간 30일 | 1.0 | 설정 한 줄. 10초 |
| 7-3 로그 전송 | 1.5 | **연쇄** — 앱이 살아야 함 |

```bash
aws logs create-log-group --log-group-name worldpay-log-group
aws logs put-retention-policy --log-group-name worldpay-log-group --retention-in-days 30
```

**로그 그룹은 시작하자마자 만들어 둔다.** 2.5점이 1분 안에 들어온다. 뒤로 미루면 시간에 쫓겨 잊는다.

7-3 채점:

```bash
aws logs tail worldpay-log-group --since 0 | grep marking-user
```

`marking-user` 는 채점자가 6-1에서 `POST /v1/users` 로 넣은 이름이다. **앱이 요청 본문이나 파라미터를 로그로 찍어야 검색에 걸린다.** 접근 로그 형식이 `POST /v1/users 200` 뿐이면 이름이 안 남아 0점이다.

지급 바이너리를 수정할 수 없으므로(2026 유의사항 8), 바이너리가 무엇을 찍는지 먼저 확인한다. 안 찍는다면 ALB 액세스 로그나 프록시 계층에서 본문을 남기는 방법을 쓴다.

### 2-1. 로그가 실제로 가는 경로

| 배포 수단 | 전송 방식 |
| --- | --- |
| ECS (2023·2025) | Task Definition의 `logConfiguration` → `awslogs` 드라이버 |
| EKS (2024) | Fluent Bit DaemonSet 또는 CloudWatch Observability 애드온 |
| EC2/ASG (2026) | **CloudWatch Agent 직접 설치 + 설정** |

2026형이 가장 손이 많이 간다.

```bash
dnf install -y amazon-cloudwatch-agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<'CFG'
{"logs":{"logs_collected":{"files":{"collect_list":[
  {"file_path":"/var/log/worldpay/app.log",
   "log_group_name":"worldpay-log-group",
   "log_stream_name":"{instance_id}"}
]}}}}
CFG
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

**인스턴스 프로파일에 `CloudWatchAgentServerPolicy` 가 필요하다.** 없으면 에이전트는 돌지만 로그가 안 간다 — 에러가 조용해 알아채기 어렵다. 확인은 에이전트 자체 로그다.

```bash
tail /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
```

문제지가 "로그가 발생하면 최대 5분 내로" 라고 적은 것은 에이전트의 배치 전송 주기를 감안한 표현이다. **채점 직전에 앱을 재시작하면 로그가 아직 안 갔을 수 있다.** 미리 요청을 몇 번 보내 로그가 도착하는 것을 확인해 둔다.

## 3. 대시보드

### 3-1. 채점이 보는 것

2025는 사람이 콘솔에서 눈으로 본다. 2026은 JSON을 직접 파싱한다.

```bash
aws cloudwatch get-dashboard --dashboard-name worldpay-dashboard \
  --query DashboardBody --output text | jq '.widgets[].properties.metrics'
```

기대값:

```json
[ "AWS/ApplicationELB", "HTTP_Fixed_Response_Count", "LoadBalancer", "app/worldpay-alb/<랜덤>" ]
[ "AWS/EC2", "CPUUtilization", "AutoScalingGroupName", "worldpay-asg" ]
```

**네임스페이스·메트릭 이름·차원 키·차원 값 네 개가 전부 맞아야 한다.** 콘솔에서 메트릭을 검색해 추가하면 자동으로 맞는다. JSON을 손으로 쓰면 차원 키를 틀리기 쉽다(`AutoScalingGroupName` 이지 `AutoScalingGroup` 이 아니다).

`app/worldpay-alb/<랜덤>` 은 ALB ARN 끝부분이다. `describe-load-balancers` 의 `LoadBalancerArn` 에서 `loadbalancer/` 뒤를 떼어 쓴다.

### 3-2. 위젯 구성이 조건일 때 (2025)

"EC2 CPU, Network In/Out, ALB 4xx, 5xx 를 확인할 수 있는 그래프들"이 요구다. 위젯을 4개로 나눠도, 하나에 4개 메트릭을 넣어도 된다. 채점은 눈으로 본다.

**메트릭 이름**을 정확히 고른다.

| 원하는 것 | 네임스페이스 | 메트릭 |
| --- | --- | --- |
| EC2 CPU | AWS/EC2 | CPUUtilization |
| EC2 네트워크 | AWS/EC2 | NetworkIn, NetworkOut |
| ALB 4xx | AWS/ApplicationELB | HTTPCode_Target_4XX_Count 또는 HTTPCode_ELB_4XX_Count |
| ALB 5xx | AWS/ApplicationELB | HTTPCode_Target_5XX_Count 또는 HTTPCode_ELB_5XX_Count |
| ALB 고정 응답 | AWS/ApplicationELB | HTTP_Fixed_Response_Count |

`ELB_4XX` 는 로드밸런서가 직접 만든 응답(잘못된 요청, 리스너 규칙에 안 걸림)이고 `Target_4XX` 는 백엔드가 만든 응답이다. **2025 채점 4-3이 존재하지 않는 경로(`/v1/errors4xx`)로 20회 요청해 알람이 울리는지 본다** — 그 경로가 타깃까지 갔다면 Target_4XX, ALB가 막았다면 ELB_4XX 다. **둘 다 대시보드에 넣어 두면 안전하다.**

## 4. 알람 (2025)

> 만약 5분 안에 4xx 에러가 10개 이상 발생 시 알람이 울리도록 구성합니다.

| 설정 | 값 |
| --- | --- |
| 메트릭 | HTTPCode_Target_4XX_Count (또는 ELB_4XX) |
| 통계 | **Sum** (Average 아님) |
| 기간 | 300초 |
| 임계값 | `>= 10` |
| 평가 기간 | 1 |
| 누락 데이터 처리 | notBreaching |

**통계를 Sum으로 두는 것이 핵심이다.** Average로 두면 20번 요청해도 값이 1 근처라 절대 안 울린다.

채점 4-3은 알람이 **채점 전 `OK` 상태**였다가 요청 후 `ALARM` 으로 바뀌는지 본다. 누락 데이터 처리를 기본값(missing)으로 두면 평소 상태가 `INSUFFICIENT_DATA` 라 "정상(OK)" 조건이 깨진다. `notBreaching` 으로 둔다.

## 5. Container Insights (2025)

ECS 클러스터 설정에서 켠다.

```bash
aws ecs update-cluster-settings --cluster ws-cluster \
  --settings name=containerInsights,value=enabled
```

**이미 돌고 있는 Task에는 소급 적용되지 않는다.** 켠 뒤 서비스를 강제 배포해 Task를 새로 띄운다.

```bash
aws ecs update-service --cluster ws-cluster --service gateway-svc --force-new-deployment
```

지표가 CloudWatch에 나타나기까지 몇 분 걸린다. **채점 직전에 켜면 그래프가 비어 있다.**

## 6. 시간 배분

관측 축은 이렇게 나눠 넣는다.

| 시점 | 할 일 | 소요 |
| --- | --- | --- |
| 과제 시작 직후 | 로그 그룹 생성 + 보관 기간 | 1분 |
| 앱 배포하며 | 로그 드라이버/에이전트 설정을 배포 정의에 함께 | 0분 (같이 함) |
| 앱이 뜬 직후 | Container Insights 켜기, 요청 몇 번 보내 로그 도달 확인 | 5분 |
| 상반부 끝 | 대시보드 + 알람 | 15분 |
| 종료 30분 전 | 알람 상태가 OK인지, 대시보드 그래프에 데이터가 있는지 | 5분 |

**대시보드를 마지막 10분에 만들면 그래프가 비어 있어 채점자가 "확인할 수 없다"고 판단할 수 있다.** 데이터가 쌓일 시간을 남긴다.

## 7. 드릴

### 7-1. 드릴 A — 3분 관측 세트

로그 그룹 생성 → 보관 기간 → 대시보드에 위젯 2개 → 알람 1개. 3분 안에.

CLI로 손에 붙이면 대회에서 콘솔을 헤매지 않는다.

```bash
aws cloudwatch put-dashboard --dashboard-name worldpay-dashboard --dashboard-body file://dash.json
aws cloudwatch put-metric-alarm --alarm-name alb-4xx \
  --namespace AWS/ApplicationELB --metric-name HTTPCode_Target_4XX_Count \
  --dimensions Name=LoadBalancer,Value=app/worldpay-alb/xxxx \
  --statistic Sum --period 300 --threshold 10 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 --treat-missing-data notBreaching
```

### 7-2. 드릴 B — 알람 실제로 울리기

2025 채점 4-3을 그대로 재현한다. 없는 경로로 1분 안에 20회 요청하고 알람이 `OK` → `ALARM` 으로 바뀌는지 5분 안에 확인한다. 안 울리면 통계·기간·차원 순으로 본다.

### 7-3. 드릴 C — 로그 도달 진단

로그가 안 갈 때 원인 넷을 하나씩 심고 찾는다.

- 인스턴스 프로파일에 CloudWatchAgentServerPolicy 없음
- 에이전트 설정의 `file_path` 가 실제 로그 파일과 다름
- 로그 그룹 이름 오타
- 앱이 stdout 으로만 찍고 파일로 안 씀

## 8. 참고 문서

- [CloudWatch Logs 보존 기간](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html)
- [CloudWatch Agent 설치](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Agent-on-EC2-Instance.html) — IAM 요구 사항 절
- [ALB CloudWatch 지표](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html) — ELB_4XX 와 Target_4XX 차이
- [CloudWatch 알람 누락 데이터 처리](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html#alarms-and-missing-data)
- [대시보드 본문 구조](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html) — metrics 배열 형식
- [Container Insights (ECS)](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-ECS.html)
