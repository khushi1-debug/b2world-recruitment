import React, { createContext, useContext, useState, useCallback } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('b2world_user')
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(false)

  const persist = (token, userObj) => {
    localStorage.setItem('b2world_token', token)
    localStorage.setItem('b2world_user', JSON.stringify(userObj))
    setUser(userObj)
  }

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const res = await client.post('/api/auth/login', { email, password })
      persist(res.data.access_token, res.data.user)
      return res.data.user
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (name, email, password, role) => {
    setLoading(true)
    try {
      const res = await client.post('/api/auth/register', { name, email, password, role })
      persist(res.data.access_token, res.data.user)
      return res.data.user
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('b2world_token')
    localStorage.removeItem('b2world_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
