import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, writeBatch, doc } from 'firebase/firestore'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import fs from 'fs/promises'
import { parse } from 'csv-parse/sync'
dotenv.config()

const firebaseConfig = {
  apiKey: process.env.VITE_API_KEY,
  authDomain: process.env.VITE_AUTH_DOMAIN,
  projectId: process.env.VITE_PROJECT_ID,
  storageBucket: process.env.VITE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_APP_ID,
}

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_KEY,
})

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const categoryCodes = {
    "Languages": "L-", 
    "Programming Concepts": "PC-",
    "Web Dev": "WD-", 
    "Back End": "BE-",
    "Data Structures and Algorithms": "DSA-",
    "AI/ML": "AI-",
    "Cloud Computing": "CC-",
    "Cybersecurity": "CS-",
    "Tools/IDE": "TI-",
    "Theory": "T-",
    "Operating Systems": "OS-",
    "DevOps": "DO-",
    "Design Patterns": "DP-",
    "System Design": "SD-",
    "Testing": "TS-",
    "Misc": "M-"
}

let topicsCache = null;
async function getCategoryTopics() {
  if(topicsCache) return topicsCache;

  try {
    const fileContent = await fs.readFile('./data/Fact_Data.csv', 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    const categoryTopics = {};

    records.forEach(record => {
      const { fact_topic, fact_category } = record;
      if (!categoryTopics[fact_category]) {
        categoryTopics[fact_category] = [];
      }
      categoryTopics[fact_category].push(fact_topic);
    });

    topicsCache = categoryTopics;
    return categoryTopics;
  } catch (error) {
    console.error('Error reading topics CSV:', error);
    throw error;
  }
}


async function verifyFact(fact) {
  try {
    const prompt = `You are a fact-checking expert in computer science and programming. 
    Please verify if the following fact is accurate and includes necessary information to 
    explain the topic in 3-4 sentences. Only respond with "TRUE" if you are highly confident 
    the fact is completely accurate, or "FALSE" if you have any doubts or detect any inaccuracies.
    
    Fact to verify: ${fact.term} - ${fact.definition}`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini", 
      temperature: 0.1, 
      max_tokens: 10 
    });

    const response = completion.choices[0].message.content.trim().toUpperCase();
    return response === "TRUE";

  } catch (error) {
    console.error('Error verifying fact:', error);
    throw error;
  }
}

async function uploadFactToFirebase(fact, categoryCounter) {
  try {
    // Format the counter to be 3 digits (e.g., 001, 012, 123)
    const formattedCounter = String(categoryCounter).padStart(3, '0');
    
    const factData = {
      fact_id: `${categoryCodes[fact.category]}${formattedCounter}`,
      fact_topic: fact.term,
      fact_category: fact.category,
      fact_text: fact.definition,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'facts'), factData);
    console.log(`✅ Uploaded fact: ${factData.fact_id}`);
    return docRef;
  } catch (error) {
    console.error('Error uploading fact:', error);
    throw error;
  }
}

async function generateFactsForCategory(category) {
  try {
    const categoryTopics = await getCategoryTopics();
    const topics = categoryTopics[category];
    let categoryCounter = 1;  // Counter for fact IDs

    for (const topic of topics) {
      let generatedFact = null;

      try {
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: "user",
              content: `You are a computer science educator. Please explain "${topic}" in 3-4 clear, accurate sentences. 
              Focus on fundamental understanding and include any crucial technical details.`
            }
          ],
          model: "gpt-4",
          temperature: 0.7,
          max_tokens: 200
        });

        generatedFact = {
          term: topic,
          definition: completion.choices[0].message.content.trim(),
          category: category
        };

        // Upload each fact as it's generated
        await uploadFactToFirebase(generatedFact, categoryCounter);
        categoryCounter++;

        console.log(`✅ Successfully generated and uploaded fact for ${topic}`);
      } catch (error) {
        console.error(`Error processing ${topic}:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (error) {
    console.error('Error in generateFactsForCategory:', error);
    throw error;
  }
}

/* Batch upload approach (commented out but available if needed)
async function uploadFactsBatch(facts) {
  try {
    const batch = writeBatch(db);
    let categoryCounters = {};
    
    facts.forEach(fact => {
      // Initialize counter for category if it doesn't exist
      if (!categoryCounters[fact.category]) {
        categoryCounters[fact.category] = 1;
      }
      
      const formattedCounter = String(categoryCounters[fact.category]).padStart(3, '0');
      const factRef = doc(collection(db, 'facts'));
      
      batch.set(factRef, {
        fact_id: `${categoryCodes[fact.category]}${formattedCounter}`,
        fact_topic: fact.term,
        fact_category: fact.category,
        fact_text: fact.definition,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      categoryCounters[fact.category]++;
    });

    await batch.commit();
    console.log('Successfully uploaded all facts to Firebase!');
  } catch (error) {
    console.error('Error uploading facts:', error);
    throw error;
  }
}
*/

generateFactsForCategory("Languages");