'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '../../lib/api'
import { useToast } from '../../lib/ToastContext'

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
  bid_count: number
  created_at: string
  expires_at: string
  images: string[]
  preferred_start_date: string
  estimated_duration: string
  required_skills: string[]
}

export default function MyJobsPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'open' | 'in_progress' | 'completed' | 'all'>('all')

  useEffect(() => {
    fetchUserData()
    fetchMyJobs()
  }, [])

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me')
      const userData = response.data.user
      
      if (userData.role !== 'customer') {
        router.push('/dashboard/tradesperson')
        return
      }
      
      setUser(userData)
    } catch (error) {
      console.error('Error fetching user:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchMyJobs = async () => {
    try {
      const response = await api.get('/jobs/my-jobs')
      setJobs(response.data.jobs)
    } catch (error) {
      console.error('Error fetching my jobs:', error)
    }
  }

  const updateJobStatus = async (jobId: number, status: string) => {
    try {
      await api.patch(`/jobs/${jobId}/status`, { status })
      fetchMyJobs()
      showToast('Job status updated successfully', 'success')
    } catch (error: any) {
      console.error('Error updating job status:', error)
      showToast(error.response?.data?.error || 'Error updating job status', 'error')
    }
  }

  const deleteJob = async (jobId: number, jobTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${jobTitle}"? This action cannot be undone. All bids and notifications for this job will also be removed.`)) {
      return
    }

    try {
      await api.delete(`/jobs/${jobId}`)
      showToast('Job deleted successfully', 'success')
      fetchMyJobs()
    } catch (error: any) {
      console.error('Error deleting job:', error)
      showToast(error.response?.data?.error || 'Error deleting job', 'error')
    }
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

  const formatBudget = (min: number, max: number) => {
    if (min && max) return `$${min} - $${max}`
    if (min) return `$${min}+`
    if (max) return `Up to $${max}`
    return 'Budget not specified'
  }

  const filteredJobs = activeTab === 'all' 
    ? jobs 
    : jobs.filter(job => job.status === activeTab)

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
                href="/dashboard/customer"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/post-job"
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
              >
                Post New Job
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Job Postings</h1>
          <p className="mt-2 text-gray-600">
            Manage your job postings and view bids from professionals
          </p>
        </div>

        {/* Status Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Jobs', count: jobs.length },
              { key: 'open', label: 'Open', count: jobs.filter(j => j.status === 'open').length },
              { key: 'in_progress', label: 'In Progress', count: jobs.filter(j => j.status === 'in_progress').length },
              { key: 'completed', label: 'Completed', count: jobs.filter(j => j.status === 'completed').length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Job Listings */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Jobs Found</h3>
              <p className="text-gray-600 mb-6">
                {activeTab === 'all' 
                  ? "You haven't posted any jobs yet. Start by posting your first job."
                  : `No jobs with status "${activeTab}".`
                }
              </p>
              <Link
                href="/post-job"
                className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
              >
                Post Your First Job
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredJobs.map(job => (
              <div key={job.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)}`}>
                        {job.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(job.urgency)}`}>
                        {job.urgency.charAt(0).toUpperCase() + job.urgency.slice(1)}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600 mb-3">
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

                    <p className="text-gray-700 mb-4 line-clamp-2">{job.description}</p>

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

                      <div className="flex items-center text-gray-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {job.bid_count} bid{job.bid_count !== 1 ? 's' : ''}
                      </div>

                      {job.preferred_start_date && (
                        <div className="flex items-center text-gray-600">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Start: {new Date(job.preferred_start_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {job.required_skills && job.required_skills.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {job.required_skills.map(skill => (
                            <span
                              key={skill}
                              className="px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {job.images && job.images.length > 0 && (
                      <div className="mb-4">
                        <div className="flex gap-2 overflow-x-auto">
                          {job.images.slice(0, 3).map((image, index) => (
                            <img
                              key={index}
                              src={image.startsWith('http') ? image : `http://localhost:5001${image}`}
                              alt={`Job image ${index + 1}`}
                              className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                            />
                          ))}
                          {job.images.length > 3 && (
                            <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center text-gray-500 text-sm flex-shrink-0">
                              +{job.images.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Expires: {new Date(job.expires_at).toLocaleDateString()}
                  </div>
                  <div className="flex space-x-3">
                    <Link
                      href={`/job/${job.id}`}
                      className="px-4 py-2 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50"
                    >
                      View Details
                    </Link>
                    {job.bid_count > 0 && (
                      <Link
                        href={`/job/${job.id}/bids`}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                      >
                        View Bids ({job.bid_count})
                      </Link>
                    )}
                    {(job.status === 'open' || job.status === 'in_progress') && (
                      <div className="relative">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              const action = e.target.value === 'cancelled' ? 'cancel' : e.target.value;
                              if (confirm(`Are you sure you want to ${action} this job?`)) {
                                updateJobStatus(job.id, e.target.value)
                              }
                            }
                            e.target.value = '' // Reset select
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                          defaultValue=""
                        >
                          <option value="" disabled>Actions</option>
                          <option value="cancelled">Cancel Job</option>
                        </select>
                      </div>
                    )}
                    <button
                      onClick={() => deleteJob(job.id, job.title)}
                      className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 text-sm font-medium"
                      title="Delete this job posting"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
