import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TdHTMLAttributes, TextareaHTMLAttributes, ThHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { supportedLanguages } from '../i18n'
import { IconChevronEnd, IconChevronStart, IconClose, IconInbox, IconSearch } from './icons'

export const invoiceStatusColor: Record<string, string> = {
  draft: 'gray',
  sent: 'blue',
  paid: 'green',
  partially_paid: 'yellow',
  overdue: 'red',
  void: 'red',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}) {
  const variants: Record<string, string> = {
    primary: 'bg-accent text-white shadow-sm hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 dark:text-accent-ink',
    secondary: 'border border-line bg-surface text-subtle hover:bg-muted hover:text-content active:scale-[0.98] disabled:opacity-50',
    danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 active:scale-[0.98] disabled:opacity-50',
    ghost: 'text-subtle hover:bg-muted hover:text-content active:scale-[0.98] disabled:opacity-50',
  }
  const sizes: Record<string, string> = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
}

const fieldBase =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-content placeholder:text-faint transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldBase} ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldBase} resize-none ${className}`} {...props} />
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className}`}>
      <select
        className="w-full appearance-none rounded-lg border border-line bg-surface px-3 py-2 pr-9 text-sm text-content transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-faint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-subtle">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
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
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}>{children}</span>
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  size,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const { t } = useTranslation()
  if (!open) return null
  const sizes: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }
  const widthClass = size ? sizes[size] : wide ? sizes.lg : sizes.md
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl ${widthClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-content">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-muted hover:text-content"
            aria-label={t('common.close')}
          >
            <IconClose size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-content">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-faint">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
      </svg>
      {children}
    </div>
  )
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <IconInbox size={22} className="text-faint" />
      </div>
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

export function Divider({ className = '' }: { className?: string }) {
  return <div className={`border-t border-line ${className}`} />
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
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3 text-sm text-subtle sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-faint">{t('pagination.showing', { from, to, total })}</span>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="secondary" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          <IconChevronStart size={14} />
          {t('pagination.prev')}
        </Button>
        <span className="min-w-[4rem] text-center text-xs text-faint">{t('pagination.pageOf', { current: currentPage, last: lastPage })}</span>
        <Button size="sm" variant="secondary" disabled={currentPage >= lastPage} onClick={() => onPageChange(currentPage + 1)}>
          {t('pagination.next')}
          <IconChevronEnd size={14} />
        </Button>
      </div>
    </div>
  )
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-muted p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === tab.id ? 'bg-surface text-content shadow-sm' : 'text-subtle hover:text-content'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function TableContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-x-auto ${className}`}>{children}</div>
}

export function Table({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <table className={`w-full min-w-[32rem] text-start text-sm ${className}`}>{children}</table>
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-line bg-muted text-xs uppercase tracking-wide text-faint">{children}</thead>
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>
}

export function TableRow({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr className={`${onClick ? 'cursor-pointer hover:bg-muted' : ''} ${className}`} onClick={onClick}>
      {children}
    </tr>
  )
}

export function TableCell({ children, className = '', colSpan }: TdHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <td className={`px-4 py-3 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  )
}

export function TableHeaderCell({ children, className = '' }: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>
}

export function LoadingState({ message }: { message?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center gap-2.5 py-12 text-sm text-faint">
      <Spinner />
      <span>{message ?? t('common.loading')}</span>
    </div>
  )
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-3">{children}</div>
}

export function SearchInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`relative w-full max-w-sm ${className}`}>
      <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-faint">
        <IconSearch size={16} />
      </span>
      <Input className="ps-9" {...props} />
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-faint">{children}</h2>
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger = true,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-content">{title}</h3>
        <p className="mt-2 text-sm text-subtle">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel ?? t('common.cancel')}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel ?? t('common.confirm')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function LocaleThemeControls({ compact }: { compact?: boolean }) {
  const { t, i18n } = useTranslation()
  const { theme, toggle } = useTheme()

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'w-full'}`}>
      <div className={`relative ${compact ? 'w-auto' : 'flex-1'}`}>
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className={`appearance-none rounded-lg border border-line bg-surface py-1.5 ps-2.5 pe-7 text-xs text-subtle transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${compact ? '' : 'w-full'}`}
        >
          {supportedLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.label}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-2 text-faint">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>
      <button
        onClick={toggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-subtle transition-colors hover:bg-muted hover:text-content"
        aria-label={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
        title={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
      >
        {theme === 'dark' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        )}
      </button>
    </div>
  )
}
