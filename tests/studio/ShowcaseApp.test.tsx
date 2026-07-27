import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ShowcaseApp } from '../../apps/studio/src/ShowcaseApp';
import { showcaseManifest } from '../../apps/studio/src/showcaseManifest';

afterEach(cleanup);
const start = () => fireEvent.click(screen.getByRole('button', { name: /inspect the real recorded run/i }));
const selections = () => { start(); fireEvent.click(screen.getByRole('button', { name: /continue to feature selection/i })); };
const selectBoth = () => {
  fireEvent.click(screen.getByRole('button', { name: /collapsible navigation/i }));
  fireEvent.click(screen.getByRole('button', { name: /activity filters/i }));
};

describe('real-artifact Showcase landing', () => {
  it('has one primary CTA and states the hosted execution boundary', () => {
    render(<ShowcaseApp />);
    expect(screen.getAllByRole('button', { name: /inspect the real recorded run/i })).toHaveLength(1);
    expect(screen.getByText(/all four applications are actual compiled artifacts/i)).toBeInTheDocument();
    expect(screen.getByText(/browser is not running git or tests/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /view source/i })).toHaveLength(1);
  });
});
describe('real-artifact workflow', () => {
  it('loads distinct generated baseline, Branch A, and Branch B artifact URLs', () => {
    render(<ShowcaseApp />); start();
    const frames = screen.getAllByTitle(/actual compiled application/i) as HTMLIFrameElement[];
    expect(frames.map(frame => frame.getAttribute('src'))).toEqual([
      `${showcaseManifest.artifacts[0].path}index.html`,
      `${showcaseManifest.artifacts[1].path}index.html`,
      `${showcaseManifest.artifacts[2].path}index.html`
    ]);
    expect(new Set(frames.map(frame => frame.src)).size).toBe(3);
  });
  it('requires both selections and never unlocks the two-feature candidate with one', () => {
    render(<ShowcaseApp />); selections();
    const review = screen.getByRole('button', { name: /review recorded source plan/i });
    expect(review).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /collapsible navigation/i }));
    expect(review).toBeDisabled();
    expect(screen.getByText(/recorded two-feature candidate stays locked/i)).toBeInTheDocument();
    expect(screen.getByTitle(/baseline actual compiled application/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /activity filters/i }));
    expect(review).toBeEnabled();
    expect(screen.getByTitle(/combined result actual compiled application/i)).toBeInTheDocument();
  });
  it('renders source plan exclusively from generated evidence and relocks after removal', () => {
    render(<ShowcaseApp />); selections(); selectBoth();
    fireEvent.click(screen.getByRole('button', { name: /review recorded source plan/i }));
    expect(screen.getByText(showcaseManifest.features[0].sourceFile)).toBeInTheDocument();
    expect(screen.getByText(showcaseManifest.features[1].sourceFile)).toBeInTheDocument();
    expect(screen.getByText(showcaseManifest.repository.commonBaseCommit)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to selections/i }));
    fireEvent.click(screen.getByRole('button', { name: /collapsible navigation/i }));
    expect(screen.getByRole('button', { name: /review recorded source plan/i })).toBeDisabled();
  });
  it('shows immutable recorded gates and the actual baseline/candidate pair', () => {
    render(<ShowcaseApp />); selections(); selectBoth();
    fireEvent.click(screen.getByRole('button', { name: /review recorded source plan/i }));
    fireEvent.click(screen.getByRole('button', { name: /inspect recorded run/i }));
    expect(screen.getByText(/checks ran during the recorded local candidate-generation run/i)).toBeInTheDocument();
    expect(screen.getAllByText('Passed')).toHaveLength(showcaseManifest.verification.length);
    expect(screen.getByTitle(/baseline actual compiled application/i)).toBeInTheDocument();
    expect(screen.getByTitle(/combined result actual compiled application/i)).toBeInTheDocument();
    expect(screen.queryByText(/running tests now|progress/i)).not.toBeInTheDocument();
  });
  it('supports back, restart, source, architecture, and local setup actions', () => {
    render(<ShowcaseApp />); selections(); selectBoth();
    fireEvent.click(screen.getByRole('button', { name: /review recorded source plan/i }));
    fireEvent.click(screen.getByRole('button', { name: /inspect recorded run/i }));
    expect(screen.getByRole('link', { name: /view source/i })).toHaveAttribute('href', showcaseManifest.links.source);
    expect(screen.getByRole('link', { name: /read architecture/i })).toHaveAttribute('href', showcaseManifest.links.architecture);
    expect(screen.getByRole('link', { name: /run locally/i })).toHaveAttribute('href', showcaseManifest.links.localSetup);
    fireEvent.click(screen.getByRole('button', { name: /back to source plan/i }));
    expect(screen.getByRole('heading', { name: /trace each visible feature/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /restart/i }));
    expect(screen.getByRole('button', { name: /inspect the real recorded run/i })).toBeInTheDocument();
  });
});
describe('generated evidence integrity', () => {
  it('contains no unavailable primary paths and has four hashed artifacts', () => {
    expect(showcaseManifest.artifacts).toHaveLength(4);
    for (const item of showcaseManifest.artifacts) expect(item.sha256).toMatch(/^[a-f0-9]{64}$/);
    for (const href of Object.values(showcaseManifest.links)) expect(href).not.toMatch(/\.ums|codex-prompts|[A-Za-z]:\\/);
  });
});
