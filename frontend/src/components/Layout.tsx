import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
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
  { to: '/settings', labelKey: 'nav.settings', permission: 'settings.view' },
  { to: '/admin', labelKey: 'nav.admin', roleOnly: 'Super Admin' },
]

export default function Layout() {
  const { user, roles, can, logout } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

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
    <div className="flex min-h-screen bg-gray-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <span className="text-lg font-bold text-indigo-600">{t('app.name')}</span>
          <p className="text-xs text-gray-500">{t('app.tagline')}</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-4">
          <select
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="mb-3 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
          >
            {supportedLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
          <p className="truncate text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="truncate text-xs text-gray-500">{roles.join(', ')}</p>
          <button onClick={onLogout} className="mt-2 text-xs font-medium text-red-600 hover:underline">
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
