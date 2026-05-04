import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Build a continuous transcript for the prompt
    // This avoids Gemini's strict user/model alternation requirement for history
    const transcript = messages.map((m: any) => 
      `${m.sender}: ${m.text}`
    ).join('\n');
    
    const prompt = `这是一段多人聊天室的对话记录。请你作为 "AI Assistant" 回复最后一条消息，结合上下文提供有用的回答：\n\n${transcript}\nAI Assistant:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 });
  }
}
