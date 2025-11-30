'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useNotifications } from '../lib/NotificationContext'

export default function NotificationHeader() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debug logging and force re-render
  useEffect(() => {
    console.log('🔔 NotificationHeader: unreadCount changed to:', unreadCount)
    console.log('🔔 NotificationHeader: notifications:', notifications.length)
    // Force component re-render when notifications change
    setForceUpdate(prev => prev + 1)
  }, [unreadCount, notifications])

  // Listen for cross-tab notification updates
  useEffect(() => {
    const handleCrossTabUpdate = (e: CustomEvent) => {
      console.log('📡 NotificationHeader: Cross-tab update received:', e.detail)
      setForceUpdate(prev => prev + 1)
    }

    window.addEventListener('kraftify_notifications_updated', handleCrossTabUpdate as EventListener)
    
    return () => {
      window.removeEventListener('kraftify_notifications_updated', handleCrossTabUpdate as EventListener)
    }
  }, [])

  // Force re-render every 5 seconds to catch any missed updates (reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Force updating notification header, current unread:', unreadCount)
      setForceUpdate(prev => prev + 1)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id)
    setIsOpen(false)
    
    // Navigate to appropriate page based on notification type
    if (notification.type === 'message') {
      // Use router.push instead of window.location.href for better navigation
      window.location.href = `/messages?job=${notification.job_id}&user=${notification.sender_id}`
    } else if (notification.type === 'bid') {
      window.location.href = `/job/${notification.job_id}`
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60)

    if (diffInMinutes < 1) {
      return 'Just now'
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`
    } else if (diffInMinutes < 1440) { // 24 hours
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:text-primary-600 focus:outline-none focus:text-primary-600"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-3.5a8.38 8.38 0 01-1.5-5V6a6 6 0 10-12 0v2.5a8.38 8.38 0 01-1.5 5L5 17h5m5 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <span 
            key={`badge-${unreadCount}-${forceUpdate}`}
            className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-pulse"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-3.5a8.38 8.38 0 01-1.5-5V6a6 6 0 10-12 0v2.5a8.38 8.38 0 01-1.5 5L5 17h5m5 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    !notification.is_read ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                      !notification.is_read ? 'bg-primary-600' : 'bg-gray-300'
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${
                          !notification.is_read ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      <p className={`text-sm mt-1 ${
                        !notification.is_read ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200">
              <Link
                href="/messages"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center text-sm text-primary-600 hover:text-primary-700"
              >
                View all messages
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
