import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Account, Paginated } from '../types'
import { Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Pagination, Select } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

interface Expense {
  id: number
  expense_number: string
  category: string | null
  amount: string
  expense_date: string
  account?: Account
}

const empty = { account_id: '', category: '', amount: '', expense_date: new Date().toISOString().slice(0, 10), description: '' }

export default function Expenses() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({ queryKey: ['expenses', page], queryFn: async () => (await api.get<Paginated<Expense>>('/expenses', { params: { page } })).data })
  const { data: accounts } = useQuery({
    queryKey: ['accounts-expense'],
    queryFn: async () => (await api.get<{ data: Account[] }>('/accounts', { params: { type: 'expense' } })).data.data,
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/expenses', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setOpen(false)
      setForm(empty)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/expenses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate()
  }

  return (
    <div>
      <PageHeader title="Expenses" action={can('cash.manage') && <Button onClick={() => setOpen(true)}>+ Record Expense</Button>} />
      <Card>
        {data?.data.length === 0 && !isLoading ? (
          <EmptyState message="No expenses recorded yet." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
              <tr>
                <th className="px-4 py-3">Expense #</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && <tr><td className="px-4 py-6 text-faint" colSpan={6}>Loading…</td></tr>}
              {data?.data.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-mono text-subtle">{e.expense_number}</td>
                  <td className="px-4 py-3 text-content">{e.account?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-subtle">{e.category ?? '—'}</td>
                  <td className="px-4 py-3 text-subtle">{e.expense_date?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right text-subtle">{e.amount}</td>
                  <td className="px-4 py-3 text-right">
                    {can('cash.manage') && (
                      <button
                        onClick={() => confirm('Delete this expense? This reverses its journal entry.') && deleteMutation.mutate(e.id)}
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

      <Modal open={open} onClose={() => setOpen(false)} title="Record Expense">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Expense Account">
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
              <Input type="date" required value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            </Field>
          </div>
          <Field label="Description">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? 'Saving…' : 'Save Expense'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
