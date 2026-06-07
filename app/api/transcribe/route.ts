// app/api/transcribe/route.ts
import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

const openai = new OpenAI({
  apiKey: process.env.SILICONFLOW_API_KEY, 
  baseURL: "https://api.siliconflow.cn/v1", 
});

export async function POST(req: Request) {
  // console.log("--- 新的 ASR 请求 ---");
  // console.log("【Env 检查】API Key:", process.env.SILICONFLOW_API_KEY ? (process.env.SILICONFLOW_API_KEY.substring(0, 8) + "***") : "未检测到");

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "未检测到音频文件上传" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePayload = await toFile(buffer, "answer.webm", { type: "audio/webm" });

    // 💡 传入经过标准转换的文件负载 filePayload
    const transcription = await openai.audio.transcriptions.create({
      file: filePayload,
      model: "TeleAI/TeleSpeechASR", // 如果想要高准确率方言普通话选星辰，如果想要极致速度选阿里 "FunAudioLLM/SenseVoiceSmall"
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("ASR Error: ", error);
    const errorMessage = error instanceof Error ? error.message : "语音识别失败";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}