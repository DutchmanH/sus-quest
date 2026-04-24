type BadgeVariant = 'live' | 'ready' | 'waiting' | 'round' | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const styles: Record<BadgeVariant, string> = {
  live: 'bg-[var(--mint)] text-[var(--bg-primary)] font-semibold',
  ready: 'border border-[var(--mint)] text-[var(--mint)]',
  waiting: 'border border-[var(--gold)] text-[var(--gold)]',
  round: 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]',
  default: 'bg-[var(--bg-card)] text-[var(--text-muted)]',
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`
      inline-flex items-center gap-1
      px-3 py-1 rounded-full
      text-xs font-mono tracking-widest uppercase
      ${styles[variant]}
      ${className}
    `}>
      {variant === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--bg-primary)] inline-block" />}
      {children}
    </span>
  )
}
