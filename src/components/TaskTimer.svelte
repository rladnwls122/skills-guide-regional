<script>
	/* 4시간 과제 타임박스.
	 *
	 * 구간표는 09-drills 3-1 의 1과제 운영 템플릿 그대로다 — 문서를 고치면 여기도
	 * 같이 고친다. 진행 상태는 localStorage 에 시작 시각(epoch ms)만 남긴다:
	 * 남은 시간을 저장하면 탭을 닫아 둔 사이의 시간이 사라져 실전과 어긋난다.
	 */
	const KEY = 'sgr-task-timer-start';
	const TOTAL = 4 * 60 * 60 * 1000;

	/* [시작(분), 라벨, 왜 이 자리인가] */
	const PHASES = [
		[0, '문제지 정독 · 이름표 표로 옮기기', '이름을 손으로 타이핑하지 않으려면 먼저 옮겨 적는다'],
		[15, '로그 그룹 + 보관 기간', '2.5점이 1분에 들어온다'],
		[20, '네트워크 전부', '배점이 가장 크고 뒤가 전부 여기에 의존한다'],
		[50, 'Bastion', 'user data 로 자동화해 두면 5분'],
		[60, 'DB 생성 시작 → 대기 중 보안 그룹·secret·IAM', '생성이 10~15분 걸린다. 먼저 건다'],
		[90, '앱 배포 + ALB + 타깃 그룹', '연쇄의 뿌리'],
		[150, 'curl POST → GET 왕복 확인', '분기점 — 여기서 막히면 30분만 더 쓴다'],
		[165, 'DB 옵션 훑기', '암호화·백업·로깅·삭제 방지·포트'],
		[195, '대시보드 + 알람', '그래프에 데이터가 쌓일 시간을 남긴다'],
		[215, '자가 채점 (mark.sh)', '빈 출력부터 고친다'],
		[230, '잔여 리소스 정리 · Bastion 접근 최종 확인', '계정 전체를 훑는 채점 명령이 있다'],
	];

	let startedAt = $state(null);
	let now = $state(Date.now());

	$effect(() => {
		try {
			const v = localStorage.getItem(KEY);
			if (v) startedAt = Number(v);
		} catch {}
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	const elapsed = $derived(startedAt ? Math.min(now - startedAt, TOTAL) : 0);
	const remain = $derived(TOTAL - elapsed);
	const minutes = $derived(Math.floor(elapsed / 60000));
	const currentIndex = $derived(
		startedAt ? PHASES.findLastIndex(([at]) => minutes >= at) : -1
	);

	function hhmmss(ms) {
		const s = Math.max(0, Math.floor(ms / 1000));
		return [s / 3600, (s % 3600) / 60, s % 60]
			.map((n) => String(Math.floor(n)).padStart(2, '0'))
			.join(':');
	}

	function start() {
		startedAt = Date.now();
		try { localStorage.setItem(KEY, String(startedAt)); } catch {}
	}

	function reset() {
		startedAt = null;
		try { localStorage.removeItem(KEY); } catch {}
	}
</script>

<div class="not-content rounded-lg border border-[var(--sl-color-gray-5)] p-4">
	<div class="flex flex-wrap items-baseline gap-3">
		<span class="font-mono text-3xl tabular-nums">{hhmmss(remain)}</span>
		<span class="text-sm opacity-70">남은 시간 · 총 4시간</span>
		<span class="ml-auto flex gap-2">
			<button
				class="rounded border border-[var(--sl-color-gray-5)] px-3 py-1 text-sm"
				onclick={start}>{startedAt ? '다시 시작' : '시작'}</button>
			{#if startedAt}
				<button
					class="rounded border border-[var(--sl-color-gray-5)] px-3 py-1 text-sm"
					onclick={reset}>정지</button>
			{/if}
		</span>
	</div>

	<div class="mt-3 h-1.5 w-full overflow-hidden rounded bg-[var(--sl-color-gray-6)]">
		<div
			class="h-full bg-[var(--sl-color-accent)] transition-[width] duration-1000"
			style="width: {(elapsed / TOTAL) * 100}%"></div>
	</div>

	<ol class="mt-4 space-y-1">
		{#each PHASES as [at, label, why], i}
			{@const done = currentIndex > i}
			{@const active = currentIndex === i}
			<li
				class="flex gap-3 rounded px-2 py-1 text-sm"
				class:opacity-40={done}
				class:bg-[var(--sl-color-gray-6)]={active}>
				<span class="w-14 shrink-0 font-mono tabular-nums opacity-70">
					{String(Math.floor(at / 60)).padStart(1, '0')}:{String(at % 60).padStart(2, '0')}
				</span>
				<span>
					<strong class:font-bold={active}>{label}</strong>
					<span class="block text-xs opacity-60">{why}</span>
				</span>
			</li>
		{/each}
	</ol>
</div>
