import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api/client'
import { Badge, Card, PageHeader } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

interface ProfitAndLoss {
  total_revenue: number
  total_expenses: number
  net_income: number
}

interface BalanceSheet {
  total_assets: number
  total_liabilities: number
  total_equity: number
}

interface MonthTrend {
  month: string
  revenue: number
  expense: number
  net: number
}

interface DashboardParty {
  name: string
}

interface RecentInvoice {
  id: number
  invoice_number: string
  status: string
  total: string
  issue_date: string
  customer?: DashboardParty
  supplier?: DashboardParty
}

interface RecentPayment {
  id: number
  payment_number: string
  direction: 'in' | 'out'
  amount: string
  payment_date: string
  customer?: DashboardParty
  supplier?: DashboardParty
}

interface OverdueInvoice {
  id: number
  invoice_number: string
  due_date: string
  total: string
  customer?: DashboardParty
}

interface LowStockProduct {
  id: number
  name: string
  sku: string | null
  quantity_on_hand: string
  reorder_level: string
}

interface DashboardSummary {
  monthly_trend?: MonthTrend[]
  recent_invoices?: RecentInvoice[]
  recent_payments?: RecentPayment[]
  overdue_invoices?: { count: number; total: number; data: OverdueInvoice[] }
  low_stock?: { count: number; data: LowStockProduct[] }
}

const statusColor: Record<string, string> = { draft: 'gray', sent: 'blue', paid: 'green', partially_paid: 'yellow', overdue: 'red', void: 'red' }

function Stat({ label, value, tone = 'text-content' }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-faint">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${tone}`}>{value}</p>
    </Card>
  )
}

function WidgetCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-content">{title}</h2>
      {children}
    </Card>
  )
}

export default function Dashboard() {
  const { user, can } = useAuth()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const canViewFinance = can('finance.view')

  const chart =
    theme === 'dark'
      ? { grid: '#29323f', tick: '#6f7c8b', revenue: '#10b981', expense: '#f87171', net: '#34d399' }
      : { grid: '#eef1f4', tick: '#7b8794', revenue: '#34d399', expense: '#f87171', net: '#059669' }

  const { data: pl } = useQuery({
    queryKey: ['dashboard-pl'],
    queryFn: async () => (await api.get<ProfitAndLoss>('/reports/profit-and-loss')).data,
    enabled: canViewFinance,
  })

  const { data: bs } = useQuery({
    queryKey: ['dashboard-bs'],
    queryFn: async () => (await api.get<BalanceSheet>('/reports/balance-sheet')).data,
    enabled: canViewFinance,
  })

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get<DashboardSummary>('/dashboard/summary')).data,
  })

  const fmt = (n: number | undefined) => (n === undefined ? '—' : n.toLocaleString(undefined, { minimumFractionDigits: 2 }))
  const monthLabel = (m: string) => new Date(`${m}-01`).toLocaleDateString(undefined, { month: 'short' })

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard.welcomeBack', { name: user?.name ?? '' })} />

      {canViewFinance ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Stat label={t('dashboard.revenueAllTime')} value={fmt(pl?.total_revenue)} />
            <Stat label={t('dashboard.expensesAllTime')} value={fmt(pl?.total_expenses)} />
            <Stat label={t('dashboard.netIncome')} value={fmt(pl?.net_income)} tone={pl && pl.net_income < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} />
            <Stat label={t('dashboard.totalAssets')} value={fmt(bs?.total_assets)} />
            <Stat label={t('dashboard.totalLiabilities')} value={fmt(bs?.total_liabilities)} />
            <Stat label={t('dashboard.totalEquity')} value={fmt(bs?.total_equity)} />
          </div>

          {summary?.monthly_trend && (
            <WidgetCard title={t('dashboard.trendTitle')}>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={summary.monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 12, fill: chart.tick }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: chart.tick }} axisLine={false} tickLine={false} />
                  <Tooltip
                    labelFormatter={(m) => monthLabel(String(m))}
                    formatter={(v) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: 10,
                      color: 'var(--content)',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="revenue" fill={chart.revenue} radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expense" fill={chart.expense} radius={[4, 4, 0, 0]} name="Expense" />
                  <Line type="monotone" dataKey="net" stroke={chart.net} strokeWidth={2} dot={false} name="Net" />
                </ComposedChart>
              </ResponsiveContainer>
            </WidgetCard>
          )}
        </>
      ) : (
        <Card className="p-6 text-sm text-faint">{t('dashboard.noPermission')}</Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {summary?.overdue_invoices && (
          <WidgetCard title={t('dashboard.overdueInvoices', { count: summary.overdue_invoices.count })}>
            {summary.overdue_invoices.data.length === 0 ? (
              <p className="text-sm text-faint">{t('dashboard.nothingOverdue')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {summary.overdue_invoices.data.map((inv) => (
                  <li key={inv.id} className="flex justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-content">{inv.invoice_number}</p>
                      <p className="text-faint">{inv.customer?.name} · due {inv.due_date.slice(0, 10)}</p>
                    </div>
                    <span className="font-medium text-red-600">{inv.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </WidgetCard>
        )}

        {summary?.low_stock && (
          <WidgetCard title={t('dashboard.lowStock', { count: summary.low_stock.count })}>
            {summary.low_stock.data.length === 0 ? (
              <p className="text-sm text-faint">{t('dashboard.wellStocked')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {summary.low_stock.data.map((p) => (
                  <li key={p.id} className="flex justify-between py-2 text-sm">
                    <span className="text-content">{p.name}</span>
                    <span className="text-red-600">{p.quantity_on_hand} / {p.reorder_level}</span>
                  </li>
                ))}
              </ul>
            )}
          </WidgetCard>
        )}

        {summary?.recent_invoices && (
          <WidgetCard title={t('dashboard.recentInvoices')}>
            {summary.recent_invoices.length === 0 ? (
              <p className="text-sm text-faint">{t('dashboard.noInvoicesYet')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {summary.recent_invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-content">{inv.invoice_number}</p>
                      <p className="text-faint">{inv.customer?.name ?? inv.supplier?.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-subtle">{inv.total}</span>
                      <Badge color={statusColor[inv.status]}>{inv.status.replace('_', ' ')}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </WidgetCard>
        )}

        {summary?.recent_payments && (
          <WidgetCard title={t('dashboard.recentPayments')}>
            {summary.recent_payments.length === 0 ? (
              <p className="text-sm text-faint">{t('dashboard.noPaymentsYet')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {summary.recent_payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-content">{p.payment_number}</p>
                      <p className="text-faint">{p.customer?.name ?? p.supplier?.name}</p>
                    </div>
                    <Badge color={p.direction === 'in' ? 'green' : 'red'}>{p.direction === 'in' ? `+${p.amount}` : `-${p.amount}`}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </WidgetCard>
        )}
      </div>
    </div>
  )
}
