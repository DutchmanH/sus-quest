export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-[var(--bg-card)] animate-pulse ${className}`}
    />
  )
}
