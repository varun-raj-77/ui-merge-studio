import { useState } from 'react';
import type { CopyState } from '../types/inspector';
export function useCopyReference(reference: string) { const [state, setState] = useState<CopyState>({ status: 'idle' }); const copy = async () => { try { await navigator.clipboard.writeText(reference); setState({ status: 'copied' }); } catch { setState({ status: 'failed' }); } }; return { copy, status: state.status }; }

