require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  try {
    console.log("Checking key:", process.env.GEMINI_API_KEY ? "EXISTS" : "MISSING");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Instead of listing models (which might require a different REST call), let's just fetch from REST directly to see what happens
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json();
    
    console.log("Available models:");
    if (data.models) {
      data.models.forEach(m => console.log(m.name));
    } else {
      console.log(data);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
