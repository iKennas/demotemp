import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Account } from '../types'
import { Badge, Button, Card, ErrorText, Field, Input, Modal, PageHeader, Select } from '../components/ui'
import { IconPlus } from '../components/icons'
import { useAuth } from '../contexts/AuthContext'

const empty = { code: '', name: '', type: 'asset', normal_balance: 'debit' }
const typeColors: Record<string, string> = { asset: 'blue', liability: 'red', equity: 'yellow', revenue: 'green', expense: 'gray' }

export default function Accounts() {
  const { can } = useAuth()
  const { t } = useTranslation()
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
        title={t('accounts.pageTitle')}
        action={can('finance.manage') && <Button onClick={() => setOpen(true)}><IconPlus size={16} />{t('accounts.newAccount')}</Button>}
      />
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
            <tr>
              <th className="px-4 py-3">{t('accounts.colCode')}</th>
              <th className="px-4 py-3">{t('accounts.colName')}</th>
              <th className="px-4 py-3">{t('accounts.colType')}</th>
              <th className="px-4 py-3">{t('accounts.colNormalBalance')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-faint" colSpan={4}>{t('common.loading')}</td>
              </tr>
            )}
            {data?.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-mono text-subtle">{a.code}</td>
                <td className="px-4 py-3 font-medium text-content">
                  {a.name} {a.is_system && <span className="ml-1 text-xs text-faint">({t('common.system')})</span>}
                </td>
                <td className="px-4 py-3">
                  <Badge color={typeColors[a.type]}>{t(`accounts.type${a.type.charAt(0).toUpperCase()}${a.type.slice(1)}`)}</Badge>
                </td>
                <td className="px-4 py-3 capitalize text-subtle">{a.normal_balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t('accounts.newAccountModalTitle')}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('fields.code')}>
              <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label={t('fields.name')}>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
          </div>
          <Field label={t('fields.type')}>
            <Select
              value={form.type}
              onChange={(e) => {
                const type = e.target.value
                const normal_balance = type === 'asset' || type === 'expense' ? 'debit' : 'credit'
                setForm({ ...form, type, normal_balance })
              }}
            >
              <option value="asset">{t('accounts.typeAsset')}</option>
              <option value="liability">{t('accounts.typeLiability')}</option>
              <option value="equity">{t('accounts.typeEquity')}</option>
              <option value="revenue">{t('accounts.typeRevenue')}</option>
              <option value="expense">{t('accounts.typeExpense')}</option>
            </Select>
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? t('common.saving') : t('accounts.saveAccount')}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
