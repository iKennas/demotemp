import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Account, Paginated } from '../types'
import { Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Pagination, Select } from '../components/ui'
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
      <PageHeader title="Revenues" action={can('cash.manage') && <Button onClick={() => setOpen(true)}>+ Record Revenue</Button>} />
      <Card>
        {data?.data.length === 0 && !isLoading ? (
          <EmptyState message="No revenues recorded yet." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
              <tr>
                <th className="px-4 py-3">Revenue #</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && <tr><td className="px-4 py-6 text-faint" colSpan={6}>Loading…</td></tr>}
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
                        onClick={() => confirm('Delete this revenue? This reverses its journal entry.') && deleteMutation.mutate(r.id)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
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

      <Modal open={open} onClose={() => setOpen(false)} title="Record Revenue">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Revenue Account">
            <Select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
              <option value="">Select…</option>
              {accounts?.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
            </Select>
          </Field>
          <Field label="Category">
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount">
              <Input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label="Date">
              <Input type="date" required value={form.revenue_date} onChange={(e) => setForm({ ...form, revenue_date: e.target.value })} />
            </Field>
          </div>
          <Field label="Description">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? 'Saving…' : 'Save Revenue'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
