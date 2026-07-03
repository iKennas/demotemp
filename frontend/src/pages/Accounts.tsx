import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Account } from '../types'
import { Badge, Button, Card, ErrorText, Field, Input, Modal, PageHeader, Select } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

const empty = { code: '', name: '', type: 'asset', normal_balance: 'debit' }
const typeColors: Record<string, string> = { asset: 'blue', liability: 'red', equity: 'yellow', revenue: 'green', expense: 'gray' }

export default function Accounts() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await api.get<{ data: Account[] }>('/accounts')).data.data,
  })

  const createMutation = useMutation({
    mutationFn: (payload: typeof empty) => api.post('/accounts', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setOpen(false)
      setForm(empty)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate(form)
  }

  return (
    <div>
      <PageHeader
        title="Chart of Accounts"
        action={can('finance.manage') && <Button onClick={() => setOpen(true)}>+ New Account</Button>}
      />
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Normal Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-gray-400" colSpan={4}>Loading…</td>
              </tr>
            )}
            {data?.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-mono text-gray-600">{a.code}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {a.name} {a.is_system && <span className="ml-1 text-xs text-gray-400">(system)</span>}
                </td>
                <td className="px-4 py-3">
                  <Badge color={typeColors[a.type]}>{a.type}</Badge>
                </td>
                <td className="px-4 py-3 capitalize text-gray-600">{a.normal_balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New Account">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code">
              <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label="Name">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
          </div>
          <Field label="Type">
            <Select
              value={form.type}
              onChange={(e) => {
                const type = e.target.value
                const normal_balance = type === 'asset' || type === 'expense' ? 'debit' : 'credit'
                setForm({ ...form, type, normal_balance })
              }}
            >
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </Select>
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? 'Saving…' : 'Save Account'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
