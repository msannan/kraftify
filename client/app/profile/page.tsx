'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '../../lib/api'
import { useToast } from '../../lib/ToastContext'

interface Profile {
  id: number
  business_name: string
  bio: string
  location: string
  hourly_rate: number
  profile_image_url: string
  certifications: any[]
  portfolio: any[]
}

interface Education {
  id: number
  certification_name: string
  issuing_organization: string
  issue_date: string
  expiry_date: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    businessName: '',
    aboutMe: '',
    portfolioDescription: '',
    location: '',
    hourlyRate: '',
  })
  const [education, setEducation] = useState<Education[]>([])
  const [newEducation, setNewEducation] = useState({
    certificationName: '',
    issuingOrganization: '',
    issueDate: '',
    expiryDate: '',
  })
  const [showEducationForm, setShowEducationForm] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/profiles/me')
      const profileData = response.data.profile
      setProfile(profileData)
      setFormData({
        businessName: profileData.business_name || '',
        aboutMe: profileData.bio || '',
        portfolioDescription: profileData.portfolio?.find((p: any) => p.project_title === 'Portfolio Description')?.project_description || '',
        location: profileData.location || '',
        hourlyRate: profileData.hourly_rate || '',
      })
      setEducation(profileData.certifications || [])
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

      const response = await api.post('/profiles/me/upload-image', formData, {
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
      await api.put('/profiles/me', formData)
      await fetchProfile()
      showToast('Profile updated successfully!', 'success')
    } catch (error: any) {
      console.error('Error saving profile:', error)
      showToast(error.response?.data?.error || 'Failed to save profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddEducation = async () => {
    try {
      await api.post('/profiles/me/education', newEducation)
      setNewEducation({
        certificationName: '',
        issuingOrganization: '',
        issueDate: '',
        expiryDate: '',
      })
      setShowEducationForm(false)
      fetchProfile()
      showToast('Education added successfully!', 'success')
    } catch (error: any) {
      console.error('Error adding education:', error)
      showToast(error.response?.data?.error || 'Failed to add education', 'error')
    }
  }

  const handleDeleteEducation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this education entry?')) return

    try {
      await api.delete(`/profiles/me/education/${id}`)
      fetchProfile()
      showToast('Education deleted successfully', 'success')
    } catch (error: any) {
      console.error('Error deleting education:', error)
      showToast(error.response?.data?.error || 'Failed to delete education', 'error')
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
                href="/dashboard/tradesperson"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
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

          {/* Business Name */}
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            <input
              id="businessName"
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Your business or professional name"
            />
          </div>

          {/* About Me */}
          <div>
            <label htmlFor="aboutMe" className="block text-sm font-medium text-gray-700 mb-2">
              About Me
            </label>
            <textarea
              id="aboutMe"
              rows={4}
              value={formData.aboutMe}
              onChange={(e) => setFormData({ ...formData, aboutMe: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Tell customers about yourself, your experience, and what makes you unique..."
            />
          </div>

          {/* Portfolio Description */}
          <div>
            <label htmlFor="portfolioDescription" className="block text-sm font-medium text-gray-700 mb-2">
              Portfolio / Work Description
            </label>
            <textarea
              id="portfolioDescription"
              rows={4}
              value={formData.portfolioDescription}
              onChange={(e) => setFormData({ ...formData, portfolioDescription: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Describe your work, past projects, and what services you offer..."
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
          </div>

          {/* Hourly Rate */}
          <div>
            <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-2">
              Hourly Rate ($)
            </label>
            <input
              id="hourlyRate"
              type="number"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="50"
            />
          </div>

          {/* Education Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Education & Certifications
              </label>
              <button
                onClick={() => setShowEducationForm(!showEducationForm)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                {showEducationForm ? 'Cancel' : '+ Add Education'}
              </button>
            </div>

            {showEducationForm && (
              <div className="bg-gray-50 p-4 rounded-md mb-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certification/Degree Name
                  </label>
                  <input
                    type="text"
                    value={newEducation.certificationName}
                    onChange={(e) => setNewEducation({ ...newEducation, certificationName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="e.g., Certified Electrician, Bachelor's Degree"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issuing Organization
                  </label>
                  <input
                    type="text"
                    value={newEducation.issuingOrganization}
                    onChange={(e) => setNewEducation({ ...newEducation, issuingOrganization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="e.g., State Licensing Board, University Name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={newEducation.issueDate}
                      onChange={(e) => setNewEducation({ ...newEducation, issueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date (if applicable)
                    </label>
                    <input
                      type="date"
                      value={newEducation.expiryDate}
                      onChange={(e) => setNewEducation({ ...newEducation, expiryDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddEducation}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 text-sm font-medium"
                >
                  Add Education
                </button>
              </div>
            )}

            {education.length > 0 ? (
              <div className="space-y-3">
                {education.map((edu) => (
                  <div key={edu.id} className="border border-gray-200 rounded-md p-4 flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{edu.certification_name}</h4>
                      {edu.issuing_organization && (
                        <p className="text-sm text-gray-600">{edu.issuing_organization}</p>
                      )}
                      {edu.issue_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Issued: {new Date(edu.issue_date).toLocaleDateString()}
                          {edu.expiry_date && ` • Expires: ${new Date(edu.expiry_date).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteEducation(edu.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No education entries yet. Add your certifications and degrees.</p>
            )}
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

