# 축 2 — Bastion·IAM·접근 경로

> 문서 유형: explanation

배점 자체는 작다(2023 3점, 2024 3점, 2026은 항목조차 없다). 그런데 **이 축이 무너지면 나머지 전부가 0이다.** 채점자가 여기로 들어와서 채점하기 때문이다.

과제지가 매년 같은 경고를 반복한다.

> Bastion EC2는 채점 시 사용하기 때문에 연결 및 권한 문제가 발생하지 않도록 주의합니다. Bastion EC2에 접근 불가한 경우 채점에 불이익이 있을 수 있습니다. — 2026 1과제 유의사항 5)

## 1. 4년간 무엇이 요구됐나

| | 2023 | 2024 | 2025 | 2026 1과제 | 2026 2과제 |
| --- | --- | --- | --- | --- | --- |
| Name | wsi-bastion | skills-bastion-ec2 | ws-bastion | worldpay-bastion | 없음 |
| 타입 | t3.small | t4g.large (1과제) / t3a.small (2과제) | t3.micro | t3.micro | — |
| OS | Amazon Linux 2 | Amazon Linux 2023 | Amazon Linux 2 | Amazon Linux 2023 | — |
| 고정 IP | EIP 필수 | EIP 필수 | EIP 필수 | 명시 없음 | — |
| 접근 | SSH | SSH, **기본 포트 금지** | SSH | SSH **또는 SSM** | CloudShell |
| 권한 | PowerUserAccess | AWS 전체 + EKS 전체 | 문제 없도록 | Administrator 급 | — |
| 패키지 | awscli, curl | AWS CLI v2, cURL, jq, kubectl | awscli, curl, docker, jq | awscli, curl (채점기준) | — |

2025 2과제는 문제마다 Bastion을 따로 요구했다 — `order-bastion`(EKS 접근 + Administrator), `korea-bastion`(Default VPC + Administrator), `automation-bastion`(**종료 방지 활성화**).

2026 2과제부터 CloudShell로 바뀌었다. → [지형도 2-2절](00-competition-map.md)

## 2. 채점자가 실제로 확인하는 것

2026 1과제 채점기준 5)절이 채점 전 셋업 절차를 그대로 적어 두었다.

```
- Bastion에 SSH로 접근 가능한지 확인합니다.
- Bastion에서 awscli, curl이 설치되었는지 확인합니다.
- Bastion에서 IAM Role이 맵핑되어 awscli로 AWS 모든 리소스에 접근 가능한지 확인합니다.
- aws sts get-caller-identity 명령을 통해 선수의 계정이 아닌 다른 계정에
  접근하고 있는지 확인합니다. 만약, 다른 계정이라면 부정행위를 의심할 수 있습니다.
```

네 줄 전부가 실격 사유다. 특히 마지막 줄 — **다른 계정의 자격 증명이 남아 있으면 부정행위 의심이다.** `~/.aws/credentials` 에 예전 실습 키를 남기지 않는다.

그리고 채점자는 `~/.aws/config` 에 아래를 추가한다.

```ini
[default]
region = ap-northeast-2
output = json
```

미리 이렇게 해 두면 채점자 손이 덜 간다. 손해 볼 일이 없다.

## 3. IAM role vs 액세스 키

**액세스 키를 파일에 넣지 않는다.** 인스턴스 프로파일(IAM role)을 붙인다.

이유는 셋이다.

1. `aws sts get-caller-identity` 가 role의 assumed-role ARN을 반환한다 — 선수 계정임이 바로 확인된다.
2. 키가 유출될 자리가 없다.
3. **"root 계정에서 awscli를 쓰면 전체 권한"(2024) 요구를 자동으로 만족한다.** 인스턴스 메타데이터는 리눅스 사용자와 무관하게 동작한다.

액세스 키를 `ec2-user` 홈에 넣으면 `sudo su -` 로 root가 됐을 때 `/root/.aws` 가 비어 권한이 사라진다. 2024 채점은 root에서 실행하는 것을 전제로 한다.

```bash
# 확인
aws sts get-caller-identity
# → Arn 이 arn:aws:sts::<계정>:assumed-role/<role>/i-xxxx 형태여야 한다
sudo aws sts get-caller-identity   # root 에서도 같은 결과여야 한다
```

## 4. SSH 포트를 바꾸라고 할 때 (2024)

> 포트는 반드시 SSH 기본 포트를 사용해서는 안 됩니다.

sshd 설정과 보안 그룹 둘 다 바꿔야 한다. **순서를 틀리면 스스로 잠긴다.**

```bash
# 1) 보안 그룹에 새 포트를 먼저 연다 (22는 아직 열어 둔 채)
# 2) sshd_config 수정
sudo sed -i 's/^#\?Port .*/Port 2222/' /etc/ssh/sshd_config
# 3) SELinux 가 켜져 있으면 포트를 등록
sudo semanage port -a -t ssh_port_t -p tcp 2222 2>/dev/null || true
sudo systemctl restart sshd
# 4) 새 터미널로 새 포트 접속을 확인한 뒤에야 22를 닫는다
```

4)를 건너뛰고 22를 먼저 닫으면 복구에 SSM이나 인스턴스 교체가 필요하다. **현재 세션은 살아 있으니 절대 닫지 말고 새 창으로 검증한다.**

접속 정보(포트 번호)를 채점자가 알 수 있게 남긴다 — 과제지에 적는 칸이 없으면 심사위원에게 구두로 알린다.

## 5. SSM Session Manager

2025 2과제와 2026 2과제는 SSM 접근을 명시적으로 요구한다(`ws-web-a/b`, `sharing-asg` 인스턴스). SSH 없이 프라이빗 서브넷 인스턴스에 붙는 수단이다.

