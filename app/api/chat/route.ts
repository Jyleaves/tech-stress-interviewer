// app/api/chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function POST(req: Request) {
  try {
    const { history, jobTitle, stressLevel, resumeText, isFinish } = await req.json();

    const systemPrompt = `
      你现在扮演【${jobTitle}】的资深面试官。
      当前面试的压力等级设定为：【${stressLevel === "hell" ? "地狱极高压" : "常规模拟"}】。
      候选人的简历概况如下：
      """
      ${resumeText || "未提供简历，按大厂标准考察通识能力"}
      """

      【面试官行为指南】：
      1. 绝对不要迎合候选人，保持冷酷、严谨、深度的技术拷问风格。
      2. 针对候选人上一次的回答，精准揪出其底层原理或架构设计上的破绽（如多线程安全、分布式一致性、高可用、性能抖动等问题）进行追问。
      3. 提问要具体，禁止背诵八股文。每次提问仅抛出 1 个有梯度的技术难题。
      4. 如果压力等级是 "hell"（地狱高压），你可以偶尔使用带有压迫感的语气，如：“你的方案在瞬间高并发下很容易引发雪崩，你真的考虑过...吗？”。
    `;

    // 如果前端请求生成最后的评估报告
    if (isFinish) {
      const reportPrompt = `
        面试已结束。请根据以上的历史对话，生成一份极具含金量、客观严苛的技术评估报告。
        请返回 JSON 格式：
        {
          "score": 59, // 100分制，大厂标准要严苛
          "depthAnalysis": "技术深度的评估...",
          "structureAnalysis": "表达结构和STAR原则的分析...",
          "stressAnalysis": "抗压表现分析..."
        }
      `;
      // 调用大模型生成 JSON 报告
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // 或 deepseek-chat 等高性价比模型
        messages: [
          { role: "system", value: systemPrompt },
          ...history,
          { role: "user", content: reportPrompt }
        ],
        response_format: { type: "json_object" }
      });
      return NextResponse.json(JSON.parse(response.choices[0].message.content || "{}"));
    }

    // 正常追问流程
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...history
      ],
      temperature: 0.7,
    });

    return NextResponse.json({ question: response.choices[0].message.content });
  } catch (error) {
    console.error("LLM Error: ", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}