import { useState, useEffect } from 'react'
import TechScroll from './components/TechScroll'
import AuthPrompt from './components/AuthPrompt'
import { auth, db } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { PhoneNumberUtil } from 'google-libphonenumber'

function App() {
  const [selectedTopics, setSelectedTopics] = useState({})
  const [isServiceEnabled, setIsServiceEnabled] = useState(false)
  const [preferredTime, setPreferredTime] = useState('09:00')
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saveError, setSaveError] = useState(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [isEditingPhone, setIsEditingPhone] = useState(false)
  const [savedPhone, setSavedPhone] = useState('')
  const phoneUtil = PhoneNumberUtil.getInstance()

  const sampleFlashcards = [
    {
      term: "Big O Notation",
      definition: "A mathematical notation that describes the limiting behavior of a function when the argument tends towards a particular value or infinity."
    },
    {
      term: "Binary Search",
      definition: "An efficient algorithm for finding an item from a sorted list of items. It works by repeatedly dividing in half the portion of the list that could contain the item."
    }
  ]

  const topicCategories = [
    {
      id: 'languages',
      title: 'Programming Languages',
      description: 'Core languages like Python, JavaScript, Java, C++, and more',
    },
    {
      id: 'concepts',
      title: 'Programming Concepts',
      description: 'Fundamentals like OOP, functional programming, and software architecture',
    },
    {
      id: 'webdev',
      title: 'Web Development',
      description: 'Frontend frameworks, HTML/CSS, responsive design, and web APIs',
    },
    {
      id: 'backend',
      title: 'Backend Development',
      description: 'Server-side programming, databases, APIs, and microservices',
    },
    {
      id: 'dsa',
      title: 'Data Structures & Algorithms',
      description: 'Essential algorithms, data structures, and problem-solving techniques',
    },
    {
      id: 'ai',
      title: 'AI & Machine Learning',
      description: 'Machine learning concepts, neural networks, and AI applications',
    },
    {
      id: 'cloud',
      title: 'Cloud Computing',
      description: 'Cloud platforms, serverless computing, and cloud architecture',
    },
    {
      id: 'security',
      title: 'Cybersecurity',
      description: 'Security principles, cryptography, and best practices',
    },
    {
      id: 'tools',
      title: 'Tools & IDEs',
      description: 'Development environments, version control, and productivity tools',
    },
    {
      id: 'theory',
      title: 'CS Theory',
      description: 'Theoretical computer science, computability, and complexity',
    },
    {
      id: 'os',
      title: 'Operating Systems',
      description: 'OS concepts, process management, and system programming',
    },
    {
      id: 'devops',
      title: 'DevOps',
      description: 'CI/CD, containerization, and infrastructure as code',
    },
    {
      id: 'patterns',
      title: 'Design Patterns',
      description: 'Software design patterns and architectural patterns',
    },
    {
      id: 'systemdesign',
      title: 'System Design',
      description: 'Distributed systems, scalability, and system architecture',
    },
    {
      id: 'testing',
      title: 'Testing',
      description: 'Unit testing, integration testing, and QA methodologies',
    },
    {
      id: 'misc',
      title: 'Miscellaneous',
      description: 'Other important CS topics and emerging technologies',
    },
  ]

  const LockedOverlay = ({ children }) => (
    <div className="relative transform transition-all duration-300 hover:scale-[0.99] hover:opacity-70">
      <div className="absolute inset-0 bg-gray-200/90 backdrop-blur-[3px] rounded-2xl z-10 
        border border-gray-100/50" />
      {children}
    </div>
  )

  const debugLog = (action, data) => {
    console.log(`[${action}]`, data)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      debugLog('Auth State Changed', user?.email)
      
      if (user) {
        setIsAuthenticated(true)
        setUser(user)
        
        try {
          const userDocRef = doc(db, 'users', user.uid)
          const docSnap = await getDoc(userDocRef)
          
          debugLog('Fetching user data', { exists: docSnap.exists() })
          
          if (docSnap.exists()) {
            const data = docSnap.data()
            debugLog('User data retrieved', data)
            
            setIsServiceEnabled(data.isServiceEnabled ?? false)
            setPreferredTime(data.preferredTime ?? '09:00')
            setSelectedTopics(data.selectedTopics ?? {})
            if (data.phoneNumber) {
              setSavedPhone(data.phoneNumber)
              setIsPhoneVerified(true)
            }
          } else {
            debugLog('Creating new user document', user.uid)
            
            const defaultTopics = {
              languages: true,
              frameworks: true,
              algorithms: true,
              dataStructures: true,
              concepts: true,
              designPatterns: true,
              bestPractices: true,
              systemDesign: true,
              tooling: true,
              testing: true,
            }
            
            try {
              await setDoc(userDocRef, {
                isServiceEnabled: false,
                preferredTime: '09:00',
                selectedTopics: defaultTopics,
                createdAt: new Date(),
                email: user.email
              })
              
              setSelectedTopics(defaultTopics)
              debugLog('New user document created', { success: true })
            } catch (error) {
              console.error('Error creating user document:', error)
              debugLog('Error creating user document', error)
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          debugLog('Error fetching user data', error)
        }
      } else {
        setIsAuthenticated(false)
        setUser(null)
        setSelectedTopics({})
        setIsServiceEnabled(false)
        setPreferredTime('09:00')
        setSavedPhone('')
        setIsPhoneVerified(false)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user || isLoading) return
    setSaveError(null)

    const saveTimeout = setTimeout(async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid)
        const dataToSave = {
          isServiceEnabled,
          preferredTime,
          selectedTopics,
          updatedAt: new Date(),
          lastSaved: serverTimestamp()
        }
        
        await setDoc(userDocRef, dataToSave, { merge: true })
      } catch (error) {
        console.error('Error saving user config:', error)
        setSaveError('Failed to save changes. Please try again.')
      }
    }, 500)

    return () => clearTimeout(saveTimeout)
  }, [isServiceEnabled, preferredTime, selectedTopics, user, isLoading])

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const validatePhoneNumber = (number) => {
    try {
      const parsedNumber = phoneUtil.parse(number, 'US')
      if (!phoneUtil.isValidNumber(parsedNumber)) {
        return false
      }
      // Format the number in E.164 format for Twilio
      return phoneUtil.format(parsedNumber, PhoneNumberUtil.PhoneNumberFormat.E164)
    } catch (error) {
      return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex justify-between items-center py-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            CS Daily
          </h2>
          {!isAuthenticated ? (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg 
                shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              Login
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{user?.email}</span>
              <button 
                onClick={handleLogout}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg 
                  shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Logout
              </button>
            </div>
          )}
        </nav>

        <main className="space-y-16 py-8">
          <section className="text-center animate-fade-in relative">
            <div className="absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-100 rounded-full blur-2xl opacity-60" />
              <div className="absolute top-8 right-12 w-32 h-32 bg-indigo-100 rounded-full blur-2xl opacity-60" />
              <div className="absolute bottom-4 left-1/3 w-28 h-28 bg-blue-50 rounded-full blur-2xl opacity-60" />
            </div>

            <div className="relative">
              <div className="inline-block">
                <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 
                  bg-clip-text text-transparent pb-2 animate-gradient-x">
                  Learn Computer Science,
                </h1>
                <div className="flex items-center justify-center gap-4 mb-8">
                  <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-blue-600 to-transparent" />
                  <h1 className="text-4xl font-bold text-gray-700">One Text at a Time</h1>
                  <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-blue-600 to-transparent" />
                </div>
              </div>
              
              <div className="relative max-w-2xl mx-auto">
                <p className="text-xl text-gray-600 leading-relaxed">
                  Receive daily computer science concepts, explanations, and facts directly to your phone.
                  Master the fundamentals with bite-sized learning.
                </p>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>5 minutes daily</span>
                  </div>
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                  <div className="flex items-center gap-2 text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Learn faster</span>
                  </div>
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                  <div className="flex items-center gap-2 text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Stay consistent</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <TechScroll />

          {!isAuthenticated && (
            <section className="text-center animate-fade-in">
              <div className="bg-white rounded-2xl shadow-xl p-12 max-w-3xl mx-auto relative overflow-hidden
                transform transition-all duration-300 hover:shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50" />
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-100 rounded-full blur-3xl opacity-50" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-100 rounded-full blur-3xl opacity-50" />
                <div className="relative">
                  <div className="flex items-center justify-center mb-8">
                    <div className="p-4 bg-blue-50 rounded-2xl">
                      <svg className="w-14 h-14 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 
                    bg-clip-text text-transparent">
                    Unlock Your Learning Journey
                  </h2>
                  <p className="text-gray-600 mb-8 max-w-xl mx-auto text-lg leading-relaxed">
                    Sign in or create an account to customize your learning experience, 
                    track your progress, and access all features.
                  </p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-xl 
                      shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 
                      transition-all duration-200 text-lg font-medium relative group"
                  >
                    <span className="relative z-10">Get Started</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {isAuthenticated && (
            <section className="bg-white rounded-2xl shadow-xl p-8 animate-slide-up">
              <h2 className="text-2xl font-semibold text-gray-800 mb-8">Notification Settings</h2>
              <div className="space-y-8">
                <div className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors duration-200">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Phone Number</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Enter your phone number to receive daily CS concepts
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {!isPhoneVerified || isEditingPhone ? (
                        <>
                          <div className="flex-1">
                            <input
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => {
                                setPhoneNumber(e.target.value)
                                setPhoneError('')
                              }}
                              placeholder="(555) 555-5555"
                              className="w-full px-4 py-2 rounded-lg border border-gray-200 
                                focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
                                transition-all duration-200"
                            />
                            {phoneError && (
                              <p className="mt-2 text-sm text-red-600">{phoneError}</p>
                            )}
                          </div>
                          <button
                            onClick={async () => {
                              const formattedNumber = validatePhoneNumber(phoneNumber)
                              if (!formattedNumber) {
                                setPhoneError('Please enter a valid phone number')
                                return
                              }
                              try {
                                const userDocRef = doc(db, 'users', user.uid)
                                await setDoc(userDocRef, {
                                  phoneNumber: formattedNumber,
                                  updatedAt: new Date()
                                }, { merge: true })
                                setIsPhoneVerified(true)
                                setSavedPhone(formattedNumber)
                                setIsEditingPhone(false)
                              } catch (error) {
                                setPhoneError('Failed to save phone number')
                                console.error('Error saving phone number:', error)
                              }
                            }}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-lg 
                              hover:bg-blue-700 hover:shadow-xl transform hover:-translate-y-0.5 
                              transition-all duration-200"
                          >
                            Verify
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1">
                            <div className="px-4 py-2 bg-white rounded-lg border border-gray-200">
                              <span className="text-gray-700">{savedPhone}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setIsEditingPhone(true)
                              setPhoneNumber(savedPhone)
                            }}
                            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg 
                              hover:bg-gray-200 transition-all duration-200"
                          >
                            Change
                          </button>
                        </>
                      )}
                    </div>
                    {isPhoneVerified && !isEditingPhone && (
                      <div className="space-y-2">
                        <p className="text-sm text-green-600 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Phone number verified
                        </p>
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/sendTestSMS', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  phoneNumber: savedPhone,
                                  userId: user.uid
                                })
                              })
                              
                              if (!response.ok) {
                                throw new Error('Failed to send test message')
                              }
                              
                              // Show success message
                              alert('Test message sent successfully!')
                            } catch (error) {
                              console.error('Error sending test message:', error)
                              alert('Failed to send test message. Please try again.')
                            }
                          }}
                          className="text-sm px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg 
                            hover:bg-blue-100 transition-colors duration-200 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Send Test Message
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {!isAuthenticated ? (
            <LockedOverlay>
              <section className="bg-white rounded-2xl shadow-xl p-8">
                <div className="h-64 flex items-center justify-center">
                  <div className="text-gray-400">Sign in to access settings</div>
                </div>
              </section>
            </LockedOverlay>
          ) : isLoading ? (
            <div className="bg-white rounded-2xl shadow-xl p-8 animate-pulse">
              <div className="h-64 flex items-center justify-center">
                <div className="text-gray-400">Loading your settings...</div>
              </div>
            </div>
          ) : (
            <section className="bg-white rounded-2xl shadow-xl p-8 animate-slide-up">
              <h2 className="text-2xl font-semibold text-gray-800 mb-8">Customize Your Learning</h2>
              <div className="space-y-8">
                <div className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-4">
      <div>
                      <h3 className="text-lg font-medium text-gray-900">Service Status</h3>
                      <p className="text-sm text-gray-600 mt-1">Enable or disable daily CS concepts</p>
      </div>
                    <button 
                      onClick={() => setIsServiceEnabled(!isServiceEnabled)}
                      className={`px-6 py-2 rounded-lg transition-all duration-200
                        ${isServiceEnabled 
                          ? 'bg-blue-600 text-white shadow-blue-200 shadow-lg' 
                          : 'bg-gray-200 text-gray-700'
                        }`}
                    >
                      {isServiceEnabled ? 'On' : 'Off'}
        </button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Preferred Time</h3>
                      <p className="text-sm text-gray-600 mt-1">When would you like to receive your daily concepts?</p>
                    </div>
                    <input 
                      type="time" 
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 
                        focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {!isAuthenticated ? (
            <LockedOverlay>
              <section className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Learning Topics</h2>
                <p className="text-gray-600 mb-8">Select the topics you want to learn about</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topicCategories.map((topic) => (
                    <div
                      key={topic.id}
                      className="p-4 border border-gray-200 rounded-xl hover:border-blue-200 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{topic.title}</h3>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={selectedTopics[topic.id]}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600" />
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{topic.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            </LockedOverlay>
          ) : (
            <section className="bg-white rounded-2xl shadow-xl p-8 animate-slide-up">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Learning Topics</h2>
              <p className="text-gray-600 mb-8">Select the topics you want to learn about</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topicCategories.map((topic) => (
                  <div
                    key={topic.id}
                    className="p-4 border border-gray-200 rounded-xl hover:border-blue-200 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{topic.title}</h3>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTopics[topic.id]}
                          onChange={() => 
                            setSelectedTopics(prev => ({
                              ...prev,
                              [topic.id]: !prev[topic.id]
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer 
                          peer-focus:ring-4 peer-focus:ring-blue-300 
                          peer-checked:after:translate-x-5 peer-checked:bg-blue-600
                          after:content-[''] after:absolute after:top-0.5 after:left-0.5 
                          after:bg-white after:rounded-full after:h-5 after:w-5 
                          after:transition-all"
                        />
                      </label>
                    </div>
                    <p className="text-sm text-gray-600">{topic.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!isAuthenticated ? (
            <LockedOverlay>
              <section className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-800 text-center">Previous Concepts</h2>
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h3 className="text-xl font-semibold text-blue-600 mb-4">
                    {sampleFlashcards[currentFlashcardIndex].term}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {sampleFlashcards[currentFlashcardIndex].definition}
                  </p>
                </div>
                <div className="flex justify-center gap-4">
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-lg">Previous</button>
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-lg">Next</button>
                </div>
              </section>
            </LockedOverlay>
          ) : (
            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800 text-center">Previous Concepts</h2>
              <div className="bg-white rounded-2xl shadow-xl p-8 transform hover:-translate-y-1 
                transition-all duration-300 hover:shadow-2xl">
                <h3 className="text-xl font-semibold text-blue-600 mb-4">
                  {sampleFlashcards[currentFlashcardIndex].term}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {sampleFlashcards[currentFlashcardIndex].definition}
                </p>
              </div>
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => setCurrentFlashcardIndex(i => (i > 0 ? i - 1 : sampleFlashcards.length - 1))}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-lg 
                    hover:bg-blue-700 hover:shadow-xl transform hover:-translate-y-0.5 
                    transition-all duration-200"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentFlashcardIndex(i => (i < sampleFlashcards.length - 1 ? i + 1 : 0))}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-lg 
                    hover:bg-blue-700 hover:shadow-xl transform hover:-translate-y-0.5 
                    transition-all duration-200"
                >
                  Next
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      <AuthPrompt 
        onLogin={() => setIsAuthenticated(true)} 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {saveError && (
        <div className="fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg">
          <p className="font-medium">Error saving changes</p>
          <p className="text-sm">{saveError}</p>
        </div>
      )}
    </div>
  )
}

export default App
