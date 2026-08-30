import type { HTMLAttributes } from 'react';
import { cn } from './utils';

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <kbd className={cn('inline-flex min-w-5 items-center justify-center rounded-sm bg-ink/[.06] px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted shadow-[inset_0_0_0_1px_var(--color-hairline)]', className)} {...props} />;
}
