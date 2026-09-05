/* 목차 항목에서 제목 배지를 걷어낸다.
 *
 * starlight-heading-badges 는 `:badge[함정]{variant=danger}` 를 제목 텍스트 안에
 * `__SHB__danger__SHB__함정__SHB__` 로 직렬화해 두고, 목차를 그릴 때 다시 배지로
 * 되돌린다. 그런데 그 복원기는 배지가 제목 **끝**에 붙어 있을 때만 동작한다 —
 * `## :badge[함정]{variant=danger} 목록` 처럼 앞이나 중간에 두면 되돌리지 못하고
 * 직렬화 문자열이 목차 패널에 그대로 노출된다.
 *
 * 본문 제목은 별도의 rehype 단계가 처리하므로 여기서 무엇을 지워도 배지가 그대로
 * 보인다. 목차에서만 배지를 감추는 것이 목적이다.
 */

const BADGE = /__SHB__[a-z]+__SHB__.*?__SHB__/g;

/** 배지를 지운 뒤 남는 빈 괄호·이중 공백·매달린 구분자를 정리한다. */
function clean(text) {
  return text
    .replace(BADGE, '')
    .replace(/\s+/g, ' ')
    .replace(/\(\s*\)/g, '')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/[\s—·:-]+$/, '')
    .trim();
}

/** 목차 트리를 제자리에서 손본다. `toc` 가 없으면 아무것도 하지 않는다. */
export function stripHeadingBadges(toc) {
  if (!toc?.items) return;
  walk(toc.items);
}

function walk(items) {
  for (const item of items) {
    if (typeof item.text === 'string') item.text = clean(item.text);
    if (item.children?.length) walk(item.children);
  }
}
