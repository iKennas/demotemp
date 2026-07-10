import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, downloadPdf } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Customer, Paginated } from '../types'
import { Badge, Button, Card, EmptyState, ErrorText, Field, FilterBar, Input, LoadingState, Modal, PageHeader, Pagination, SearchInput, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from '../components/ui'
import { IconChevronStart, IconPlus } from '../components/icons'
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
            <Button onClick={() => setOpen(true)}><IconPlus size={16} />{t('customers.newCustomer')}</Button>
          )
        }
      />
      <FilterBar>
        <SearchInput placeholder={t('customers.searchPlaceholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </FilterBar>
      <Card>
        {data?.data.length === 0 && !isLoading ? (
          <EmptyState message={search ? t('customers.emptySearch') : t('customers.emptyDefault')} />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>{t('customers.colName')}</TableHeaderCell>
                  <TableHeaderCell>{t('customers.colType')}</TableHeaderCell>
                  <TableHeaderCell>{t('customers.colEmail')}</TableHeaderCell>
                  <TableHeaderCell>{t('customers.colPhone')}</TableHeaderCell>
                  <TableHeaderCell>{t('customers.colStatus')}</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <LoadingState />
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((c) => (
                  <TableRow key={c.id} onClick={() => setEditing(c)}>
                    <TableCell className="font-medium text-content">{c.name}</TableCell>
                    <TableCell className="text-subtle">{c.type === 'company' ? t('customers.typeCompany') : t('customers.typeIndividual')}</TableCell>
                    <TableCell className="text-subtle">{c.email ?? '—'}</TableCell>
                    <TableCell className="text-subtle">{c.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge color={c.status === 'active' ? 'green' : 'gray'}>{c.status === 'active' ? t('status.active') : t('status.inactive')}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
            <div className="flex flex-col gap-2 sm:flex-row">
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
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button onClick={() => setShowStatement(false)} className="inline-flex items-center gap-1 text-xs font-medium text-accent-strong hover:underline">
                <IconChevronStart size={14} />
                {t('customers.backToDetails')}
              </button>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
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
                <TableContainer>
                <table className="w-full min-w-[36rem] text-start">
                  <thead className="border-b border-line text-xs uppercase text-faint">
                    <tr>
                      <th className="py-1">{t('customers.colDate')}</th>
                      <th className="py-1">{t('customers.colRef')}</th>
                      <th className="py-1 text-end">{t('customers.colAmount')}</th>
                      <th className="py-1 text-end">{t('customers.colBalance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {statement.data.map((line, i) => (
                      <tr key={i}>
                        <td className="py-1.5">{line.date.slice(0, 10)}</td>
                        <td className="py-1.5">{line.reference}</td>
                        <td className="py-1.5 text-end">{fmt(line.amount)}</td>
                        <td className="py-1.5 text-end">{fmt(line.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </TableContainer>
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
