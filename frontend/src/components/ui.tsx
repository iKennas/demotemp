import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const variants: Record<string, string> = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  return (
    <button
      className={`px-3.5 py-2 rounded-md text-sm font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>
}

export function Badge({ children, color = 'gray' }: { children: ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
  }
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[color]}`}>{children}</span>
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
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
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      {action}
    </div>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="mt-2 text-sm text-red-600">{children}</p>
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <p className="text-sm text-gray-400">{message}</p>
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
  if (lastPage <= 1) return null

  const from = (currentPage - 1) * perPage + 1
  const to = Math.min(currentPage * perPage, total)

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          ← Prev
        </Button>
        <span className="flex items-center px-2">
          Page {currentPage} of {lastPage}
        </span>
        <Button variant="secondary" disabled={currentPage >= lastPage} onClick={() => onPageChange(currentPage + 1)}>
          Next →
        </Button>
      </div>
    </div>
  )
}
