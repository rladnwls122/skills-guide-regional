// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mdx from '@astrojs/mdx';
import mermaid from 'astro-mermaid';
import remarkGfm from 'remark-gfm';
import rehypeExternalLinks from 'rehype-external-links';
import starlightThemeExquisitus from 'starlight-theme-exquisitus';
import starlightHeadingBadges from 'starlight-heading-badges';
import starlightScrollToTop from 'starlight-scroll-to-top';
import starlightCodeblockFullscreen from 'starlight-codeblock-fullscreen';
import starlightLinksValidator from 'starlight-links-validator';

export default defineConfig({
  /* 정적 빌드다. API 라우트가 없으므로 어댑터를 두지 않는다 — `npm run build` 가
     평범한 파일을 내고 어느 정적 호스팅에나 그대로 올라간다. */

  /* GFM 기본값은 홑물결(~)도 취소선 구분자로 먹는다 — `3~4h` 같은 범위 표기가
     문단 안에서 짝 지어져 그 사이가 통째로 취소선이 된다. 내장 gfm 을 끄고
     remark-gfm 을 singleTilde:false 로 직접 넣어 겹물결(~~)만 취소선으로 남긴다.
     표·작업 목록 등 나머지 GFM 은 그대로다. skills-guide 와 같은 판단이다. */
  markdown: {
    gfm: false,
    remarkPlugins: [[remarkGfm, { singleTilde: false }]],
    /* 외부 링크는 새 탭으로 연다 — 공식 문서에서 값을 찾다가 읽던 자리를 잃지
       않게 한다. 사이트 안 링크와 앵커는 대상이 아니다. `rel` 은 새 탭이 원본
       창을 조작하지 못하게 막는 표준 조합이다. */
    rehypePlugins: [
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
    ],
  },

  integrations: [
    /* autoTheme 를 끈다 — mermaid 는 항상 default 테마로 한 번만 그리고 다크/라이트
       차이는 CSS 값 재계산으로 끝난다. 켜면 테마를 누를 때마다 모든 도식이 빈 칸이
       됐다 돌아온다. */
    mermaid({ autoTheme: false, mermaidConfig: { themeVariables: { fontSize: '18px' } } }),
    starlight({
      title: 'skills-guide-regional',
      description: '지방기능경기대회 클라우드컴퓨팅 훈련 문서 — 2023~2026 기출 분석',
      defaultLocale: 'root',
      locales: { root: { label: '한국어', lang: 'ko' } },
      customCss: ['./src/styles/korean-fonts.css'],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/rladnwls122/skills-guide-regional',
        },
      ],
      sidebar: [{ label: '가이드', items: [{ autogenerate: { directory: 'guide' } }] }],
      plugins: [
        starlightThemeExquisitus(),
        starlightHeadingBadges(),
        starlightScrollToTop(),
        starlightCodeblockFullscreen(),
        /* 죽은 사이트 내부 링크가 있으면 빌드가 깨진다 — 예전에 쓰던 셸 링크
           검사 스크립트를 대체한다. */
        starlightLinksValidator({ errorOnRelativeLinks: false }),
      ],
    }),
    mdx(),
  ],
});
