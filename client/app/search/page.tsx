'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '../../lib/api'

interface Tradesperson {
  id: number
  business_name: string
  bio: string
  location: string
  hourly_rate: number
  availability_status: string
  verification_status: string
  profile_image_url: string
  first_name: string
  last_name: string
  average_rating: number
  total_reviews: number
}

export default function SearchPage() {
  const [tradespeople, setTradespeople] = useState<Tradesperson[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    query: '',
    location: '',
    skill: '',
    minRating: '',
    maxRate: '',
    sortBy: 'rating',
  })

  useEffect(() => {
    fetchTradespeople()
  }, [filters])

  const fetchTradespeople = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await api.get(`/search?${params.toString()}`)
      setTradespeople(response.data.tradespeople)
    } catch (error) {
      console.error('Error fetching tradespeople:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Find a Professional</h1>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                placeholder="Name, business, or keywords"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                placeholder="City, State"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Hourly Rate
              </label>
              <input
                type="number"
                value={filters.maxRate}
                onChange={(e) => handleFilterChange('maxRate', e.target.value)}
                placeholder="$0"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading professionals...</p>
          </div>
        ) : tradespeople.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No professionals found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tradespeople.map((person) => (
              <Link
                key={person.id}
                href={`/profiles/${person.id}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    {person.profile_image_url ? (
                      <img
                        src={person.profile_image_url}
                        alt={person.business_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-semibold text-xl">
                          {person.first_name[0]}{person.last_name[0]}
                        </span>
                      </div>
                    )}
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {person.business_name || `${person.first_name} ${person.last_name}`}
                      </h3>
                      {person.verification_status === 'verified' && (
                        <span className="text-xs text-green-600 font-medium">✓ Verified</span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{person.bio}</p>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-gray-500">Location: </span>
                      <span className="text-gray-900">{person.location || 'Not specified'}</span>
                    </div>
                    <div className="text-primary-600 font-semibold">
                      ${person.hourly_rate}/hr
                    </div>
                  </div>
                  {person.average_rating > 0 && (
                    <div className="mt-4 flex items-center">
                      <span className="text-yellow-400">★</span>
                      <span className="ml-1 text-gray-700 font-medium">
                        {typeof person.average_rating === 'number' ? person.average_rating.toFixed(1) : parseFloat(String(person.average_rating || 0)).toFixed(1)}
                      </span>
                      <span className="ml-1 text-gray-500">
                        ({person.total_reviews} reviews)
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

