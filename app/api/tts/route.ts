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

    // 3. 加入带重试机制的 TTS 合成调用
    let result: { audio: Blob } | null = null;
    let retries = 5; // 最大重试次数
    let lastError: unknown = null;

    while (retries > 0) {
      try {
        // 必须在循环内部实例化 EdgeTTS，确保每次重试都是一个干净的全新 WebSocket 握手，防连接复用污染
        const tts = new EdgeTTS(cleanedText, "zh-CN-YunxiNeural");
        
        // 执行一键合成
        result = await tts.synthesize();

        if (result && result.audio) {
          // 如果成功拿到数据，立刻跳出循环
          break;
        } else {
          throw new Error("合成返回的数据为空");
        }
      } catch (error) {
        lastError = error;
        retries -= 1;
        console.warn(`[TTS 警告] 语音合成出现网络抖动，正在重试... 剩余重试次数: ${retries}`);
        
        if (retries === 0) {
          // 次数耗尽，抛出最后一次的异常给外层抓取
          throw lastError;
        }
        
        // 延迟 500ms 后重试，防止被微软服务器当成恶意攻击（风控拦截）
        await new Promise(res => setTimeout(res, 500));
      }
    }

    // 4. 最终校验
    if (!result || !result.audio) {
      throw new Error("Edge-TTS 音频数据合成失败，已达到最大重试次数");
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