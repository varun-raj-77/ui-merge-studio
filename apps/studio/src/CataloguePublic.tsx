import { ArrowRight, Check, Code2, GitMerge, MousePointer2, ShieldCheck } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { PublicCandidate } from '../../../packages/showcase-evidence/src/schema';
import { Button } from './ui/Button';

export const githubUrl = 'https://github.com/varun-raj-77/ui-merge-studio';
export const localSetupUrl = `${githubUrl}#run-locally`;

function BrandMark() {
  return <span className="relative grid size-7 place-items-center rounded-md bg-ink text-[10px] font-black tracking-[-.04em] text-white" aria-hidden="true">
    UM<span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2 border-canvas bg-selection" />
  </span>;
}

export function PublicNav({ open }: { open: () => void }) {
  return <nav className="sticky top-0 z-50 mx-auto flex h-14 w-full max-w-[1480px] items-center justify-between px-5 sm:px-8" aria-label="Public navigation">
    <a href="#top" className="flex items-center gap-2.5 text-[14px] font-semibold text-ink no-underline"><BrandMark />UI Merge Studio</a>
    <div className="ums-glass flex items-center gap-1 rounded-lg p-1">
      <button className="hidden min-h-8 rounded-md px-3 text-xs font-medium text-muted hover:bg-white/70 hover:text-ink sm:block" onClick={open}>Interactive demo</button>
      <a className="hidden min-h-8 items-center rounded-md px-3 text-xs font-medium text-muted no-underline hover:bg-white/70 hover:text-ink sm:flex" href="#how-it-works">How it works</a>
      <a className="flex min-h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-muted no-underline hover:bg-white/70 hover:text-ink" href={githubUrl} target="_blank" rel="noreferrer noopener"><Code2 size={14} /> GitHub</a>
    </div>
  </nav>;
}

function HeroProductDemo() {
  const reduced = useReducedMotion();
  return <motion.div
    className="relative min-h-[420px] overflow-hidden rounded-xl border border-hairline bg-raised p-3 shadow-frame sm:min-h-[510px] sm:p-4"
    aria-label="Illustration of two source versions converging into one verified result"
    initial={reduced ? false : { opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: 'spring', stiffness: 300, damping: 32, delay: .08 }}
  >
    <header className="mb-3 flex h-8 items-center justify-between px-1 text-[11px] text-muted">
      <span className="flex items-center gap-2"><i className="size-1.5 rounded-full bg-success" />Controlled proof</span>
      <span className="font-mono">main · 8223897</span>
    </header>
    <div className="grid h-[275px] grid-cols-2 gap-2 sm:h-[330px] sm:gap-3">
      <article className="grid min-w-0 grid-rows-[34px_1fr] overflow-hidden rounded-lg bg-canvas shadow-[inset_0_0_0_1px_var(--color-hairline)]">
        <div className="flex items-center justify-between px-3 text-[11px]"><strong>Version A</strong><span className="truncate text-muted">branch-sidebar</span></div>
        <div className="relative grid grid-cols-[28%_1fr] gap-2 overflow-hidden bg-white p-3">
          <div className="rounded-md bg-ink p-2"><i className="mb-4 block h-2 w-10 max-w-full rounded bg-white/80" /><i className="mb-1.5 block h-5 rounded bg-selection" /><i className="mb-1.5 block h-5 rounded bg-white/10" /><i className="block h-5 rounded bg-white/10" /></div>
          <div><i className="mb-3 block h-3 w-3/5 rounded bg-ink/80" /><div className="grid gap-2"><i className="h-16 rounded-md bg-canvas" /><i className="h-16 rounded-md bg-canvas" /><i className="h-16 rounded-md bg-canvas" /></div></div>
          <span className="absolute bottom-3 left-3 right-[70%] rounded-md ring-2 ring-selection ring-offset-2 ring-offset-white" aria-label="Selected Category sidebar" />
          <label className="absolute bottom-5 left-5 rounded-md bg-selection px-2 py-1 text-[10px] font-semibold text-white">Sidebar A</label>
        </div>
      </article>
      <article className="grid min-w-0 grid-rows-[34px_1fr] overflow-hidden rounded-lg bg-canvas shadow-[inset_0_0_0_1px_var(--color-hairline)]">
        <div className="flex items-center justify-between px-3 text-[11px]"><strong>Version B</strong><span className="truncate text-muted">branch-inspector</span></div>
        <div className="relative overflow-hidden bg-white p-3">
          <i className="mb-3 block h-3 w-1/2 rounded bg-ink/80" />
          <div className="grid grid-cols-2 gap-2"><i className="h-20 rounded-md bg-canvas" /><i className="h-20 rounded-md bg-canvas" /><i className="h-20 rounded-md bg-canvas" /><i className="h-20 rounded-md bg-selection-soft ring-2 ring-selection ring-offset-2 ring-offset-white" /></div>
          <label className="absolute bottom-5 right-5 rounded-md bg-selection px-2 py-1 text-[10px] font-semibold text-white">Quick View B</label>
        </div>
      </article>
    </div>
    <div className="ums-glass absolute bottom-16 left-1/2 flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold shadow-float sm:gap-4 sm:px-4">
      <span className="flex whitespace-nowrap items-center gap-1.5"><Check size={13} className="text-selection" /> Sidebar A</span>
      <span className="hidden whitespace-nowrap items-center gap-1.5 sm:flex"><Check size={13} className="text-selection" /> Quick View B</span>
      <span className="text-muted">2 selected</span><span className="flex whitespace-nowrap items-center gap-1.5 text-selection">Combine 2 <ArrowRight size={13} /></span>
    </div>
    <div className="absolute inset-x-4 bottom-3 flex h-10 items-center justify-between rounded-lg bg-evidence px-3 text-xs text-white">
      <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-[var(--color-success)]" />Combined result</span>
      <span className="text-white/55">Verified</span>
    </div>
  </motion.div>;
}

