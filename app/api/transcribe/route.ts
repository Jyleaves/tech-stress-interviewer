// app/api/transcribe/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 需在项目根目录新建 .env 文件并配置该变量
  baseURL: process.env.OPENAI_BASE_URL, // 如果使用国内聚合代理，请配置 baseURL
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "未检测到音频文件上传" }, { status: 400 });
    }

    // 调用 OpenAI Whisper API 进行语音转文字
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "zh", // 强制指定中文识别，提升准确率
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("ASR Error: ", error);
    const errorMessage = error instanceof Error ? error.message : "语音识别失败";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}