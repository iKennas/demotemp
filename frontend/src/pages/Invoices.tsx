import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, downloadPdf } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Customer, Invoice, InvoiceItem, Paginated, Product, Supplier } from '../types'
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorText, Field, FilterBar, Input, LoadingState, Modal, PageHeader, Pagination, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow, invoiceStatusColor } from '../components/ui'
import { IconPlus } from '../components/icons'
import { useAuth } from '../contexts/AuthContext'

const emptyItem: InvoiceItem = { product_id: null, description: '', quantity: 1, unit_price: 0, tax_rate: 15, discount: 0 }
const statusKey: Record<string, string> = { draft: 'draft', sent: 'sent', paid: 'paid', partially_paid: 'partiallyPaid', overdue: 'overdue', void: 'void' }

export default function Invoices() {
  const { can } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<Invoice | null>(null)
  const [type, setType] = useState<'sales' | 'purchase'>('sales')
  const [partyId, setPartyId] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [items, setItems] = useState<InvoiceItem[]>([{ ...emptyItem }])
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'void'; id: number } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, page],
    queryFn: async () => (await api.get<Paginated<Invoice>>('/invoices', { params: { status: statusFilter || undefined, page } })).data,
  })

  const { data: customers } = useQuery({
    queryKey: ['customers-all'],
    queryFn: async () => (await api.get<Paginated<Customer>>('/customers', { params: { per_page: 200 } })).data.data,
  })
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: async () => (await api.get<Paginated<Supplier>>('/suppliers', { params: { per_page: 200 } })).data.data,
  })
  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => (await api.get<Paginated<Product>>('/products', { params: { per_page: 200 } })).data.data,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/invoices', {
        type,
        customer_id: type === 'sales' ? partyId : null,
        supplier_id: type === 'purchase' ? partyId : null,
        issue_date: issueDate,
        items,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setOpen(false)
      setItems([{ ...emptyItem }])
      setPartyId('')
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const sendMutation = useMutation({
    mutationFn: (id: number) => api.post(`/invoices/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setViewing(null)
    },
  })

  const [emailStatus, setEmailStatus] = useState('')
  const emailMutation = useMutation({
    mutationFn: (id: number) => api.post(`/invoices/${id}/email`),
    onSuccess: (res) => setEmailStatus(res.data.message),
    onError: (err) => setEmailStatus(apiErrorMessage(err)),
  })

  const voidMutation = useMutation({
    mutationFn: (id: number) => api.post(`/invoices/${id}/void`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setViewing(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setViewing(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const downloadInvoicePdf = (id: number, invoiceNumber: string) => downloadPdf(`/invoices/${id}/pdf`, `${invoiceNumber}.pdf`)

  const updateItem = (i: number, patch: Partial<InvoiceItem>) => setItems((its) => its.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const onSelectProduct = (i: number, productId: string) => {
    const product = products?.find((p) => p.id === Number(productId))
    updateItem(i, {
      product_id: product?.id ?? null,
      description: product?.name ?? '',
      unit_price: product ? Number(product.sale_price) : 0,
      tax_rate: product ? Number(product.tax_rate) : 15,
    })
  }

  const lineTotal = (it: InvoiceItem) => {
    const gross = it.quantity * it.unit_price - it.discount
    return gross + gross * (it.tax_rate / 100)
  }
  const total = items.reduce((s, it) => s + lineTotal(it), 0)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate()
  }

  return (
    <div>
      <PageHeader
        title={t('invoices.pageTitle')}
        action={can('invoices.manage') && <Button onClick={() => setOpen(true)}><IconPlus size={16} />{t('invoices.newInvoice')}</Button>}
      />
      <FilterBar>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="">{t('invoices.allStatuses')}</option>
            <option value="draft">{t('status.draft')}</option>
            <option value="sent">{t('status.sent')}</option>
            <option value="partially_paid">{t('status.partiallyPaid')}</option>
            <option value="paid">{t('status.paid')}</option>
            <option value="overdue">{t('status.overdue')}</option>
            <option value="void">{t('status.void')}</option>
          </Select>
      </FilterBar>
      <Card>
        {data?.data.length === 0 && !isLoading ? (
          <EmptyState message={statusFilter ? t('invoices.emptyStatus') : t('invoices.emptyDefault')} />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>{t('invoices.colInvoiceNumber')}</TableHeaderCell>
                  <TableHeaderCell>{t('invoices.colType')}</TableHeaderCell>
                  <TableHeaderCell>{t('invoices.colParty')}</TableHeaderCell>
                  <TableHeaderCell>{t('invoices.colDate')}</TableHeaderCell>
                  <TableHeaderCell className="text-end">{t('invoices.colTotal')}</TableHeaderCell>
                  <TableHeaderCell>{t('invoices.colStatus')}</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <LoadingState />
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((inv) => (
                  <TableRow key={inv.id} onClick={() => setViewing(inv)}>
                    <TableCell className="font-mono text-subtle">{inv.invoice_number}</TableCell>
                    <TableCell className="text-subtle">{inv.type === 'sales' ? t('invoices.typeSales') : t('invoices.typePurchase')}</TableCell>
                    <TableCell className="text-content">{inv.customer?.name ?? inv.supplier?.name ?? '—'}</TableCell>
                    <TableCell className="text-subtle">{inv.issue_date?.slice(0, 10)}</TableCell>
                    <TableCell className="text-end text-subtle">{inv.total}</TableCell>
                    <TableCell>
                      <Badge color={invoiceStatusColor[inv.status]}>{t(`status.${statusKey[inv.status]}`)}</Badge>
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

      <Modal open={open} onClose={() => setOpen(false)} title={t('invoices.newInvoiceModalTitle')} size="xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={t('fields.type')}>
              <Select value={type} onChange={(e) => { setType(e.target.value as 'sales' | 'purchase'); setPartyId('') }}>
                <option value="sales">{t('invoices.typeSales')}</option>
                <option value="purchase">{t('invoices.typePurchase')}</option>
              </Select>
            </Field>
            <Field label={type === 'sales' ? t('invoices.customer') : t('invoices.supplier')}>
              <Select required value={partyId} onChange={(e) => setPartyId(e.target.value)}>
                <option value="">{t('common.select')}</option>
                {(type === 'sales' ? customers : suppliers)?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('invoices.issueDate')}>
              <Input type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </Field>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-faint">{t('invoices.lineItems')}</p>
            {items.map((it, i) => (
              <div key={i} className="space-y-3 rounded-lg border border-line bg-muted/40 p-3 sm:space-y-0 sm:p-2">
                <Field label={t('invoices.customItem')}>
                  <Select value={it.product_id ?? ''} onChange={(e) => onSelectProduct(i, e.target.value)}>
                    <option value="">{t('invoices.customItem')}</option>
                    {products?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('invoices.descriptionPlaceholder')}>
                  <Input placeholder={t('invoices.descriptionPlaceholder')} required value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Field label={t('invoices.qtyPlaceholder')}>
                    <Input type="number" step="0.001" placeholder="1" value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} />
                  </Field>
                  <Field label={t('invoices.pricePlaceholder')}>
                    <Input type="number" step="0.01" placeholder="0.00" value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })} />
                  </Field>
                  <Field label={t('invoices.taxPlaceholder')}>
                    <Input type="number" step="0.01" placeholder="15" value={it.tax_rate} onChange={(e) => updateItem(i, { tax_rate: Number(e.target.value) })} />
                  </Field>
                  <div className="flex flex-col justify-end">
                    <span className="mb-1.5 block text-sm font-medium text-subtle">{t('invoices.colTotal')}</span>
                    <p className="py-2 text-sm font-semibold text-content">{lineTotal(it).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setItems((its) => [...its, { ...emptyItem }])} className="inline-flex items-center gap-1 text-xs font-medium text-accent-strong hover:underline">
              <IconPlus size={14} />
              {t('invoices.addItem')}
            </button>
          </div>

          <div className="flex justify-end border-t border-line pt-3 text-base font-semibold text-content">{t('invoices.total', { amount: total.toFixed(2) })}</div>

          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? t('common.saving') : t('invoices.saveDraft')}
          </Button>
        </form>
      </Modal>

      <Modal
        open={!!viewing}
        onClose={() => {
          setViewing(null)
          setEmailStatus('')
          setError('')
        }}
        title={viewing?.invoice_number ?? ''}
      >
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-faint">{t('invoices.status')}</span>
              <Badge color={invoiceStatusColor[viewing.status]}>{t(`status.${statusKey[viewing.status]}`)}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-faint">{t('invoices.party')}</span>
              <span>{viewing.customer?.name ?? viewing.supplier?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-faint">{t('invoices.subtotal')}</span>
              <span>{viewing.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-faint">{t('invoices.tax')}</span>
              <span>{viewing.tax_total}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>{t('invoices.colTotal')}</span>
              <span>{viewing.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-faint">{t('invoices.paid')}</span>
              <span>{viewing.paid_amount}</span>
            </div>
            {viewing.zatca_qr_code && (
              <div className="rounded-md bg-muted p-2 text-xs text-faint">
                <p className="font-medium text-subtle">{t('invoices.zatcaQr')}</p>
                <p className="break-all">{viewing.zatca_qr_code}</p>
              </div>
            )}
            {viewing.status === 'draft' && can('invoices.manage') && (
              <div className="space-y-2">
                <Button onClick={() => sendMutation.mutate(viewing.id)} disabled={sendMutation.isPending} className="w-full">
                  {sendMutation.isPending ? t('invoices.sending') : t('invoices.sendInvoice')}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setConfirmAction({ type: 'delete', id: viewing.id })}
                  disabled={deleteMutation.isPending}
                  className="w-full"
                >
                  {t('invoices.deleteDraft')}
                </Button>
              </div>
            )}
            {viewing.status === 'sent' && Number(viewing.paid_amount) === 0 && can('invoices.manage') && (
              <Button
                variant="danger"
                onClick={() => setConfirmAction({ type: 'void', id: viewing.id })}
                disabled={voidMutation.isPending}
                className="w-full"
              >
                {voidMutation.isPending ? t('invoices.voiding') : t('invoices.voidInvoice')}
              </Button>
            )}
            {viewing.status !== 'draft' && (
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="secondary" onClick={() => downloadInvoicePdf(viewing.id, viewing.invoice_number)} className="flex-1">
                    {t('invoices.downloadPdf')}
                  </Button>
                  {can('invoices.manage') && (
                    <Button
                      variant="secondary"
                      onClick={() => emailMutation.mutate(viewing.id)}
                      disabled={emailMutation.isPending}
                      className="flex-1"
                    >
                      {emailMutation.isPending ? t('invoices.sending') : t('invoices.emailInvoice')}
                    </Button>
                  )}
                </div>
                {emailStatus && <p className="text-xs text-faint">{emailStatus}</p>}
              </div>
            )}
            <ErrorText>{error}</ErrorText>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.type === 'delete' ? t('invoices.deleteDraft') : t('invoices.voidInvoice')}
        message={confirmAction?.type === 'delete' ? t('invoices.deleteDraftConfirm') : t('invoices.voidConfirm')}
        confirmLabel={confirmAction?.type === 'delete' ? t('common.delete') : t('invoices.voidInvoice')}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return
          if (confirmAction.type === 'delete') deleteMutation.mutate(confirmAction.id)
          else voidMutation.mutate(confirmAction.id)
          setConfirmAction(null)
        }}
      />
    </div>
  )
}
