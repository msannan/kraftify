import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
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
                href="/login"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl">
            Connect with Skilled
            <span className="text-primary-600"> Professionals</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            A digital marketplace designed to help skilled workers build credibility
            and connect directly with customers. No intermediaries, fair earnings, transparent relationships.
          </p>
          <div className="mt-10 flex justify-center space-x-4">
            <Link
              href="/register?role=customer"
              className="bg-primary-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-primary-700 transition"
            >
              Find a Professional
            </Link>
            <Link
              href="/register?role=tradesperson"
              className="bg-white text-primary-600 px-8 py-3 rounded-lg text-lg font-semibold border-2 border-primary-600 hover:bg-primary-50 transition"
            >
              Join as Professional
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-4xl mb-4">✓</div>
            <h3 className="text-xl font-semibold mb-2">Verified Profiles</h3>
            <p className="text-gray-600">
              Every professional is verified with certifications and past project portfolios.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2">Fair Earnings</h3>
            <p className="text-gray-600">
              Workers keep 100% of their earnings. No hidden fees or commission cuts.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
            <p className="text-gray-600">
              All payments are processed securely through our integrated payment system.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

