import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', action, page],
    queryFn: async () => (await api.get<Paginated<AuditLogEntry>>('/audit-logs', { params: { action: action || undefined, page } })).data,
  })

  return (
    <div>
      <PageHeader
        title={t('auditLog.pageTitle')}
        action={
          <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }} className="w-40">
            <option value="">{t('auditLog.allActions')}</option>
            <option value="created">{t('auditLog.created')}</option>
            <option value="updated">{t('auditLog.updated')}</option>
            <option value="deleted">{t('auditLog.deleted')}</option>
          </Select>
        }
      />
      <Card>
        {isLoading && <p className="p-6 text-sm text-faint">{t('common.loading')}</p>}
        {!isLoading && data?.data.length === 0 && <EmptyState message={t('auditLog.emptyMessage')} />}
        {!isLoading && data && data.data.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
              <tr>
                <th className="px-4 py-3">{t('auditLog.colWhen')}</th>
                <th className="px-4 py-3">{t('auditLog.colUser')}</th>
                <th className="px-4 py-3">{t('auditLog.colAction')}</th>
                <th className="px-4 py-3">{t('auditLog.colRecord')}</th>
                <th className="px-4 py-3">{t('auditLog.colDescription')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.data.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-subtle">{log.created_at.slice(0, 19).replace('T', ' ')}</td>
                  <td className="px-4 py-3 text-subtle">{log.user?.name ?? t('auditLog.system')}</td>
                  <td className="px-4 py-3">
                    <Badge color={actionColor[log.action] ?? 'gray'}>{t(`auditLog.${log.action}`)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-subtle">{modelLabel(log.auditable_type)} #{log.auditable_id}</td>
                  <td className="px-4 py-3 text-content">{log.description}</td>
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
