// app/api/tts/route.ts
import { NextResponse } from "next/server";
import { EdgeTTS } from "edge-tts-universal";

// 1. 文本清洗工具：过滤掉括号内前缀和 Markdown 符号
function sanitizeTextForTTS(rawText: string): string {
  if (!rawText) return "";
  return rawText
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/【[^】]*】/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "语音合成文本不能为空" }, { status: 400 });
    }

    // 2. 进行文本清洗，并在开头增加一个中文逗号和空格，人为创造 300ms 硬件唤醒静音缓冲，完美解决吞字
    const cleanedText = "， " + sanitizeTextForTTS(text);

    if (!cleanedText) {
      return NextResponse.json({ error: "清洗后文本为空" }, { status: 400 });
    }

    // 3. 初始化极简版 EdgeTTS
    // 参数一：要合成的文本
    // 参数二：音色（使用微软经典自然的严肃男声 "zh-CN-YunxiNeural"）
    const tts = new EdgeTTS(cleanedText, "zh-CN-YunxiNeural");

    // 4. 执行一键合成
    const result = await tts.synthesize();

    if (!result || !result.audio) {
      throw new Error("Edge-TTS 音频数据合成失败");
    }

    // 5. 异步提取 Blob 中的 ArrayBuffer，并安全地转换为 Node.js Buffer
    const arrayBuffer = await result.audio.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });

  } catch (error) {
    console.error("Edge-TTS API Error: ", error);
    const errMsg = error instanceof Error ? error.message : "语音合成失败";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}