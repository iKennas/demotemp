import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Paginated } from '../types'
import { Badge, Card, EmptyState, PageHeader, Pagination, Select } from '../components/ui'

interface AuditLogEntry {
  id: number
  action: 'created' | 'updated' | 'deleted'
  auditable_type: string
  auditable_id: number
  description: string | null
  changes: Record<string, unknown> | null
  created_at: string
  user: { id: number; name: string; email: string } | null
}

const actionColor: Record<string, string> = { created: 'green', updated: 'blue', deleted: 'red' }

function modelLabel(type: string) {
  return type.split('\\').pop() ?? type
}

export default function AuditLog() {
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', action, page],
    queryFn: async () => (await api.get<Paginated<AuditLogEntry>>('/audit-logs', { params: { action: action || undefined, page } })).data,
  })

  return (
    <div>
      <PageHeader
        title="Audit Log"
        action={
          <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }} className="w-40">
            <option value="">All actions</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="deleted">Deleted</option>
          </Select>
        }
      />
      <Card>
        {isLoading && <p className="p-6 text-sm text-gray-400">Loading…</p>}
        {!isLoading && data?.data.length === 0 && <EmptyState message="No activity yet. Changes made in this company will show up here." />}
        {!isLoading && data && data.data.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Record</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{log.created_at.slice(0, 19).replace('T', ' ')}</td>
                  <td className="px-4 py-3 text-gray-600">{log.user?.name ?? 'System'}</td>
                  <td className="px-4 py-3">
                    <Badge color={actionColor[log.action] ?? 'gray'}>{log.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{modelLabel(log.auditable_type)} #{log.auditable_id}</td>
                  <td className="px-4 py-3 text-gray-900">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {data && <Pagination currentPage={data.current_page} lastPage={data.last_page} total={data.total} perPage={data.per_page} onPageChange={setPage} />}
    </div>
  )
}
