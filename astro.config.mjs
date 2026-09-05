// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mdx from '@astrojs/mdx';
import svelte from '@astrojs/svelte';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import mermaid from 'astro-mermaid';
import remarkGfm from 'remark-gfm';
import rehypeExternalLinks from 'rehype-external-links';
import starlightThemeExquisitus from 'starlight-theme-exquisitus';
import starlightHeadingBadges from 'starlight-heading-badges';
import starlightScrollToTop from 'starlight-scroll-to-top';
import starlightFullViewMode from 'starlight-fullview-mode';
import starlightLlmActions from 'starlight-llm-actions';
import starlightCodeblockFullscreen from 'starlight-codeblock-fullscreen';
import starlightLinksValidator from 'starlight-links-validator';
import starlightQuiz from 'starlight-quiz';
import starlightSidebarTopics from 'starlight-sidebar-topics';
import { iconifyUrl } from './src/mermaid-icons.mjs';
/* Iconify 에 없는 AWS 서비스·리소스용 자체 팩. scripts/build-aws-icons.mjs 가
   AWS 공식 아이콘 패키지에서 뽑아 만든다. */
import awsIcons from './src/icons/aws.json';
/* kubernetes 공식 리소스 아이콘. scripts/build-k8s-icons.mjs 가 만든다. */
import k8sIcons from './src/icons/k8s.json';

/* 도식에 "크게 보기" 단추를 붙이고 오버레이에서 확대·이동해 볼 수 있게 한다.
   색은 여기서 내지 않는다 — .mfs-* 규칙은 이미 src/styles/mermaid.css 에 있고,
   다크/라이트는 mermaid-theme.css 의 --sl-color-* 가 낸다. 전국판과 같은 구조다. */
/** @type {import('astro').AstroIntegration} */
const mermaidFullscreen = {
  name: 'mermaid-fullscreen',
  hooks: {
    'astro:config:setup': ({ injectScript }) => {
      injectScript('page', `import '/src/scripts/mermaid-fullscreen.js';`);
    },
  },
};

/** @type {import('astro').AstroIntegration} */
const scrollbars = {
  name: 'scrollbars',
  hooks: {
    'astro:config:setup': ({ injectScript }) => {
      injectScript('page', `import '/src/scripts/scrollbars.js';`);
    },
  },
};

/** @type {import('astro').AstroIntegration} */
const splitView = {
  name: 'split-view',
  hooks: {
    'astro:config:setup': ({ injectScript }) => {
      injectScript('page', `import '/src/scripts/split-view.js';`);
    },
  },
};

/* 저장된 레일 폭·접힘 상태를 첫 페인트 전에 되돌린다. head 인라인이 아니면
   페이지를 넘길 때마다 기본 폭이 한 프레임 보였다가 바뀐다.
   접혀 있는 레일에는 저장된 폭을 다시 얹지 않는다 — 인라인 커스텀 속성이
   html[data-*='closed'] 의 0rem 규칙을 이겨서, 패널만 숨고 폭은 그대로 남는다. */
const splitViewRestore = `(()=>{try{var r=document.documentElement,
w=JSON.parse(localStorage.getItem('sl-split-steps')||'{}'),
sc=localStorage.getItem('sl-sidebar-collapsed')==='1',
tc=localStorage.getItem('sl-toc-collapsed')==='1';
if(w.sidebar&&!sc)r.style.setProperty('--sl-sidebar-width',w.sidebar+'rem');
if(w.toc&&!tc)r.style.setProperty('--sl-exquisitus-toc-width',w.toc+'rem');
if(tc)r.dataset.toc='closed';}catch(e){}})()`;

/* GFM 이 잠가 놓은 체크박스를 살리고 진도를 브라우저에 남긴다. 문서 쪽은 손대지
   않는다 — 항목을 새로 쓸 때 문법을 따로 외우지 않아도 되게 하려는 것이다.
   전국판(skills-guide)과 같은 구조다. */
/** @type {import('astro').AstroIntegration} */
const progress = {
  name: 'progress',
  hooks: {
    'astro:config:setup': ({ injectScript }) => {
      injectScript('page', `import '/src/scripts/progress.js';`);
    },
  },
};

