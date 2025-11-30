'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '../../lib/api'
import { useToast } from '../../lib/ToastContext'

interface Profile {
  id: number
  bio: string
  location: string
  profile_image_url: string
  first_name: string
  last_name: string
  email: string
  phone: string
}

export default function CustomerProfilePage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    location: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/customer-profiles/me')
      const profileData = response.data.profile
      setProfile(profileData)
      setFormData({
        firstName: profileData.first_name || '',
        lastName: profileData.last_name || '',
        phone: profileData.phone || '',
        bio: profileData.bio || '',
        location: profileData.location || '',
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await api.post('/customer-profiles/me/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // Update profile image URL
      if (profile) {
        setProfile({ ...profile, profile_image_url: response.data.imageUrl })
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast('Failed to upload image', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Update profile
      await api.put('/customer-profiles/me', {
        bio: formData.bio,
        location: formData.location,
      })
      
      // Update user details
      await api.put('/customer-profiles/me/user-details', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      })
      
      await fetchProfile()
      showToast('Profile updated successfully!', 'success')
    } catch (error: any) {
      console.error('Error saving profile:', error)
      showToast(error.response?.data?.error || 'Failed to save profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/')
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
    return null
  }

  const imageUrl = profile.profile_image_url
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
                href="/dashboard/customer"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/search"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Find Professionals
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Profile Picture Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Picture
            </label>
            <div className="flex items-center space-x-4">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-2xl">👤</span>
                </div>
              )}
              <div>
                <label className="cursor-pointer">
                  <span className="inline-block bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 text-sm font-medium">
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF (max 5MB)</p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Your first name"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Your last name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* About Me */}
          <div className="border-t pt-6">
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
              About Me
            </label>
            <textarea
              id="bio"
              rows={4}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Tell us a little about yourself..."
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="City, State"
            />
            <p className="text-xs text-gray-500 mt-1">This helps professionals find you in their area</p>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

