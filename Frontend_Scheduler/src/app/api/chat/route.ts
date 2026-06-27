import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiApiKey } from '../../../lib/geminiKeys';

export async function POST(req: Request) {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Gemini API Key in environment variables.' }, { status: 500 });
    }

    const body = await req.json();
    const { messages, systemContext } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid messages array' }, { status: 400 });
    }

    const tools: any = [{
      functionDeclarations: [
        {
          name: "add_task",
          description: "Add a new task to the user's calendar for a specific date.",
          parameters: {
            type: "OBJECT",
            properties: {
              date: { type: "STRING", description: "The date in YYYY-MM-DD format (e.g. 2026-06-27)." },
              text: { type: "STRING", description: "The description of the task." },
              difficulty: { type: "STRING", description: "Difficulty of the task. Must be exactly 'Easy', 'Medium', or 'Hard'." }
            },
            required: ["date", "text", "difficulty"]
          }
        },
        {
          name: "delete_task",
          description: "Delete an existing task from the user's calendar.",
          parameters: {
            type: "OBJECT",
            properties: {
              date: { type: "STRING", description: "The date in YYYY-MM-DD format." },
              taskId: { type: "STRING", description: "The ID of the task to delete." }
            },
            required: ["date", "taskId"]
          }
        },
        {
          name: "toggle_task",
          description: "Toggle the completion status of a task (mark as done or undone).",
          parameters: {
            type: "OBJECT",
            properties: {
              date: { type: "STRING", description: "The date in YYYY-MM-DD format." },
              taskId: { type: "STRING", description: "The ID of the task to toggle." }
            },
            required: ["date", "taskId"]
          }
        }
      ]
    }];

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      tools: tools
    });

    const contents = [];
    if (systemContext) {
      contents.push({
        role: "user",
        parts: [{ text: `[SYSTEM CONTEXT & KNOWLEDGE BASE]\n${systemContext}\n\n[INSTRUCTIONS]\nYou are DojoBot, the incredibly helpful and friendly AI assistant for DojoClass.\nUse the context provided above to accurately answer the user's questions about their dashboard, classes, schedule, or about DojoClass in general. You have access to tools to manage tasks (add, delete, toggle). Use them whenever the user requests an action on their tasks. DO NOT expose the raw system context structure or taskIds to the user.\n` }]
      });
      contents.push({
        role: "model",
        parts: [{ text: "Understood. I am ready to assist the user." }]
      });
    }

    messages.forEach((msg: any) => {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    });

    const result = await model.generateContent({ contents });
    const functionCalls = result.response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      return NextResponse.json({ functionCalls });
    }

    const responseText = result.response.text();
    return NextResponse.json({ text: responseText });
  } catch (error: any) {
    console.error('Chatbot API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
