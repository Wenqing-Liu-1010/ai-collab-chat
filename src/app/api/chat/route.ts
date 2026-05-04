import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // The messages array will contain the chat history
    // We format it for Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Extract text from messages
    const chatHistory = messages.map((m: any) => ({
      role: m.isAi ? "model" : "user",
      parts: [{ text: `${m.sender}: ${m.text}` }],
    }));

    const chat = model.startChat({
      history: chatHistory.slice(0, -1),
    });

    const lastMessage = messages[messages.length - 1].text;
    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 });
  }
}
