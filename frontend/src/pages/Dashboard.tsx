import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { Card, PageHeader } from '../components/ui'
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

function Stat({ label, value, tone = 'text-gray-900' }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
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

  const fmt = (n: number | undefined) => (n === undefined ? '—' : n.toLocaleString(undefined, { minimumFractionDigits: 2 }))

  return (
    <div>
      <PageHeader title={`Welcome back, ${user?.name ?? ''}`} />
      {canViewFinance ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Stat label="Revenue (all time)" value={fmt(pl?.total_revenue)} />
          <Stat label="Expenses (all time)" value={fmt(pl?.total_expenses)} />
          <Stat label="Net Income" value={fmt(pl?.net_income)} tone={pl && pl.net_income < 0 ? 'text-red-600' : 'text-green-600'} />
          <Stat label="Total Assets" value={fmt(bs?.total_assets)} />
          <Stat label="Total Liabilities" value={fmt(bs?.total_liabilities)} />
          <Stat label="Total Equity" value={fmt(bs?.total_equity)} />
        </div>
      ) : (
        <Card className="p-6 text-sm text-gray-500">You don't have permission to view financial summaries.</Card>
      )}
    </div>
  )
}
