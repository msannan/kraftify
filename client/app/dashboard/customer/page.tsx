'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '../../../lib/api'
import SimpleNotificationHeader from '../../../components/SimpleNotificationHeader'

interface Booking {
  id: number
  project_title: string
  status: string
  total_amount: number
  business_name: string
  profile_image_url: string
  created_at: string
}

interface Profile {
  id: number
  bio: string
  location: string
  profile_image_url: string
  first_name: string
  last_name: string
}

export default function CustomerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings'>('overview')

  useEffect(() => {
    fetchUserData()
    fetchBookings()
    fetchProfile()
  }, [])

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me')
      const userData = response.data.user
      // Normalize user data (convert snake_case to camelCase)
      setUser({
        ...userData,
        firstName: userData.first_name || userData.firstName,
        lastName: userData.last_name || userData.lastName,
      })
    } catch (error) {
      console.error('Error fetching user:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchProfile = async () => {
    try {
      const response = await api.get('/customer-profiles/me')
      setProfile(response.data.profile)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings/my-bookings')
      setBookings(response.data.bookings || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
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

  const totalSpent = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + parseFloat(b.total_amount.toString()), 0)

  const imageUrl = profile?.profile_image_url
    ? profile.profile_image_url.startsWith('http')
      ? profile.profile_image_url
      : `http://localhost:5001${profile.profile_image_url}`
    : null

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
                href="/search"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Find Professionals
              </Link>
              <Link
                href="/my-jobs"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                My Jobs
              </Link>
              <Link
                href="/messages"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Messages
              </Link>
              <Link
                href="/customer-profile"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Profile
              </Link>
              <SimpleNotificationHeader />
              <span className="text-gray-700">
                {user?.firstName} {user?.lastName}
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Customer Dashboard</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`${
                activeTab === 'bookings'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              My Bookings ({bookings.length})
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Welcome Hero Card */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    Welcome back, {user?.firstName || 'there'}! 👋
                  </h2>
                  <p className="text-primary-100 text-lg mb-4">
                    Find skilled professionals for your projects. Connect directly with verified tradespeople.
                  </p>
                  <Link
                    href="/search"
                    className="inline-block bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition"
                  >
                    Find a Professional
                  </Link>
                </div>
                {imageUrl && (
                  <div className="hidden md:block">
                    <img
                      src={imageUrl}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Profile Snapshot */}
            {profile && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Your Profile</h3>
                  <Link
                    href="/customer-profile"
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Edit Profile →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="text-gray-900 font-medium">
                      {profile.first_name} {profile.last_name}
                    </p>
                  </div>
                  {profile.location && (
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="text-gray-900 font-medium">{profile.location}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Member Since</p>
                    <p className="text-gray-900 font-medium">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Recently'}
                    </p>
                  </div>
                </div>
                {profile.bio && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-500 mb-1">About You</p>
                    <p className="text-gray-700">{profile.bio}</p>
                  </div>
                )}
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {bookings.filter((b) => b.status === 'pending').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">In Progress</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {bookings.filter((b) => b.status === 'in_progress').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {bookings.filter((b) => b.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Link
                  href="/post-job"
                  className="flex items-center p-4 border-2 border-primary-200 bg-primary-50 rounded-lg hover:border-primary-500 hover:bg-primary-100 transition"
                >
                  <div className="p-2 bg-primary-100 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-primary-900">Post a Job</p>
                    <p className="text-sm text-primary-700">Get bids from professionals</p>
                  </div>
                </Link>

                <Link
                  href="/search"
                  className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition"
                >
                  <div className="p-2 bg-primary-100 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Find Professionals</p>
                    <p className="text-sm text-gray-500">Browse verified tradespeople</p>
                  </div>
                </Link>

                <Link
                  href="/customer-profile"
                  className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition"
                >
                  <div className="p-2 bg-primary-100 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Edit Profile</p>
                    <p className="text-sm text-gray-500">Update your information</p>
                  </div>
                </Link>

                <button
                  onClick={() => setActiveTab('bookings')}
                  className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition text-left"
                >
                  <div className="p-2 bg-primary-100 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">View Bookings</p>
                    <p className="text-sm text-gray-500">Manage your projects</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Bookings Preview */}
            {bookings.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View All →
                  </button>
                </div>
                <div className="space-y-4">
                  {bookings.slice(0, 3).map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        {booking.profile_image_url ? (
                          <img
                            src={booking.profile_image_url.startsWith('http') ? booking.profile_image_url : `http://localhost:5001${booking.profile_image_url}`}
                            alt={booking.business_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-semibold text-sm">
                              {booking.business_name?.[0] || 'P'}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{booking.project_title}</p>
                          <p className="text-sm text-gray-500">{booking.business_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">${booking.total_amount}</p>
                        <span
                          className={`mt-1 inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            booking.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : booking.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : booking.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State for No Bookings */}
            {bookings.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Your First Project</h3>
                  <p className="text-gray-600 mb-6">
                    Find skilled professionals in your area to help with your projects. Browse verified tradespeople and connect directly.
                  </p>
                  <Link
                    href="/search"
                    className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
                  >
                    Browse Professionals
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">My Bookings</h2>
              <Link
                href="/search"
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
              >
                Find a Professional
              </Link>
            </div>

            {bookings.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bookings Yet</h3>
                  <p className="text-gray-600 mb-6">
                    You haven't made any bookings yet. Start by finding a professional for your project.
                  </p>
                  <Link
                    href="/search"
                    className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
                  >
                    Browse Professionals
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {bookings.map((booking) => (
                  <div key={booking.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {booking.profile_image_url ? (
                          <img
                            src={booking.profile_image_url.startsWith('http') ? booking.profile_image_url : `http://localhost:5001${booking.profile_image_url}`}
                            alt={booking.business_name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-semibold">
                              {booking.business_name?.[0] || 'P'}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{booking.project_title}</h3>
                          <p className="text-sm text-gray-600">{booking.business_name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(booking.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">${booking.total_amount}</p>
                        <span
                          className={`mt-2 inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                            booking.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : booking.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : booking.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
