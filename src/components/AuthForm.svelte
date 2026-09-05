<script>
	/* 로그인·가입 폼.
	 *
	 * 끝나면 읽던 문서로 돌려보낸다. 로그인은 목적이 아니라 하던 일을 이어 가기 위한
	 * 중간 단계라, 끝나고 낯선 화면에 떨어지면 읽던 자리를 다시 찾아야 한다.
	 *
	 * 돌아갈 주소는 검사한다. `?next=` 는 주소창에 있는 값이라 누구나 바꿔 넣을 수 있고,
	 * 그대로 믿으면 이 사이트의 로그인 화면이 남의 사이트로 보내는 발판이 된다.
	 * 같은 사이트의 경로만 통과시킨다.
	 */
	import { onMount } from 'svelte';
	import { pull, push, sessionId, setSession } from '../scripts/sync.js';

	const HOME = '/progress/';

	let mode = $state('login'); // 'login' | 'register'
	let id = $state('');
	let password = $state('');
	let busy = $state(false);
	let notice = $state('');
	let next = $state(HOME);
	let already = $state(null);

	/** 같은 사이트의 경로만 남긴다. `//evil.test` 같은 값은 바깥으로 나간다. */
	function safeNext(raw) {
		if (typeof raw !== 'string' || !raw.startsWith('/')) return HOME;
		if (raw.startsWith('//') || raw.startsWith('/\\')) return HOME;
		return raw;
	}

	async function submit(event) {
		event.preventDefault();
		busy = true;
		notice = '';
		try {
			const res = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id, password }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				notice = data.error || '실패했다';
				return;
			}
			password = '';
			setSession(data.id);
			/* 먼저 받아서 합치고, 합친 결과를 올린다. 이 기기에만 있던 진도가
			   계정에도 올라가야 다음 기기에서 이어진다. */
			await pull();
			await push();
			location.assign(next);
		} catch {
			notice = '연결하지 못했다';
		} finally {
			busy = false;
		}
	}

	onMount(() => {
		next = safeNext(new URLSearchParams(location.search).get('next'));
		sessionId().then((value) => (already = value));
	});
</script>

<section class="not-content progress-panel">
	{#if already}
		<p><strong>{already}</strong> 으로 이미 로그인했다.</p>
		<p class="progress-panel__actions">
			<a class="progress-panel__link-button" href={next}>돌아가기</a>
			<a class="progress-panel__link-button ghost" href={HOME}>진도 보기</a>
		</p>
	{:else}
		<p class="progress-panel__muted">
			로그인하지 않아도 진도는 이 브라우저에 남는다. 로그인은 그 값을 다른 기기에서 잇기 위한 것이다.
		</p>

		<form onsubmit={submit}>
			<label>
				아이디
				<input bind:value={id} autocomplete="username" required minlength="3" maxlength="32" />
			</label>
			<label>
				비밀번호
				<input
					type="password"
					bind:value={password}
					autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
					required
					minlength="10"
				/>
			</label>
			<p class="progress-panel__actions">
				<button type="submit" disabled={busy}>{mode === 'login' ? '로그인' : '가입'}</button>
				<button
					type="button"
					class="ghost"
					onclick={() => {
						mode = mode === 'login' ? 'register' : 'login';
						notice = '';
					}}
				>
					{mode === 'login' ? '계정 만들기' : '로그인으로'}
				</button>
			</p>
		</form>

		{#if mode === 'register'}
			<p class="progress-panel__muted">
				비밀번호는 10자 이상이다. 이메일을 받지 않으므로 <strong>잊으면 되돌릴 수 없다.</strong>
			</p>
		{/if}

		{#if notice}
			<p class="progress-panel__notice">{notice}</p>
		{/if}

		{#if next !== HOME}
			<p class="progress-panel__muted">끝나면 <code>{next}</code> 로 돌아간다.</p>
		{/if}
	{/if}
</section>
