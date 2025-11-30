'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSimpleNotifications } from '../lib/SimpleNotificationContext'

export default function SimpleNotificationHeader() {
  const router = useRouter()
  const { notifications, unreadCount, clearNotification, clearAllNotifications } = useSimpleNotifications()
  const [isOpen, setIsOpen] = useState(false)

  // Force re-render when notifications change
  useEffect(() => {
    console.log('🔔 Notification header updated - count:', unreadCount)
  }, [unreadCount, notifications])

  const handleNotificationClick = (notification: any) => {
    // Navigate to the conversation
    router.push(`/messages?job=${notification.jobId}&user=${notification.senderId}`)
    // Clear this specific notification
    clearNotification(notification.id)
    setIsOpen(false)
  }

  const handleClearAll = () => {
    clearAllNotifications()
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 19H6.414a1 1 0 01-.707-.293L4 17V6a1 1 0 011-1h14a1 1 0 011 1v8M11 19v-6a1 1 0 011-1h2m-3 7v-7" />
        </svg>
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No new notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        New Message
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        clearNotification(notification.id)
                      }}
                      className="text-gray-400 hover:text-gray-600 ml-2"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
