import { useQuery } from '@tanstack/react-query'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api/client'
import { Badge, Card, PageHeader } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

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

function Stat({ label, value, tone = 'text-gray-900' }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    </Card>
  )
}

function WidgetCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </Card>
  )
}

export default function Dashboard() {
  const { user, can } = useAuth()
  const canViewFinance = can('finance.view')

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
      <PageHeader title={`Welcome back, ${user?.name ?? ''}`} />

      {canViewFinance ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Stat label="Revenue (all time)" value={fmt(pl?.total_revenue)} />
            <Stat label="Expenses (all time)" value={fmt(pl?.total_expenses)} />
            <Stat label="Net Income" value={fmt(pl?.net_income)} tone={pl && pl.net_income < 0 ? 'text-red-600' : 'text-green-600'} />
            <Stat label="Total Assets" value={fmt(bs?.total_assets)} />
            <Stat label="Total Liabilities" value={fmt(bs?.total_liabilities)} />
            <Stat label="Total Equity" value={fmt(bs?.total_equity)} />
          </div>

          {summary?.monthly_trend && (
            <WidgetCard title="Revenue vs Expenses (last 6 months)">
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={summary.monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    labelFormatter={(m) => monthLabel(String(m))}
                    formatter={(v) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  />
                  <Bar dataKey="revenue" fill="#a5b4fc" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expense" fill="#fca5a5" radius={[4, 4, 0, 0]} name="Expense" />
                  <Line type="monotone" dataKey="net" stroke="#4f46e5" strokeWidth={2} dot={false} name="Net" />
                </ComposedChart>
              </ResponsiveContainer>
            </WidgetCard>
          )}
        </>
      ) : (
        <Card className="p-6 text-sm text-gray-500">You don't have permission to view financial summaries.</Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {summary?.overdue_invoices && (
          <WidgetCard title={`Overdue Invoices (${summary.overdue_invoices.count})`}>
            {summary.overdue_invoices.data.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing overdue. 🎉</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {summary.overdue_invoices.data.map((inv) => (
                  <li key={inv.id} className="flex justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{inv.invoice_number}</p>
                      <p className="text-gray-500">{inv.customer?.name} · due {inv.due_date.slice(0, 10)}</p>
                    </div>
                    <span className="font-medium text-red-600">{inv.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </WidgetCard>
        )}

        {summary?.low_stock && (
          <WidgetCard title={`Low Stock (${summary.low_stock.count})`}>
            {summary.low_stock.data.length === 0 ? (
              <p className="text-sm text-gray-400">All products well stocked.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {summary.low_stock.data.map((p) => (
                  <li key={p.id} className="flex justify-between py-2 text-sm">
                    <span className="text-gray-900">{p.name}</span>
                    <span className="text-red-600">{p.quantity_on_hand} / {p.reorder_level}</span>
                  </li>
                ))}
              </ul>
            )}
          </WidgetCard>
        )}

        {summary?.recent_invoices && (
          <WidgetCard title="Recent Invoices">
            {summary.recent_invoices.length === 0 ? (
              <p className="text-sm text-gray-400">No invoices yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {summary.recent_invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{inv.invoice_number}</p>
                      <p className="text-gray-500">{inv.customer?.name ?? inv.supplier?.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{inv.total}</span>
                      <Badge color={statusColor[inv.status]}>{inv.status.replace('_', ' ')}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </WidgetCard>
        )}

        {summary?.recent_payments && (
          <WidgetCard title="Recent Payments">
            {summary.recent_payments.length === 0 ? (
              <p className="text-sm text-gray-400">No payments yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {summary.recent_payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{p.payment_number}</p>
                      <p className="text-gray-500">{p.customer?.name ?? p.supplier?.name}</p>
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
