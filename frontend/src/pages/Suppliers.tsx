import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Paginated, Supplier } from '../types'
import { Badge, Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Pagination, Select } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

const empty = { name: '', email: '', phone: '', tax_number: '', status: 'active' }

interface StatementLine {
  date: string
  type: 'invoice' | 'payment'
  reference: string
  amount: number
  balance: number
}

export default function Suppliers() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [editForm, setEditForm] = useState(empty)
  const [showStatement, setShowStatement] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search, page],
    queryFn: async () => (await api.get<Paginated<Supplier>>('/suppliers', { params: { search: search || undefined, page } })).data,
  })

  const { data: statement, isLoading: statementLoading } = useQuery({
    queryKey: ['supplier-statement', editing?.id],
    queryFn: async () => (await api.get<{ data: StatementLine[]; opening_balance: number; closing_balance: number }>(`/suppliers/${editing!.id}/statement`)).data,
    enabled: showStatement && !!editing,
  })

  useEffect(() => {
    if (editing) {
      setEditForm({ name: editing.name, email: editing.email ?? '', phone: editing.phone ?? '', tax_number: '', status: editing.status })
      setShowStatement(false)
    }
  }, [editing])

  const createMutation = useMutation({
    mutationFn: (payload: typeof empty) => api.post('/suppliers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setOpen(false)
      setForm(empty)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: typeof empty) => api.put(`/suppliers/${editing!.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setEditing(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate(form)
  }

  const onEditSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    updateMutation.mutate(editForm)
  }

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2 })

  return (
    <div>
      <PageHeader
        title="Suppliers"
        action={can('suppliers.manage') && <Button onClick={() => setOpen(true)}>+ New Supplier</Button>}
      />
      <div className="mb-4 max-w-xs">
        <Input placeholder="Search suppliers…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>
      <Card>
        {data?.data.length === 0 && !isLoading ? (
          <EmptyState message={search ? 'No suppliers match your search.' : 'No suppliers yet.'} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td className="px-4 py-6 text-gray-400" colSpan={4}>Loading…</td>
                </tr>
              )}
              {data?.data.map((s) => (
                <tr key={s.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setEditing(s)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color={s.status === 'active' ? 'green' : 'gray'}>{s.status}</Badge>
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

      <Modal open={open} onClose={() => setOpen(false)} title="New Supplier">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Tax Number">
            <Input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? 'Saving…' : 'Save Supplier'}
          </Button>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.name ?? ''}>
        {!showStatement ? (
          <form onSubmit={onEditSubmit} className="space-y-4">
            <Field label="Name">
              <Input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} disabled={!can('suppliers.manage')} />
            </Field>
            <Field label="Email">
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} disabled={!can('suppliers.manage')} />
            </Field>
            <Field label="Phone">
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} disabled={!can('suppliers.manage')} />
            </Field>
            <Field label="Status">
              <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} disabled={!can('suppliers.manage')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            <ErrorText>{error}</ErrorText>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowStatement(true)} className="flex-1">
                View Statement
              </Button>
              {can('suppliers.manage') && (
                <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
                  {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              )}
            </div>
          </form>
        ) : (
          <div>
            <button onClick={() => setShowStatement(false)} className="mb-3 text-xs font-medium text-indigo-600 hover:underline">
              ← Back to details
            </button>
            {statementLoading && <p className="text-sm text-gray-400">Loading…</p>}
            {statement && (
              <div className="text-sm">
                <div className="mb-2 flex justify-between text-gray-500">
                  <span>Opening balance</span>
                  <span>{fmt(statement.opening_balance)}</span>
                </div>
                <table className="w-full text-left">
                  <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="py-1">Date</th>
                      <th className="py-1">Ref</th>
                      <th className="py-1 text-right">Amount</th>
                      <th className="py-1 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {statement.data.map((line, i) => (
                      <tr key={i}>
                        <td className="py-1.5">{line.date.slice(0, 10)}</td>
                        <td className="py-1.5">{line.reference}</td>
                        <td className="py-1.5 text-right">{fmt(line.amount)}</td>
                        <td className="py-1.5 text-right">{fmt(line.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold">
                  <span>Closing balance</span>
                  <span>{fmt(statement.closing_balance)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
