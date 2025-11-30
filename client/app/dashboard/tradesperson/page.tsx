'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '../../../lib/api'
import SimpleNotificationHeader from '../../../components/SimpleNotificationHeader'

interface User {
  id: number
  email: string
  role: string
  firstName: string
  lastName: string
  profile?: any
}

interface Booking {
  id: number
  project_title: string
  status: string
  total_amount: number
  first_name: string
  last_name: string
  created_at: string
}

export default function TradespersonDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'profile'>('overview')

  useEffect(() => {
    const initDashboard = async () => {
      try {
        await Promise.all([fetchUserData(), fetchProfileData(), fetchBookings()])
      } finally {
        setLoading(false)
      }
    }

    initDashboard()
  }, [])

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me')
      const userData = response.data.user
      const normalizedUser: User = {
        ...userData,
        firstName: userData.first_name || userData.firstName || '',
        lastName: userData.last_name || userData.lastName || '',
      }

      setUser(normalizedUser)

      if (normalizedUser.profile) {
        setProfile(normalizedUser.profile)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      router.push('/login')
    }
  }

  const fetchProfileData = async () => {
    try {
      const response = await api.get('/profiles/me')
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

  const updateBookingStatus = async (bookingId: number, status: string) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status })
      fetchBookings()
    } catch (error) {
      console.error('Error updating booking:', error)
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

  if (!user) {
    return null
  }

  const pendingBookings = bookings.filter((b) => b.status === 'pending').length
  const inProgressBookings = bookings.filter((b) => b.status === 'in_progress').length
  const completedBookings = bookings.filter((b) => b.status === 'completed').length
  const totalEarnings = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, booking) => sum + Number(booking.total_amount || 0), 0)

  const profileFields = [
    profile?.profile_image_url,
    profile?.business_name,
    profile?.bio,
    profile?.location,
    profile?.hourly_rate,
  ]

  const completionPercentage = profile
    ? Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100)
    : 20

  const businessName = profile?.business_name || `${user.firstName} ${user.lastName}`
  const location = profile?.location || 'Add your location'
  const hourlyRate = profile?.hourly_rate ? `$${profile.hourly_rate}/hr` : 'Set your rate'
  const availability = profile?.availability_status || 'available'
  const verification = profile?.verification_status || 'pending'
  const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

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
                href="/browse-jobs"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Browse Jobs
              </Link>
              <Link
                href="/messages"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Messages
              </Link>
              <Link
                href="/profile"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Profile
              </Link>
              <SimpleNotificationHeader />
              <span className="text-gray-700">
                {user.firstName} {user.lastName}
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Tradesperson Dashboard</h1>

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
              Bookings ({bookings.length})
            </button>
            <Link
              href="/profile"
              className="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Profile
            </Link>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-gradient-to-r from-primary-600 to-blue-500 rounded-lg shadow p-6 text-white">
                <p className="text-sm uppercase tracking-wide text-white/70">Welcome back</p>
                <h2 className="text-3xl font-semibold mt-2">
                  {businessName}
                </h2>
                <p className="mt-2 text-white/80">
                  {profile
                    ? 'Here’s a quick snapshot of your business today.'
                    : 'Complete your profile to start receiving bookings from customers.'}
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="bg-white/15 rounded-lg p-4">
                    <p className="text-sm text-white/80">Location</p>
                    <p className="text-lg font-semibold">{location}</p>
                  </div>
                  <div className="bg-white/15 rounded-lg p-4">
                    <p className="text-sm text-white/80">Hourly Rate</p>
                    <p className="text-lg font-semibold">{hourlyRate}</p>
                  </div>
                  <div className="bg-white/15 rounded-lg p-4">
                    <p className="text-sm text-white/80">Availability</p>
                    <p className="text-lg font-semibold capitalize">{availability}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-4">
                  <Link
                    href="/browse-jobs"
                    className="bg-white text-primary-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition"
                  >
                    Browse Jobs
                  </Link>
                  <Link
                    href="/profile"
                    className="bg-white/10 border border-white/30 px-4 py-2 rounded-md font-medium hover:bg-white/20 transition"
                  >
                    {profile ? 'Edit Profile' : 'Complete Profile'}
                  </Link>
                  {profile && (
                    <Link
                      href={`/profiles/${profile.id}`}
                      className="bg-white/10 border border-white/30 px-4 py-2 rounded-md font-medium hover:bg-white/20 transition"
                    >
                      View Public Profile
                    </Link>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Profile Snapshot</h3>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      verification === 'verified' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {verification === 'verified' ? 'Verified' : 'Pending Verification'}
                  </span>
                </div>
                <dl className="divide-y divide-gray-100 text-sm">
                  <div className="py-3 flex justify-between">
                    <dt className="text-gray-500">Business Name</dt>
                    <dd className="text-gray-900 font-medium text-right max-w-[60%]">{businessName}</dd>
                  </div>
                  <div className="py-3 flex justify-between">
                    <dt className="text-gray-500">Location</dt>
                    <dd className="text-gray-900 font-medium">{location}</dd>
                  </div>
                  <div className="py-3 flex justify-between">
                    <dt className="text-gray-500">Hourly Rate</dt>
                    <dd className="text-gray-900 font-medium">{hourlyRate}</dd>
                  </div>
                  <div className="py-3 flex justify-between">
                    <dt className="text-gray-500">Profile Completion</dt>
                    <dd className="text-gray-900 font-medium">{completionPercentage}%</dd>
                  </div>
                  <div className="py-3 flex justify-between">
                    <dt className="text-gray-500">Member Since</dt>
                    <dd className="text-gray-900 font-medium">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">{bookings.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Pending</h3>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingBookings}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">In Progress</h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">{inProgressBookings}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Completed</h3>
                <p className="text-3xl font-bold text-green-600 mt-2">{completedBookings}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Total Earnings</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">{currencyFormatter.format(totalEarnings)}</p>
                <p className="text-xs text-gray-500 mt-2">Based on completed bookings</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Profile Completeness</h3>
                  <span className="text-xs text-gray-500">{completionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="bg-primary-600 h-2.5 rounded-full"
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {completionPercentage === 100
                    ? 'Great job! Your profile is complete.'
                    : 'Add more details to stand out to customers.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {bookings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No bookings yet.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{booking.project_title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {booking.first_name} {booking.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">${booking.total_amount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {booking.status === 'pending' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'accepted')}
                            className="text-primary-600 hover:text-primary-900 mr-3"
                          >
                            Accept
                          </button>
                        )}
                        {booking.status === 'accepted' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'in_progress')}
                            className="text-primary-600 hover:text-primary-900 mr-3"
                          >
                            Start Work
                          </button>
                        )}
                        {booking.status === 'in_progress' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'completed')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Mark Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Profile Tab - Redirect to profile page */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
            {profile ? (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Profile ID: {profile.id}
                </p>
                <p className="text-gray-600">
                  Status: {profile.verification_status}
                </p>
                <div className="flex space-x-4">
                  <Link
                    href="/profile"
                    className="inline-block bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                  >
                    Edit Profile
                  </Link>
                  <Link
                    href={`/profiles/${profile.id}`}
                    className="inline-block text-primary-600 hover:text-primary-700 px-4 py-2 border border-primary-600 rounded-md"
                  >
                    View Public Profile →
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">Profile will be created automatically.</p>
                <Link
                  href="/profile"
                  className="inline-block bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                  Complete Your Profile
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

