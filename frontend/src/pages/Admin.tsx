import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import type { Company, Paginated, Plan } from '../types'
import { Badge, Card, PageHeader, Select } from '../components/ui'

function CompaniesTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: async () => (await api.get<Paginated<Company & { users_count: number }>>('/admin/companies')).data,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.put(`/admin/companies/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-companies'] }),
  })

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
        <tr>
          <th className="px-4 py-3">{t('admin.colCompany')}</th>
          <th className="px-4 py-3">{t('admin.colPlan')}</th>
          <th className="px-4 py-3">{t('admin.colUsers')}</th>
          <th className="px-4 py-3">{t('admin.colStatus')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {isLoading && <tr><td className="px-4 py-6 text-faint" colSpan={4}>{t('common.loading')}</td></tr>}
        {data?.data.map((c) => (
          <tr key={c.id}>
            <td className="px-4 py-3 font-medium text-content">{c.name}</td>
            <td className="px-4 py-3 text-subtle">{c.plan?.name ?? '—'}</td>
            <td className="px-4 py-3 text-subtle">{c.users_count}</td>
            <td className="px-4 py-3">
              <Select
                value={c.status}
                onChange={(e) => updateStatus.mutate({ id: c.id, status: e.target.value })}
                className="w-32"
              >
                <option value="trial">{t('status.trial')}</option>
                <option value="active">{t('status.active')}</option>
                <option value="suspended">{t('status.suspended')}</option>
              </Select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PlansTab() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({ queryKey: ['admin-plans'], queryFn: async () => (await api.get<{ data: Plan[] }>('/admin/plans')).data.data })

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
        <tr>
          <th className="px-4 py-3">{t('admin.colName')}</th>
          <th className="px-4 py-3">{t('admin.colPrice')}</th>
          <th className="px-4 py-3">{t('admin.colBilling')}</th>
          <th className="px-4 py-3">{t('admin.colMaxUsers')}</th>
          <th className="px-4 py-3">{t('admin.colStatus')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {isLoading && <tr><td className="px-4 py-6 text-faint" colSpan={5}>{t('common.loading')}</td></tr>}
        {data?.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3 font-medium text-content">{p.name}</td>
            <td className="px-4 py-3 text-subtle">{p.price}</td>
            <td className="px-4 py-3 text-subtle">{p.billing_cycle === 'yearly' ? t('admin.billingYearly') : t('admin.billingMonthly')}</td>
            <td className="px-4 py-3 text-subtle">{p.max_users ?? t('common.unlimited')}</td>
            <td className="px-4 py-3"><Badge color={p.is_active ? 'green' : 'gray'}>{p.is_active ? t('status.active') : t('status.inactive')}</Badge></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function Admin() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'companies' | 'plans'>('companies')

  return (
    <div>
      <PageHeader
        title={t('admin.pageTitle')}
        action={
          <Select value={tab} onChange={(e) => setTab(e.target.value as 'companies' | 'plans')} className="w-40">
            <option value="companies">{t('admin.companies')}</option>
            <option value="plans">{t('admin.plans')}</option>
          </Select>
        }
      />
      <Card>{tab === 'companies' ? <CompaniesTab /> : <PlansTab />}</Card>
    </div>
  )
}
