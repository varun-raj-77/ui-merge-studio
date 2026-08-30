import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './utils';

export function Tooltip({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={350}>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content sideOffset={8} className="z-[90] rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-float">
          {label}<TooltipPrimitive.Arrow className="fill-ink" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>;
}

export function Popover({ trigger, children, open, onOpenChange, align = 'center' }: {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'center' | 'end';
}) {
  return <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content align={align} sideOffset={10} collisionPadding={12} className="ums-glass z-[70] w-[min(340px,calc(100vw-24px))] rounded-lg p-4 text-sm text-ink shadow-float outline-none data-[state=open]:animate-in data-[state=closed]:animate-out">
        {children}<PopoverPrimitive.Arrow className="fill-raised/90" />
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  </PopoverPrimitive.Root>;
}

export function DropdownMenu({ trigger, children, align = 'end' }: {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
}) {
  return <DropdownPrimitive.Root>
    <DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger>
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content align={align} sideOffset={8} collisionPadding={12} className="ums-glass z-[70] min-w-56 rounded-lg p-1.5 text-[13px] text-ink shadow-float outline-none">
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  </DropdownPrimitive.Root>;
}

export function DropdownItem({ children, onSelect, danger = false }: {
  children: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
}) {
  return <DropdownPrimitive.Item onSelect={onSelect} className={cn('flex min-h-9 cursor-default items-center gap-2 rounded-md px-2.5 outline-none data-[highlighted]:bg-ink/[.06]', danger && 'text-danger')}>{children}</DropdownPrimitive.Item>;
}

export function DropdownSeparator() {
  return <DropdownPrimitive.Separator className="my-1 h-px bg-hairline" />;
}

export function Sheet({ open, onOpenChange, title, description, children, side = 'right' }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  side?: 'right' | 'bottom';
}) {
  const reduced = useReducedMotion();
  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <AnimatePresence>
      {open && <DialogPrimitive.Portal forceMount>
        <DialogPrimitive.Overlay asChild>
          <motion.div className="fixed inset-0 z-[80] bg-ink/22 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        </DialogPrimitive.Overlay>
        <DialogPrimitive.Content asChild onOpenAutoFocus={event => event.preventDefault()}>
          <motion.section
            role="dialog"
            aria-modal="true"
            className={cn(
              'fixed z-[81] flex overflow-hidden bg-evidence text-white shadow-float outline-none',
              side === 'right' && 'inset-y-0 right-0 w-[min(440px,calc(100vw-20px))] flex-col rounded-l-xl',
              side === 'bottom' && 'inset-x-0 bottom-0 max-h-[82vh] flex-col rounded-t-xl'
            )}
            initial={reduced ? { opacity: 0 } : side === 'right' ? { x: '100%' } : { y: '100%' }}
            animate={reduced ? { opacity: 1 } : { x: 0, y: 0 }}
            exit={reduced ? { opacity: 0 } : side === 'right' ? { x: '100%' } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <DialogPrimitive.Title className="m-0 text-lg font-semibold tracking-[-.02em]">{title}</DialogPrimitive.Title>
                {description && <DialogPrimitive.Description className="mt-1 text-xs leading-5 text-white/55">{description}</DialogPrimitive.Description>}
              </div>
              <DialogPrimitive.Close className="grid size-8 shrink-0 place-items-center rounded-md border-0 bg-transparent text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close technical evidence"><X size={16} /></DialogPrimitive.Close>
            </header>
            {children}
          </motion.section>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>}
    </AnimatePresence>
  </DialogPrimitive.Root>;
}

export const Tabs = TabsPrimitive.Root;
export const TabsList = TabsPrimitive.List;
export const TabsContent = TabsPrimitive.Content;

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  return <TabsPrimitive.Trigger value={value} className="relative min-h-9 flex-1 rounded-md border-0 bg-transparent px-2 text-xs font-semibold capitalize text-white/55 outline-none transition-colors hover:bg-white/[.05] data-[state=active]:bg-white/10 data-[state=active]:text-white">
    {children}
  </TabsPrimitive.Trigger>;
}
