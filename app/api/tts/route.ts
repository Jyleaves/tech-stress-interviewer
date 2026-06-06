// app/api/tts/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "文本内容不能为空" }, { status: 400 });
    }

    // 调用 OpenAI TTS 模型
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy", // 推荐 alloy（中性冷酷）或 onyx（浑厚专业男声）
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    // 返回音频数据流
    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("TTS Error: ", error);
    const errorMessage = error instanceof Error ? error.message : "语音合成失败";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}