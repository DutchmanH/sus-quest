interface AvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  active?: boolean
  className?: string
}

const sizes = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-2xl',
}

export function Avatar({ name, color, size = 'md', active, className = '' }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase()

  return (
    <div
      className={`
        rounded-full flex items-center justify-center
        font-bold font-["Space_Grotesk"] text-[var(--bg-primary)]
        transition-all duration-200
        ${sizes[size]}
        ${active ? 'ring-2 ring-[var(--coral)] ring-offset-2 ring-offset-[var(--bg-primary)]' : ''}
        ${className}
      `}
      style={{ background: color }}
      title={name}
    >
      {initial}
    </div>
  )
}
