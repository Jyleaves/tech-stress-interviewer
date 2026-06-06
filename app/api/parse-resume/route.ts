// app/api/parse-resume/route.ts
import { NextResponse } from "next/server";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "未检测到上传的文件" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = "";

    // 1. 处理 PDF 文件
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const data = await pdf(buffer);
      extractedText = data.text;
    }
    // 2. 处理 Word (.docx) 文件
    else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    }
    // 3. 处理纯文本
    else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      extractedText = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "不支持的文件格式。仅支持 .txt, .pdf, .docx 格式" },
        { status: 400 }
      );
    }

    // 清洗提取出的文字，去掉多余空行
    const cleanedText = extractedText
      .replace(/\r\n/g, "\n")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    return NextResponse.json({ text: cleanedText });
  } catch (error) {
    console.error("Resume parsing error: ", error);
    return NextResponse.json(
      { error: "解析过程中出现技术故障，请直接复制粘贴文本内容。" },
      { status: 500 }
    );
  }
}