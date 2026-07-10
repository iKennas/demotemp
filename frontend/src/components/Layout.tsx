import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logoIcon from '../assets/logo-icon.png'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { supportedLanguages } from '../i18n'
import {
  IconBank,
  IconBox,
  IconCard,
  IconDashboard,
  IconExpense,
  IconHistory,
  IconJournal,
  IconLedger,
  IconReceipt,
  IconReports,
  IconRevenue,
  IconSettings,
  IconShield,
  IconStorefront,
  IconUser,
  IconUsers,
  type IconProps,
} from './icons'

interface NavItem {
  to: string
  labelKey: string
  icon: ComponentType<IconProps>
  permission?: string
  roleOnly?: string
}

const NAV: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: IconDashboard },
  { to: '/accounts', labelKey: 'nav.accounts', icon: IconLedger, permission: 'finance.view' },
  { to: '/journal-entries', labelKey: 'nav.journalEntries', icon: IconJournal, permission: 'finance.view' },
  { to: '/reports', labelKey: 'nav.reports', icon: IconReports, permission: 'finance.view' },
  { to: '/customers', labelKey: 'nav.customers', icon: IconUser, permission: 'customers.view' },
  { to: '/suppliers', labelKey: 'nav.suppliers', icon: IconStorefront, permission: 'suppliers.view' },
  { to: '/invoices', labelKey: 'nav.invoices', icon: IconReceipt, permission: 'invoices.view' },
  { to: '/payments', labelKey: 'nav.payments', icon: IconCard, permission: 'cash.view' },
  { to: '/expenses', labelKey: 'nav.expenses', icon: IconExpense, permission: 'cash.view' },
  { to: '/revenues', labelKey: 'nav.revenues', icon: IconRevenue, permission: 'cash.view' },
  { to: '/bank-accounts', labelKey: 'nav.bankAccounts', icon: IconBank, permission: 'cash.view' },
  { to: '/products', labelKey: 'nav.products', icon: IconBox, permission: 'inventory.view' },
  { to: '/users', labelKey: 'nav.team', icon: IconUsers, permission: 'users.view' },
  { to: '/audit-log', labelKey: 'nav.auditLog', icon: IconHistory, permission: 'audit.view' },
  { to: '/settings', labelKey: 'nav.settings', icon: IconSettings, permission: 'settings.view' },
  { to: '/admin', labelKey: 'nav.admin', icon: IconShield, roleOnly: 'Super Admin' },
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
  const location = useLocation()
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
          <img src={logoIcon} alt="" className="h-8 w-8 object-contain" />
          <div>
            <span className="block text-sm font-bold leading-tight text-content">{t('app.name')}</span>
            <span className="block text-xs leading-tight text-faint">{t('app.tagline')}</span>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {visible.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-accent-soft text-accent-strong' : 'text-subtle hover:bg-muted hover:text-content'
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                {t(item.labelKey)}
              </NavLink>
            )
          })}
        </nav>
        <div className="space-y-3 border-t border-line p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="w-full appearance-none rounded-lg border border-line bg-surface py-1.5 pl-2.5 pr-7 text-xs text-subtle transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-faint">
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
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg p-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-strong">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-content">{user?.name}</p>
              <p className="truncate text-xs text-faint">{roles.join(', ')}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {t('nav.signOut')}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        {/* Force remount on route change to avoid brief stale content during transitions. */}
        <Outlet key={location.pathname} />
      </main>
    </div>
  )
}