필요한 것 넷.

1. 인스턴스에 **`AmazonSSMManagedInstanceCore`** 정책을 가진 IAM role
2. SSM Agent — Amazon Linux 2/2023 AMI에는 기본 설치돼 있다
3. **SSM 엔드포인트로 나가는 길** — NAT 경유 또는 VPC 엔드포인트 3종(`ssm`, `ssmmessages`, `ec2messages`)
4. 보안 그룹 아웃바운드 443

```bash
# 등록 확인
aws ssm describe-instance-information \
  --filters Key=InstanceIds,Values=[i-xxxx] --query InstanceInformationList[].PingStatus
# → "Online"
```

2025 2과제 채점 3-9가 정확히 이 명령이다. `Online` 이 안 나오면 위 넷 중 하나가 빠졌다. **인스턴스를 방금 띄웠으면 등록까지 1~2분 걸린다** — 바로 확인하고 실패로 단정하지 않는다.

## 6. 종료 방지 (2025 2과제 ④)

`automation-bastion` 은 자기가 만든 삭제 스크립트에 지워지면 안 된다.

```bash
aws ec2 modify-instance-attribute --instance-id i-xxxx --disable-api-termination
```

그런데 **종료 방지만으로는 부족하다.** `delete_all_instance.sh` 가 `terminate-instances` 를 호출하면 API가 에러를 반환하고, 스크립트가 거기서 죽으면 나머지 인스턴스가 안 지워져 4-7·4-8이 실패한다.

스크립트에서 Bastion을 **명시적으로 제외**한다.

```bash
SELF=$(curl -s -H "X-aws-ec2-metadata-token: $(curl -sX PUT \
  http://169.254.169.254/latest/api/token \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')" \
  http://169.254.169.254/latest/meta-data/instance-id)

IDS=$(aws ec2 describe-instances \
  --filters Name=instance-state-name,Values=running,stopped \
  --query "Reservations[].Instances[?InstanceId!='$SELF'].InstanceId" --output text)

[ -n "$IDS" ] && aws ec2 terminate-instances --instance-ids $IDS
```

`[ -n "$IDS" ]` 검사가 없으면 대상이 없을 때 `terminate-instances` 가 인자 없이 호출돼 에러를 낸다.

## 7. CloudShell (2026 2과제)

브라우저에서 열리는 셸이다. 로그인한 IAM 주체의 권한을 그대로 쓴다.

알아 둘 것.

- **리전마다 별개다.** 리전을 바꾸면 새 세션이고 홈 디렉터리도 다르다(1GB 영구 저장은 리전별).
- 120일 미사용 시 홈이 삭제된다.
- VPC 안이 아니다 — **프라이빗 RDS·EFS에 직접 못 붙는다.** 2026 2과제 채점이 Lambda invoke·EFS는 SSM 경유로 하는 이유다.
- `aws` CLI, `python3`, `jq` 가 기본 설치돼 있다.

2026 2과제 채점기준 유의사항: "브라우저를 통해 접근하며 권한 및 접속 문제가 없도록 주의합니다." **콘솔 로그인 계정에 CloudShell 사용 권한이 있는지 미리 확인한다.**

## 8. 드릴

### 8-1. 드릴 A — Bastion 5분 컷

빈 계정에서 시작해 5분 안에:

1. IAM role 생성 (AdministratorAccess) + 인스턴스 프로파일
2. EC2 t3.micro, Amazon Linux 2023, public 서브넷, EIP
3. `aws sts get-caller-identity` 가 assumed-role을 반환
4. `sudo aws sts get-caller-identity` 도 같은 결과
5. `~/.aws/config` 에 region·output 설정
6. awscli v2 · curl · jq · kubectl 확인

user data로 자동화해 둔다. 대회에서 이 6단계를 손으로 하면 10분을 버린다.

```bash
#!/bin/bash
dnf install -y jq
curl -sL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/a.zip
cd /tmp && unzip -q a.zip && ./aws/install --update
curl -sLO "https://dl.k8s.io/release/$(curl -sL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
install -m 0755 kubectl /usr/local/bin/kubectl
mkdir -p /root/.aws /home/ec2-user/.aws
printf '[default]\nregion = ap-northeast-2\noutput = json\n' | tee /root/.aws/config /home/ec2-user/.aws/config
chown -R ec2-user:ec2-user /home/ec2-user/.aws
```

**Amazon Linux 2 를 쓰라는 해(2023·2025)에는 `dnf` 가 아니라 `yum` 이다.** AMI가 무엇인지 먼저 확인한다.

### 8-2. 드릴 B — SSH 포트 변경 후 복구

일부러 잠긴 상태를 만들고 SSM으로 복구한다. 2024형 요구를 안전하게 처리하는 감각을 만든다.

### 8-3. 드릴 C — 자기 파괴하지 않는 삭제 스크립트

6절 스크립트를 직접 써서 인스턴스 4대를 띄우고 태그 기준·전체 기준 삭제를 각각 검증한다. 2025 2과제 ④의 채점 절차(4-1~4-9)를 그대로 따라 한다.

## 9. 참고 문서

- [EC2 인스턴스 프로파일](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html) — role이 인스턴스에 붙는 구조
- [Session Manager 사전 조건](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-prerequisites.html) — 위 5절 네 조건의 원문
- [VPC 엔드포인트로 Systems Manager 설정](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html) — NAT 없이 SSM
- [인스턴스 종료 방지](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_ChangingDisableAPITermination.html)
- [AWS CloudShell 사용](https://docs.aws.amazon.com/cloudshell/latest/userguide/working-with-cloudshell.html) — 리전별 스토리지 절
