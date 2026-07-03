import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Customer, Paginated } from '../types'
import { Badge, Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Pagination, Select } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

const empty = { name: '', type: 'individual', email: '', phone: '', tax_number: '', status: 'active' }

interface StatementLine {
  date: string
  type: 'invoice' | 'payment'
  reference: string
  amount: number
  balance: number
}

export default function Customers() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Customer | null>(null)
  const [editForm, setEditForm] = useState(empty)
  const [showStatement, setShowStatement] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: async () => (await api.get<Paginated<Customer>>('/customers', { params: { search: search || undefined, page } })).data,
  })

  const { data: statement, isLoading: statementLoading } = useQuery({
    queryKey: ['customer-statement', editing?.id],
    queryFn: async () => (await api.get<{ data: StatementLine[]; opening_balance: number; closing_balance: number }>(`/customers/${editing!.id}/statement`)).data,
    enabled: showStatement && !!editing,
  })

  useEffect(() => {
    if (editing) {
      setEditForm({
        name: editing.name,
        type: editing.type,
        email: editing.email ?? '',
        phone: editing.phone ?? '',
        tax_number: '',
        status: editing.status,
      })
      setShowStatement(false)
    }
  }, [editing])

  const createMutation = useMutation({
    mutationFn: (payload: typeof empty) => api.post('/customers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setOpen(false)
      setForm(empty)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: typeof empty) => api.put(`/customers/${editing!.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
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
        title="Customers"
        action={
          can('customers.manage') && (
            <Button onClick={() => setOpen(true)}>+ New Customer</Button>
          )
        }
      />
      <div className="mb-4 max-w-xs">
        <Input placeholder="Search customers…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>
      <Card>
        {data?.data.length === 0 && !isLoading ? (
          <EmptyState message={search ? 'No customers match your search.' : 'No customers yet.'} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td className="px-4 py-6 text-gray-400" colSpan={5}>Loading…</td>
                </tr>
              )}
              {data?.data.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setEditing(c)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{c.type}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color={c.status === 'active' ? 'green' : 'gray'}>{c.status}</Badge>
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

      <Modal open={open} onClose={() => setOpen(false)} title="New Customer">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="individual">Individual</option>
              <option value="company">Company</option>
            </Select>
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
            {createMutation.isPending ? 'Saving…' : 'Save Customer'}
          </Button>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.name ?? ''}>
        {!showStatement ? (
          <form onSubmit={onEditSubmit} className="space-y-4">
            <Field label="Name">
              <Input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} disabled={!can('customers.manage')} />
            </Field>
            <Field label="Type">
              <Select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} disabled={!can('customers.manage')}>
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </Select>
            </Field>
            <Field label="Email">
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} disabled={!can('customers.manage')} />
            </Field>
            <Field label="Phone">
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} disabled={!can('customers.manage')} />
            </Field>
            <Field label="Status">
              <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} disabled={!can('customers.manage')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            <ErrorText>{error}</ErrorText>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowStatement(true)} className="flex-1">
                View Statement
              </Button>
              {can('customers.manage') && (
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
