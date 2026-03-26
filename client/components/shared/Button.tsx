'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';

/**
 * Button Variants using design tokens
 * - primary: Brand color (--brand)
 * - secondary: Outlined/ghost style
 * - danger: Destructive actions (--danger)
 * - accent: Highlight/CTA (--accent)
 * - ghost: Minimal, text-only
 */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'accent' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

interface ButtonAsButton extends BaseButtonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  href?: never;
  external?: never;
}

interface ButtonAsLink extends BaseButtonProps {
  href: string;
  external?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: never;
  className?: string;
}

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-[var(--brand)] text-white 
    hover:bg-[var(--brand)]/90 
    active:bg-[var(--brand)]/80
    disabled:bg-[var(--brand)]/50
    shadow-sm hover:shadow
  `,
  secondary: `
    bg-[var(--surface-strong)] text-[var(--foreground)]
    border border-[var(--border)]
    hover:bg-[var(--brand-soft)] hover:border-[var(--brand)]/30
    active:bg-[var(--brand-soft)]/80
    disabled:opacity-50
  `,
  danger: `
    bg-[var(--danger)] text-white
    hover:bg-[var(--danger)]/90
    active:bg-[var(--danger)]/80
    disabled:bg-[var(--danger)]/50
    shadow-sm hover:shadow
  `,
  accent: `
    bg-[var(--accent)] text-white
    hover:bg-[var(--accent)]/90
    active:bg-[var(--accent)]/80
    disabled:bg-[var(--accent)]/50
    shadow-sm hover:shadow
  `,
  ghost: `
    bg-transparent text-[var(--brand)]
    hover:bg-[var(--brand-soft)]
    active:bg-[var(--brand-soft)]/80
    disabled:opacity-50
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
  xl: 'px-6 py-3 text-lg gap-3',
};

const baseStyles = `
  inline-flex items-center justify-center
  font-medium rounded-xl
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50 focus:ring-offset-2
  disabled:cursor-not-allowed
`;

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      loading = false,
      fullWidth = false,
      children,
      className = '',
      ...rest
    } = props;

    const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `.replace(/\s+/g, ' ').trim();

    const content = (
      <>
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {!loading && icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
        {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
      </>
    );

    // Link variant
    if ('href' in rest && rest.href) {
      const { href, external, onClick, disabled, ...linkRest } = rest as ButtonAsLink;
      
      if (external) {
        return (
          <a
            ref={ref as React.Ref<HTMLAnchorElement>}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={combinedClassName}
            onClick={disabled ? (e) => e.preventDefault() : onClick}
            aria-disabled={disabled}
            {...linkRest}
          >
            {content}
          </a>
        );
      }

      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={combinedClassName}
          onClick={disabled ? (e) => e.preventDefault() : onClick}
          aria-disabled={disabled}
          {...linkRest}
        >
          {content}
        </Link>
      );
    }

    // Button variant
    const buttonProps = rest as ButtonAsButton;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={combinedClassName}
        disabled={loading || buttonProps.disabled}
        {...buttonProps}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

/**
 * Icon-only button for compact actions
 */
interface IconButtonProps extends Omit<ButtonAsButton, 'children' | 'icon' | 'iconPosition'> {
  icon: ReactNode;
  label: string; // For accessibility
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, variant = 'ghost', size = 'md', className = '', ...props }, ref) => {
    const iconSizeStyles: Record<ButtonSize, string> = {
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-2.5',
      xl: 'p-3',
    };

    return (
      <button
        ref={ref}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${iconSizeStyles[size]}
          rounded-full
          ${className}
        `.replace(/\s+/g, ' ').trim()}
        aria-label={label}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default Button;
