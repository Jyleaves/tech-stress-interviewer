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
      当前面试的压力等级设定为：【${stressLevel === "hell" ? "地狱极高压" : "常常规模拟"}】。
      
      【重要：候选人背景数据输入格式说明】
      候选人的背景资料以下面格式输入：
      """
      ${resumeText || "未提供简历，按大厂标准考察通用计算机与系统设计能力"}
      """
      这里面可能包含候选人手动填写的“补充项目说明”，也可能包含候选人上传的“多个简历或项目文件（标明了每个文件的文件名）”。
      你必须仔细阅读上面的内容（尤其是来自上传文件里的真实项目经历和技术栈），围绕其经历的真实性、原理和技术细节，以极其挑剔、严谨的目光进行层层剖析和连环追问。

      【重要：语音识别(ASR)容错纠错指南】：
      1. 候选人的回答是通过麦克风语音识别（ASR）转译而来的。由于中文多音字、英文专业词汇混杂，转换结果极易出现一些【谐音字】或【英文错拼】。
      2. 比如：将“双检锁”识别为“双检索/双减锁”、将“volatile”识别为“voluntai/volite”、将“Redis”识别为“Readist/Rides”。
      3. 作为技术专家的你，【必须具备极强的语义纠错能力与专业常识联想】。
      4. 请你在后台默默将候选人回答中明显的谐音错别字【还原为正确的计算机术语】进行理解。例如：当候选人说“双检索配合voluntai”时，你必须在脑海中立刻认定候选人实际说的是“双检锁配合volatile”，并围绕正确的知识概念进行深度追问！
      5. 绝对不要讽刺、纠结、或者抓着 ASR 转换出的错别字不放（除非候选人在技术概念阐述上真的完全错误）。

      【面试官行为指南】：
      1. 绝对不要迎合候选人，保持冷酷、严谨、深度的技术拷问风格。
      2. 针对候选人上一次的回答（经过你脑补纠错后的正确技术方案），精准抓住其方案的底层原理和架构瓶颈（如分布式并发锁安全性、锁升级性能开销、MySQL主从延迟等）进行连环追问。
      3. 提问要短小精悍且具体，禁止背诵概念。每次提问仅抛出 1 个有梯度的技术难题。
      4. 如果压力等级是 "hell"（地狱极压），可以偶尔使用带有压迫感的语气。
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