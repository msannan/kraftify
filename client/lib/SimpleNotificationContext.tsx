'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

interface SimpleNotification {
  id: string
  message: string
  jobId: number
  senderId: number
  senderName: string
  timestamp: string
}

interface SimpleNotificationContextType {
  notifications: SimpleNotification[]
  unreadCount: number
  addNotification: (notification: Omit<SimpleNotification, 'id' | 'timestamp'>) => void
  clearNotification: (id: string) => void
  clearAllNotifications: () => void
  clearJobNotifications: (jobId: number, senderId: number) => void
}

const SimpleNotificationContext = createContext<SimpleNotificationContextType | undefined>(undefined)

export function SimpleNotificationProvider({ children, userId }: { children: React.ReactNode, userId?: number }) {
  const [notifications, setNotifications] = useState<SimpleNotification[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return

    console.log('🔌 Connecting to socket for user:', userId)
    
    const newSocket = io('http://localhost:5001', {
      transports: ['websocket'],
      forceNew: true
    })

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id)
      newSocket.emit('join', userId)
    })

    newSocket.on('new_message', (data) => {
      console.log('📨 New message received:', data)
      
      const notification: SimpleNotification = {
        id: `${Date.now()}-${Math.random()}`,
        message: `${data.message.sender_first_name} sent you a message`,
        jobId: data.job_id,
        senderId: data.sender_id,
        senderName: data.message.sender_first_name,
        timestamp: new Date().toISOString()
      }

      setNotifications(prev => {
        const updated = [notification, ...prev]
        console.log('🔔 Notifications updated, count:', updated.length)
        return updated
      })
    })

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected')
    })

    setSocket(newSocket)

    return () => {
      console.log('🔌 Cleaning up socket connection')
      newSocket.disconnect()
    }
  }, [userId])

  const addNotification = (notification: Omit<SimpleNotification, 'id' | 'timestamp'>) => {
    const newNotification: SimpleNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString()
    }
    
    setNotifications(prev => [newNotification, ...prev])
    console.log('➕ Notification added manually:', newNotification.message)
  }

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    console.log('🗑️ Cleared notification:', id)
  }

  const clearAllNotifications = () => {
    setNotifications([])
    console.log('🗑️ Cleared all notifications')
  }

  const clearJobNotifications = (jobId: number, senderId: number) => {
    setNotifications(prev => prev.filter(n => !(n.jobId === jobId && n.senderId === senderId)))
    console.log('🗑️ Cleared notifications for job:', jobId, 'sender:', senderId)
  }

  const unreadCount = notifications.length

  return (
    <SimpleNotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      clearNotification,
      clearAllNotifications,
      clearJobNotifications
    }}>
      {children}
    </SimpleNotificationContext.Provider>
  )
}

export function useSimpleNotifications() {
  const context = useContext(SimpleNotificationContext)
  if (context === undefined) {
    throw new Error('useSimpleNotifications must be used within a SimpleNotificationProvider')
  }
  return context
}
