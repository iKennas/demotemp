import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { BankAccount } from '../types'
import { Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Select, TableContainer } from '../components/ui'
import { IconPlus } from '../components/icons'
import { useAuth } from '../contexts/AuthContext'

const empty = { account_name: '', bank_name: '', account_number: '', iban: '', opening_balance: '0' }
const emptyEdit = { account_name: '', bank_name: '', account_number: '', iban: '', is_active: true }

export default function BankAccounts() {
  const { can } = useAuth()
  const { t } = useTranslation()
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
      <PageHeader title={t('bankAccounts.pageTitle')} action={can('cash.manage') && <Button onClick={() => setOpen(true)}><IconPlus size={16} />{t('bankAccounts.newBankAccount')}</Button>} />
      <Card>
        {(!data || data.length === 0) && !isLoading ? (
          <EmptyState message={t('bankAccounts.emptyMessage')} />
        ) : (
          <TableContainer>
          <table className="w-full min-w-[36rem] text-start text-sm">
            <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
              <tr>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3">{t('bankAccounts.colAccountName')}</th>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3">{t('bankAccounts.colBank')}</th>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3">{t('bankAccounts.colAccountNumber')}</th>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3">{t('bankAccounts.colIban')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && <tr><td className="px-3 py-6 text-faint sm:px-4" colSpan={4}>{t('common.loading')}</td></tr>}
              {data?.map((b) => (
                <tr key={b.id} className="cursor-pointer hover:bg-muted" onClick={() => setEditing(b)}>
                  <td className="px-3 py-2.5 font-medium text-content sm:px-4 sm:py-3">{b.account_name}</td>
                  <td className="px-3 py-2.5 text-subtle sm:px-4 sm:py-3">{b.bank_name}</td>
                  <td className="px-3 py-2.5 text-subtle sm:px-4 sm:py-3">{b.account_number ?? '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-subtle sm:px-4 sm:py-3">{b.iban ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableContainer>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t('bankAccounts.newBankAccountModalTitle')}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t('bankAccounts.accountName')}>
            <Input required value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
          </Field>
          <Field label={t('bankAccounts.bankName')}>
            <Input required value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
          </Field>
          <Field label={t('bankAccounts.accountNumber')}>
            <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
          </Field>
          <Field label={t('bankAccounts.iban')}>
            <Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} />
          </Field>
          <Field label={t('bankAccounts.openingBalance')}>
            <Input type="number" step="0.01" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? t('common.saving') : t('bankAccounts.saveBankAccount')}
          </Button>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => { setEditing(null); setError('') }} title={editing?.account_name ?? ''}>
        {editing && (
          <form onSubmit={onEditSubmit} className="space-y-4">
            {detail && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm text-subtle">
                {t('bankAccounts.currentBalance')} <span className="font-medium text-content">{fmt(detail.balance)}</span>
              </div>
            )}
            <Field label={t('bankAccounts.accountName')}>
              <Input required value={editForm.account_name} onChange={(e) => setEditForm({ ...editForm, account_name: e.target.value })} disabled={!can('cash.manage')} />
            </Field>
            <Field label={t('bankAccounts.bankName')}>
              <Input required value={editForm.bank_name} onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })} disabled={!can('cash.manage')} />
            </Field>
            <Field label={t('bankAccounts.accountNumber')}>
              <Input value={editForm.account_number} onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })} disabled={!can('cash.manage')} />
            </Field>
            <Field label={t('bankAccounts.iban')}>
              <Input value={editForm.iban} onChange={(e) => setEditForm({ ...editForm, iban: e.target.value })} disabled={!can('cash.manage')} />
            </Field>
            <Field label={t('bankAccounts.status')}>
              <Select value={editForm.is_active ? '1' : '0'} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === '1' })} disabled={!can('cash.manage')}>
                <option value="1">{t('status.active')}</option>
                <option value="0">{t('status.inactive')}</option>
              </Select>
            </Field>
            <ErrorText>{error}</ErrorText>
            {can('cash.manage') && (
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
                  {updateMutation.isPending ? t('common.saving') : t('bankAccounts.saveChanges')}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => confirm(t('bankAccounts.deleteConfirm')) && deleteMutation.mutate()}
                >
                  {t('bankAccounts.delete')}
                </Button>
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  )
}
