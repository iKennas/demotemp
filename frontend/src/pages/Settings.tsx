import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Company, Plan } from '../types'
import { Badge, Button, Card, ErrorText, Field, Input, PageHeader } from '../components/ui'
import { IconCheck } from '../components/icons'
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
  const { t } = useTranslation()
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
      <h2 className="mb-4 text-lg font-semibold text-content">{t('settings.subscriptionBilling')}</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-faint">{t('settings.planLabel')}</span>
          <span className="font-medium">{data?.plan?.name ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-faint">{t('settings.price')}</span>
          <span className="font-medium">{data?.plan ? `${data.plan.price} SAR / ${data.plan.billing_cycle === 'yearly' ? t('admin.billingYearly') : t('admin.billingMonthly')}` : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-faint">{t('settings.statusLabel')}</span>
          {data?.data ? <Badge color={statusColor[data.data.status] ?? 'gray'}>{t(`status.${data.data.status}`)}</Badge> : <span>—</span>}
        </div>
        {data?.data?.trial_ends_at && (
          <div className="flex justify-between">
            <span className="text-faint">{t('settings.trialEnds')}</span>
            <span className="font-medium">{data.data.trial_ends_at.slice(0, 10)}</span>
          </div>
        )}
      </div>
      {can('settings.manage') && (
        <div className="mt-4">
          <Button variant="secondary" disabled={checkoutMutation.isPending} onClick={() => { setCheckoutError(''); checkoutMutation.mutate() }}>
            {checkoutMutation.isPending ? t('settings.startingCheckout') : t('settings.manageBilling')}
          </Button>
          <ErrorText>{checkoutError}</ErrorText>
        </div>
      )}
    </Card>
  )
}

function LogoCard({ company }: { company?: Company }) {
  const { can } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let objectUrl: string | null = null
    if (company?.logo_path) {
      api.get('/company/logo', { responseType: 'blob' }).then((res) => {
        objectUrl = URL.createObjectURL(res.data)
        setPreview(objectUrl)
      })
    } else {
      setPreview(null)
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [company?.logo_path])

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('logo', file)
      return api.post('/company/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] })
      if (fileInput.current) fileInput.current.value = ''
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    uploadMutation.mutate(file)
  }

  if (!can('settings.view')) return null

  return (
    <Card className="max-w-xl p-6">
      <h2 className="mb-4 text-lg font-semibold text-content">{t('settings.companyLogo')}</h2>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-32 items-center justify-center rounded-md border border-dashed border-line bg-muted">
          {preview ? (
            <img src={preview} alt={t('settings.companyLogo')} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-faint">{t('settings.noLogo')}</span>
          )}
        </div>
        {can('settings.manage') && (
          <div>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={onFileChange} className="hidden" id="logo-upload" />
            <Button type="button" variant="secondary" disabled={uploadMutation.isPending} onClick={() => fileInput.current?.click()}>
              {uploadMutation.isPending ? t('settings.uploading') : t('settings.uploadLogo')}
            </Button>
            <p className="mt-1 text-xs text-faint">{t('settings.logoHint')}</p>
          </div>
        )}
      </div>
      <ErrorText>{error}</ErrorText>
    </Card>
  )
}

export default function Settings() {
  const { can } = useAuth()
  const { t } = useTranslation()
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
      <PageHeader title={t('settings.pageTitle')} />
      <Card className="max-w-xl p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t('settings.companyName')}>
            <Input required disabled={!can('settings.manage')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t('settings.legalName')}>
            <Input disabled={!can('settings.manage')} value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
          </Field>
          <Field label={t('settings.taxNumberVat')}>
            <Input disabled={!can('settings.manage')} value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('settings.email')}>
              <Input type="email" disabled={!can('settings.manage')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label={t('settings.phone')}>
              <Input disabled={!can('settings.manage')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <div className="rounded-md bg-muted px-3 py-2 text-sm text-subtle">
            {t('settings.plan')} <span className="font-medium">{data?.plan?.name ?? '—'}</span> · {t('settings.status')} <span className="font-medium">{data?.status ? t(`status.${data.status}`) : ''}</span>
          </div>
          <ErrorText>{error}</ErrorText>
          {can('settings.manage') && (
            <Button type="submit" disabled={updateMutation.isPending}>
              {saved && <IconCheck size={16} />}
              {updateMutation.isPending ? t('common.saving') : saved ? t('settings.saved') : t('settings.saveChanges')}
            </Button>
          )}
        </form>
      </Card>

      <LogoCard company={data} />
      <BillingCard />
    </div>
  )
}
