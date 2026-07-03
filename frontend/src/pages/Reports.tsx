import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, downloadPdf } from '../api/client'
import { Button, Card, PageHeader, Select } from '../components/ui'

interface TrialBalanceRow { code: string; name: string; type: string; debit: number; credit: number }
interface TrialBalance { data: TrialBalanceRow[]; total_debit: number; total_credit: number }
interface PLRow { code: string; name: string; amount: number }
interface PL { revenue: PLRow[]; expenses: PLRow[]; total_revenue: number; total_expenses: number; net_income: number }
interface BSRow { code: string; name: string; amount: number }
interface BS { assets: BSRow[]; liabilities: BSRow[]; equity: BSRow[]; net_income: number; total_assets: number; total_liabilities: number; total_equity: number }

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2 })

function TrialBalanceView() {
  const { data, isLoading } = useQuery({ queryKey: ['trial-balance'], queryFn: async () => (await api.get<TrialBalance>('/reports/trial-balance')).data })
  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
        <tr>
          <th className="px-4 py-3">Code</th>
          <th className="px-4 py-3">Account</th>
          <th className="px-4 py-3 text-right">Debit</th>
          <th className="px-4 py-3 text-right">Credit</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {data?.data.map((r) => (
          <tr key={r.code}>
            <td className="px-4 py-3 font-mono text-gray-600">{r.code}</td>
            <td className="px-4 py-3 text-gray-900">{r.name}</td>
            <td className="px-4 py-3 text-right text-gray-600">{r.debit ? fmt(r.debit) : '—'}</td>
            <td className="px-4 py-3 text-right text-gray-600">{r.credit ? fmt(r.credit) : '—'}</td>
          </tr>
        ))}
      </tbody>
      <tfoot className="border-t-2 border-gray-300 font-semibold text-gray-900">
        <tr>
          <td className="px-4 py-3" colSpan={2}>Total</td>
          <td className="px-4 py-3 text-right">{fmt(data?.total_debit ?? 0)}</td>
          <td className="px-4 py-3 text-right">{fmt(data?.total_credit ?? 0)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function ProfitAndLossView() {
  const { data, isLoading } = useQuery({ queryKey: ['pl'], queryFn: async () => (await api.get<PL>('/reports/profit-and-loss')).data })
  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>
  return (
    <div className="p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">Revenue</h3>
      {data?.revenue.map((r) => (
        <div key={r.code} className="flex justify-between border-b border-gray-100 py-1.5 text-sm">
          <span className="text-gray-600">{r.name}</span>
          <span className="text-gray-900">{fmt(r.amount)}</span>
        </div>
      ))}
      <h3 className="mb-2 mt-4 text-sm font-semibold text-gray-700">Expenses</h3>
      {data?.expenses.map((r) => (
        <div key={r.code} className="flex justify-between border-b border-gray-100 py-1.5 text-sm">
          <span className="text-gray-600">{r.name}</span>
          <span className="text-gray-900">{fmt(r.amount)}</span>
        </div>
      ))}
      <div className="mt-4 flex justify-between border-t-2 border-gray-300 pt-2 text-base font-semibold">
        <span>Net Income</span>
        <span className={data && data.net_income < 0 ? 'text-red-600' : 'text-green-600'}>{fmt(data?.net_income ?? 0)}</span>
      </div>
    </div>
  )
}

function BalanceSheetView() {
  const { data, isLoading } = useQuery({ queryKey: ['bs'], queryFn: async () => (await api.get<BS>('/reports/balance-sheet')).data })
  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>
  return (
    <div className="grid grid-cols-2 gap-6 p-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Assets</h3>
        {data?.assets.map((r) => (
          <div key={r.code} className="flex justify-between border-b border-gray-100 py-1.5 text-sm">
            <span className="text-gray-600">{r.name}</span>
            <span className="text-gray-900">{fmt(r.amount)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between font-semibold">
          <span>Total Assets</span>
          <span>{fmt(data?.total_assets ?? 0)}</span>
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Liabilities</h3>
        {data?.liabilities.map((r) => (
          <div key={r.code} className="flex justify-between border-b border-gray-100 py-1.5 text-sm">
            <span className="text-gray-600">{r.name}</span>
            <span className="text-gray-900">{fmt(r.amount)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between font-semibold">
          <span>Total Liabilities</span>
          <span>{fmt(data?.total_liabilities ?? 0)}</span>
        </div>
        <h3 className="mb-2 mt-4 text-sm font-semibold text-gray-700">Equity</h3>
        {data?.equity.map((r) => (
          <div key={r.code} className="flex justify-between border-b border-gray-100 py-1.5 text-sm">
            <span className="text-gray-600">{r.name}</span>
            <span className="text-gray-900">{fmt(r.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between border-b border-gray-100 py-1.5 text-sm">
          <span className="text-gray-600">Net Income</span>
          <span className="text-gray-900">{fmt(data?.net_income ?? 0)}</span>
        </div>
        <div className="mt-2 flex justify-between font-semibold">
          <span>Total Equity</span>
          <span>{fmt(data?.total_equity ?? 0)}</span>
        </div>
      </div>
    </div>
  )
}

const reportPdf: Record<string, { path: string; filename: string }> = {
  'trial-balance': { path: '/reports/trial-balance/pdf', filename: 'trial-balance.pdf' },
  'profit-and-loss': { path: '/reports/profit-and-loss/pdf', filename: 'profit-and-loss.pdf' },
  'balance-sheet': { path: '/reports/balance-sheet/pdf', filename: 'balance-sheet.pdf' },
}

export default function Reports() {
  const [tab, setTab] = useState('trial-balance')

  return (
    <div>
      <PageHeader
        title="Reports"
        action={
          <div className="flex items-center gap-2">
            <Select value={tab} onChange={(e) => setTab(e.target.value)} className="w-56">
              <option value="trial-balance">Trial Balance</option>
              <option value="profit-and-loss">Profit & Loss</option>
              <option value="balance-sheet">Balance Sheet</option>
            </Select>
            <Button variant="secondary" onClick={() => downloadPdf(reportPdf[tab].path, reportPdf[tab].filename)}>
              Download PDF
            </Button>
          </div>
        }
      />
      <Card>
        {tab === 'trial-balance' && <TrialBalanceView />}
        {tab === 'profit-and-loss' && <ProfitAndLossView />}
        {tab === 'balance-sheet' && <BalanceSheetView />}
      </Card>
    </div>
  )
}
