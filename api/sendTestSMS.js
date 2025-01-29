import twilio from 'twilio'
import { getAuth } from 'firebase-admin/auth'
import { initializeApp, getApps } from 'firebase-admin/app'

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp()
}

const accountSid = process.env.VITE_TWILIO_ACCOUNT_SID
const authToken = process.env.VITE_TWILIO_AUTH_TOKEN
const client = twilio(accountSid, authToken)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { phoneNumber, userId } = req.body

  try {
    // Verify the user is authenticated
    const auth = getAuth()
    await auth.getUser(userId)

    if (!client) {
      throw new Error('Twilio client failed to initialize')
    }


    const message = await client.messages.create({
      body: 'This is a test message from CS Daily! Your daily CS concepts will be delivered to this number.',
      //to: phoneNumber,
      to: '+18777804236',
      from: process.env.TWILIO_PHONE_NUMBER
    })

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Detailed error information:', {
      errorCode: error.code,
      errorStatus: error.status,
      errorMessage: error.message,
      moreInfo: error.moreInfo,
      details: error.details
    })

    // Return more detailed error information
    res.status(500).json({ 
      error: error.message,
      details: error.message,
      code: error.code,
      status: error.status
    })
  }
} 