export function PublicHero({ open }: { open: () => void }) {
  return <>
    <PublicNav open={open} />
    <section className="mx-auto grid min-h-[calc(100vh-56px)] w-full max-w-[1480px] items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[.82fr_1.18fr] lg:gap-16 lg:py-16" id="top">
      <div className="max-w-[620px]">
        <p className="mb-5 text-xs font-bold uppercase tracking-[.18em] text-selection">Visual integration for React</p>
        <h1 className="m-0 text-[clamp(3rem,5.5vw,4rem)] font-semibold leading-[.98] tracking-[-.055em] text-ink">Build the version<br />you actually want.</h1>
        <p className="mt-7 max-w-[570px] text-[17px] leading-7 text-muted">Compare parallel implementations, select the parts you prefer, and create one verified branch.</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={open}>Try interactive demo <ArrowRight size={16} /></Button>
          <a className="inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold text-ink no-underline hover:bg-ink/[.05]" href={githubUrl} target="_blank" rel="noreferrer noopener"><Code2 size={16} /> GitHub</a>
        </div>
        <div className="mt-7 flex items-center gap-2 text-xs text-muted" role="note" aria-label="Hosted showcase boundary">
          <span className="size-1.5 rounded-full bg-success" /><span>Controlled, recorded proof</span><span aria-hidden="true">·</span><span>No repository access in the browser</span>
        </div>
      </div>
      <HeroProductDemo />
    </section>
  </>;
}

function ProductGuide() {
  const steps = [
    { icon: GitMerge, number: '01', title: 'Run', copy: 'Parallel React/Vite branches run as real rendered applications.', detail: 'Isolated local worktrees' },
    { icon: MousePointer2, number: '02', title: 'Select', copy: 'A visible boundary maps back to its server-owned source identity.', detail: 'Rendered UI → source receipt' },
    { icon: GitMerge, number: '03', title: 'Integrate', copy: 'Required dependencies come with the feature. Unrelated changes stay out.', detail: 'Dependency-aware slicing' },
    { icon: ShieldCheck, number: '04', title: 'Verify', copy: 'The result is typechecked, tested, built, and relaunched before handoff.', detail: 'Truthful gates, safe refusal' }
  ];
  return <section className="mx-auto w-full max-w-[1360px] px-5 py-24 sm:px-8" id="how-it-works" aria-labelledby="how-title">
    <header className="mb-12 grid gap-5 lg:grid-cols-2 lg:items-end">
      <div><p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-selection">How it works</p><h2 id="how-title" className="m-0 max-w-[560px] text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-.045em]">A visual decision with a verifiable path.</h2></div>
      <p className="m-0 max-w-[520px] text-[15px] leading-6 text-muted lg:justify-self-end">The hosted demo replays validated artifacts. The local Studio performs the real Git, worktree, generation, and verification operations on your machine.</p>
    </header>
    <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-12">
      {steps.map((step, index) => <li key={step.title} className={`rounded-lg bg-raised p-6 shadow-[inset_0_0_0_1px_var(--color-hairline)] ${index === 0 || index === 3 ? 'md:col-span-7' : 'md:col-span-5'}`}>
        <div className="mb-12 flex items-center justify-between text-xs text-muted"><step.icon size={17} /><span>{step.number}</span></div>
        <h3 className="mb-2 text-xl font-semibold tracking-[-.03em]">{step.title}</h3><p className="m-0 max-w-[440px] text-sm leading-6 text-muted">{step.copy}</p><code className="mt-5 block font-mono text-[11px] text-ink/45">{step.detail}</code>
      </li>)}
    </ol>
  </section>;
}

