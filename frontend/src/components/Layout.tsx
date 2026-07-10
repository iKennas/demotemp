import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logoIcon from '../assets/logo-icon.png'
import { useAuth } from '../contexts/AuthContext'
import { LocaleThemeControls } from './ui'
import {
  IconBank,
  IconBox,
  IconCard,
  IconChevronEnd,
  IconDashboard,
  IconExpense,
  IconHistory,
  IconJournal,
  IconLedger,
  IconMenu,
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

interface NavSection {
  labelKey: string
  items: NavItem[]
  flat?: boolean
}

const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: 'nav.sections.overview',
    flat: true,
    items: [{ to: '/', labelKey: 'nav.dashboard', icon: IconDashboard }],
  },
  {
    labelKey: 'nav.sections.accounting',
    items: [
      { to: '/accounts', labelKey: 'nav.accounts', icon: IconLedger, permission: 'finance.view' },
      { to: '/journal-entries', labelKey: 'nav.journalEntries', icon: IconJournal, permission: 'finance.view' },
      { to: '/reports', labelKey: 'nav.reports', icon: IconReports, permission: 'finance.view' },
    ],
  },
  {
    labelKey: 'nav.sections.sales',
    items: [
      { to: '/customers', labelKey: 'nav.customers', icon: IconUser, permission: 'customers.view' },
      { to: '/suppliers', labelKey: 'nav.suppliers', icon: IconStorefront, permission: 'suppliers.view' },
      { to: '/invoices', labelKey: 'nav.invoices', icon: IconReceipt, permission: 'invoices.view' },
    ],
  },
  {
    labelKey: 'nav.sections.cash',
    items: [
      { to: '/payments', labelKey: 'nav.payments', icon: IconCard, permission: 'cash.view' },
      { to: '/expenses', labelKey: 'nav.expenses', icon: IconExpense, permission: 'cash.view' },
      { to: '/revenues', labelKey: 'nav.revenues', icon: IconRevenue, permission: 'cash.view' },
      { to: '/bank-accounts', labelKey: 'nav.bankAccounts', icon: IconBank, permission: 'cash.view' },
    ],
  },
  {
    labelKey: 'nav.sections.inventory',
    items: [{ to: '/products', labelKey: 'nav.products', icon: IconBox, permission: 'inventory.view' }],
  },
  {
    labelKey: 'nav.sections.administration',
    items: [
      { to: '/users', labelKey: 'nav.team', icon: IconUsers, permission: 'users.view' },
      { to: '/audit-log', labelKey: 'nav.auditLog', icon: IconHistory, permission: 'audit.view' },
      { to: '/settings', labelKey: 'nav.settings', icon: IconSettings, permission: 'settings.view' },
      { to: '/admin', labelKey: 'nav.admin', icon: IconShield, roleOnly: 'Super Admin' },
    ],
  },
]

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items)
const COLLAPSED_STORAGE_KEY = 'urs-nav-collapsed-v2'

function defaultCollapsedSections(): Set<string> {
  return new Set(NAV_SECTIONS.filter((section) => !section.flat).map((section) => section.labelKey))
}

function canSeeItem(item: NavItem, can: (p: string) => boolean, roles: string[]) {
  if (item.roleOnly) return roles.includes(item.roleOnly)
  if (item.permission) return can(item.permission)
  return true
}

function isSectionActive(section: NavSection, pathname: string) {
  return section.items.some((item) => (item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)))
}

function loadCollapsedSections(): Set<string> {
  try {
    const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY)
    if (!stored) return defaultCollapsedSections()
    return new Set(JSON.parse(stored) as string[])
  } catch {
    return defaultCollapsedSections()
  }
}

function saveCollapsedSections(collapsed: Set<string>) {
  localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...collapsed]))
}

export default function Layout() {
  const { user, roles, can, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(loadCollapsedSections)

  const visibleSections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => canSeeItem(item, can, roles)),
      })).filter((section) => section.items.length > 0),
    [can, roles],
  )

  const currentPage = ALL_NAV_ITEMS.find((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
  )

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    setCollapsedSections((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const section of visibleSections) {
        if (isSectionActive(section, location.pathname) && next.has(section.labelKey)) {
          next.delete(section.labelKey)
          changed = true
        }
      }
      if (changed) saveCollapsedSections(next)
      return changed ? next : prev
    })
  }, [location.pathname, visibleSections])

  const toggleSection = (labelKey: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(labelKey)) next.delete(labelKey)
      else next.add(labelKey)
      saveCollapsedSections(next)
      return next
    })
  }

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  const sidebar = (
    <>
      <div className="flex shrink-0 items-center gap-2.5 border-b border-line px-5 py-4">
        <img src={logoIcon} alt="" className="h-8 w-8 object-contain" />
        <div className="min-w-0">
          <span className="block text-sm font-bold leading-tight text-content">{t('app.name')}</span>
          <span className="block text-xs leading-tight text-faint">{t('app.tagline')}</span>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleSections.map((section) => {
          const navLinks = (
            <div className="space-y-0.5 pb-1">
              {section.items.map((item) => {
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
                    <span className="truncate">{t(item.labelKey)}</span>
                  </NavLink>
                )
              })}
            </div>
          )

          if (section.flat) {
            return <div key={section.labelKey}>{navLinks}</div>
          }

          const isOpen = !collapsedSections.has(section.labelKey)
          const sectionActive = isSectionActive(section, location.pathname)

          return (
            <div key={section.labelKey}>
              <button
                type="button"
                onClick={() => toggleSection(section.labelKey)}
                aria-expanded={isOpen}
                aria-controls={`nav-section-${section.labelKey.replace(/\./g, '-')}`}
                className={`mb-0.5 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-muted ${
                  sectionActive ? 'bg-accent-soft/40 text-accent-strong' : 'text-subtle hover:text-content'
                }`}
              >
                <span className="truncate">{t(section.labelKey)}</span>
                <IconChevronEnd
                  size={16}
                  className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                />
              </button>
              <div
                id={`nav-section-${section.labelKey.replace(/\./g, '-')}`}
                className={`grid transition-[grid-template-rows] duration-200 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="overflow-hidden">{navLinks}</div>
              </div>
            </div>
          )
        })}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-line bg-surface p-4">
        <LocaleThemeControls />
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
    </>
  )

  return (
    <div className="flex min-h-screen bg-app">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label={t('common.close')}
        />
      )}

      <aside
        className={`fixed inset-y-0 start-0 z-50 flex h-screen max-h-screen w-64 shrink-0 flex-col border-e border-line bg-surface transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full rtl:lg:translate-x-0'
        }`}
      >
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur-sm lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-subtle transition-colors hover:bg-muted hover:text-content lg:hidden"
            aria-label={t('nav.openMenu')}
          >
            <IconMenu size={18} />
          </button>
          <div className="min-w-0 flex-1 lg:hidden">
            <p className="truncate text-sm font-semibold text-content">{currentPage ? t(currentPage.labelKey) : t('nav.dashboard')}</p>
            <p className="truncate text-xs text-faint">{user?.name}</p>
          </div>
          <div className="hidden sm:block">
            <LocaleThemeControls compact />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet key={location.pathname} />
        </main>
      </div>
    </div>
  )
}
