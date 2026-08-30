import { cva, type VariantProps } from 'class-variance-authority';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { cn } from './utils';

export const buttonVariants = cva(
  'inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ink disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-white hover:bg-ink/88',
        iris: 'bg-iris text-white hover:bg-iris-hover',
        secondary: 'bg-raised text-ink shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-canvas',
        ghost: 'bg-transparent text-muted hover:bg-ink/[.05] hover:text-ink',
        danger: 'bg-danger text-white hover:bg-danger/90'
      },
      size: {
        sm: 'min-h-8 px-3 text-xs',
        md: 'min-h-9',
        lg: 'min-h-11 px-4 text-sm'
      }
    },
    defaultVariants: { variant: 'primary', size: 'md' }
  }
);

type ButtonProps = Omit<HTMLMotionProps<'button'>, 'ref'> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  const reduced = useReducedMotion();
  return <motion.button
    whileTap={reduced || props.disabled ? undefined : { scale: .975 }}
    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    className={cn(buttonVariants({ variant, size }), className)}
    {...props}
  />;
}
