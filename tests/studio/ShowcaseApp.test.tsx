// @vitest-environment jsdom
import '../setup';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ShowcaseApp } from '../../apps/studio/src/ShowcaseApp';
import { rawShowcaseManifest, showcaseManifest, validateShowcaseManifest } from '../../apps/studio/src/showcaseManifest';

afterEach(cleanup);
const start = () => fireEvent.click(screen.getByRole('button', { name: /explore the verified demo/i }));
const compare = () => { start(); fireEvent.click(screen.getByRole('button', { name: /i understand the comparison/i })); };
const select = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('Showcase landing', () => {
  it('has one primary CTA, one source CTA, boundary copy, and no duplicate How it works action', () => {
    render(<ShowcaseApp />);
    expect(screen.getAllByRole('button', { name: /explore the verified demo/i })).toHaveLength(1);
    expect(screen.queryByText(/how it works/i)).not.toBeInTheDocument();
    expect(screen.getByText(/hosted showcase/i)).toBeInTheDocument();
    expect(screen.getByText(/local engine/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /view source/i })[0]).toHaveAttribute('href', 'https://github.com/varun-raj-77/ui-merge-studio');
    expect(document.querySelector('a[href*="codex-prompts/0"]')).toBeNull();
  });
});

describe('Showcase workflow', () => {
  it('distinguishes baseline and both branches without accidental selection', () => {
    render(<ShowcaseApp />); start();
    expect(document.querySelector('[aria-label="Baseline application before either feature"]')).toBeInTheDocument();
    expect(document.querySelector('[aria-label="Branch A: Collapsible navigation"]')).toBeInTheDocument();
    expect(document.querySelector('[aria-label="Branch B: Activity filters"]')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add to candidate/i })).not.toBeInTheDocument();
    expect(screen.getByText('branch-sidebar')).toBeInTheDocument();
    expect(screen.getByText('branch-inspector')).toBeInTheDocument();
  });

  it('updates and reverses the persistent result preview from explicit selections', () => {
    render(<ShowcaseApp />); compare();
    const preview = screen.getByRole('complementary', { name: /result preview/i });
    expect(within(preview).getByText('Baseline')).toBeInTheDocument();
    select(/collapsible navigation.*add to candidate preview/i);
    expect(within(preview).getByText('1 feature selected')).toBeInTheDocument();
    expect(within(preview).getByText(/a · navigation/i)).toHaveClass('on');
    select(/activity filters.*add to candidate preview/i);
    expect(within(preview).getByText('2 features selected')).toBeInTheDocument();
    select(/collapsible navigation.*selected.*remove/i);
    expect(within(preview).getByText('1 feature selected')).toBeInTheDocument();
    expect(within(preview).getByText(/a · navigation/i)).not.toHaveClass('on');
  });

  it('renders a manifest-backed integration plan and prevents an empty plan', () => {
    render(<ShowcaseApp />); compare();
    expect(screen.getByRole('button', { name: /review integration plan/i })).toBeDisabled();
    select(/activity filters.*add to candidate preview/i);
    fireEvent.click(screen.getByRole('button', { name: /review integration plan/i }));
    expect(screen.getByText('src/features/tickets/ActivityFilters.tsx')).toBeInTheDocument();
    expect(screen.getByText('src/hooks/useActivityFilter.ts')).toBeInTheDocument();
    expect(screen.getByText('src/utils/sortTickets.ts')).toBeInTheDocument();
    expect(screen.getByText('combined-result')).toBeInTheDocument();
    expect(screen.queryByText(/placeholder|todo|unavailable-value/i)).not.toBeInTheDocument();
  });

  it('requires explicit verification review and reveals result only after the final gate', () => {
    render(<ShowcaseApp />); compare();
    select(/collapsible navigation.*add to candidate preview/i);
    fireEvent.click(screen.getByRole('button', { name: /review integration plan/i }));
    expect(screen.queryByText(/recorded status: passed/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /approve candidate generation/i }));
    expect(screen.getByText(/no checks are running in this browser/i)).toBeInTheDocument();
    expect(screen.getAllByText(/recorded status: passed/i)).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: /verified combined result/i })).not.toBeInTheDocument();
    for (let index = 0; index < showcaseManifest.gates.length - 1; index++) fireEvent.click(screen.getByRole('button', { name: /inspect next gate/i }));
    fireEvent.click(screen.getByRole('button', { name: /open verified result/i }));
    expect(screen.getByRole('heading', { name: /verified combined result/i })).toBeInTheDocument();
    expect(document.querySelector('[aria-label="Baseline before selected features"]')).toBeInTheDocument();
    expect(screen.getByText(/collapsible navigation · branch-sidebar/i)).toBeInTheDocument();
  });

  it('supports back to plan, back to selections, and restart without inspection mutation', () => {
    render(<ShowcaseApp />); compare();
    select(/collapsible navigation.*add to candidate preview/i);
    fireEvent.click(screen.getByRole('button', { name: /review integration plan/i }));
    fireEvent.click(screen.getByRole('button', { name: /approve candidate generation/i }));
    for (let index = 0; index < showcaseManifest.gates.length - 1; index++) fireEvent.click(screen.getByRole('button', { name: /inspect next gate/i }));
    fireEvent.click(screen.getByRole('button', { name: /open verified result/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to plan/i }));
    expect(screen.getByText('src/features/navigation/AppSidebar.tsx')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to selections/i }));
    expect(screen.getByRole('button', { name: /collapsible navigation.*selected.*remove/i })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /restart/i }));
    expect(screen.getByRole('button', { name: /explore the verified demo/i })).toBeInTheDocument();
  });
});

describe('Showcase evidence integrity', () => {
  it('validates required typed evidence and fails clearly when it is missing', () => {
    expect(validateShowcaseManifest(rawShowcaseManifest)).toBe(showcaseManifest);
    expect(() => validateShowcaseManifest({
      ...rawShowcaseManifest,
      repository: { ...rawShowcaseManifest.repository, commonBaseCommit: '' }
    })).toThrow(/invalid showcase evidence manifest: missing repository evidence/i);
  });

  it('keeps focused public links away from numbered prompt documents', () => {
    expect(showcaseManifest.links.source.href).toBe('https://github.com/varun-raj-77/ui-merge-studio');
    expect(showcaseManifest.links.architecture.href).toContain('/docs/adr');
    expect(showcaseManifest.links.evaluation.href).toContain('docs/evaluation.md');
    expect(showcaseManifest.links.localSetup.href).toContain('#run-the-controlled-demo');
    expect(showcaseManifest.links.developmentHistory.label).toBe('Development history');
    for (const [key, link] of Object.entries(showcaseManifest.links)) {
      if (key !== 'developmentHistory') expect(link.href).not.toMatch(/codex-prompts\/\d/);
    }
  });
});
