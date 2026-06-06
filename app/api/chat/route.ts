// app/api/chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

// 初始化 DeepSeek 客户端（使用 OpenAI 兼容格式）
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY, // 需在环境变量中配置
  baseURL: "https://api.deepseek.com/v1", // 对接 DeepSeek 官方 Base URL
});

export async function POST(req: Request) {
  try {
    const { history, jobTitle, stressLevel, resumeText, isFinish } = await req.json();

    // 构建大厂高压面试官的系统级 System Prompt
    const systemPrompt = `
      你现在扮演【${jobTitle}】的资深面试官。
      当前面试的压力等级设定为：【${stressLevel === "hell" ? "地狱极高压" : "常规模拟"}】。
      候选人的简历概况如下：
      """
      ${resumeText || "未提供简历，按大厂标准考察通用计算机与系统设计能力"}
      """

      【面试官行为指南】：
      1. 绝对不要迎合候选人，保持冷酷、严谨、深度的技术拷问风格。
      2. 针对候选人上一次的回答，精准抓住其技术漏洞（如：高并发、分布式一致性、高可用、JVM瓶颈）进行深度连环追问。
      3. 提问要短小精悍且具体，禁止背诵概念。每次提问仅抛出 1 个有梯度的技术难题。
      4. 如果压力等级是 "hell"，可以偶尔使用带有压迫感的语气。
    `;

    // 1. 如果是面试结束，要求生成严苛的技术复盘报告
    if (isFinish) {
      const reportPrompt = `
        面试已结束。请根据以上的历史对话，生成一份极具含金量、客观严苛的技术评估报告。
        请严格返回以下格式的 JSON 字符串（不要附带 markdown 的 \`\`\`json 标记，只需纯 JSON）：
        {
          "score": 55,
          "depthAnalysis": "技术深度的客观评估，指出哪些原理候选人没有讲透...",
          "structureAnalysis": "候选人逻辑表达结构（是否符合STAR原则）的评估...",
          "stressAnalysis": "在高压和倒计时下的抗压能力评估..."
        }
      `;

      const response = await deepseek.chat.completions.create({
        model: "deepseek-v4-flash", // 选用极速的 flash 模型
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: reportPrompt }
        ],
        temperature: 0.3, // 降低温度以获取更稳定的 JSON 输出
      });

      const reply = response.choices[0].message.content || "{}";
      // 清除可能存在的 markdown 标记
      const cleanedReply = reply.replace(/```json|```/g, "").trim();
      return NextResponse.json(JSON.parse(cleanedReply));
    }

    // 2. 正常追问流程
    const response = await deepseek.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...history
      ],
      temperature: 0.7,
      max_tokens: 400, // 限制输出长度以保证极致的响应速度
    });

    return NextResponse.json({ question: response.choices[0].message.content });
  } catch (error) {
    console.error("DeepSeek LLM Error: ", error);
    const errMsg = error instanceof Error ? error.message : "大模型调用失败";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}