import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import logoIcon from '../assets/logo-icon.png'
import { useAuth } from '../contexts/AuthContext'
import { apiErrorMessage } from '../api/errors'
import { Button, Card, ErrorText, Field, Input } from '../components/ui'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <img src={logoIcon} alt="" className="h-9 w-9 object-contain" />
          <div>
            <h1 className="text-lg font-semibold leading-tight text-content">{t('auth.signInTitle', { app: t('app.name') })}</h1>
            <p className="text-sm leading-tight text-faint">{t('auth.signInSubtitle')}</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t('auth.email')}>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={t('auth.password')}>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-faint">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-medium text-accent-strong hover:underline">
            {t('auth.registerLink')}
          </Link>
        </p>
      </Card>
    </div>
  )
}
