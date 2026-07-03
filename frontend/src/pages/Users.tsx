import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { apiErrorMessage } from '../api/errors'
import type { Paginated, User } from '../types'
import { Badge, Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Pagination, Select } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

const ROLES = ['Company Owner', 'Accountant', 'Employee']
const empty = { name: '', email: '', password: '', role: 'Employee' }
const emptyEdit = { name: '', is_active: true, role: 'Employee' }

export default function Users() {
  const { can, user: me } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<User | null>(null)
  const [editForm, setEditForm] = useState(emptyEdit)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({ queryKey: ['users', page], queryFn: async () => (await api.get<Paginated<User>>('/users', { params: { page } })).data })

  useEffect(() => {
    if (editing) {
      setEditForm({
        name: editing.name,
        is_active: editing.is_active,
        role: editing.roles?.[0]?.name ?? 'Employee',
      })
    }
  }, [editing])

  const createMutation = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setOpen(false)
      setForm(empty)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: () => api.put(`/users/${editing!.id}`, editForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditing(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: () => api.delete(`/users/${editing!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditing(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate()
  }

  const onEditSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    updateMutation.mutate()
  }

  return (
    <div>
      <PageHeader title={t('users.pageTitle')} action={can('users.manage') && <Button onClick={() => setOpen(true)}>{t('users.inviteTeammate')}</Button>} />
      <Card>
        {data?.data.length === 0 && !isLoading ? (
          <EmptyState message={t('users.emptyMessage')} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted text-xs uppercase text-faint">
              <tr>
                <th className="px-4 py-3">{t('users.colName')}</th>
                <th className="px-4 py-3">{t('users.colEmail')}</th>
                <th className="px-4 py-3">{t('users.colRole')}</th>
                <th className="px-4 py-3">{t('users.colStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && <tr><td className="px-4 py-6 text-faint" colSpan={4}>{t('common.loading')}</td></tr>}
              {data?.data.map((u) => (
                <tr
                  key={u.id}
                  className={can('users.manage') ? 'cursor-pointer hover:bg-muted' : ''}
                  onClick={() => can('users.manage') && setEditing(u)}
                >
                  <td className="px-4 py-3 font-medium text-content">
                    {u.name} {u.id === me?.id && <span className="text-xs text-faint">{t('users.you')}</span>}
                  </td>
                  <td className="px-4 py-3 text-subtle">{u.email}</td>
                  <td className="px-4 py-3 text-subtle">{u.roles?.map((r) => r.name).join(', ') ?? '—'}</td>
                  <td className="px-4 py-3"><Badge color={u.is_active ? 'green' : 'gray'}>{u.is_active ? t('status.active') : t('status.inactive')}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && (
          <Pagination currentPage={data.current_page} lastPage={data.last_page} total={data.total} perPage={data.per_page} onPageChange={setPage} />
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t('users.inviteModalTitle')}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t('fields.name')}>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t('fields.email')}>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label={t('users.temporaryPassword')}>
            <Input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label={t('users.role')}>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? t('users.inviting') : t('users.invite')}
          </Button>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => { setEditing(null); setError('') }} title={editing?.name ?? ''}>
        {editing && (
          <form onSubmit={onEditSubmit} className="space-y-4">
            <Field label={t('fields.name')}>
              <Input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </Field>
            <Field label={t('users.role')}>
              <Select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label={t('fields.status')}>
              <Select value={editForm.is_active ? '1' : '0'} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === '1' })}>
                <option value="1">{t('status.active')}</option>
                <option value="0">{t('status.inactive')}</option>
              </Select>
            </Field>
            <ErrorText>{error}</ErrorText>
            <div className="flex gap-2">
              <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
                {updateMutation.isPending ? t('common.saving') : t('users.saveChanges')}
              </Button>
              {editing.id !== me?.id && (
                <Button
                  type="button"
                  variant="danger"
                  disabled={removeMutation.isPending}
                  onClick={() => confirm(t('users.removeConfirm', { name: editing.name })) && removeMutation.mutate()}
                >
                  {t('users.remove')}
                </Button>
              )}
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
