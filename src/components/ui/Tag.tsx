interface TagProps {
  children: React.ReactNode
  className?: string
}

export function Tag({ children, className = '' }: TagProps) {
  return (
    <span className={`
      inline-flex items-center
      px-3 py-1 rounded-full
      bg-[var(--bg-card)] border border-[var(--border)]
      text-xs font-mono tracking-widest uppercase text-[var(--text-muted)]
      ${className}
    `}>
      {children}
    </span>
  )
}
