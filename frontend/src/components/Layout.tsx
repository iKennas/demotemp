import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { supportedLanguages } from '../i18n'

interface NavItem {
  to: string
  labelKey: string
  permission?: string
  roleOnly?: string
}

const NAV: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard' },
  { to: '/accounts', labelKey: 'nav.accounts', permission: 'finance.view' },
  { to: '/journal-entries', labelKey: 'nav.journalEntries', permission: 'finance.view' },
  { to: '/reports', labelKey: 'nav.reports', permission: 'finance.view' },
  { to: '/customers', labelKey: 'nav.customers', permission: 'customers.view' },
  { to: '/suppliers', labelKey: 'nav.suppliers', permission: 'suppliers.view' },
  { to: '/invoices', labelKey: 'nav.invoices', permission: 'invoices.view' },
  { to: '/payments', labelKey: 'nav.payments', permission: 'cash.view' },
  { to: '/expenses', labelKey: 'nav.expenses', permission: 'cash.view' },
  { to: '/revenues', labelKey: 'nav.revenues', permission: 'cash.view' },
  { to: '/bank-accounts', labelKey: 'nav.bankAccounts', permission: 'cash.view' },
  { to: '/products', labelKey: 'nav.products', permission: 'inventory.view' },
  { to: '/users', labelKey: 'nav.team', permission: 'users.view' },
  { to: '/audit-log', labelKey: 'nav.auditLog', permission: 'audit.view' },
  { to: '/settings', labelKey: 'nav.settings', permission: 'settings.view' },
  { to: '/admin', labelKey: 'nav.admin', roleOnly: 'Super Admin' },
]

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

export default function Layout() {
  const { user, roles, can, logout } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { theme, toggle } = useTheme()

  const visible = NAV.filter((item) => {
    if (item.roleOnly) return roles.includes(item.roleOnly)
    if (item.permission) return can(item.permission)
    return true
  })

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-app">
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">U</span>
          <div>
            <span className="block text-sm font-bold leading-tight text-content">{t('app.name')}</span>
            <span className="block text-xs leading-tight text-faint">{t('app.tagline')}</span>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent-soft text-accent-strong' : 'text-subtle hover:bg-muted hover:text-content'
                }`
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 border-t border-line p-4">
          <div className="flex items-center gap-2">
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-subtle transition-colors focus:border-accent focus:outline-none"
            >
              {supportedLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
            <button
              onClick={toggle}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-subtle transition-colors hover:bg-muted hover:text-content"
              aria-label={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
              title={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div>
            <p className="truncate text-sm font-medium text-content">{user?.name}</p>
            <p className="truncate text-xs text-faint">{roles.join(', ')}</p>
          </div>
          <button onClick={onLogout} className="text-xs font-medium text-red-600 hover:underline dark:text-red-400">
            {t('nav.signOut')}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
