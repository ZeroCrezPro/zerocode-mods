import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/format'
import { Felirat } from './Szoveg'

/* ---------- Gombok ---------- */

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 font-bold uppercase tracking-[0.08em] transition-colors duration-150 select-none disabled:opacity-50 disabled:pointer-events-none'

const variants: Record<Variant, string> = {
  primary: 'bg-blood-600 text-white hover:bg-blood-500 active:bg-blood-700',
  secondary: 'border border-ink-600 bg-ink-800 text-ash-100 hover:border-blood-600 hover:bg-ink-700',
  ghost: 'border border-transparent text-ash-300 hover:text-ash-100 hover:bg-ink-800',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[11px]',
  md: 'h-11 px-5 text-xs',
  lg: 'h-13 px-7 text-sm',
}

export function btnClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cx(base, variants[variant], sizes[size], extra)
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={btnClass(variant, size, className)} {...rest} />
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: {
  to: string
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}) {
  return (
    <Link to={to} className={btnClass(variant, size, className)}>
      {children}
    </Link>
  )
}

export function ExternalButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size }) {
  return (
    <a
      rel="noopener noreferrer"
      className={btnClass(variant, size, className)}
      {...rest}
    >
      {children}
    </a>
  )
}

/* ---------- Jelvények ---------- */

export function Badge({
  children,
  className,
  title,
}: {
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap',
        className ?? 'border-ink-600 bg-ink-800 text-ash-300',
      )}
    >
      {children}
    </span>
  )
}

/* ---------- Panel / szekció ---------- */

export function Panel({
  title,
  cimKulcs,
  id,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string
  /** Ha meg van adva, a szekciócím is formázható a szerkesztőben. */
  cimKulcs?: string
  id?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section id={id} className={cx('border border-ink-700 bg-ink-900', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-ink-700 bg-ink-850 px-4 py-3 sm:px-5">
          <h2 className="zc-label flex items-center gap-2.5 text-ash-100">
            <span aria-hidden className="block h-3 w-[3px] bg-blood-500" />
            {cimKulcs ? <Felirat kulcs={cimKulcs} alap={title} /> : title}
          </h2>
          {action}
        </header>
      )}
      <div className={cx('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

export function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="zc-label mb-1.5 text-blood-400">{eyebrow}</p>}
        <h2 className="flex items-center gap-3 text-xl font-extrabold tracking-tight uppercase sm:text-2xl">
          <span aria-hidden className="block h-6 w-1 bg-blood-500" />
          {title}
        </h2>
      </div>
      {action}
    </div>
  )
}
