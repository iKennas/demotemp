import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { BankAccount } from '../types'
import { Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Select } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

const empty = { account_name: '', bank_name: '', account_number: '', iban: '', opening_balance: '0' }
const emptyEdit = { account_name: '', bank_name: '', account_number: '', iban: '', is_active: true }

export default function BankAccounts() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<BankAccount | null>(null)
  const [editForm, setEditForm] = useState(emptyEdit)

  const { data, isLoading } = useQuery({ queryKey: ['bank-accounts'], queryFn: async () => (await api.get<{ data: BankAccount[] }>('/bank-accounts')).data.data })

  const { data: detail } = useQuery({
    queryKey: ['bank-account', editing?.id],
    queryFn: async () => (await api.get<{ data: BankAccount; balance: number }>(`/bank-accounts/${editing!.id}`)).data,
    enabled: !!editing,
  })

  useEffect(() => {
    if (editing) {
      setEditForm({
        account_name: editing.account_name,
        bank_name: editing.bank_name,
        account_number: editing.account_number ?? '',
        iban: editing.iban ?? '',
        is_active: editing.is_active,
      })
    }
  }, [editing])

  const createMutation = useMutation({
    mutationFn: () => api.post('/bank-accounts', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      setOpen(false)
      setForm(empty)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: () => api.put(`/bank-accounts/${editing!.id}`, editForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      setEditing(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/bank-accounts/${editing!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      setEditing(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate()
  }

  const onEditSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    updateMutation.mutate()
  }

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2 })

  return (
    <div>
      <PageHeader title="Bank Accounts" action={can('cash.manage') && <Button onClick={() => setOpen(true)}>+ New Bank Account</Button>} />
      <Card>
        {(!data || data.length === 0) && !isLoading ? (
          <EmptyState message="No bank accounts yet." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Account Name</th>
                <th className="px-4 py-3">Bank</th>
                <th className="px-4 py-3">Account Number</th>
                <th className="px-4 py-3">IBAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td className="px-4 py-6 text-gray-400" colSpan={4}>Loading…</td></tr>}
              {data?.map((b) => (
                <tr key={b.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setEditing(b)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{b.account_name}</td>
                  <td className="px-4 py-3 text-gray-600">{b.bank_name}</td>
                  <td className="px-4 py-3 text-gray-600">{b.account_number ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.iban ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New Bank Account">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Account Name">
            <Input required value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
          </Field>
          <Field label="Bank Name">
            <Input required value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
          </Field>
          <Field label="Account Number">
            <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
          </Field>
          <Field label="IBAN">
            <Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} />
          </Field>
          <Field label="Opening Balance">
            <Input type="number" step="0.01" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? 'Saving…' : 'Save Bank Account'}
          </Button>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => { setEditing(null); setError('') }} title={editing?.account_name ?? ''}>
        {editing && (
          <form onSubmit={onEditSubmit} className="space-y-4">
            {detail && (
              <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                Current balance: <span className="font-medium text-gray-900">{fmt(detail.balance)}</span>
              </div>
            )}
            <Field label="Account Name">
              <Input required value={editForm.account_name} onChange={(e) => setEditForm({ ...editForm, account_name: e.target.value })} disabled={!can('cash.manage')} />
            </Field>
            <Field label="Bank Name">
              <Input required value={editForm.bank_name} onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })} disabled={!can('cash.manage')} />
            </Field>
            <Field label="Account Number">
              <Input value={editForm.account_number} onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })} disabled={!can('cash.manage')} />
            </Field>
            <Field label="IBAN">
              <Input value={editForm.iban} onChange={(e) => setEditForm({ ...editForm, iban: e.target.value })} disabled={!can('cash.manage')} />
            </Field>
            <Field label="Status">
              <Select value={editForm.is_active ? '1' : '0'} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === '1' })} disabled={!can('cash.manage')}>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </Select>
            </Field>
            <ErrorText>{error}</ErrorText>
            {can('cash.manage') && (
              <div className="flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
                  {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => confirm('Delete this bank account?') && deleteMutation.mutate()}
                >
                  Delete
                </Button>
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  )
}
