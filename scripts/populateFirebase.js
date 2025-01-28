import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, writeBatch, doc } from 'firebase/firestore'
import dotenv from 'dotenv'
dotenv.config()

const firebaseConfig = {
  apiKey: process.env.VITE_API_KEY,
  authDomain: process.env.VITE_AUTH_DOMAIN,
  projectId: process.env.VITE_PROJECT_ID,
  storageBucket: process.env.VITE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Structure your facts in a separate file
const facts = [
  {
    id: 'fact1',
    term: 'Big O Notation',
    definition: 'A mathematical notation that describes the limiting behavior of a function...',
    category: 'dsa',
    difficulty: 'intermediate',
    tags: ['algorithms', 'complexity'],
    examples: [
      {
        code: 'for(let i = 0; i < n; i++) { ... }',
        explanation: 'This is an O(n) operation'
      }
    ],
    relatedConcepts: ['Time Complexity', 'Space Complexity']
  },
  // ... more facts
]

async function populateFirebase() {
  try {
    const batch = writeBatch(db)
    
    for (const fact of facts) {
      const factRef = doc(collection(db, 'facts'))
      batch.set(factRef, {
        ...fact,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    await batch.commit()
    console.log('Successfully uploaded facts to Firebase!')
  } catch (error) {
    console.error('Error uploading facts:', error)
  }
}

populateFirebase() 