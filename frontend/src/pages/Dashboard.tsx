import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api/client'
import { Badge, Card, PageHeader, SectionTitle, invoiceStatusColor } from '../components/ui'
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

const statusKey: Record<string, string> = {
  draft: 'draft',
  sent: 'sent',
  paid: 'paid',
  partially_paid: 'partiallyPaid',
  overdue: 'overdue',
  void: 'void',
}

function Stat({ label, value, tone = 'text-content', highlight }: { label: string; value: string; tone?: string; highlight?: boolean }) {
  return (
    <Card className={`p-4 sm:p-5 ${highlight ? 'border-accent/30 bg-accent-soft/30' : ''}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-faint">{label}</p>
      <p className={`mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl ${tone}`}>{value}</p>
    </Card>
  )
}

function WidgetCard({ title, children, urgent }: { title: string; children: React.ReactNode; urgent?: boolean }) {
  return (
    <Card className={`p-5 ${urgent ? 'border-red-200 dark:border-red-500/30' : ''}`}>
      <h2 className={`mb-3 text-sm font-semibold ${urgent ? 'text-red-600 dark:text-red-400' : 'text-content'}`}>{title}</h2>
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
      ? { grid: '#29323f', tick: '#6f7c8b', revenue: '#63b93e', expense: '#f87171', net: '#8fd96c' }
      : { grid: '#eef1f4', tick: '#7b8794', revenue: '#7cc55e', expense: '#f87171', net: '#3b7423' }

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

  const hasAlerts =
    (summary?.overdue_invoices?.count ?? 0) > 0 || (summary?.low_stock?.count ?? 0) > 0

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('dashboard.welcomeBack', { name: user?.name ?? '' })}
        subtitle={t('dashboard.subtitle')}
      />

      {canViewFinance ? (
        <>
          <section>
            <SectionTitle>{t('dashboard.sections.performance')}</SectionTitle>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat label={t('dashboard.revenueAllTime')} value={fmt(pl?.total_revenue)} />
              <Stat label={t('dashboard.expensesAllTime')} value={fmt(pl?.total_expenses)} />
              <Stat
                label={t('dashboard.netIncome')}
                value={fmt(pl?.net_income)}
                tone={pl && pl.net_income < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}
                highlight
              />
            </div>
          </section>

          <section>
            <SectionTitle>{t('dashboard.sections.balanceSheet')}</SectionTitle>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat label={t('dashboard.totalAssets')} value={fmt(bs?.total_assets)} />
              <Stat label={t('dashboard.totalLiabilities')} value={fmt(bs?.total_liabilities)} />
              <Stat label={t('dashboard.totalEquity')} value={fmt(bs?.total_equity)} />
            </div>
          </section>

          {summary?.monthly_trend && (
            <section>
              <WidgetCard title={t('dashboard.trendTitle')}>
                <div className="h-[200px] sm:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={summary.monthly_trend} margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                    <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} width={48} />
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
                    <Bar dataKey="revenue" fill={chart.revenue} radius={[4, 4, 0, 0]} name={t('dashboard.chartRevenue')} />
                    <Bar dataKey="expense" fill={chart.expense} radius={[4, 4, 0, 0]} name={t('dashboard.chartExpense')} />
                    <Line type="monotone" dataKey="net" stroke={chart.net} strokeWidth={2} dot={false} name={t('dashboard.chartNet')} />
                </ComposedChart>
                </ResponsiveContainer>
                </div>
              </WidgetCard>
            </section>
          )}
        </>
      ) : (
        <Card className="p-6 text-sm text-faint">{t('dashboard.noPermission')}</Card>
      )}

      {hasAlerts && (
        <section>
          <SectionTitle>{t('dashboard.sections.alerts')}</SectionTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {summary?.overdue_invoices && (
              <WidgetCard title={t('dashboard.overdueInvoices', { count: summary.overdue_invoices.count })} urgent={summary.overdue_invoices.count > 0}>
                {summary.overdue_invoices.data.length === 0 ? (
                  <p className="text-sm text-faint">{t('dashboard.nothingOverdue')}</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {summary.overdue_invoices.data.map((inv) => (
                      <li key={inv.id} className="flex justify-between gap-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-content">{inv.invoice_number}</p>
                          <p className="truncate text-faint">
                            {inv.customer?.name} · {t('dashboard.dueDate', { date: inv.due_date.slice(0, 10) })}
                          </p>
                        </div>
                        <span className="shrink-0 font-medium text-red-600 dark:text-red-400">{inv.total}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </WidgetCard>
            )}

            {summary?.low_stock && (
              <WidgetCard title={t('dashboard.lowStock', { count: summary.low_stock.count })} urgent={summary.low_stock.count > 0}>
                {summary.low_stock.data.length === 0 ? (
                  <p className="text-sm text-faint">{t('dashboard.wellStocked')}</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {summary.low_stock.data.map((p) => (
                      <li key={p.id} className="flex justify-between gap-3 py-2.5 text-sm">
                        <span className="truncate text-content">{p.name}</span>
                        <span className="shrink-0 text-red-600 dark:text-red-400">
                          {p.quantity_on_hand} / {p.reorder_level}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </WidgetCard>
            )}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>{t('dashboard.sections.recentActivity')}</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {summary?.recent_invoices && (
            <WidgetCard title={t('dashboard.recentInvoices')}>
              {summary.recent_invoices.length === 0 ? (
                <p className="text-sm text-faint">{t('dashboard.noInvoicesYet')}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {summary.recent_invoices.map((inv) => (
                    <li key={inv.id} className="flex flex-col gap-2 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-content">{inv.invoice_number}</p>
                        <p className="truncate text-faint">{inv.customer?.name ?? inv.supplier?.name}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-end">
                        <span className="text-subtle">{inv.total}</span>
                        <Badge color={invoiceStatusColor[inv.status]}>
                          {t(`status.${statusKey[inv.status] ?? inv.status}`)}
                        </Badge>
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
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-content">{p.payment_number}</p>
                        <p className="truncate text-faint">{p.customer?.name ?? p.supplier?.name}</p>
                      </div>
                      <Badge color={p.direction === 'in' ? 'green' : 'red'}>
                        {p.direction === 'in' ? `+${p.amount}` : `-${p.amount}`}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </WidgetCard>
          )}
        </div>
      </section>
    </div>
  )
}
