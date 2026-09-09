import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline'
type Size = 'md' | 'lg' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-fg text-bg hover:bg-signal hover:text-white',
  secondary: 'bg-signal text-white hover:bg-fg',
  outline: 'bg-transparent text-fg border border-border hover:border-fg',
  ghost: 'bg-transparent text-fg hover:bg-black/5',
}

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-4 py-2 min-h-[36px]',
  md: 'text-[15px] px-5 py-3 min-h-[44px]',
  lg: 'text-base px-7 py-4 min-h-[52px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon, iconPosition = 'left', className = '', children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={[
          'inline-flex items-center justify-center gap-2 font-medium tracking-tight',
          'transition-colors duration-200 rounded-[3px] cursor-pointer select-none',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...rest}
      >
        {icon && iconPosition === 'left' && icon}
        {children}
        {icon && iconPosition === 'right' && icon}
      </button>
    )
  },
)
Button.displayName = 'Button'
