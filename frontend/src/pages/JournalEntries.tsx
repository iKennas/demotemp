import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Account, Paginated } from '../types'
import { Badge, Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Pagination, Select } from '../components/ui'
import { IconClose, IconPlus } from '../components/icons'
import { useAuth } from '../contexts/AuthContext'

interface Line { account_id: string; debit: string; credit: string; description: string }
interface JournalEntry {
  id: number
  entry_number: string
  entry_date: string
  description: string | null
  status: 'draft' | 'posted' | 'void'
  total_debit: string
  total_credit: string
}

const emptyLine: Line = { account_id: '', debit: '', credit: '', description: '' }
const statusColor: Record<string, string> = { draft: 'gray', posted: 'green', void: 'red' }

export default function JournalEntries() {
  const { can } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }, { ...emptyLine }])
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['journal-entries', page],
    queryFn: async () => (await api.get<Paginated<JournalEntry>>('/journal-entries', { params: { page } })).data,
  })

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await api.get<{ data: Account[] }>('/accounts')).data.data,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/journal-entries', {
        entry_date: entryDate,
        description,
        lines: lines
          .filter((l) => l.account_id)
          .map((l) => ({ account_id: Number(l.account_id), debit: l.debit || 0, credit: l.credit || 0, description: l.description })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      setOpen(false)
      setLines([{ ...emptyLine }, { ...emptyLine }])
      setDescription('')
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const postMutation = useMutation({
    mutationFn: (id: number) => api.post(`/journal-entries/${id}/post`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['journal-entries'] }),
  })

  const voidMutation = useMutation({
    mutationFn: (id: number) => api.post(`/journal-entries/${id}/void`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['journal-entries'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/journal-entries/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['journal-entries'] }),
  })

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const balanced = totalDebit === totalCredit && totalDebit > 0

  const updateLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!balanced) {
      setError(t('journalEntries.mustBalance'))
      return
    }
    createMutation.mutate()
  }

  return (
    <div>
      <PageHeader
        title={t('journalEntries.pageTitle')}
        action={can('finance.manage') && <Button onClick={() => setOpen(true)}><IconPlus size={16} />{t('journalEntries.newEntry')}</Button>}
      />
      <Card>
        {data?.data.length === 0 && !isLoading ? (
          <EmptyState message={t('journalEntries.emptyMessage')} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
              <tr>
                <th className="px-4 py-3">{t('journalEntries.colEntryNumber')}</th>
                <th className="px-4 py-3">{t('journalEntries.colDate')}</th>
                <th className="px-4 py-3">{t('journalEntries.colDescription')}</th>
                <th className="px-4 py-3 text-right">{t('journalEntries.colDebit')}</th>
                <th className="px-4 py-3 text-right">{t('journalEntries.colCredit')}</th>
                <th className="px-4 py-3">{t('journalEntries.colStatus')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && (
                <tr>
                  <td className="px-4 py-6 text-faint" colSpan={7}>{t('common.loading')}</td>
                </tr>
              )}
              {data?.data.map((je) => (
                <tr key={je.id}>
                  <td className="px-4 py-3 font-mono text-subtle">{je.entry_number}</td>
                  <td className="px-4 py-3 text-subtle">{je.entry_date?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-content">{je.description ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-subtle">{je.total_debit}</td>
                  <td className="px-4 py-3 text-right text-subtle">{je.total_credit}</td>
                  <td className="px-4 py-3">
                    <Badge color={statusColor[je.status]}>{t(`status.${je.status}`)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {can('finance.manage') && je.status === 'draft' && (
                      <>
                        <button onClick={() => postMutation.mutate(je.id)} className="text-xs font-medium text-accent-strong hover:underline">
                          {t('journalEntries.post')}
                        </button>
                        <button
                          onClick={() => confirm(t('journalEntries.deleteConfirm')) && deleteMutation.mutate(je.id)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          {t('journalEntries.delete')}
                        </button>
                      </>
                    )}
                    {can('finance.manage') && je.status === 'posted' && (
                      <button
                        onClick={() => confirm(t('journalEntries.voidConfirm')) && voidMutation.mutate(je.id)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        {t('journalEntries.void')}
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

      <Modal open={open} onClose={() => setOpen(false)} title={t('journalEntries.newEntryModalTitle')}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('fields.date')}>
              <Input type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </Field>
            <Field label={t('fields.description')}>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>

          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <Select value={line.account_id} onChange={(e) => updateLine(i, { account_id: e.target.value })}>
                    <option value="">{t('journalEntries.accountPlaceholder')}</option>
                    {accounts?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input type="number" step="0.01" placeholder={t('journalEntries.debitPlaceholder')} value={line.debit} onChange={(e) => updateLine(i, { debit: e.target.value, credit: '' })} />
                </div>
                <div className="col-span-3">
                  <Input type="number" step="0.01" placeholder={t('journalEntries.creditPlaceholder')} value={line.credit} onChange={(e) => updateLine(i, { credit: e.target.value, debit: '' })} />
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  {lines.length > 2 && (
                    <button type="button" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="text-faint hover:text-red-600">
                      <IconClose size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setLines((ls) => [...ls, { ...emptyLine }])} className="inline-flex items-center gap-1 text-xs font-medium text-accent-strong hover:underline">
              <IconPlus size={14} />
              {t('journalEntries.addLine')}
            </button>
          </div>

          <div className={`flex justify-between rounded-md px-3 py-2 text-sm ${balanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <span>{t('journalEntries.debitLabel', { amount: totalDebit.toFixed(2) })}</span>
            <span>{t('journalEntries.creditLabel', { amount: totalCredit.toFixed(2) })}</span>
          </div>

          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending || !balanced} className="w-full">
            {createMutation.isPending ? t('common.saving') : t('journalEntries.saveEntry')}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
