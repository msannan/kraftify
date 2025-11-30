'use client'

import { useToast } from '../lib/ToastContext'

export default function Toast() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => {
        const bgColor = {
          success: 'bg-green-500',
          error: 'bg-red-500',
          info: 'bg-blue-500',
          warning: 'bg-yellow-500'
        }[toast.type]

        const icon = {
          success: '✓',
          error: '✕',
          info: 'ℹ',
          warning: '⚠'
        }[toast.type]

        return (
          <div
            key={toast.id}
            className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md transform transition-all duration-300 ease-out animate-[slideIn_0.3s_ease-out]`}
            style={{
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            <span className="text-xl font-bold">{icon}</span>
            <p className="flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white hover:text-gray-200 font-bold text-lg"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}

