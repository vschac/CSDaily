import twilio from 'twilio'

const accountSid = process.env.VITE_TWILIO_ACCOUNT_SID
const authToken = process.env.VITE_TWILIO_AUTH_TOKEN
const client = twilio(accountSid, authToken)

export async function sendSMS(to, message) {
  try {
    const result = await client.messages.create({
      body: message,
      to,
      from: process.env.VITE_TWILIO_PHONE_NUMBER
    })
    return result
  } catch (error) {
    console.error('Error sending SMS:', error)
    throw error
  }
} 