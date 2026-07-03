import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface NavItem {
  to: string
  label: string
  permission?: string
  roleOnly?: string
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/accounts', label: 'Chart of Accounts', permission: 'finance.view' },
  { to: '/journal-entries', label: 'Journal Entries', permission: 'finance.view' },
  { to: '/reports', label: 'Reports', permission: 'finance.view' },
  { to: '/customers', label: 'Customers', permission: 'customers.view' },
  { to: '/suppliers', label: 'Suppliers', permission: 'suppliers.view' },
  { to: '/invoices', label: 'Invoices', permission: 'invoices.view' },
  { to: '/payments', label: 'Payments', permission: 'cash.view' },
  { to: '/expenses', label: 'Expenses', permission: 'cash.view' },
  { to: '/revenues', label: 'Revenues', permission: 'cash.view' },
  { to: '/bank-accounts', label: 'Bank Accounts', permission: 'cash.view' },
  { to: '/products', label: 'Products & Inventory', permission: 'inventory.view' },
  { to: '/users', label: 'Team', permission: 'users.view' },
  { to: '/settings', label: 'Company Settings', permission: 'settings.view' },
  { to: '/admin', label: 'Platform Admin', roleOnly: 'Super Admin' },
]

export default function Layout() {
  const { user, roles, can, logout } = useAuth()
  const navigate = useNavigate()

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
          <span className="text-lg font-bold text-indigo-600">URS</span>
          <p className="text-xs text-gray-500">Cloud Accounting</p>
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
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-4">
          <p className="truncate text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="truncate text-xs text-gray-500">{roles.join(', ')}</p>
          <button onClick={onLogout} className="mt-2 text-xs font-medium text-red-600 hover:underline">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
