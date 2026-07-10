import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, downloadPdf } from '../api/client'
import { Button, Card, LoadingState, PageHeader, Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow, Tabs } from '../components/ui'

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
  if (isLoading) return <LoadingState />
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>{t('reports.colCode')}</TableHeaderCell>
            <TableHeaderCell>{t('reports.colAccount')}</TableHeaderCell>
            <TableHeaderCell className="text-end">{t('reports.colDebit')}</TableHeaderCell>
            <TableHeaderCell className="text-end">{t('reports.colCredit')}</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {data?.data.map((r) => (
            <TableRow key={r.code}>
              <TableCell className="font-mono text-subtle">{r.code}</TableCell>
              <TableCell className="text-content">{r.name}</TableCell>
              <TableCell className="text-end text-subtle">{r.debit ? fmt(r.debit) : '—'}</TableCell>
              <TableCell className="text-end text-subtle">{r.credit ? fmt(r.credit) : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <tfoot className="border-t-2 border-line font-semibold text-content">
          <tr>
            <TableCell colSpan={2}>{t('reports.total')}</TableCell>
            <TableCell className="text-end">{fmt(data?.total_debit ?? 0)}</TableCell>
            <TableCell className="text-end">{fmt(data?.total_credit ?? 0)}</TableCell>
          </tr>
        </tfoot>
      </Table>
    </TableContainer>
  )
}

function ProfitAndLossView() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({ queryKey: ['pl'], queryFn: async () => (await api.get<PL>('/reports/profit-and-loss')).data })
  if (isLoading) return <LoadingState />
  return (
    <div className="p-4">
      <h3 className="mb-2 text-sm font-semibold text-subtle">{t('reports.revenue')}</h3>
      {data?.revenue.map((r) => (
        <div key={r.code} className="flex items-start justify-between gap-3 border-b border-line py-1.5 text-sm">
          <span className="min-w-0 flex-1 truncate text-subtle">{r.name}</span>
          <span className="shrink-0 text-content">{fmt(r.amount)}</span>
        </div>
      ))}
      <h3 className="mb-2 mt-4 text-sm font-semibold text-subtle">{t('reports.expenses')}</h3>
      {data?.expenses.map((r) => (
        <div key={r.code} className="flex items-start justify-between gap-3 border-b border-line py-1.5 text-sm">
          <span className="min-w-0 flex-1 truncate text-subtle">{r.name}</span>
          <span className="shrink-0 text-content">{fmt(r.amount)}</span>
        </div>
      ))}
      <div className="mt-4 flex justify-between border-t-2 border-line pt-2 text-base font-semibold">
        <span>{t('reports.netIncome')}</span>
        <span className={data && data.net_income < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>{fmt(data?.net_income ?? 0)}</span>
      </div>
    </div>
  )
}

function BalanceSheetView() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({ queryKey: ['bs'], queryFn: async () => (await api.get<BS>('/reports/balance-sheet')).data })
  if (isLoading) return <LoadingState />
  return (
    <div className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-subtle">{t('reports.assets')}</h3>
        {data?.assets.map((r) => (
          <div key={r.code} className="flex items-start justify-between gap-3 border-b border-line py-1.5 text-sm">
            <span className="min-w-0 flex-1 truncate text-subtle">{r.name}</span>
            <span className="shrink-0 text-content">{fmt(r.amount)}</span>
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
          <div key={r.code} className="flex items-start justify-between gap-3 border-b border-line py-1.5 text-sm">
            <span className="min-w-0 flex-1 truncate text-subtle">{r.name}</span>
            <span className="shrink-0 text-content">{fmt(r.amount)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between font-semibold">
          <span>{t('reports.totalLiabilities')}</span>
          <span>{fmt(data?.total_liabilities ?? 0)}</span>
        </div>
        <h3 className="mb-2 mt-4 text-sm font-semibold text-subtle">{t('reports.equity')}</h3>
        {data?.equity.map((r) => (
          <div key={r.code} className="flex items-start justify-between gap-3 border-b border-line py-1.5 text-sm">
            <span className="min-w-0 flex-1 truncate text-subtle">{r.name}</span>
            <span className="shrink-0 text-content">{fmt(r.amount)}</span>
          </div>
        ))}
        <div className="flex items-start justify-between gap-3 border-b border-line py-1.5 text-sm">
          <span className="min-w-0 flex-1 truncate text-subtle">{t('reports.netIncome')}</span>
          <span className="shrink-0 text-content">{fmt(data?.net_income ?? 0)}</span>
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

  const tabs = [
    { id: 'trial-balance', label: t('reports.trialBalance') },
    { id: 'profit-and-loss', label: t('reports.profitAndLoss') },
    { id: 'balance-sheet', label: t('reports.balanceSheet') },
  ]

  return (
    <div>
      <PageHeader title={t('reports.pageTitle')} subtitle={t('reports.subtitle')} />

      <div className="mb-4 space-y-3">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => downloadPdf(reportPdf[tab].path, reportPdf[tab].filename)}>
          {t('reports.downloadPdf')}
        </Button>
      </div>

      <Card>
        {tab === 'trial-balance' && <TrialBalanceView />}
        {tab === 'profit-and-loss' && <ProfitAndLossView />}
        {tab === 'balance-sheet' && <BalanceSheetView />}
      </Card>
    </div>
  )
}
