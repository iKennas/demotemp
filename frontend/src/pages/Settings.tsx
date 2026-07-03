import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Company, Plan } from '../types'
import { Badge, Button, Card, ErrorText, Field, Input, PageHeader } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

interface Subscription {
  id: number
  status: string
  starts_at: string
  ends_at: string | null
  trial_ends_at: string | null
}

const statusColor: Record<string, string> = { active: 'green', trial: 'blue', suspended: 'red', paused: 'yellow', expired: 'red', cancelled: 'gray' }

function BillingCard() {
  const { can } = useAuth()
  const [checkoutError, setCheckoutError] = useState('')

  const { data } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => (await api.get<{ data: Subscription | null; plan: Plan | null; company_status: string }>('/subscription')).data,
    enabled: can('settings.view'),
  })

  const checkoutMutation = useMutation({
    mutationFn: () => api.post('/subscription/checkout'),
    onError: (err) => setCheckoutError(apiErrorMessage(err)),
  })

  if (!can('settings.view')) return null

  return (
    <Card className="max-w-xl p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Subscription & Billing</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Plan</span>
          <span className="font-medium">{data?.plan?.name ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Price</span>
          <span className="font-medium">{data?.plan ? `${data.plan.price} SAR / ${data.plan.billing_cycle}` : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>
          {data?.data ? <Badge color={statusColor[data.data.status] ?? 'gray'}>{data.data.status}</Badge> : <span>—</span>}
        </div>
        {data?.data?.trial_ends_at && (
          <div className="flex justify-between">
            <span className="text-gray-500">Trial ends</span>
            <span className="font-medium">{data.data.trial_ends_at.slice(0, 10)}</span>
          </div>
        )}
      </div>
      {can('settings.manage') && (
        <div className="mt-4">
          <Button variant="secondary" disabled={checkoutMutation.isPending} onClick={() => { setCheckoutError(''); checkoutMutation.mutate() }}>
            {checkoutMutation.isPending ? 'Starting checkout…' : 'Manage Billing'}
          </Button>
          <ErrorText>{checkoutError}</ErrorText>
        </div>
      )}
    </Card>
  )
}

export default function Settings() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: '', legal_name: '', tax_number: '', email: '', phone: '', address: '', city: '' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const { data } = useQuery({
    queryKey: ['company'],
    queryFn: async () => (await api.get<{ data: Company }>('/company')).data.data,
  })

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name ?? '',
        legal_name: data.legal_name ?? '',
        tax_number: data.tax_number ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        address: '',
        city: '',
      })
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: () => api.put('/company', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    updateMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Company Settings" />
      <Card className="max-w-xl p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Company Name">
            <Input required disabled={!can('settings.manage')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Legal Name">
            <Input disabled={!can('settings.manage')} value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
          </Field>
          <Field label="Tax Number (VAT)">
            <Input disabled={!can('settings.manage')} value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <Input type="email" disabled={!can('settings.manage')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input disabled={!can('settings.manage')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
            Plan: <span className="font-medium">{data?.plan?.name ?? '—'}</span> · Status: <span className="font-medium capitalize">{data?.status}</span>
          </div>
          <ErrorText>{error}</ErrorText>
          {can('settings.manage') && (
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
            </Button>
          )}
        </form>
      </Card>

      <BillingCard />
    </div>
  )
}
