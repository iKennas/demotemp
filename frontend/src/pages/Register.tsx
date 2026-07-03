import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiErrorMessage } from '../api/errors'
import { Button, Card, ErrorText, Field, Input } from '../components/ui'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    company_name: '',
    owner_name: '',
    owner_email: '',
    owner_password: '',
    owner_password_confirmation: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <Card className="w-full max-w-md p-8">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Set up your company</h1>
        <p className="mb-6 text-sm text-gray-500">Start your 14-day free trial on URS.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Company name">
            <Input required value={form.company_name} onChange={set('company_name')} />
          </Field>
          <Field label="Your name">
            <Input required value={form.owner_name} onChange={set('owner_name')} />
          </Field>
          <Field label="Email">
            <Input type="email" required value={form.owner_email} onChange={set('owner_email')} />
          </Field>
          <Field label="Password">
            <Input type="password" required minLength={8} value={form.owner_password} onChange={set('owner_password')} />
          </Field>
          <Field label="Confirm password">
            <Input
              type="password"
              required
              value={form.owner_password_confirmation}
              onChange={set('owner_password_confirmation')}
            />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Creating your account…' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  )
}
