<script>
	/* 진도 화면 — 로그인과 저장 상태.
	 *
	 * 로그인하지 않아도 진도는 이 브라우저에 남는다. 로그인은 그 값을 계정에 올려
	 * 다른 기기에서 잇는 기능일 뿐이다. 그래서 로그인 칸보다 저장 상태를 먼저 그린다 —
	 * 로그인을 해야 쓸 수 있는 것처럼 보이면 안 된다.
	 *
	 * 비밀번호는 이 화면을 떠나지 않는다. 서버로 한 번 보내고 변수에서 지운다.
	 */
	import { onMount } from 'svelte';
	import { loadChecks, quizStamps, quizTotals, summarize } from '../lib/progress-store.js';
	import { pull, push, sessionId, setSession } from '../scripts/sync.js';

	/* 사이드바 주제 넷과 같은 순서다. 여기 없는 경로는 집계에 안 잡힌다. */
	const PARTS = [
		{ prefix: '/basics/', label: '사전 지식' },
		{ prefix: '/exam/', label: '대회 이해' },
		{ prefix: '/axis/', label: '과제 축' },
		{ prefix: '/drill/', label: '훈련' },
	];

	let signedIn = $state(null); // null = 아직 모른다
	let busy = $state(false);
	let notice = $state('');
	let rows = $state([]);
	let totals = $state(new Map());
	let docs = $state([]);

	const fmt = (ms) =>
		ms ? new Date(ms).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

	function refresh() {
		rows = PARTS.map((part) => ({
			...part,
			...summarize(part.prefix),
			quizTotal: totals.get(part.prefix) || 0,
		})).filter((row) => row.seen > 0);

		const checks = loadChecks();
		const stamps = quizStamps();
		docs = Object.entries(checks)
			.map(([path, entry]) => ({
				path,
				done: (entry.done || []).length,
				total: entry.total || 0,
				at: Math.max(entry.updatedAt || 0, stamps[path] || 0),
			}))
			.sort((a, b) => b.at - a.at);
	}

	async function readSession() {
		signedIn = await sessionId();
	}

	async function signOut() {
		busy = true;
		try {
			await fetch('/api/auth/session', { method: 'DELETE' });
		} catch {
			/* 실패해도 화면은 로그아웃으로 둔다 — 쿠키가 남았으면 다음 요청에서 드러난다. */
		}
		signedIn = null;
		setSession(null);
		busy = false;
	}

	async function syncNow() {
		busy = true;
		notice = '';
		const ok = (await push()) && (await pull());
		refresh();
		notice = ok ? '올렸다' : '동기화하지 못했다';
		busy = false;
	}

	onMount(() => {
		(async () => {
			try {
				const res = await fetch('/quiz-manifest.json');
				if (res.ok) totals = quizTotals(await res.json());
			} catch {
				/* 매니페스트가 없으면 퀴즈 분모 없이 체크만 보여 준다. */
			}
			refresh();
		})();
		readSession();
		window.addEventListener('skills-guide:progress-synced', refresh);
		return () => window.removeEventListener('skills-guide:progress-synced', refresh);
	});
</script>

<section class="not-content progress-panel">
	<h2>계정</h2>

	{#if signedIn === null}
		<p class="progress-panel__muted">확인하는 중</p>
	{:else if signedIn}
		<p>
			<strong>{signedIn}</strong> 으로 로그인했다. 체크와 퀴즈가 이 계정에 함께 저장된다.
		</p>
		<p class="progress-panel__actions">
			<button type="button" onclick={syncNow} disabled={busy}>지금 동기화</button>
			<button type="button" class="ghost" onclick={signOut} disabled={busy}>로그아웃</button>
		</p>
	{:else}
		<p class="progress-panel__muted">
			로그인하지 않아도 진도는 이 브라우저에 남는다. 로그인은 그 값을 다른 기기에서 잇기 위한 것이다.
		</p>
		<p class="progress-panel__actions">
			<a class="progress-panel__link-button" href="/login/">로그인</a>
		</p>
	{/if}

	{#if notice}
		<p class="progress-panel__notice">{notice}</p>
	{/if}

	<h2>저장 상태</h2>

	{#if rows.length === 0}
		<p class="progress-panel__muted">아직 남은 것이 없다. 문서에서 항목을 체크하면 여기에 쌓인다.</p>
	{:else}
		<table>
			<thead>
				<tr><th>구간</th><th>체크</th><th>퀴즈 정답</th><th>지나온 문서</th></tr>
			</thead>
			<tbody>
				{#each rows as row (row.prefix)}
					<tr>
						<td>{row.label}</td>
						<td>{row.checkDone} / {row.checkTotal}</td>
						<td>{row.correct} / {row.quizTotal || '—'}</td>
						<td>{row.seen}</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<h2>문서별</h2>
		<table>
			<thead>
				<tr><th>문서</th><th>체크</th><th>마지막 변경</th></tr>
			</thead>
			<tbody>
				{#each docs as doc (doc.path)}
					<tr>
						<td><a href={doc.path}>{doc.path}</a></td>
						<td>{doc.done} / {doc.total}</td>
						<td>{fmt(doc.at)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>
