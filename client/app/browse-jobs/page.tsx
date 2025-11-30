'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '../../lib/api'

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
  customer_image: string
  bid_count: number
  my_bid_count: number
  created_at: string
  required_skills: string[]
  estimated_duration: string
}

export default function BrowseJobsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserData()
    fetchJobs()
  }, [])

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me')
      const userData = response.data.user
      
      if (userData.role !== 'tradesperson') {
        router.push('/dashboard/customer')
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

  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs/for-me')
      setJobs(response.data.jobs)
    } catch (error) {
      console.error('Error fetching jobs:', error)
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
                href="/dashboard/tradesperson"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/my-bids"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                My Bids
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
          <h1 className="text-3xl font-bold text-gray-900">Browse Jobs</h1>
          <p className="mt-2 text-gray-600">
            Jobs that match your profile, skills, and expertise
          </p>
        </div>

        {/* Job Listings */}
        {jobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Matching Jobs Found</h3>
              <p className="text-gray-600 mb-6">
                We couldn't find any jobs that match your profile and expertise. Check back later for new opportunities, or update your profile to improve job matching.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {jobs.map(job => (
              <div key={job.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(job.urgency)}`}>
                        {job.urgency.charAt(0).toUpperCase() + job.urgency.slice(1)}
                      </span>
                      {job.my_bid_count > 0 && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          You Bid
                        </span>
                      )}
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
                      <span>{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>

                    <p className="text-gray-700 mb-4 line-clamp-3">{job.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm">
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
                    </div>

                    {job.required_skills && job.required_skills.length > 0 && (
                      <div className="mt-3">
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
                  </div>

                  <div className="flex flex-col items-end ml-6">
                    {job.customer_image ? (
                      <img
                        src={job.customer_image.startsWith('http') ? job.customer_image : `http://localhost:5001${job.customer_image}`}
                        alt={`${job.first_name} ${job.last_name}`}
                        className="w-12 h-12 rounded-full object-cover mb-2"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-2">
                        <span className="text-primary-600 font-semibold text-sm">
                          {job.first_name?.[0]}{job.last_name?.[0]}
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-gray-600 text-center">
                      {job.first_name} {job.last_name}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Posted {new Date(job.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex space-x-3">
                    <Link
                      href={`/job/${job.id}`}
                      className="px-4 py-2 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50"
                    >
                      View Details
                    </Link>
                    {job.my_bid_count === 0 ? (
                      <Link
                        href={`/job/${job.id}/bid`}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                      >
                        Place Bid
                      </Link>
                    ) : (
                      <Link
                        href={`/my-bids`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        View My Bid
                      </Link>
                    )}
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
