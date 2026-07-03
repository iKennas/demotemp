import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({ queryKey: ['trial-balance'], queryFn: async () => (await api.get<TrialBalance>('/reports/trial-balance')).data })
  if (isLoading) return <p className="text-sm text-faint">{t('common.loading')}</p>
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
        <tr>
          <th className="px-4 py-3">{t('reports.colCode')}</th>
          <th className="px-4 py-3">{t('reports.colAccount')}</th>
          <th className="px-4 py-3 text-right">{t('reports.colDebit')}</th>
          <th className="px-4 py-3 text-right">{t('reports.colCredit')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {data?.data.map((r) => (
          <tr key={r.code}>
            <td className="px-4 py-3 font-mono text-subtle">{r.code}</td>
            <td className="px-4 py-3 text-content">{r.name}</td>
            <td className="px-4 py-3 text-right text-subtle">{r.debit ? fmt(r.debit) : '—'}</td>
            <td className="px-4 py-3 text-right text-subtle">{r.credit ? fmt(r.credit) : '—'}</td>
          </tr>
        ))}
      </tbody>
      <tfoot className="border-t-2 border-line font-semibold text-content">
        <tr>
          <td className="px-4 py-3" colSpan={2}>{t('reports.total')}</td>
          <td className="px-4 py-3 text-right">{fmt(data?.total_debit ?? 0)}</td>
          <td className="px-4 py-3 text-right">{fmt(data?.total_credit ?? 0)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function ProfitAndLossView() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({ queryKey: ['pl'], queryFn: async () => (await api.get<PL>('/reports/profit-and-loss')).data })
  if (isLoading) return <p className="text-sm text-faint">{t('common.loading')}</p>
  return (
    <div className="p-4">
      <h3 className="mb-2 text-sm font-semibold text-subtle">{t('reports.revenue')}</h3>
      {data?.revenue.map((r) => (
        <div key={r.code} className="flex justify-between border-b border-line py-1.5 text-sm">
          <span className="text-subtle">{r.name}</span>
          <span className="text-content">{fmt(r.amount)}</span>
        </div>
      ))}
      <h3 className="mb-2 mt-4 text-sm font-semibold text-subtle">{t('reports.expenses')}</h3>
      {data?.expenses.map((r) => (
        <div key={r.code} className="flex justify-between border-b border-line py-1.5 text-sm">
          <span className="text-subtle">{r.name}</span>
          <span className="text-content">{fmt(r.amount)}</span>
        </div>
      ))}
      <div className="mt-4 flex justify-between border-t-2 border-line pt-2 text-base font-semibold">
        <span>{t('reports.netIncome')}</span>
        <span className={data && data.net_income < 0 ? 'text-red-600' : 'text-green-600'}>{fmt(data?.net_income ?? 0)}</span>
      </div>
    </div>
  )
}

function BalanceSheetView() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({ queryKey: ['bs'], queryFn: async () => (await api.get<BS>('/reports/balance-sheet')).data })
  if (isLoading) return <p className="text-sm text-faint">{t('common.loading')}</p>
  return (
    <div className="grid grid-cols-2 gap-6 p-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-subtle">{t('reports.assets')}</h3>
        {data?.assets.map((r) => (
          <div key={r.code} className="flex justify-between border-b border-line py-1.5 text-sm">
            <span className="text-subtle">{r.name}</span>
            <span className="text-content">{fmt(r.amount)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between font-semibold">
          <span>{t('reports.totalAssets')}</span>
          <span>{fmt(data?.total_assets ?? 0)}</span>
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-subtle">{t('reports.liabilities')}</h3>
        {data?.liabilities.map((r) => (
          <div key={r.code} className="flex justify-between border-b border-line py-1.5 text-sm">
            <span className="text-subtle">{r.name}</span>
            <span className="text-content">{fmt(r.amount)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between font-semibold">
          <span>{t('reports.totalLiabilities')}</span>
          <span>{fmt(data?.total_liabilities ?? 0)}</span>
        </div>
        <h3 className="mb-2 mt-4 text-sm font-semibold text-subtle">{t('reports.equity')}</h3>
        {data?.equity.map((r) => (
          <div key={r.code} className="flex justify-between border-b border-line py-1.5 text-sm">
            <span className="text-subtle">{r.name}</span>
            <span className="text-content">{fmt(r.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between border-b border-line py-1.5 text-sm">
          <span className="text-subtle">{t('reports.netIncome')}</span>
          <span className="text-content">{fmt(data?.net_income ?? 0)}</span>
        </div>
        <div className="mt-2 flex justify-between font-semibold">
          <span>{t('reports.totalEquity')}</span>
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
  const { t } = useTranslation()
  const [tab, setTab] = useState('trial-balance')

  return (
    <div>
      <PageHeader
        title={t('reports.pageTitle')}
        action={
          <div className="flex items-center gap-2">
            <Select value={tab} onChange={(e) => setTab(e.target.value)} className="w-56">
              <option value="trial-balance">{t('reports.trialBalance')}</option>
              <option value="profit-and-loss">{t('reports.profitAndLoss')}</option>
              <option value="balance-sheet">{t('reports.balanceSheet')}</option>
            </Select>
            <Button variant="secondary" onClick={() => downloadPdf(reportPdf[tab].path, reportPdf[tab].filename)}>
              {t('reports.downloadPdf')}
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
