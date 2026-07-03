import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, downloadPdf } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Customer, Invoice, InvoiceItem, Paginated, Product, Supplier } from '../types'
import { Badge, Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Pagination, Select } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

const emptyItem: InvoiceItem = { product_id: null, description: '', quantity: 1, unit_price: 0, tax_rate: 15, discount: 0 }
const statusColor: Record<string, string> = { draft: 'gray', sent: 'blue', paid: 'green', partially_paid: 'yellow', overdue: 'red', void: 'red' }
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
        action={can('invoices.manage') && <Button onClick={() => setOpen(true)}>{t('invoices.newInvoice')}</Button>}
      />
      <div className="mb-4 max-w-xs">
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">{t('invoices.allStatuses')}</option>
          <option value="draft">{t('status.draft')}</option>
          <option value="sent">{t('status.sent')}</option>
          <option value="partially_paid">{t('status.partiallyPaid')}</option>
          <option value="paid">{t('status.paid')}</option>
          <option value="overdue">{t('status.overdue')}</option>
          <option value="void">{t('status.void')}</option>
        </Select>
      </div>
      <Card>
        {data?.data.length === 0 && !isLoading ? (
          <EmptyState message={statusFilter ? t('invoices.emptyStatus') : t('invoices.emptyDefault')} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
              <tr>
                <th className="px-4 py-3">{t('invoices.colInvoiceNumber')}</th>
                <th className="px-4 py-3">{t('invoices.colType')}</th>
                <th className="px-4 py-3">{t('invoices.colParty')}</th>
                <th className="px-4 py-3">{t('invoices.colDate')}</th>
                <th className="px-4 py-3 text-right">{t('invoices.colTotal')}</th>
                <th className="px-4 py-3">{t('invoices.colStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && (
                <tr>
                  <td className="px-4 py-6 text-faint" colSpan={6}>{t('common.loading')}</td>
                </tr>
              )}
              {data?.data.map((inv) => (
                <tr key={inv.id} className="cursor-pointer hover:bg-muted" onClick={() => setViewing(inv)}>
                  <td className="px-4 py-3 font-mono text-subtle">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-subtle">{inv.type === 'sales' ? t('invoices.typeSales') : t('invoices.typePurchase')}</td>
                  <td className="px-4 py-3 text-content">{inv.customer?.name ?? inv.supplier?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-subtle">{inv.issue_date?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right text-subtle">{inv.total}</td>
                  <td className="px-4 py-3">
                    <Badge color={statusColor[inv.status]}>{t(`status.${statusKey[inv.status]}`)}</Badge>
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

      <Modal open={open} onClose={() => setOpen(false)} title={t('invoices.newInvoiceModalTitle')}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
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
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <div className="col-span-4">
                  <Select value={it.product_id ?? ''} onChange={(e) => onSelectProduct(i, e.target.value)}>
                    <option value="">{t('invoices.customItem')}</option>
                    {products?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input placeholder={t('invoices.descriptionPlaceholder')} required value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
                </div>
                <div className="col-span-1">
                  <Input type="number" step="0.001" placeholder={t('invoices.qtyPlaceholder')} value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} />
                </div>
                <div className="col-span-2">
                  <Input type="number" step="0.01" placeholder={t('invoices.pricePlaceholder')} value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })} />
                </div>
                <div className="col-span-1">
                  <Input type="number" step="0.01" placeholder={t('invoices.taxPlaceholder')} value={it.tax_rate} onChange={(e) => updateItem(i, { tax_rate: Number(e.target.value) })} />
                </div>
                <div className="col-span-1 flex items-center justify-end pr-1 text-sm text-subtle">{lineTotal(it).toFixed(2)}</div>
              </div>
            ))}
            <button type="button" onClick={() => setItems((its) => [...its, { ...emptyItem }])} className="text-xs font-medium text-accent hover:underline">
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
              <Badge color={statusColor[viewing.status]}>{t(`status.${statusKey[viewing.status]}`)}</Badge>
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
                  onClick={() => confirm(t('invoices.deleteDraftConfirm')) && deleteMutation.mutate(viewing.id)}
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
                onClick={() => confirm(t('invoices.voidConfirm')) && voidMutation.mutate(viewing.id)}
                disabled={voidMutation.isPending}
                className="w-full"
              >
                {voidMutation.isPending ? t('invoices.voiding') : t('invoices.voidInvoice')}
              </Button>
            )}
            {viewing.status !== 'draft' && (
              <div className="space-y-2">
                <div className="flex gap-2">
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
    </div>
  )
}
