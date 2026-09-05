<script>
	/* 상단바의 로그인 단추.
	 *
	 * 로그아웃 상태면 로그인 화면으로, 로그인 상태면 진도 화면으로 보낸다. 로그인
	 * 주소에는 지금 읽던 문서를 붙여서, 로그인이 끝나면 그 자리로 돌아오게 한다 —
	 * 로그인은 목적이 아니라 하던 일을 이어 가기 위한 중간 단계다.
	 *
	 * 상태를 모르는 동안에는 아무것도 그리지 않는다. "로그인"을 먼저 그렸다가 아이디로
	 * 바꾸면 페이지를 열 때마다 글자가 한 번 튄다.
	 */
	import { onMount } from 'svelte';
	import { sessionId } from '../scripts/sync.js';

	let id = $state(undefined);
	let here = $state('/');

	/* 로그인·진도 화면에서 누르면 그 자리로 되돌아오게 되므로 기본 자리로 보낸다. */
	const loginHref = $derived(
		here === '/login/' || here === '/progress/'
			? '/login/'
			: `/login/?next=${encodeURIComponent(here)}`,
	);

	onMount(() => {
		here = location.pathname;
		sessionId().then((value) => (id = value));

		const onSession = (event) => (id = event.detail);
		window.addEventListener('skills-guide:session', onSession);
		return () => window.removeEventListener('skills-guide:session', onSession);
	});
</script>

{#if id !== undefined}
	<a
		class="header-auth"
		href={id ? '/progress/' : loginHref}
		title={id ? `${id} 으로 로그인함 — 진도 보기` : '로그인하고 읽던 자리로 돌아오기'}
	>
		{#if id}
			<span class="header-auth__dot" aria-hidden="true"></span>
			<span class="header-auth__id">{id}</span>
		{:else}
			로그인
		{/if}
	</a>
{/if}