function LocalRunCTA() {
  return <section className="mx-auto mb-8 grid w-[calc(100%-40px)] max-w-[1360px] gap-8 rounded-xl bg-evidence px-6 py-10 text-white sm:w-[calc(100%-64px)] sm:px-10 lg:grid-cols-[1fr_auto] lg:items-end" aria-labelledby="local-title">
    <div><p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-white/45">Run on your repository</p><h2 id="local-title" className="m-0 text-[clamp(2rem,4vw,3.25rem)] font-semibold tracking-[-.045em]">The real workspace stays local.</h2><p className="mb-0 mt-4 max-w-[680px] text-sm leading-6 text-white/55">React · TypeScript · Vite · Local Git. Your repositories, worktrees, preview processes, and generated branches remain on your machine.</p></div>
    <div className="flex flex-wrap gap-2"><a className="inline-flex min-h-10 items-center rounded-md bg-white px-4 text-sm font-semibold text-ink no-underline" href={localSetupUrl} target="_blank" rel="noreferrer noopener">Setup <ArrowRight size={15} className="ml-2" /></a><a className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-white no-underline hover:bg-white/10" href={githubUrl} target="_blank" rel="noreferrer noopener"><Code2 size={15} className="mr-2" />GitHub</a></div>
  </section>;
}

export function PublicProductGuide() {
  return <div><ProductGuide /><LocalRunCTA /><footer className="mx-auto flex h-16 max-w-[1360px] items-center justify-between px-5 text-xs text-muted sm:px-8"><span>UI Merge Studio</span><span>Open source · MIT</span></footer></div>;
}

export function PublicLanding({ open }: { open: () => void }) {
  return <main className="ums-presentation bg-canvas"><PublicHero open={open} /><PublicProductGuide /></main>;
}

type CausalityState = 'complete' | 'active' | 'idle' | 'refused';

export function ShowcaseCausalityStrip({ selectionCount, combined, refused, expanded = false }: { selectionCount: number; combined: boolean; refused: boolean; expanded?: boolean }) {
  const stages = ['Selected', 'Source', 'Slice', 'Candidate', 'Verified'];
  const state = (index: number): CausalityState => {
    if (combined) return 'complete';
    if (refused && index >= 3) return 'refused';
    if (selectionCount > 0 && index < 3) return 'complete';
    if (selectionCount > 0 && index === 3) return 'active';
    return index === 0 ? 'active' : 'idle';
  };
  return <div className="flex items-center gap-1" aria-label="Controlled integration evidence state" role="status">
    {stages.map((stage, index) => <span key={stage} className="flex items-center gap-1" data-state={state(index)} title={stage}>
      <i className={`grid size-3 place-items-center rounded-full border text-[7px] not-italic ${state(index) === 'complete' ? 'border-success bg-success text-white' : state(index) === 'active' ? 'border-selection bg-selection-soft text-selection' : state(index) === 'refused' ? 'border-danger bg-danger text-white' : 'border-hairline bg-transparent text-muted'}`}>{state(index) === 'complete' ? '✓' : state(index) === 'refused' ? '!' : ''}</i>
      {expanded && <small className="text-[11px] text-muted">{stage}</small>}
      {index < stages.length - 1 && <b className="h-px w-2 bg-hairline" aria-hidden="true" />}
    </span>)}
  </div>;
}

export function ShowcaseResultSummary({ candidate, selectionCount, onEvidence }: { candidate: PublicCandidate; selectionCount: number; onEvidence?: () => void }) {
  const gateLabel = (id: string) => ({
    'locked-dependencies': 'Dependencies',
    typecheck: 'TypeScript',
    'focused-feature-tests': 'Tests',
    'production-build': 'Build'
  }[id] ?? id.replaceAll('-', ' '));
  return <section className="ums-glass flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-4 py-2.5" aria-label="Recorded result convergence">
    <strong className="flex items-center gap-2 text-[13px]"><ShieldCheck size={16} className="text-success" /> Verified</strong>
    <span className="hidden h-5 w-px bg-hairline sm:block" />
    <div className="flex flex-1 flex-wrap items-center gap-3" aria-label="Recorded verification gates">{candidate.verification.map(gate => <span key={gate.id} className="flex items-center gap-1.5 text-xs text-muted"><Check size={12} className="text-success" />{gateLabel(gate.id)}</span>)}</div>
    <span className="text-xs text-muted">{selectionCount} part{selectionCount === 1 ? '' : 's'}</span>
    {onEvidence && <button className="rounded-md px-2 py-1 text-xs font-semibold text-ink hover:bg-ink/[.05]" onClick={onEvidence}>Evidence</button>}
  </section>;
}
