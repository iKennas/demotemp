import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, downloadPdf } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Paginated, Supplier } from '../types'
import { Badge, Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Pagination, Select } from '../components/ui'
import { IconChevronStart, IconPlus } from '../components/icons'
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
  const { t } = useTranslation()
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
        title={t('suppliers.pageTitle')}
        action={can('suppliers.manage') && <Button onClick={() => setOpen(true)}><IconPlus size={16} />{t('suppliers.newSupplier')}</Button>}
      />
      <div className="mb-4 max-w-xs">
        <Input placeholder={t('suppliers.searchPlaceholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>
      <Card>
        {data?.data.length === 0 && !isLoading ? (
          <EmptyState message={search ? t('suppliers.emptySearch') : t('suppliers.emptyDefault')} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
              <tr>
                <th className="px-4 py-3">{t('suppliers.colName')}</th>
                <th className="px-4 py-3">{t('suppliers.colEmail')}</th>
                <th className="px-4 py-3">{t('suppliers.colPhone')}</th>
                <th className="px-4 py-3">{t('suppliers.colStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && (
                <tr>
                  <td className="px-4 py-6 text-faint" colSpan={4}>{t('common.loading')}</td>
                </tr>
              )}
              {data?.data.map((s) => (
                <tr key={s.id} className="cursor-pointer hover:bg-muted" onClick={() => setEditing(s)}>
                  <td className="px-4 py-3 font-medium text-content">{s.name}</td>
                  <td className="px-4 py-3 text-subtle">{s.email ?? '—'}</td>
                  <td className="px-4 py-3 text-subtle">{s.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color={s.status === 'active' ? 'green' : 'gray'}>{s.status === 'active' ? t('status.active') : t('status.inactive')}</Badge>
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

      <Modal open={open} onClose={() => setOpen(false)} title={t('suppliers.newSupplierModalTitle')}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t('fields.name')}>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
            {createMutation.isPending ? t('common.saving') : t('suppliers.saveSupplier')}
          </Button>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.name ?? ''}>
        {!showStatement ? (
          <form onSubmit={onEditSubmit} className="space-y-4">
            <Field label={t('fields.name')}>
              <Input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} disabled={!can('suppliers.manage')} />
            </Field>
            <Field label={t('fields.email')}>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} disabled={!can('suppliers.manage')} />
            </Field>
            <Field label={t('fields.phone')}>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} disabled={!can('suppliers.manage')} />
            </Field>
            <Field label={t('fields.status')}>
              <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} disabled={!can('suppliers.manage')}>
                <option value="active">{t('status.active')}</option>
                <option value="inactive">{t('status.inactive')}</option>
              </Select>
            </Field>
            <ErrorText>{error}</ErrorText>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowStatement(true)} className="flex-1">
                {t('suppliers.viewStatement')}
              </Button>
              {can('suppliers.manage') && (
                <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
                  {updateMutation.isPending ? t('common.saving') : t('common.saveChanges')}
                </Button>
              )}
            </div>
          </form>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => setShowStatement(false)} className="inline-flex items-center gap-1 text-xs font-medium text-accent-strong hover:underline">
                <IconChevronStart size={14} />
                {t('suppliers.backToDetails')}
              </button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => downloadPdf(`/suppliers/${editing!.id}/statement/pdf`, `statement-${editing!.name}.pdf`)}
              >
                {t('suppliers.downloadPdf')}
              </Button>
            </div>
            {statementLoading && <p className="text-sm text-faint">{t('common.loading')}</p>}
            {statement && (
              <div className="text-sm">
                <div className="mb-2 flex justify-between text-faint">
                  <span>{t('suppliers.openingBalance')}</span>
                  <span>{fmt(statement.opening_balance)}</span>
                </div>
                <table className="w-full text-left">
                  <thead className="border-b border-line text-xs uppercase text-faint">
                    <tr>
                      <th className="py-1">{t('suppliers.colDate')}</th>
                      <th className="py-1">{t('suppliers.colRef')}</th>
                      <th className="py-1 text-right">{t('suppliers.colAmount')}</th>
                      <th className="py-1 text-right">{t('suppliers.colBalance')}</th>
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
                  <span>{t('suppliers.closingBalance')}</span>
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
