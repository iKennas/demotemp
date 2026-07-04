import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, downloadPdf } from '../api/client'
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
  const { t } = useTranslation()
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
        title={t('customers.pageTitle')}
        action={
          can('customers.manage') && (
            <Button onClick={() => setOpen(true)}>{t('customers.newCustomer')}</Button>
          )
        }
      />
      <div className="mb-4 max-w-xs">
        <Input placeholder={t('customers.searchPlaceholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>
      <Card>
        {data?.data.length === 0 && !isLoading ? (
          <EmptyState message={search ? t('customers.emptySearch') : t('customers.emptyDefault')} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
              <tr>
                <th className="px-4 py-3">{t('customers.colName')}</th>
                <th className="px-4 py-3">{t('customers.colType')}</th>
                <th className="px-4 py-3">{t('customers.colEmail')}</th>
                <th className="px-4 py-3">{t('customers.colPhone')}</th>
                <th className="px-4 py-3">{t('customers.colStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && (
                <tr>
                  <td className="px-4 py-6 text-faint" colSpan={5}>{t('common.loading')}</td>
                </tr>
              )}
              {data?.data.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-muted" onClick={() => setEditing(c)}>
                  <td className="px-4 py-3 font-medium text-content">{c.name}</td>
                  <td className="px-4 py-3 text-subtle">{c.type === 'company' ? t('customers.typeCompany') : t('customers.typeIndividual')}</td>
                  <td className="px-4 py-3 text-subtle">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-subtle">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color={c.status === 'active' ? 'green' : 'gray'}>{c.status === 'active' ? t('status.active') : t('status.inactive')}</Badge>
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

      <Modal open={open} onClose={() => setOpen(false)} title={t('customers.newCustomerModalTitle')}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t('fields.name')}>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t('fields.type')}>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="individual">{t('customers.typeIndividual')}</option>
              <option value="company">{t('customers.typeCompany')}</option>
            </Select>
          </Field>
          <Field label={t('fields.email')}>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label={t('fields.phone')}>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label={t('fields.taxNumber')}>
            <Input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? t('common.saving') : t('customers.saveCustomer')}
          </Button>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.name ?? ''}>
        {!showStatement ? (
          <form onSubmit={onEditSubmit} className="space-y-4">
            <Field label={t('fields.name')}>
              <Input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} disabled={!can('customers.manage')} />
            </Field>
            <Field label={t('fields.type')}>
              <Select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} disabled={!can('customers.manage')}>
                <option value="individual">{t('customers.typeIndividual')}</option>
                <option value="company">{t('customers.typeCompany')}</option>
              </Select>
            </Field>
            <Field label={t('fields.email')}>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} disabled={!can('customers.manage')} />
            </Field>
            <Field label={t('fields.phone')}>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} disabled={!can('customers.manage')} />
            </Field>
            <Field label={t('fields.status')}>
              <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} disabled={!can('customers.manage')}>
                <option value="active">{t('status.active')}</option>
                <option value="inactive">{t('status.inactive')}</option>
              </Select>
            </Field>
            <ErrorText>{error}</ErrorText>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowStatement(true)} className="flex-1">
                {t('customers.viewStatement')}
              </Button>
              {can('customers.manage') && (
                <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
                  {updateMutation.isPending ? t('common.saving') : t('common.saveChanges')}
                </Button>
              )}
            </div>
          </form>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => setShowStatement(false)} className="text-xs font-medium text-accent-strong hover:underline">
                {t('customers.backToDetails')}
              </button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => downloadPdf(`/customers/${editing!.id}/statement/pdf`, `statement-${editing!.name}.pdf`)}
              >
                {t('customers.downloadPdf')}
              </Button>
            </div>
            {statementLoading && <p className="text-sm text-faint">{t('common.loading')}</p>}
            {statement && (
              <div className="text-sm">
                <div className="mb-2 flex justify-between text-faint">
                  <span>{t('customers.openingBalance')}</span>
                  <span>{fmt(statement.opening_balance)}</span>
                </div>
                <table className="w-full text-left">
                  <thead className="border-b border-line text-xs uppercase text-faint">
                    <tr>
                      <th className="py-1">{t('customers.colDate')}</th>
                      <th className="py-1">{t('customers.colRef')}</th>
                      <th className="py-1 text-right">{t('customers.colAmount')}</th>
                      <th className="py-1 text-right">{t('customers.colBalance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
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
                <div className="mt-2 flex justify-between border-t border-line pt-2 font-semibold">
                  <span>{t('customers.closingBalance')}</span>
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
