'use client'

import { useEffect, useState } from 'react'
import { SimpleNotificationProvider } from '../lib/SimpleNotificationContext'
import { ToastProvider } from '../lib/ToastContext'
import Toast from './Toast'
import api from '../lib/api'

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token')
        if (token) {
          const response = await api.get('/auth/me')
          setUser(response.data.user)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        localStorage.removeItem('token')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  console.log('ClientLayout: User ID for notifications:', user?.id);
  
  // Only render NotificationProvider when we have determined the user state
  // This ensures the provider initializes properly with the correct user ID
  return (
    <ToastProvider>
      <SimpleNotificationProvider userId={user?.id}>
        {children}
        <Toast />
      </SimpleNotificationProvider>
    </ToastProvider>
  )
}