export default defineConfig({
  /* Starlight 이 끼워 넣는 sitemap 은 site 가 없으면 통째로 건너뛴다. 배포 주소를
     여기 박아 두면 빌드마다 sitemap-index.xml 이 함께 나온다. */
  site: 'https://skills-guide-regional.vercel.app',

  /* 문서는 전부 정적으로 굽는다. 어댑터는 나중에 `/api/*` 같은 함수 경로를 붙일
     자리를 열어 두기 위한 것이고, 지금은 페이지가 전부 프리렌더된다. */
  adapter: vercel(),

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
    progress,
    mermaidFullscreen,
    scrollbars,
    splitView,
    /* autoTheme 를 끈다 — mermaid 는 항상 default 테마로 한 번만 그리고, 다크/라이트
       차이는 src/styles/mermaid-theme.css 가 Starlight 의 --sl-color-* 로 낸다.
       켜면 data-theme 가 바뀔 때마다 모든 도식의 data-processed 를 떼고 mermaid 를
       통째로 다시 돌린다 — 테마를 누를 때마다 도식이 빈 칸이 됐다 돌아온다. */
    mermaid({
      autoTheme: false,
      mermaidConfig: { themeVariables: { fontSize: '18px' } },
      iconPacks: [
        { name: 'logos', url: iconifyUrl('logos', 'json') },
        { name: 'mdi', url: iconifyUrl('mdi', 'json') },
        { name: 'simple-icons', url: iconifyUrl('simple-icons', 'json') },
        /* IconifyJSON 전체를 넘긴다 — 안쪽 icons 맵만 주면 크기만 잡히고 body 가
           비어 아이콘이 빈 사각형으로 그려진다. 빌드는 통과하므로 브라우저로
           봐야 드러난다. */
        { name: 'aws', icons: awsIcons },
        { name: 'k8s', icons: k8sIcons },
      ],
    }),
    starlight({
      title: 'skills-guide-regional',
      /* 안 주면 Starlight 가 /favicon.svg 를 가리키는데 그 파일이 없어 페이지마다
         404 가 하나씩 났다. 대회 로고에서 구운 180px PNG 를 쓴다. */
      favicon: '/favicon.png',
      description: '지방기능경기대회 클라우드컴퓨팅 훈련 문서 — 2023~2026 기출 분석',
      defaultLocale: 'root',
      locales: { root: { label: '한국어', lang: 'ko' } },
      customCss: [
        /* 레이어 순서를 먼저 선언해야 한다 — 뒤에 오는 파일들이 그 순서를 전제한다. */
        './src/styles/tailwind.css',
        './src/styles/korean-fonts.css',
        './src/styles/mermaid.css',
        './src/styles/mermaid-theme.css',
        './src/styles/mermaid-aws-icons.css',
        './src/styles/mermaid-k8s-icons.css',
        './src/styles/diagram-note.css',
        './src/styles/build-step.css',
        './src/styles/mobile.css',
        './src/styles/sidebar-toggle.css',
        './src/styles/layout.css',
        './src/styles/scrollbar.css',
        './src/styles/codeblock-fullscreen.css',
        './src/styles/progress.css',
      ],
      /* subgraph 라벨의 <span class='icon--logos--*'> 를 정의하는 CSS. 아이콘이
         데이터 URI 로 들어 있어 아이콘 개수와 무관하게 요청은 팩당 1건이다.
         mdi 는 단색이라 색을 박아야 한다 — 양쪽 테마에서 읽히는 중간톤으로 고정. */
      head: [
        { tag: 'link', attrs: { rel: 'stylesheet', href: iconifyUrl('logos', 'css') } },
        { tag: 'link', attrs: { rel: 'stylesheet', href: iconifyUrl('mdi', 'css', '&color=%238ab') } },
        { tag: 'script', content: splitViewRestore },
      ],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/rladnwls122/skills-guide-regional',
        },
      ],
      /* 상단바 오른쪽에 로그인 단추를 붙이려고 감싼 것이다. 안에서 기본 소셜
         아이콘(GitHub)을 그대로 렌더한다. */
      /* 목차 오버라이드 둘은 starlight-quiz 의 것을 감싼 것이다 — 배지를 목차
         패널에서만 감춘다(본문 제목에는 그대로 남는다). Starlight 는 한 컴포넌트에
         오버라이드를 하나만 걸 수 있어서, 감싸지 않으면 먼저 등록한 quiz 가 자리를
         차지하고 heading-badges 의 배지 복원이 아예 돌지 않는다. */
      components: {
        /* 인덱스 패널 접기 단추를 헤더 제목 옆에 둔다. */
        SiteTitle: './src/components/SiteTitle.astro',
        SocialIcons: './src/components/SocialIcons.astro',
        TableOfContents: './src/components/TableOfContents.astro',
        MobileTableOfContents: './src/components/MobileTableOfContents.astro',
      },
      plugins: [
        starlightThemeExquisitus(),
        starlightQuiz(),
        starlightHeadingBadges(),
        starlightFullViewMode(),
        starlightScrollToTop(),
        starlightLlmActions(),
        starlightCodeblockFullscreen(),
        starlightSidebarTopics([
          {
            label: '사전 지식',
            link: '/basics/00-index/',
            icon: 'seti:notebook',
            items: [{ label: '사전 지식', items: [{ autogenerate: { directory: 'basics' } }] }],
          },
          {
            label: '대회 이해',
            link: '/exam/00-competition-map/',
            icon: 'open-book',
            items: [{ label: '대회 이해', items: [{ autogenerate: { directory: 'exam' } }] }],
          },
          {
            label: '과제 축',
            link: '/axis/03-axis-network/',
            icon: 'puzzle',
            items: [{ label: '과제 축', items: [{ autogenerate: { directory: 'axis' } }] }],
          },
          {
            label: '훈련',
            link: '/drill/09-drills/',
            icon: 'rocket',
            items: [{ label: '훈련', items: [{ autogenerate: { directory: 'drill' } }] }],
          },
          /* 문서가 아니라 도구다. 훈련 문서 넷 어디에도 안 들어가므로 주제를 따로 준다.
             starlight-sidebar-topics 는 주제에 안 속한 페이지가 있으면 빌드를 세운다. */
          {
            label: '진도',
            link: '/progress/',
            icon: 'approve-check',
            items: [
              {
                label: '진도',
                items: [
                  { label: '저장 상태', link: '/progress/' },
                  { label: '로그인', link: '/login/' },
                ],
              },
            ],
          },
        ]),
        /* 죽은 사이트 내부 링크가 있으면 빌드가 깨진다. */
        starlightLinksValidator({ errorOnRelativeLinks: false }),
      ],
    }),
    mdx(),
    svelte(),
  ],

  vite: { plugins: [tailwindcss()] },
});
