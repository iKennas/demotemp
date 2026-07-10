import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import logoIcon from '../assets/logo-icon.png'
import { useAuth } from '../contexts/AuthContext'
import { apiErrorMessage } from '../api/errors'
import { Button, Card, ErrorText, Field, Input, LocaleThemeControls } from '../components/ui'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
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
    <div className="flex min-h-screen flex-col bg-app">
      <div className="flex justify-end p-4">
        <LocaleThemeControls compact />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-8">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <img src={logoIcon} alt="" className="h-9 w-9 object-contain" />
          <div>
            <h1 className="text-lg font-semibold leading-tight text-content">{t('auth.registerTitle')}</h1>
            <p className="text-sm leading-tight text-faint">{t('auth.registerSubtitle')}</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t('auth.companyName')}>
            <Input required value={form.company_name} onChange={set('company_name')} />
          </Field>
          <Field label={t('auth.yourName')}>
            <Input required value={form.owner_name} onChange={set('owner_name')} />
          </Field>
          <Field label={t('auth.email')}>
            <Input type="email" required value={form.owner_email} onChange={set('owner_email')} />
          </Field>
          <Field label={t('auth.password')}>
            <Input type="password" required minLength={8} value={form.owner_password} onChange={set('owner_password')} />
          </Field>
          <Field label={t('auth.confirmPassword')}>
            <Input
              type="password"
              required
              value={form.owner_password_confirmation}
              onChange={set('owner_password_confirmation')}
            />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? t('auth.creatingAccount') : t('auth.createAccount')}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-faint">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="font-medium text-accent-strong hover:underline">
            {t('auth.signInLink')}
          </Link>
        </p>
      </Card>
      </div>
    </div>
  )
}
