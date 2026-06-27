import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiApiKey } from '../../../lib/geminiKeys';

export async function POST(req: Request) {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key is missing. Please add GEMINI_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { topics, examDate, todayDate, hours, examType, daysToComplete } = body;

    if (!examDate || !todayDate || !hours) {
      return NextResponse.json({ error: 'Missing required fields in the request body.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let topicsSection = "";
    if (topics && Array.isArray(topics) && topics.length > 0) {
      topicsSection = `Topics specified by the student to focus on:
${topics.map((t: any) => `- ${t.name} (Difficulty: ${t.difficulty})`).join('\n')}`;
    } else {
      topicsSection = `No custom topics provided. You MUST automatically design the study schedule based on the official standard syllabus for: "${examType || 'General Study'}".
Make sure to break down the main subjects of the "${examType}" syllabus (e.g. key subjects, units, or chapters) and distribute them logically across the revision days.`;
    }

    const prompt = `Act as an expert study planner designer. 
I need an interactive revision calendar for a student preparing for an exam.
I will provide:
1. Today's date and the Exam date.
2. The exam the student is preparing for (to guide syllabus-based planning if custom topics are empty).
3. A list of custom topics to focus on (if provided).
4. Hours available to study per day.

Your Goal: Generate a spaced repetition study schedule formatted as a structured calendar grid in JSON.

Rules:
1. Calendar Layout: Output actual dates starting from Today's date until the Exam date. Organize them week by week.
2. Tasks: Each day should have 1 to 3 small, actionable tasks (e.g., "Read Topic X notes", "Solve 5 practice questions").
3. Difficulty & Color Coding: Each task must include its difficulty ("Easy", "Medium", "Hard") so the frontend can color code it (Green, Yellow, Red). Allocate more time/tasks to Hard topics.
4. Spaced Repetition: Automatically schedule short review sessions of earlier topics every few days. Mark them appropriately.
5. Practice Test Day: Exactly one day before the exam date should be distinctly marked as a practice test day (e.g. "isPracticeTest": true).
6. Time Limit: Be realistic. Do not exceed the hours available per day (the user can study ${hours} hours per day).

Output exactly valid JSON in this schema:
{
  "weeks": [
    {
      "weekNumber": 1,
      "days": [
        {
          "date": "YYYY-MM-DD",
          "isPracticeTest": false,
          "tasks": [
            { "text": "Task description here", "difficulty": "Hard" }
          ]
        }
      ]
    }
  ]
}
Return ONLY JSON, no markdown blocks or extra text.

Data:
Today's Date: ${todayDate}
Exam Date: ${examDate}
Exam Type: ${examType || 'General'}
Days to Complete: ${daysToComplete || 'Automatic'}
Study Hours per Day: ${hours}

${topicsSection}

Generate the JSON schedule.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error("No content returned from Gemini");
    }
    
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedPlan = JSON.parse(jsonStr);

    return NextResponse.json({ plan: parsedPlan });
  } catch (error: any) {
    console.error('Error generating plan with Gemini:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate plan' }, { status: 500 });
  }
}
