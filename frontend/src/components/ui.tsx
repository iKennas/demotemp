import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const variants: Record<string, string> = {
    primary: 'bg-accent text-accent-ink shadow-sm hover:bg-accent-hover disabled:opacity-50',
    secondary: 'border border-line bg-surface text-subtle hover:bg-muted hover:text-content disabled:opacity-50',
    danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:opacity-50',
    ghost: 'text-subtle hover:bg-muted hover:text-content disabled:opacity-50',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

const fieldClasses =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-content placeholder:text-faint transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClasses} ${className}`} {...props} />
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${fieldClasses} ${className}`} {...props}>
      {children}
    </select>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-subtle">{label}</span>
      {children}
    </label>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface shadow-sm ${className}`}>{children}</div>
}

export function Badge({ children, color = 'gray' }: { children: ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    yellow: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  }
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[color]}`}>{children}</span>
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-content">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-faint transition-colors hover:bg-muted hover:text-content" aria-label={t('common.close')}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-content">{title}</h1>
      {action}
    </div>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="mt-2 text-sm text-red-600 dark:text-red-400">{children}</p>
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <p className="text-sm text-faint">{message}</p>
      {action}
    </div>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" width="20" height="20">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

interface PaginationProps {
  currentPage: number
  lastPage: number
  total: number
  perPage: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, lastPage, total, perPage, onPageChange }: PaginationProps) {
  const { t } = useTranslation()
  if (lastPage <= 1) return null

  const from = (currentPage - 1) * perPage + 1
  const to = Math.min(currentPage * perPage, total)

  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-subtle">
      <span>{t('pagination.showing', { from, to, total })}</span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          {t('pagination.prev')}
        </Button>
        <span className="px-2 text-faint">{t('pagination.pageOf', { current: currentPage, last: lastPage })}</span>
        <Button variant="secondary" disabled={currentPage >= lastPage} onClick={() => onPageChange(currentPage + 1)}>
          {t('pagination.next')}
        </Button>
      </div>
    </div>
  )
}
