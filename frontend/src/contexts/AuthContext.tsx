import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type { User } from '../types'

interface AuthState {
  user: User | null
  permissions: string[]
  roles: string[]
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  can: (permission: string) => boolean
}

interface RegisterPayload {
  company_name: string
  owner_name: string
  owner_email: string
  owner_password: string
  owner_password_confirmation: string
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
      setPermissions(data.permissions ?? [])
      setRoles(data.roles ?? [])
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (localStorage.getItem('token')) {
      fetchMe()
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    await fetchMe()
  }

  const register = async (payload: RegisterPayload) => {
    const { data } = await api.post('/auth/register', payload)
    localStorage.setItem('token', data.token)
    await fetchMe()
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      localStorage.removeItem('token')
      setUser(null)
      setPermissions([])
      setRoles([])
    }
  }

  const can = (permission: string) => permissions.includes(permission) || roles.includes('Super Admin')

  return (
    <AuthContext.Provider value={{ user, permissions, roles, loading, login, register, logout, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
