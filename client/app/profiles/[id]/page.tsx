'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import api from '../../../lib/api'
import { useToast } from '../../../lib/ToastContext'

interface Profile {
  id: number
  user_id: number
  business_name: string
  bio: string
  location: string
  hourly_rate: number
  availability_status: string
  verification_status: string
  profile_image_url: string
  first_name: string
  last_name: string
  email: string
  phone: string
  skills: Array<{
    id: number
    skill_name: string
    proficiency_level: string
  }>
  certifications: Array<{
    id: number
    certification_name: string
    issuing_organization: string
    issue_date: string
    expiry_date: string
  }>
  portfolio: Array<{
    id: number
    project_title: string
    project_description: string
    project_image_url: string
    completion_date: string
  }>
  reviews: Array<{
    id: number
    rating: number
    comment: string
    created_at: string
    first_name: string
    last_name: string
  }>
  averageRating: number
  totalReviews: number
}

export default function TradespersonProfilePage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const profileId = params.id as string
  
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMessageForm, setShowMessageForm] = useState(false)
  const [messageForm, setMessageForm] = useState({
    message: '',
    job_id: '' // Optional - can message without a job
  })

  useEffect(() => {
    fetchUserData()
    fetchProfile()
  }, [profileId])

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data.user)
    } catch (error) {
      // Not logged in - that's okay, they can still view the profile
      setUser(null)
    }
  }

  const fetchProfile = async () => {
    try {
      const response = await api.get(`/profiles/${profileId}`)
      setProfile(response.data.profile)
    } catch (error: any) {
      console.error('Error fetching profile:', error)
      showToast(error.response?.data?.error || 'Profile not found', 'error')
      router.push('/search')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!user) {
      showToast('Please login to send a message', 'warning')
      router.push('/login')
      return
    }

    if (user.role !== 'customer') {
      showToast('Only customers can send messages', 'warning')
      return
    }

    if (!profile) return

    // Redirect to messages page with contact parameter
    // The messages page will handle creating a direct contact thread
    router.push(`/messages?contact=${profile.user_id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Profile not found</p>
          <Link href="/search" className="text-primary-600 hover:text-primary-700">
            Back to Search
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              {profile.profile_image_url ? (
                <img
                  src={profile.profile_image_url.startsWith('http') 
                    ? profile.profile_image_url 
                    : `http://localhost:5001${profile.profile_image_url}`}
                  alt={profile.business_name}
                  className="w-32 h-32 rounded-full object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-semibold text-4xl">
                    {profile.first_name?.[0]}{profile.last_name?.[0]}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {profile.business_name || `${profile.first_name} ${profile.last_name}`}
                  </h1>
                  {profile.verification_status === 'verified' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-2">
                      ✓ Verified Professional
                    </span>
                  )}
                  <p className="text-gray-600 mb-4">{profile.location}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-600 mb-1">
                    ${profile.hourly_rate}/hr
                  </div>
                  <div className="text-sm text-gray-500">
                    {profile.availability_status || 'Available'}
                  </div>
                </div>
              </div>

              {/* Rating */}
              {profile.averageRating > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    <span className="text-yellow-400 text-xl">★</span>
                    <span className="ml-1 text-lg font-semibold text-gray-900">
                      {profile.averageRating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-gray-500">
                    ({profile.totalReviews} {profile.totalReviews === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {(!user || user.role === 'customer') && (
                  <button
                    onClick={handleSendMessage}
                    className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    {user ? 'Send Message' : 'Login to Message'}
                  </button>
                )}
                {(!user || user.role === 'customer') && (
                  <Link
                    href="/post-job"
                    className="px-6 py-2 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50"
                  >
                    Post a Job
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
              <p className="text-gray-700 whitespace-pre-line">
                {profile.bio || 'No bio available.'}
              </p>
            </div>

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                    >
                      {skill.skill_name}
                      {skill.proficiency_level && (
                        <span className="ml-1 text-primary-600">({skill.proficiency_level})</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio */}
            {profile.portfolio && profile.portfolio.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Portfolio</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.portfolio.map((project) => (
                    <div key={project.id} className="border rounded-lg p-4">
                      {project.project_image_url && (
                        <img
                          src={project.project_image_url.startsWith('http')
                            ? project.project_image_url
                            : `http://localhost:5001${project.project_image_url}`}
                          alt={project.project_title}
                          className="w-full h-48 object-cover rounded-md mb-3"
                        />
                      )}
                      <h3 className="font-semibold text-gray-900 mb-2">{project.project_title}</h3>
                      <p className="text-gray-600 text-sm mb-2">{project.project_description}</p>
                      {project.completion_date && (
                        <p className="text-gray-500 text-xs">
                          Completed: {new Date(project.completion_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {profile.reviews && profile.reviews.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Reviews ({profile.totalReviews})
                </h2>
                <div className="space-y-4">
                  {profile.reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {review.first_name} {review.last_name}
                          </span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Certifications */}
            {profile.certifications && profile.certifications.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Certifications</h2>
                <div className="space-y-3">
                  {profile.certifications.map((cert) => (
                    <div key={cert.id} className="border-l-4 border-primary-500 pl-4">
                      <h3 className="font-semibold text-gray-900">{cert.certification_name}</h3>
                      <p className="text-sm text-gray-600">{cert.issuing_organization}</p>
                      {cert.issue_date && (
                        <p className="text-xs text-gray-500">
                          Issued: {new Date(cert.issue_date).toLocaleDateString()}
                        </p>
                      )}
                      {cert.expiry_date && (
                        <p className="text-xs text-gray-500">
                          Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Location:</span>
                  <span className="ml-2 text-gray-900">{profile.location || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Hourly Rate:</span>
                  <span className="ml-2 text-gray-900 font-semibold">${profile.hourly_rate}/hr</span>
                </div>
                <div>
                  <span className="text-gray-500">Availability:</span>
                  <span className="ml-2 text-gray-900 capitalize">
                    {profile.availability_status || 'Available'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

