interface MobileContainerProps {
  children: React.ReactNode
  className?: string
}

export function MobileContainer({ children, className = '' }: MobileContainerProps) {
  return (
    <div className="min-h-screen flex justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className={`w-full max-w-[390px] min-h-screen flex flex-col relative overflow-hidden ${className}`}>
        {children}
      </div>
    </div>
  )
}
