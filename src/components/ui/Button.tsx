'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'mint' | 'coral' | 'dark' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  mint: 'text-[var(--bg-primary)] font-semibold hover:opacity-90 active:scale-95',
  coral: 'text-white font-semibold hover:opacity-90 active:scale-95',
  dark: 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-card-hover)] active:scale-95',
  outline: 'bg-transparent text-[var(--mint)] border border-[var(--mint)] hover:bg-[var(--mint)] hover:text-[var(--bg-primary)] active:scale-95',
  ghost: 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-95',
}

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm rounded-xl',
  md: 'px-6 py-3 text-base rounded-2xl',
  lg: 'px-8 py-4 text-lg rounded-full',
}

const bgColors: Record<Variant, string> = {
  mint: 'bg-[var(--mint)]',
  coral: 'bg-[var(--coral)]',
  dark: '',
  outline: '',
  ghost: '',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'mint', size = 'lg', fullWidth, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2
          font-["Space_Grotesk"] font-semibold
          transition-all duration-150
          disabled:opacity-40 disabled:cursor-not-allowed
          ${variants[variant]}
          ${bgColors[variant]}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
