import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Account, Paginated } from '../types'
import { Badge, Button, Card, ErrorText, Field, Input, Modal, PageHeader, Select } from '../components/ui'
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
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }, { ...emptyLine }])
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: async () => (await api.get<Paginated<JournalEntry>>('/journal-entries')).data,
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

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const balanced = totalDebit === totalCredit && totalDebit > 0

  const updateLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!balanced) {
      setError('Total debit must equal total credit before saving.')
      return
    }
    createMutation.mutate()
  }

  return (
    <div>
      <PageHeader
        title="Journal Entries"
        action={can('finance.manage') && <Button onClick={() => setOpen(true)}>+ New Entry</Button>}
      />
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Entry #</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-gray-400" colSpan={7}>Loading…</td>
              </tr>
            )}
            {data?.data.map((je) => (
              <tr key={je.id}>
                <td className="px-4 py-3 font-mono text-gray-600">{je.entry_number}</td>
                <td className="px-4 py-3 text-gray-600">{je.entry_date?.slice(0, 10)}</td>
                <td className="px-4 py-3 text-gray-900">{je.description ?? '—'}</td>
                <td className="px-4 py-3 text-right text-gray-600">{je.total_debit}</td>
                <td className="px-4 py-3 text-right text-gray-600">{je.total_credit}</td>
                <td className="px-4 py-3">
                  <Badge color={statusColor[je.status]}>{je.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {je.status === 'draft' && can('finance.manage') && (
                    <button
                      onClick={() => postMutation.mutate(je.id)}
                      className="text-xs font-medium text-indigo-600 hover:underline"
                    >
                      Post
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New Journal Entry">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date">
              <Input type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </Field>
            <Field label="Description">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>

          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <Select value={line.account_id} onChange={(e) => updateLine(i, { account_id: e.target.value })}>
                    <option value="">Account…</option>
                    {accounts?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input type="number" step="0.01" placeholder="Debit" value={line.debit} onChange={(e) => updateLine(i, { debit: e.target.value, credit: '' })} />
                </div>
                <div className="col-span-3">
                  <Input type="number" step="0.01" placeholder="Credit" value={line.credit} onChange={(e) => updateLine(i, { credit: e.target.value, debit: '' })} />
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  {lines.length > 2 && (
                    <button type="button" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-600">
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setLines((ls) => [...ls, { ...emptyLine }])} className="text-xs font-medium text-indigo-600 hover:underline">
              + Add line
            </button>
          </div>

          <div className={`flex justify-between rounded-md px-3 py-2 text-sm ${balanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <span>Debit: {totalDebit.toFixed(2)}</span>
            <span>Credit: {totalCredit.toFixed(2)}</span>
          </div>

          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending || !balanced} className="w-full">
            {createMutation.isPending ? 'Saving…' : 'Save Entry'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
