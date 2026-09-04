#!/usr/bin/env bash
# 저장소 안의 상대 링크가 실제 파일을 가리키는지 확인한다.
# 사용: bash check-links.sh
set -u
fail=0
while IFS= read -r f; do
  dir=$(dirname "$f")
  grep -o '](\([^)#]*\)[^)]*)' "$f" | sed 's/^](//; s/[)#].*$//' | while read -r target; do
    case "$target" in
      http*|mailto:*|"") continue ;;
    esac
    [ -e "$dir/$target" ] || echo "BROKEN $f -> $target"
  done
done < <(find . -name '*.md' -not -path './.git/*') > /tmp/link-check.txt
if [ -s /tmp/link-check.txt ]; then cat /tmp/link-check.txt; fail=1; else echo "OK: 모든 상대 링크가 유효하다"; fi
exit $fail
