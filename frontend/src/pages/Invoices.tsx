import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Customer, Invoice, InvoiceItem, Paginated, Product, Supplier } from '../types'
import { Badge, Button, Card, ErrorText, Field, Input, Modal, PageHeader, Select } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

const emptyItem: InvoiceItem = { product_id: null, description: '', quantity: 1, unit_price: 0, tax_rate: 15, discount: 0 }
const statusColor: Record<string, string> = { draft: 'gray', sent: 'blue', paid: 'green', partially_paid: 'yellow', overdue: 'red', void: 'red' }

export default function Invoices() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<Invoice | null>(null)
  const [type, setType] = useState<'sales' | 'purchase'>('sales')
  const [partyId, setPartyId] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [items, setItems] = useState<InvoiceItem[]>([{ ...emptyItem }])
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => (await api.get<Paginated<Invoice>>('/invoices')).data,
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

  const downloadPdf = async (id: number, invoiceNumber: string) => {
    const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoiceNumber}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

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
        title="Invoices"
        action={can('invoices.manage') && <Button onClick={() => setOpen(true)}>+ New Invoice</Button>}
      />
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Party</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-gray-400" colSpan={6}>Loading…</td>
              </tr>
            )}
            {data?.data.map((inv) => (
              <tr key={inv.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setViewing(inv)}>
                <td className="px-4 py-3 font-mono text-gray-600">{inv.invoice_number}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{inv.type}</td>
                <td className="px-4 py-3 text-gray-900">{inv.customer?.name ?? inv.supplier?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{inv.issue_date?.slice(0, 10)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{inv.total}</td>
                <td className="px-4 py-3">
                  <Badge color={statusColor[inv.status]}>{inv.status.replace('_', ' ')}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New Invoice">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Type">
              <Select value={type} onChange={(e) => { setType(e.target.value as 'sales' | 'purchase'); setPartyId('') }}>
                <option value="sales">Sales</option>
                <option value="purchase">Purchase</option>
              </Select>
            </Field>
            <Field label={type === 'sales' ? 'Customer' : 'Supplier'}>
              <Select required value={partyId} onChange={(e) => setPartyId(e.target.value)}>
                <option value="">Select…</option>
                {(type === 'sales' ? customers : suppliers)?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Issue Date">
              <Input type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </Field>
          </div>

          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <div className="col-span-4">
                  <Select value={it.product_id ?? ''} onChange={(e) => onSelectProduct(i, e.target.value)}>
                    <option value="">Custom item…</option>
                    {products?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input placeholder="Description" required value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
                </div>
                <div className="col-span-1">
                  <Input type="number" step="0.001" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} />
                </div>
                <div className="col-span-2">
                  <Input type="number" step="0.01" placeholder="Price" value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })} />
                </div>
                <div className="col-span-1">
                  <Input type="number" step="0.01" placeholder="Tax%" value={it.tax_rate} onChange={(e) => updateItem(i, { tax_rate: Number(e.target.value) })} />
                </div>
                <div className="col-span-1 flex items-center justify-end pr-1 text-sm text-gray-600">{lineTotal(it).toFixed(2)}</div>
              </div>
            ))}
            <button type="button" onClick={() => setItems((its) => [...its, { ...emptyItem }])} className="text-xs font-medium text-indigo-600 hover:underline">
              + Add item
            </button>
          </div>

          <div className="flex justify-end border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">Total: {total.toFixed(2)}</div>

          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? 'Saving…' : 'Save Draft Invoice'}
          </Button>
        </form>
      </Modal>

      <Modal
        open={!!viewing}
        onClose={() => {
          setViewing(null)
          setEmailStatus('')
        }}
        title={viewing?.invoice_number ?? ''}
      >
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <Badge color={statusColor[viewing.status]}>{viewing.status.replace('_', ' ')}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Party</span>
              <span>{viewing.customer?.name ?? viewing.supplier?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{viewing.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tax</span>
              <span>{viewing.tax_total}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{viewing.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Paid</span>
              <span>{viewing.paid_amount}</span>
            </div>
            {viewing.zatca_qr_code && (
              <div className="rounded-md bg-gray-50 p-2 text-xs text-gray-500">
                <p className="font-medium text-gray-700">ZATCA QR (base64 TLV)</p>
                <p className="break-all">{viewing.zatca_qr_code}</p>
              </div>
            )}
            {viewing.status === 'draft' && can('invoices.manage') && (
              <Button onClick={() => sendMutation.mutate(viewing.id)} disabled={sendMutation.isPending} className="w-full">
                {sendMutation.isPending ? 'Sending…' : 'Send Invoice'}
              </Button>
            )}
            {viewing.status !== 'draft' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => downloadPdf(viewing.id, viewing.invoice_number)} className="flex-1">
                    Download PDF
                  </Button>
                  {can('invoices.manage') && (
                    <Button
                      variant="secondary"
                      onClick={() => emailMutation.mutate(viewing.id)}
                      disabled={emailMutation.isPending}
                      className="flex-1"
                    >
                      {emailMutation.isPending ? 'Sending…' : 'Email Invoice'}
                    </Button>
                  )}
                </div>
                {emailStatus && <p className="text-xs text-gray-500">{emailStatus}</p>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
