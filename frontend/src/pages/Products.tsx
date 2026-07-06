import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Paginated, Product } from '../types'
import { Badge, Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Pagination, Select } from '../components/ui'
import { IconPlus } from '../components/icons'
import { useAuth } from '../contexts/AuthContext'

const empty = { name: '', type: 'product', sale_price: '', cost_price: '', tax_rate: '15', track_inventory: true, quantity_on_hand: '0' }
const emptyEdit = { name: '', sale_price: '', cost_price: '', tax_rate: '15', reorder_level: '', is_active: true }

export default function Products() {
  const { can } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState(emptyEdit)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, page],
    queryFn: async () => (await api.get<Paginated<Product>>('/products', { params: { search: search || undefined, page } })).data,
  })

  useEffect(() => {
    if (editing) {
      setEditForm({
        name: editing.name,
        sale_price: editing.sale_price,
        cost_price: editing.cost_price,
        tax_rate: editing.tax_rate,
        reorder_level: editing.reorder_level ?? '',
        is_active: editing.is_active,
      })
      setAdjustQty('')
    }
  }, [editing])

  const createMutation = useMutation({
    mutationFn: (payload: typeof empty) => api.post('/products', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setOpen(false)
      setForm(empty)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: typeof emptyEdit) => api.put(`/products/${editing!.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setEditing(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const adjustMutation = useMutation({
    mutationFn: () => api.post(`/products/${editing!.id}/adjust-stock`, { type: adjustType, quantity: adjustQty }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
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

  return (
    <div>
      <PageHeader
        title={t('products.pageTitle')}
        action={can('inventory.manage') && <Button onClick={() => setOpen(true)}><IconPlus size={16} />{t('products.newProduct')}</Button>}
      />
      <div className="mb-4 max-w-xs">
        <Input placeholder={t('products.searchPlaceholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>
      <Card>
        {data?.data.length === 0 && !isLoading ? (
          <EmptyState message={search ? t('products.emptySearch') : t('products.emptyDefault')} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
              <tr>
                <th className="px-4 py-3">{t('products.colName')}</th>
                <th className="px-4 py-3">{t('products.colType')}</th>
                <th className="px-4 py-3">{t('products.colSalePrice')}</th>
                <th className="px-4 py-3">{t('products.colOnHand')}</th>
                <th className="px-4 py-3">{t('products.colStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && (
                <tr>
                  <td className="px-4 py-6 text-faint" colSpan={5}>{t('common.loading')}</td>
                </tr>
              )}
              {data?.data.map((p) => {
                const low = p.track_inventory && p.reorder_level !== null && Number(p.quantity_on_hand) <= Number(p.reorder_level)
                return (
                  <tr key={p.id} className="cursor-pointer hover:bg-muted" onClick={() => setEditing(p)}>
                    <td className="px-4 py-3 font-medium text-content">{p.name}</td>
                    <td className="px-4 py-3 text-subtle">{p.type === 'service' ? t('products.typeService') : t('products.typeProduct')}</td>
                    <td className="px-4 py-3 text-subtle">{p.sale_price}</td>
                    <td className="px-4 py-3 text-subtle">{p.track_inventory ? p.quantity_on_hand : '—'}</td>
                    <td className="px-4 py-3">
                      {low ? <Badge color="red">{t('products.lowStock')}</Badge> : <Badge color={p.is_active ? 'green' : 'gray'}>{p.is_active ? t('status.active') : t('status.inactive')}</Badge>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {data && (
          <Pagination currentPage={data.current_page} lastPage={data.last_page} total={data.total} perPage={data.per_page} onPageChange={setPage} />
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t('products.newProductModalTitle')}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t('fields.name')}>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t('fields.type')}>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="product">{t('products.typeProduct')}</option>
              <option value="service">{t('products.typeService')}</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('products.salePrice')}>
              <Input type="number" step="0.01" required value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
            </Field>
            <Field label={t('products.costPrice')}>
              <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('products.taxRatePercent')}>
              <Input type="number" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} />
            </Field>
            {form.type === 'product' && (
              <Field label={t('products.openingQuantity')}>
                <Input type="number" step="0.001" value={form.quantity_on_hand} onChange={(e) => setForm({ ...form, quantity_on_hand: e.target.value })} />
              </Field>
            )}
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? t('common.saving') : t('products.saveProduct')}
          </Button>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.name ?? ''}>
        {editing && (
          <div className="space-y-6">
            <form onSubmit={onEditSubmit} className="space-y-4">
              <Field label={t('fields.name')}>
                <Input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} disabled={!can('inventory.manage')} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('products.salePrice')}>
                  <Input type="number" step="0.01" value={editForm.sale_price} onChange={(e) => setEditForm({ ...editForm, sale_price: e.target.value })} disabled={!can('inventory.manage')} />
                </Field>
                <Field label={t('products.costPrice')}>
                  <Input type="number" step="0.01" value={editForm.cost_price} onChange={(e) => setEditForm({ ...editForm, cost_price: e.target.value })} disabled={!can('inventory.manage')} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('products.taxRatePercent')}>
                  <Input type="number" step="0.01" value={editForm.tax_rate} onChange={(e) => setEditForm({ ...editForm, tax_rate: e.target.value })} disabled={!can('inventory.manage')} />
                </Field>
                <Field label={t('products.reorderLevel')}>
                  <Input type="number" step="0.001" placeholder={t('common.none')} value={editForm.reorder_level} onChange={(e) => setEditForm({ ...editForm, reorder_level: e.target.value })} disabled={!can('inventory.manage')} />
                </Field>
              </div>
              <Field label={t('fields.status')}>
                <Select value={editForm.is_active ? '1' : '0'} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === '1' })} disabled={!can('inventory.manage')}>
                  <option value="1">{t('status.active')}</option>
                  <option value="0">{t('status.inactive')}</option>
                </Select>
              </Field>
              <ErrorText>{error}</ErrorText>
              {can('inventory.manage') && (
                <Button type="submit" disabled={updateMutation.isPending} className="w-full">
                  {updateMutation.isPending ? t('common.saving') : t('products.saveChanges')}
                </Button>
              )}
            </form>

            {editing.track_inventory && can('inventory.manage') && (
              <div className="border-t border-line pt-4">
                <p className="mb-2 text-sm font-medium text-subtle">{t('products.adjustStockTitle', { qty: editing.quantity_on_hand })}</p>
                <div className="flex gap-2">
                  <Select value={adjustType} onChange={(e) => setAdjustType(e.target.value as 'in' | 'out')} className="w-28">
                    <option value="in">{t('products.add')}</option>
                    <option value="out">{t('products.remove')}</option>
                  </Select>
                  <Input type="number" step="0.001" placeholder={t('products.quantityPlaceholder')} value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!adjustQty || adjustMutation.isPending}
                    onClick={() => adjustMutation.mutate()}
                  >
                    {t('products.apply')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
