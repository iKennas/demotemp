import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { BankAccount } from '../types'
import { Button, Card, ErrorText, Field, Input, Modal, PageHeader } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

const empty = { account_name: '', bank_name: '', account_number: '', iban: '', opening_balance: '0' }

export default function BankAccounts() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['bank-accounts'], queryFn: async () => (await api.get<{ data: BankAccount[] }>('/bank-accounts')).data.data })

  const createMutation = useMutation({
    mutationFn: () => api.post('/bank-accounts', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      setOpen(false)
      setForm(empty)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate()
  }

  return (
    <div>
      <PageHeader title="Bank Accounts" action={can('cash.manage') && <Button onClick={() => setOpen(true)}>+ New Bank Account</Button>} />
      <Card>
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
              <tr key={b.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{b.account_name}</td>
                <td className="px-4 py-3 text-gray-600">{b.bank_name}</td>
                <td className="px-4 py-3 text-gray-600">{b.account_number ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.iban ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  )
}
