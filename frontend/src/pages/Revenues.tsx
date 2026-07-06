import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Account, Paginated } from '../types'
import { Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Pagination, Select } from '../components/ui'
import { IconPlus } from '../components/icons'
import { useAuth } from '../contexts/AuthContext'

interface Revenue {
  id: number
  revenue_number: string
  category: string | null
  amount: string
  revenue_date: string
  account?: Account
}

const empty = { account_id: '', category: '', amount: '', revenue_date: new Date().toISOString().slice(0, 10), description: '' }

export default function Revenues() {
  const { can } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({ queryKey: ['revenues', page], queryFn: async () => (await api.get<Paginated<Revenue>>('/revenues', { params: { page } })).data })
  const { data: accounts } = useQuery({
    queryKey: ['accounts-revenue'],
    queryFn: async () => (await api.get<{ data: Account[] }>('/accounts', { params: { type: 'revenue' } })).data.data,
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/revenues', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] })
      setOpen(false)
      setForm(empty)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/revenues/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['revenues'] }),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate()
  }

  return (
    <div>
      <PageHeader title={t('revenues.pageTitle')} action={can('cash.manage') && <Button onClick={() => setOpen(true)}><IconPlus size={16} />{t('revenues.recordRevenue')}</Button>} />
      <Card>
        {data?.data.length === 0 && !isLoading ? (
          <EmptyState message={t('revenues.emptyMessage')} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
              <tr>
                <th className="px-4 py-3">{t('revenues.colRevenueNumber')}</th>
                <th className="px-4 py-3">{t('revenues.colAccount')}</th>
                <th className="px-4 py-3">{t('revenues.colCategory')}</th>
                <th className="px-4 py-3">{t('revenues.colDate')}</th>
                <th className="px-4 py-3 text-right">{t('revenues.colAmount')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && <tr><td className="px-4 py-6 text-faint" colSpan={6}>{t('common.loading')}</td></tr>}
              {data?.data.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono text-subtle">{r.revenue_number}</td>
                  <td className="px-4 py-3 text-content">{r.account?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-subtle">{r.category ?? '—'}</td>
                  <td className="px-4 py-3 text-subtle">{r.revenue_date?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right text-subtle">{r.amount}</td>
                  <td className="px-4 py-3 text-right">
                    {can('cash.manage') && (
                      <button
                        onClick={() => confirm(t('revenues.deleteConfirm')) && deleteMutation.mutate(r.id)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        {t('revenues.delete')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && (
          <Pagination currentPage={data.current_page} lastPage={data.last_page} total={data.total} perPage={data.per_page} onPageChange={setPage} />
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t('revenues.recordRevenueModalTitle')}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t('revenues.revenueAccount')}>
            <Select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
              <option value="">{t('common.select')}</option>
              {accounts?.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
            </Select>
          </Field>
          <Field label={t('revenues.category')}>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('revenues.amount')}>
              <Input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label={t('revenues.date')}>
              <Input type="date" required value={form.revenue_date} onChange={(e) => setForm({ ...form, revenue_date: e.target.value })} />
            </Field>
          </div>
          <Field label={t('revenues.description')}>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? t('common.saving') : t('revenues.saveRevenue')}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
