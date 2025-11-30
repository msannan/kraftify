'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '../../lib/api'
import { useSimpleNotifications } from '../../lib/SimpleNotificationContext'
import SimpleNotificationHeader from '../../components/SimpleNotificationHeader'
import { useToast } from '../../lib/ToastContext'

interface MessageThread {
  id: number
  job_id: number
  customer_id: number
  tradesperson_id: number
  job_title: string
  job_status: string
  customer_first_name: string
  customer_last_name: string
  tradesperson_first_name: string
  tradesperson_last_name: string
  business_name: string
  customer_image: string
  tradesperson_image: string
  unread_count: number
  last_message: string
  last_message_at: string
}

interface Message {
  id: number
  job_id: number
  sender_id: number
  receiver_id: number
  message: string
  message_type: string
  attachment_url: string
  is_read: boolean
  created_at: string
  sender_first_name: string
  sender_last_name: string
}

export default function MessagesPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const { clearJobNotifications } = useSimpleNotifications()
  const [user, setUser] = useState<any>(null)
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchUserData()
    fetchThreads()
  }, [])

  useEffect(() => {
    // Handle URL parameters for starting conversations
    const urlParams = new URLSearchParams(window.location.search)
    const jobId = urlParams.get('job')
    const userId = urlParams.get('user')
    const contactId = urlParams.get('contact') // Direct contact without job
    
    if (contactId && user && user.role === 'customer') {
      // Direct contact - create a message without a job
      handleDirectContact(parseInt(contactId))
    } else if (jobId && userId && user) {
      handleUrlConversation(jobId, userId)
    }
  }, [threads, user])
  
  const handleDirectContact = async (tradespersonUserId: number) => {
    // Check if thread already exists for direct contact
    let thread = threads.find(t => 
      t.job_id === null && 
      ((user?.id === t.customer_id && tradespersonUserId === t.tradesperson_id) ||
       (user?.id === t.tradesperson_id && tradespersonUserId === t.customer_id))
    )
    
    if (!thread) {
      // Send an initial message to create the thread
      // The backend will create the thread automatically
      try {
        await api.post('/messages/send', {
          job_id: null, // No job for direct contact
          receiver_id: tradespersonUserId,
          message: 'Hello! I\'d like to discuss a potential project with you.'
        })
        
        // Refresh threads
        await fetchThreads()
        
        // Find the newly created thread
        thread = threads.find(t => 
          t.job_id === null && 
          ((user?.id === t.customer_id && tradespersonUserId === t.tradesperson_id) ||
           (user?.id === t.tradesperson_id && tradespersonUserId === t.customer_id))
        )
      } catch (error) {
        console.error('Error starting direct contact:', error)
        return
      }
    }
    
    if (thread) {
      setSelectedThread(thread)
      // Clear URL parameters
      window.history.replaceState({}, '', '/messages')
    }
  }

  const handleUrlConversation = async (jobId: string, userId: string) => {
    // First check if thread already exists
    let thread = threads.find(t => {
      const threadJobId = t.job_id === null ? 'direct' : t.job_id.toString()
      return threadJobId === jobId && 
        (t.customer_id.toString() === userId || t.tradesperson_id.toString() === userId)
    })
    
    if (!thread) {
      // Skip thread creation for direct contact (handled automatically when message is sent)
      if (jobId === 'direct' || jobId === 'null' || jobId === '0') {
        showToast('Please send a message to start the conversation', 'info')
        return
      }
      
      // Create new thread for job-based conversations
      try {
        const response = await api.post('/messages/create-thread', {
          job_id: parseInt(jobId),
          other_user_id: parseInt(userId)
        })
        
        // Refresh threads to get the new one
        await fetchThreads()
        
        // Find the newly created thread
        thread = threads.find(t => {
          const threadJobId = t.job_id === null ? 'direct' : t.job_id.toString()
          return threadJobId === jobId && 
            (t.customer_id.toString() === userId || t.tradesperson_id.toString() === userId)
        })
      } catch (error) {
        console.error('Error creating thread:', error)
        return
      }
    }
    
    if (thread) {
      setSelectedThread(thread)
      // Clear notifications for this conversation (only if it's a job-based conversation)
      if (jobId !== 'direct' && jobId !== 'null' && jobId !== '0' && !isNaN(parseInt(jobId))) {
        clearJobNotifications(parseInt(jobId), parseInt(userId))
      }
      // Clear URL parameters
      window.history.replaceState({}, '', '/messages')
    }
  }

  useEffect(() => {
    if (selectedThread) {
      const jobId = selectedThread.job_id || 'direct' // Use 'direct' for NULL job_id
      fetchMessages(jobId, getOtherUserId(selectedThread))
      // Only clear notifications when actually reading messages, not just selecting thread
      // We'll clear them when the user actually views the conversation
    }
  }, [selectedThread])

  // Clear notifications when user selects a thread
  useEffect(() => {
    if (selectedThread && selectedThread.job_id) {
      clearJobNotifications(selectedThread.job_id, getOtherUserId(selectedThread))
    }
  }, [selectedThread])

  // Real-time message handling is now done by the notification context
  // We just need to refresh the UI when messages arrive
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedThread) {
        const jobId = selectedThread.job_id || 'direct'
        fetchMessages(jobId, getOtherUserId(selectedThread))
      }
      fetchThreads()
    }, 2000) // Refresh every 2 seconds

    return () => clearInterval(interval)
  }, [selectedThread])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data.user)
    } catch (error) {
      console.error('Error fetching user:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchThreads = async () => {
    try {
      const response = await api.get('/messages/threads')
      setThreads(response.data.threads)
    } catch (error) {
      console.error('Error fetching threads:', error)
    }
  }

  const fetchMessages = async (jobId: number | string, otherUserId: number) => {
    try {
      const jobIdParam = jobId === null || jobId === 'direct' ? 'direct' : jobId
      const response = await api.get(`/messages/job/${jobIdParam}/conversation/${otherUserId}`)
      setMessages(response.data.messages)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !selectedThread) return

    setSendingMessage(true)
    try {
      const response = await api.post('/messages/send', {
        job_id: selectedThread.job_id || null, // NULL for direct contact
        receiver_id: getOtherUserId(selectedThread),
        message: newMessage.trim()
      })

      setMessages(prev => [...prev, response.data.message])
      setNewMessage('')
      
      // Update thread's last message
      setThreads(prev => prev.map(thread => 
        thread.id === selectedThread.id 
          ? { ...thread, last_message: newMessage.trim(), last_message_at: new Date().toISOString() }
          : thread
      ))
    } catch (error: any) {
      console.error('Error sending message:', error)
      showToast(error.response?.data?.error || 'Error sending message', 'error')
    } finally {
      setSendingMessage(false)
    }
  }

  const getOtherUserId = (thread: MessageThread) => {
    return user?.id === thread.customer_id ? thread.tradesperson_id : thread.customer_id
  }

  const getOtherUserName = (thread: MessageThread) => {
    if (user?.id === thread.customer_id) {
      return thread.business_name || `${thread.tradesperson_first_name} ${thread.tradesperson_last_name}`
    }
    return `${thread.customer_first_name} ${thread.customer_last_name}`
  }

  const getOtherUserImage = (thread: MessageThread) => {
    const image = user?.id === thread.customer_id ? thread.tradesperson_image : thread.customer_image
    return image ? (image.startsWith('http') ? image : `http://localhost:5001${image}`) : null
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-primary-600">
                Kraftify
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href={user?.role === 'customer' ? "/dashboard/customer" : "/dashboard/tradesperson"}
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <SimpleNotificationHeader />
              <span className="text-gray-700">
                {user?.first_name} {user?.last_name}
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem('token')
                  router.push('/')
                }}
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="mt-2 text-gray-600">
            Communicate with {user?.role === 'customer' ? 'tradespeople' : 'customers'} about your projects
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ height: '600px' }}>
          <div className="flex h-full">
            {/* Threads Sidebar */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Conversations</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {threads.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.524A11.956 11.956 0 010 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No conversations yet</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {user?.role === 'customer' 
                        ? 'Start by posting a job and receiving bids'
                        : 'Start by bidding on jobs'
                      }
                    </p>
                  </div>
                ) : (
                  threads.map(thread => (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThread(thread)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedThread?.id === thread.id ? 'bg-primary-50 border-primary-200' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {getOtherUserImage(thread) ? (
                          <img
                            src={getOtherUserImage(thread)!}
                            alt={getOtherUserName(thread)}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-semibold text-sm">
                              {getOtherUserName(thread).charAt(0)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {getOtherUserName(thread)}
                            </p>
                            {thread.unread_count > 0 && (
                              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-primary-600 rounded-full">
                                {thread.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{thread.job_title}</p>
                          {thread.last_message && (
                            <p className="text-xs text-gray-400 truncate mt-1">
                              {thread.last_message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              {selectedThread ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center space-x-3">
                      {getOtherUserImage(selectedThread) ? (
                        <img
                          src={getOtherUserImage(selectedThread)!}
                          alt={getOtherUserName(selectedThread)}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 font-semibold text-sm">
                            {getOtherUserName(selectedThread).charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getOtherUserName(selectedThread)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Job: {selectedThread.job_title}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map(message => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.sender_id === user?.id
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-200 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.message}</p>
                            {message.attachment_url && (
                              <div className="mt-2">
                                {message.message_type === 'image' ? (
                                  <img
                                    src={message.attachment_url.startsWith('http') ? message.attachment_url : `http://localhost:5001${message.attachment_url}`}
                                    alt="Attachment"
                                    className="max-w-full h-auto rounded"
                                  />
                                ) : (
                                  <a
                                    href={message.attachment_url.startsWith('http') ? message.attachment_url : `http://localhost:5001${message.attachment_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-200 hover:text-blue-100 underline text-xs"
                                  >
                                    📎 View Attachment
                                  </a>
                                )}
                              </div>
                            )}
                            <p className={`text-xs mt-1 ${
                              message.sender_id === user?.id ? 'text-primary-200' : 'text-gray-500'
                            }`}>
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200">
                    <form onSubmit={sendMessage} className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={sendingMessage}
                      />
                      <button
                        type="submit"
                        disabled={sendingMessage || !newMessage.trim()}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingMessage ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.524A11.956 11.956 0 010 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">Select a conversation to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
