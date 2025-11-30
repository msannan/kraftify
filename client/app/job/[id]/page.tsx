'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import api from '../../../lib/api'
import { useToast } from '../../../lib/ToastContext'

interface Job {
  id: number
  title: string
  description: string
  location: string
  budget_min: number
  budget_max: number
  urgency: string
  status: string
  category_name: string
  category_icon: string
  first_name: string
  last_name: string
  email: string
  phone: string
  customer_image: string
  customer_location: string
  created_at: string
  expires_at: string
  preferred_start_date: string
  estimated_duration: string
  required_skills: string[]
  images: string[]
  contact_preference: string
  bids: Bid[]
}

interface Bid {
  id: number
  tradesperson_id: number
  bid_amount: number
  estimated_duration: string
  proposal: string
  availability_date: string
  status: string
  created_at: string
  first_name: string
  last_name: string
  business_name: string
  profile_image_url: string
  hourly_rate: number
  verification_status: string
  avg_rating: number
  review_count: number
}

export default function JobDetailPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const params = useParams()
  const jobId = params.id as string
  
  const [user, setUser] = useState<any>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBidForm, setShowBidForm] = useState(false)
  const [showMessageForm, setShowMessageForm] = useState(false)
  const [selectedTradesperson, setSelectedTradesperson] = useState<number | null>(null)
  
  const [bidForm, setBidForm] = useState({
    bid_amount: '',
    estimated_duration: '',
    proposal: '',
    availability_date: ''
  })

  const [messageForm, setMessageForm] = useState({
    message: '',
    receiver_id: ''
  })

  useEffect(() => {
    fetchUserData()
    fetchJobDetails()
  }, [jobId])

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

  const fetchJobDetails = async () => {
    try {
      const response = await api.get(`/jobs/${jobId}`)
      setJob(response.data.job)
    } catch (error) {
      console.error('Error fetching job details:', error)
      router.push('/browse-jobs')
    }
  }

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!bidForm.bid_amount || !bidForm.proposal) {
      showToast('Please fill in bid amount and proposal', 'warning')
      return
    }

    try {
      await api.post('/bids', {
        job_id: jobId,
        ...bidForm
      })
      
      showToast('Bid submitted successfully!', 'success')
      setShowBidForm(false)
      setBidForm({
        bid_amount: '',
        estimated_duration: '',
        proposal: '',
        availability_date: ''
      })
      fetchJobDetails() // Refresh to show new bid
    } catch (error: any) {
      console.error('Error submitting bid:', error)
      showToast(error.response?.data?.error || 'Error submitting bid', 'error')
    }
  }

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!messageForm.message.trim()) {
      showToast('Please enter a message', 'warning')
      return
    }

    try {
      await api.post('/messages/send', {
        job_id: parseInt(jobId),
        receiver_id: parseInt(messageForm.receiver_id),
        message: messageForm.message
      })
      
      showToast('Message sent successfully!', 'success')
      setShowMessageForm(false)
      setMessageForm({ message: '', receiver_id: '' })
    } catch (error: any) {
      console.error('Error sending message:', error)
      showToast(error.response?.data?.error || 'Error sending message', 'error')
    }
  }

  const acceptBid = async (bidId: number) => {
    if (!confirm('Are you sure you want to accept this bid? This will reject all other bids.')) {
      return
    }

    try {
      await api.patch(`/bids/${bidId}/status`, { status: 'accepted' })
      showToast('Bid accepted successfully!', 'success')
      fetchJobDetails()
    } catch (error: any) {
      console.error('Error accepting bid:', error)
      showToast(error.response?.data?.error || 'Error accepting bid', 'error')
    }
  }

  const rejectBid = async (bidId: number) => {
    if (!confirm('Are you sure you want to reject this bid?')) {
      return
    }

    try {
      await api.patch(`/bids/${bidId}/status`, { status: 'rejected' })
      showToast('Bid rejected', 'info')
      fetchJobDetails()
    } catch (error: any) {
      console.error('Error rejecting bid:', error)
      showToast(error.response?.data?.error || 'Error rejecting bid', 'error')
    }
  }

  const openMessageForm = (receiverId: number) => {
    setMessageForm({ ...messageForm, receiver_id: receiverId.toString() })
    setShowMessageForm(true)
  }

  const startConversation = (receiverId: number) => {
    // Redirect to messages page with the conversation
    router.push(`/messages?job=${parseInt(jobId)}&user=${receiverId}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getBidStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'withdrawn': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatBudget = (min: number, max: number) => {
    if (min && max) return `$${min} - $${max}`
    if (min) return `$${min}+`
    if (max) return `Up to $${max}`
    return 'Budget not specified'
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

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h2>
          <Link href="/browse-jobs" className="text-primary-600 hover:text-primary-700">
            ← Back to Browse Jobs
          </Link>
        </div>
      </div>
    )
  }

  const isCustomer = user?.role === 'customer'
  const isJobOwner = isCustomer && user?.id === job?.customer_id
  const myBid = job.bids?.find(bid => bid.tradesperson_id === user?.id)
  // Allow bidding if: not customer, job is open, and either no bid exists OR existing bid is rejected/withdrawn
  const canBid = !isCustomer && 
                 job.status === 'open' && 
                 (!myBid || myBid.status === 'rejected' || myBid.status === 'withdrawn')

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
                href={isCustomer ? "/dashboard/customer" : "/dashboard/tradesperson"}
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
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
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href={isCustomer ? "/my-jobs" : "/browse-jobs"}
            className="inline-flex items-center text-primary-600 hover:text-primary-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {isCustomer ? "My Jobs" : "Browse Jobs"}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Job Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Job Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)}`}>
                      {job.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(job.urgency)}`}>
                      {job.urgency.charAt(0).toUpperCase() + job.urgency.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <span className="font-medium">{job.category_name}</span>
                    {job.location && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{job.location}</span>
                      </>
                    )}
                    <span className="mx-2">•</span>
                    <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm mb-4">
                    <div className="flex items-center text-gray-600">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      {formatBudget(job.budget_min, job.budget_max)}
                    </div>
                    
                    {job.estimated_duration && (
                      <div className="flex items-center text-gray-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {job.estimated_duration}
                      </div>
                    )}

                    {job.preferred_start_date && (
                      <div className="flex items-center text-gray-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Start: {new Date(job.preferred_start_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
              </div>

              {job.required_skills && job.required_skills.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.required_skills.map(skill => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.images && job.images.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Images</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {job.images.map((image, index) => (
                      <img
                        key={index}
                        src={image.startsWith('http') ? image : `http://localhost:5001${image}`}
                        alt={`Job image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!isJobOwner && (
                <div className="flex gap-4 pt-4 border-t">
                  {canBid && (
                    <button
                      onClick={() => setShowBidForm(true)}
                      className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                      Place Bid
                    </button>
                  )}
                  
                  {myBid && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Your bid:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getBidStatusColor(myBid.status)}`}>
                        ${myBid.bid_amount} - {myBid.status}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => startConversation(job.customer_id)}
                    className="px-6 py-2 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50"
                  >
                    Message Customer
                  </button>
                </div>
              )}
            </div>

            {/* Bids Section */}
            {job.bids && job.bids.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {isJobOwner 
                    ? `Bids (${job.bids.length})` 
                    : 'Your Bid'
                  }
                </h3>
                <div className="space-y-4">
                  {job.bids.map(bid => (
                    <div key={bid.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          {bid.profile_image_url ? (
                            <img
                              src={bid.profile_image_url.startsWith('http') ? bid.profile_image_url : `http://localhost:5001${bid.profile_image_url}`}
                              alt={bid.business_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-primary-600 font-semibold">
                                {bid.first_name?.[0]}{bid.last_name?.[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {bid.business_name || `${bid.first_name} ${bid.last_name}`}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              {bid.avg_rating && (
                                <span>★ {bid.avg_rating.toFixed(1)} ({bid.review_count} reviews)</span>
                              )}
                              {bid.verification_status === 'verified' && (
                                <span className="text-green-600">✓ Verified</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">${bid.bid_amount}</div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getBidStatusColor(bid.status)}`}>
                            {bid.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3">{bid.proposal}</p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                        {bid.estimated_duration && (
                          <span>Duration: {bid.estimated_duration}</span>
                        )}
                        {bid.availability_date && (
                          <span>Available: {new Date(bid.availability_date).toLocaleDateString()}</span>
                        )}
                        <span>Bid placed: {new Date(bid.created_at).toLocaleDateString()}</span>
                      </div>

                      {isJobOwner && bid.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => acceptBid(bid.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                          >
                            Accept Bid
                          </button>
                          <button
                            onClick={() => rejectBid(bid.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => startConversation(bid.tradesperson_id)}
                            className="px-4 py-2 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50 text-sm"
                          >
                            Message
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Posted By</h3>
              <div className="flex items-center gap-3 mb-4">
                {job.customer_image ? (
                  <img
                    src={job.customer_image.startsWith('http') ? job.customer_image : `http://localhost:5001${job.customer_image}`}
                    alt={`${job.first_name} ${job.last_name}`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 font-semibold">
                      {job.first_name?.[0]}{job.last_name?.[0]}
                    </span>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {job.first_name} {job.last_name}
                  </h4>
                  {job.customer_location && (
                    <p className="text-sm text-gray-600">{job.customer_location}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Contact Preference:</span>
                  <span className="font-medium capitalize">{job.contact_preference}</span>
                </div>
                {job.contact_preference !== 'platform' && (
                  <>
                    {job.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{job.email}</span>
                      </div>
                    )}
                    {job.phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{job.phone}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Job Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Bids:</span>
                  <span className="font-medium">{job.bids?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expires:</span>
                  <span className="font-medium">{new Date(job.expires_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)}`}>
                    {job.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bid Form Modal */}
        {showBidForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Place Your Bid</h3>
              <form onSubmit={handleBidSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bid Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={bidForm.bid_amount}
                    onChange={(e) => setBidForm({...bidForm, bid_amount: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Duration
                  </label>
                  <input
                    type="text"
                    value={bidForm.estimated_duration}
                    onChange={(e) => setBidForm({...bidForm, estimated_duration: e.target.value})}
                    placeholder="e.g., 2-3 hours, 1 day"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Availability Date
                  </label>
                  <input
                    type="date"
                    value={bidForm.availability_date}
                    onChange={(e) => setBidForm({...bidForm, availability_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proposal *
                  </label>
                  <textarea
                    value={bidForm.proposal}
                    onChange={(e) => setBidForm({...bidForm, proposal: e.target.value})}
                    required
                    rows={4}
                    placeholder="Describe your approach and why you're the best fit for this job..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBidForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Submit Bid
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Message Form Modal */}
        {showMessageForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Message</h3>
              <form onSubmit={handleMessageSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    value={messageForm.message}
                    onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}
                    required
                    rows={4}
                    placeholder="Type your message..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowMessageForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
