'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'

interface Notification {
  id: string
  type: 'message' | 'bid' | 'job'
  title: string
  message: string
  job_id?: number
  sender_id?: number
  created_at: string
  is_read: boolean
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>) => void
  markAsRead: (id: string) => void
  markConversationAsRead: (jobId: number, senderId: number) => void
  markAllAsRead: () => void
  clearNotifications: () => void
  clearConversationNotifications: (jobId: number, otherUserId: number) => void
  socket: Socket | null
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
  userId?: number
}

export function NotificationProvider({ children, userId }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    // Load notifications from localStorage on initialization
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kraftify_notifications')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Error parsing saved notifications:', e)
        }
      }
    }
    return []
  })
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kraftify_notifications', JSON.stringify(notifications))
      // Dispatch custom event to notify other tabs
      window.dispatchEvent(new CustomEvent('kraftify_notifications_updated', {
        detail: { notifications, unreadCount: notifications.filter(n => !n.is_read).length }
      }))
    }
  }, [notifications])

  // Listen for notification updates from other tabs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'kraftify_notifications' && e.newValue) {
          try {
            const updatedNotifications = JSON.parse(e.newValue)
            console.log('📡 Syncing notifications from other tab:', updatedNotifications.length)
            setNotifications(updatedNotifications)
          } catch (error) {
            console.error('Error syncing notifications from other tab:', error)
          }
        }
      }

      const handleCustomEvent = (e: CustomEvent) => {
        console.log('📡 Received notification update from other tab:', e.detail)
        // Force re-render of notification components
        setNotifications(prev => [...prev])
      }

      window.addEventListener('storage', handleStorageChange)
      window.addEventListener('kraftify_notifications_updated', handleCustomEvent as EventListener)
      
      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('kraftify_notifications_updated', handleCustomEvent as EventListener)
      }
    }
  }, [])

  useEffect(() => {
    console.log('NotificationProvider: Setting up socket for user ID:', userId);
    if (userId && userId !== null && userId !== undefined) {
      console.log('NotificationProvider: Initializing socket connection for user:', userId);
      
      // Add a small delay to ensure the component is fully mounted
      const initSocket = () => {
        // Initialize socket connection
        const newSocket = io('http://localhost:5001', {
          forceNew: true, // Force a new connection
          timeout: 5000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        })
      
      newSocket.on('connect', () => {
        console.log('✅ Connected to server, joining with user ID:', userId)
        setIsConnected(true)
        newSocket.emit('join', userId)
      })

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from server, reason:', reason)
        setIsConnected(false)
      })

      newSocket.on('reconnect', () => {
        console.log('🔄 Reconnected to server, rejoining with user ID:', userId)
        newSocket.emit('join', userId)
      })

      newSocket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error)
      })

      newSocket.on('error', (error) => {
        console.error('❌ Socket error:', error)
      })

      // Listen for new messages
      const handleNewMessage = (data: any) => {
        console.log('🔔 Received new_message event on page:', window.location.pathname, data)
        const notification: Omit<Notification, 'id' | 'created_at' | 'is_read'> = {
          type: 'message',
          title: 'New Message',
          message: `${data.message.sender_first_name} sent you a message`,
          job_id: data.job_id,
          sender_id: data.sender_id
        }
        console.log('🔔 Adding notification:', notification)
        
        // Use functional update to ensure we have the latest state
        setNotifications(prevNotifications => {
          // Check for duplicate notifications (same job_id and sender_id within last 5 seconds)
          const now = new Date().getTime()
          const isDuplicate = prevNotifications.some(existing => 
            existing.job_id === notification.job_id && 
            existing.sender_id === notification.sender_id &&
            existing.type === 'message' &&
            (now - new Date(existing.created_at).getTime()) < 5000 // 5 seconds
          )
          
          if (isDuplicate) {
            console.log('🚫 Duplicate notification detected, skipping')
            return prevNotifications
          }
          
          const newNotification: Notification = {
            ...notification,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            is_read: false
          }
          const updated = [newNotification, ...prevNotifications]
          console.log('🔔 Added new notification, total count:', updated.length)
          
          // Also save to localStorage immediately
          if (typeof window !== 'undefined') {
            localStorage.setItem('kraftify_notifications', JSON.stringify(updated))
          }
          
          return updated
        })
      }
      
      newSocket.on('new_message', handleNewMessage)

      // Listen for new bids
      newSocket.on('new_bid', (data) => {
        const notification: Omit<Notification, 'id' | 'created_at' | 'is_read'> = {
          type: 'bid',
          title: 'New Bid',
          message: `You received a new bid on your job`,
          job_id: data.job_id
        }
        addNotification(notification)
      })

      setSocket(newSocket)

      // Add a heartbeat to keep connection alive and test event listeners
      const heartbeat = setInterval(() => {
        if (newSocket.connected) {
          console.log('💓 Heartbeat: Socket connected, sending ping')
          newSocket.emit('ping')
        } else {
          console.log('💔 Heartbeat: Socket disconnected')
        }
      }, 15000) // Ping every 15 seconds (more frequent)
      
      // Test event listener every 30 seconds
      const testListener = setInterval(() => {
        console.log('🧪 Testing event listeners - current notification count:', notifications.length)
      }, 30000)

        return () => {
          clearInterval(heartbeat)
          clearInterval(testListener)
          newSocket.off('new_message', handleNewMessage) // Remove specific listener
          newSocket.disconnect()
          console.log('🔌 NotificationProvider: Disconnected socket for user:', userId);
        }
      }

      // Initialize socket immediately or with a small delay
      const timer = setTimeout(initSocket, 100);
      
      return () => {
        clearTimeout(timer);
      }
    } else {
      console.log('NotificationProvider: No user ID provided, skipping socket initialization');
      setSocket(null);
    }
  }, [userId])

  const addNotification = (notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>) => {
    console.log('⚠️ addNotification called directly (should use handleNewMessage instead)')
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      is_read: false
    }
    
    setNotifications(prev => {
      const updated = [newNotification, ...prev]
      console.log('📝 Direct notification add - total count:', updated.length)
      return updated
    })
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, is_read: true }
          : notification
      )
    )
  }

  const markConversationAsRead = (jobId: number, senderId: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.job_id === jobId && notification.sender_id === senderId
          ? { ...notification, is_read: true }
          : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, is_read: true }))
    )
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  const clearConversationNotifications = (jobId: number, otherUserId: number) => {
    console.log(`🧹 Clearing notifications for job ${jobId} with user ${otherUserId}`)
    setNotifications(prev => {
      const updated = prev.map(notification => 
        notification.job_id === jobId && notification.sender_id === otherUserId
          ? { ...notification, is_read: true }
          : notification
      )
      console.log(`🧹 Marked ${prev.length - updated.filter(n => !n.is_read).length} notifications as read`)
      return updated
    })
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markConversationAsRead,
    markAllAsRead,
    clearNotifications,
    clearConversationNotifications,
    socket
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
