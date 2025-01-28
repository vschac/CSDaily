import { useState } from 'react'
import { auth, googleProvider } from '../firebase'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth'

function AuthPrompt({ onLogin, isOpen, onClose }) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [isResetMode, setIsResetMode] = useState(false)

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please try again.'
      case 'auth/user-not-found':
        return 'No account found with this email. Please sign up.'
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.'
      case 'auth/email-already-in-use':
        return 'An account already exists with this email.'
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.'
      case 'auth/invalid-email':
        return 'Please enter a valid email address.'
      default:
        return 'An error occurred. Please try again.'
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }

    // Password length validation for signup
    if (isSignup && password.length < 6) {
      setError('Password should be at least 6 characters')
      return
    }
    
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      onClose()
    } catch (err) {
      console.error('Auth error:', err)
      setError(getErrorMessage(err.code))
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
      onClose()
    } catch (err) {
      console.error('Google sign-in error:', err)
      setError(getErrorMessage(err.code))
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    setError('')
    
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>


      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative animate-fade-in">
            <button
              onClick={() => {
                onClose()
                setIsResetMode(false)
                setResetSent(false)
                setError('')
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {isResetMode ? 'Reset Password' : (isSignup ? 'Create Account' : 'Welcome Back')}
              </h2>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                <p>{error}</p>
              </div>
            )}

            {resetSent && (
              <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
                <p>Password reset email sent! Check your inbox.</p>
              </div>
            )}

            {isResetMode ? (
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                      focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg 
                    hover:bg-blue-700 hover:shadow-xl transition-all duration-200"
                >
                  Send Reset Link
                </button>
              </form>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                        focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                        focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg 
                      hover:bg-blue-700 hover:shadow-xl transition-all duration-200"
                  >
                    {isSignup ? 'Sign Up' : 'Log In'}
                  </button>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleSignIn}
                    className="mt-4 w-full flex items-center justify-center gap-3 px-6 py-2 border border-gray-300 
                      rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200"
                  >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    <span className="text-gray-700">Google</span>
                  </button>
                </div>
              </>
            )}

            <div className="mt-6 text-center space-y-2">
              {!isResetMode && (
                <button
                  onClick={() => setIsSignup(!isSignup)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                </button>
              )}
              <button
                onClick={() => {
                  setIsResetMode(!isResetMode)
                  setResetSent(false)
                }}
                className="block w-full text-blue-600 hover:text-blue-800 text-sm"
              >
                {isResetMode ? 'Back to login' : 'Forgot password?'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AuthPrompt 