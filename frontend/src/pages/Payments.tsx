import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { BankAccount, Customer, Paginated, Supplier } from '../types'
import { Badge, Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Pagination, Select } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

interface Payment {
  id: number
  payment_number: string
  direction: 'in' | 'out'
  amount: string
  payment_date: string
  method: string
  customer?: Customer
  supplier?: Supplier
}

const empty = { direction: 'in', customer_id: '', supplier_id: '', bank_account_id: '', amount: '', payment_date: new Date().toISOString().slice(0, 10), method: 'cash' }

export default function Payments() {
  const { can } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({ queryKey: ['payments', page], queryFn: async () => (await api.get<Paginated<Payment>>('/payments', { params: { page } })).data })
  const { data: customers } = useQuery({ queryKey: ['customers-all'], queryFn: async () => (await api.get<Paginated<Customer>>('/customers', { params: { per_page: 200 } })).data.data })
  const { data: suppliers } = useQuery({ queryKey: ['suppliers-all'], queryFn: async () => (await api.get<Paginated<Supplier>>('/suppliers', { params: { per_page: 200 } })).data.data })
  const { data: bankAccounts } = useQuery({ queryKey: ['bank-accounts'], queryFn: async () => (await api.get<{ data: BankAccount[] }>('/bank-accounts')).data.data })

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/payments', {
        direction: form.direction,
        customer_id: form.direction === 'in' ? form.customer_id || null : null,
        supplier_id: form.direction === 'out' ? form.supplier_id || null : null,
        bank_account_id: form.bank_account_id || null,
        amount: form.amount,
        payment_date: form.payment_date,
        method: form.method,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      setOpen(false)
      setForm(empty)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/payments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate()
  }

  return (
    <div>
      <PageHeader title={t('payments.pageTitle')} action={can('cash.manage') && <Button onClick={() => setOpen(true)}>{t('payments.recordPayment')}</Button>} />
      <Card>
        {data?.data.length === 0 && !isLoading ? (
          <EmptyState message={t('payments.emptyMessage')} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
              <tr>
                <th className="px-4 py-3">{t('payments.colPaymentNumber')}</th>
                <th className="px-4 py-3">{t('payments.colDirection')}</th>
                <th className="px-4 py-3">{t('payments.colParty')}</th>
                <th className="px-4 py-3">{t('payments.colDate')}</th>
                <th className="px-4 py-3 text-right">{t('payments.colAmount')}</th>
                <th className="px-4 py-3">{t('payments.colMethod')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && <tr><td className="px-4 py-6 text-faint" colSpan={7}>{t('common.loading')}</td></tr>}
              {data?.data.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-mono text-subtle">{p.payment_number}</td>
                  <td className="px-4 py-3"><Badge color={p.direction === 'in' ? 'green' : 'red'}>{p.direction === 'in' ? t('payments.received') : t('payments.paid')}</Badge></td>
                  <td className="px-4 py-3 text-content">{p.customer?.name ?? p.supplier?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-subtle">{p.payment_date?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right text-subtle">{p.amount}</td>
                  <td className="px-4 py-3 capitalize text-subtle">{p.method}</td>
                  <td className="px-4 py-3 text-right">
                    {can('cash.manage') && (
                      <button
                        onClick={() => confirm(t('payments.deleteConfirm')) && deleteMutation.mutate(p.id)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        {t('payments.delete')}
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

      <Modal open={open} onClose={() => setOpen(false)} title={t('payments.recordPaymentModalTitle')}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t('payments.direction')}>
            <Select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
              <option value="in">{t('payments.receivedFromCustomer')}</option>
              <option value="out">{t('payments.paidToSupplier')}</option>
            </Select>
          </Field>
          {form.direction === 'in' ? (
            <Field label={t('payments.customer')}>
              <Select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                <option value="">{t('common.select')}</option>
                {customers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label={t('payments.supplier')}>
              <Select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
                <option value="">{t('common.select')}</option>
                {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label={t('payments.bankAccountLabel')}>
            <Select value={form.bank_account_id} onChange={(e) => setForm({ ...form, bank_account_id: e.target.value })}>
              <option value="">{t('payments.cash')}</option>
              {bankAccounts?.map((b) => <option key={b.id} value={b.id}>{b.account_name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('payments.amount')}>
              <Input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label={t('payments.date')}>
              <Input type="date" required value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
            </Field>
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? t('common.saving') : t('payments.savePayment')}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
