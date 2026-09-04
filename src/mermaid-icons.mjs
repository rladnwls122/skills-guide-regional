/**
 * mermaid 도식이 쓰는 아이콘 목록.
 *
 * 노드는 아이콘 팩 JSON(`@{ icon: "logos:aws-s3" }`)을, subgraph 는 CSS 클래스
 * (`<span class='icon--logos icon--logos--aws-s3'>`)를 쓴다. 둘 다 이 목록에서
 * 만든 URL로 받으므로 이름이 갈라지지 않는다.
 *
 * 목록에 없는 아이콘을 도식에서 쓰면 그 노드가 깨진다 —
 * scripts/check-mermaid-icons.mjs 가 그 회귀를 막는다.
 */
export const MERMAID_ICONS = {
  logos: [
    // ECR 은 Iconify logos 팩에 없다 — 범용 AWS 로고로 대체한다.
    'aws',
    'aws-kms', 'aws-s3', 'aws-vpc', 'aws-eks', 'aws-ec2', 'aws-lambda',
    'aws-dynamodb', 'aws-iam', 'aws-cloudfront', 'aws-cloudwatch', 'aws-elb',
    'aws-sqs', 'aws-sns', 'aws-eventbridge', 'aws-kinesis', 'aws-api-gateway',
    'aws-ecs', 'aws-fargate', 'aws-rds', 'aws-route53', 'aws-secrets-manager',
    'aws-xray', 'aws-step-functions', 'aws-cloudformation', 'aws-waf',
    'aws-cognito', 'aws-elasticache', 'aws-glue', 'aws-cloudtrail',
    'aws-config', 'aws-msk', 'aws-documentdb',
    'kubernetes', 'docker-icon', 'terraform-icon', 'prometheus', 'grafana',
    'helm', 'nginx', 'apache-flink', 'opentelemetry',
  ],
  // AWS·제품 로고로 표현할 수 없는 개념(서브넷·계층·로그 등)에만 쓴다.
  mdi: [
    'lan-connect', 'layers-outline', 'script-text-outline', 'console-line',
    'server-network', 'web', 'routes', 'card-text-outline',
  ],
  // logos 팩에 없는 브랜드 로고. 단색이라 mdi처럼 색을 박아야 한다.
  'simple-icons': ['fluentbit'],
};

/** Iconify 서브셋 엔드포인트 URL. 아이콘 개수와 무관하게 팩당 요청 1건. */
export const iconifyUrl = (pack, ext, params = '') =>
  `https://api.iconify.design/${pack}.${ext}?icons=${MERMAID_ICONS[pack].join(',')}${params}`;
