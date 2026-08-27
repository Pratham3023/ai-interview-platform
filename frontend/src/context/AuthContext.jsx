/**
 * Auth Context — provides user state globally
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    setLoading(true)
    try {
      const data = await authAPI.login(email, password)
      localStorage.setItem('access_token', data.access_token)
      const userData = { id: data.user_id, full_name: data.full_name, email: data.email }
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return data
    } finally {
      setLoading(false)
    }
  }

  const register = async (email, password, fullName) => {
    setLoading(true)
    try {
      const data = await authAPI.register({ email, password, full_name: fullName })
      localStorage.setItem('access_token', data.access_token)
      const userData = { id: data.user_id, full_name: data.full_name, email: data.email }
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return data
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
