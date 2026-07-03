import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Company, Paginated, Plan } from '../types'
import { Badge, Card, PageHeader, Select } from '../components/ui'

function CompaniesTab() {
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
      <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
        <tr>
          <th className="px-4 py-3">Company</th>
          <th className="px-4 py-3">Plan</th>
          <th className="px-4 py-3">Users</th>
          <th className="px-4 py-3">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {isLoading && <tr><td className="px-4 py-6 text-gray-400" colSpan={4}>Loading…</td></tr>}
        {data?.data.map((c) => (
          <tr key={c.id}>
            <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
            <td className="px-4 py-3 text-gray-600">{c.plan?.name ?? '—'}</td>
            <td className="px-4 py-3 text-gray-600">{c.users_count}</td>
            <td className="px-4 py-3">
              <Select
                value={c.status}
                onChange={(e) => updateStatus.mutate({ id: c.id, status: e.target.value })}
                className="w-32"
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </Select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PlansTab() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-plans'], queryFn: async () => (await api.get<{ data: Plan[] }>('/admin/plans')).data.data })

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
        <tr>
          <th className="px-4 py-3">Name</th>
          <th className="px-4 py-3">Price</th>
          <th className="px-4 py-3">Billing</th>
          <th className="px-4 py-3">Max Users</th>
          <th className="px-4 py-3">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {isLoading && <tr><td className="px-4 py-6 text-gray-400" colSpan={5}>Loading…</td></tr>}
        {data?.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
            <td className="px-4 py-3 text-gray-600">{p.price}</td>
            <td className="px-4 py-3 capitalize text-gray-600">{p.billing_cycle}</td>
            <td className="px-4 py-3 text-gray-600">{p.max_users ?? 'Unlimited'}</td>
            <td className="px-4 py-3"><Badge color={p.is_active ? 'green' : 'gray'}>{p.is_active ? 'Active' : 'Inactive'}</Badge></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function Admin() {
  const [tab, setTab] = useState<'companies' | 'plans'>('companies')

  return (
    <div>
      <PageHeader
        title="Platform Admin"
        action={
          <Select value={tab} onChange={(e) => setTab(e.target.value as 'companies' | 'plans')} className="w-40">
            <option value="companies">Companies</option>
            <option value="plans">Plans</option>
          </Select>
        }
      />
      <Card>{tab === 'companies' ? <CompaniesTab /> : <PlansTab />}</Card>
    </div>
  )
}
