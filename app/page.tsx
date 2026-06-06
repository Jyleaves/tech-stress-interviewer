"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Terminal, AlertTriangle } from "lucide-react";

// 🚀 导入刚才拆分出的四个全新前端组件
import InterviewSetup from "./components/InterviewSetup";
import CameraMonitor from "./components/CameraMonitor";
import Timer from "./components/Timer";
import ReportCard from "./components/ReportCard";

type Step = "setup" | "interview" | "report";

export default function Home() {
  // 核心状态控制
  const [step, setStep] = useState<Step>("setup");
  const [jobTitle, setJobTitle] = useState("字节跳动 - 核心业务线后端开发 (一面)");
  const [stressLevel, setStressLevel] = useState("hell"); // normal | hell
  const [resumeText, setResumeText] = useState("");
  
  // 面试运行状态
  const [currentQuestion, setCurrentQuestion] = useState(
    "请结合你的项目，谈谈在超高并发场景下，你是如何防止 Redis 缓存击穿与雪崩的？请详细阐述你的双检锁设计与降级方案，不要背诵八股文。"
  );
  const [questionCount, setQuestionCount] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120); // 单题 120 秒倒计时
  const [satisfaction, setSatisfaction] = useState(85); // 面试官耐心值 (0-100)
  const [actionHint, setActionHint] = useState("面试官正在凝视你，请点击下方按钮开始作答...");

  // 摄像头流控制
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // 维护面试对话历史，供大模型追问和最后生成报告
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  // 倒计时与高压计时逻辑
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "interview") {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // 超时扣减面试官耐心
            setSatisfaction((s) => Math.max(s - 15, 10));
            setActionHint("【警告】回答超时！面试官认为你缺乏结构化表达能力。");
            return 120; // 自动重置或强制进入下一题
          }
          // 地狱模式下，时间流逝会缓慢降低面试官满意度（催促效应）
          if (stressLevel === "hell" && prev % 15 === 0) {
            setSatisfaction((s) => Math.max(s - 2, 5));
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, stressLevel]);

  // 启动摄像头
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setStream(mediaStream); // 仅设置 state，由 CameraMonitor 中的 useEffect 侦听并绑定
    } catch (err) {
      console.warn("无法获取摄像头权限: ", err);
    }
  };

  // 关闭摄像头
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // 进入面试
  const handleStartInterview = () => {
    setStep("interview");
    startCamera();
    setTimeRemaining(120);
    setSatisfaction(stressLevel === "hell" ? 90 : 80);
    setQuestionCount(1);

    // 💡 初始化对话历史，把第一道默认问题存进去
    setHistory([{ role: "assistant", content: currentQuestion }]);
  };

  // 核心：点击提交作答时，通过 prompt 弹窗获取文本回答，并连线 DeepSeek 深度追问
  const handleNextQuestion = async () => {
    // 1. 弹出浏览器原生输入框，方便临时文本测试
    const userInput = window.prompt(
      "【大厂技术面作答通道】\n请在下方输入你的技术回答进行测试：",
      "针对这个问题，我认为应当使用双检锁（Double-Checked Locking）配合 volatile 关键字来防止..."
    );

    // 如果用户点击了取消，或者输入为空，则中止
    if (userInput === null || userInput.trim() === "") {
      return;
    }

    // 2. 暂时关闭录音状态，更新考场反馈信息
    setIsRecording(false);
    setActionHint("面试官正在审视你的回答，并连线 DeepSeek 整理下一轮技术追问...");

    // 3. 将用户的回答追加到对话历史中
    const updatedHistory = [
      ...history,
      { role: "user" as const, content: userInput }
    ];
    setHistory(updatedHistory);

    try {
      // 4. 发送 POST 请求调用我们之前写好的 /api/chat 接口
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          history: updatedHistory,
          jobTitle: jobTitle,
          stressLevel: stressLevel,
          resumeText: resumeText,
          isFinish: false
        }),
      });

      if (!response.ok) {
        throw new Error("大模型接口响应异常");
      }

      const data = await response.json();

      if (data.error) {
        alert("大模型返回错误: " + data.error);
        return;
      }

      // 5. 成功拿到 DeepSeek 追问，更新界面状态
      setCurrentQuestion(data.question);

      // 💡 自动朗读面试官的追问：请求我们的后端接口并播放
      setActionHint("面试官正在组织语言，口头向你提出深入追问...");
      try {
        const ttsResponse = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.question }),
        });
        if (ttsResponse.ok) {
          const audioBlob = await ttsResponse.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.play(); // 自动开口说话！
        }
      } catch (ttsErr) {
        console.warn("TTS 自动播放失败: ", ttsErr);
      }
      
      // 6. 将大模型的追问也追加到历史中，以便下一次迭代
      setHistory([
        ...updatedHistory,
        { role: "assistant" as const, content: data.question }
      ]);

      setQuestionCount((c) => c + 1);
      setTimeRemaining(120);
      setActionHint("面试官对你的上一个回答表示怀疑，正在进行深度追问...");

    } catch (error) {
      console.error("联调失败: ", error);
      setActionHint("通信异常：无法连线到面试官大脑，请检查网络或 .env 秘钥配置。");
      alert("对话失败，请确认你的 .env.local 中配置了 DEEPSEEK_API_KEY，且后端 npm run dev 终端无报错。");
    }
  };

  // 模拟作答录制
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setActionHint("正在录音并分析你的答题结构（建议遵循 STAR 原则：情境-任务-行动-结果）...");
    } else {
      setActionHint("作答已暂时挂起，请检查或直接提交。");
    }
  };

  // 强制生成报告
  const handleFinishInterview = () => {
    stopCamera();
    setStep("report");
  };

  // 重新开始：彻底重置所有面试相关的 Context 状态，防止上下文污染
  const handleReset = () => {
    setStep("setup");
    stopCamera();
    
    // 💡 彻底重置所有核心数据流状态
    setCurrentQuestion(
      "请结合你的项目，谈谈在超高并发场景下，你是如何防止 Redis 缓存击穿与雪崩的？请详细阐述你的双检锁设计与降级方案，不要背诵八股文。"
    );
    setHistory([]);
    setQuestionCount(1);
    setSatisfaction(85);
    setActionHint("面试官正在凝视你，请点击下方按钮开始作答...");
    setIsRecording(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between font-mono">
      
      {/* 顶部通栏 - 大厂高压模拟环境标识 */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-ping" />
          <span className="text-sm tracking-wider font-semibold text-zinc-300">
            AI STRESS TEST ARENA // 大厂极客面试沙场 
          </span>
        </div>
        <div className="text-xs text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded border border-zinc-800">
          SYSTEM STATUS: <span className="text-red-500 font-bold">READY</span>
        </div>
      </header>

      {/* 主体交互区域：根据 step 调度不同的解耦组件 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col justify-center">
        
        {/* Step 1: 简历与配置页面 */}
        {step === "setup" && (
          <InterviewSetup
            jobTitle={jobTitle}
            setJobTitle={setJobTitle}
            stressLevel={stressLevel}
            setStressLevel={setStressLevel}
            resumeText={resumeText}
            setResumeText={setResumeText}
            onStart={handleStartInterview}
          />
        )}

        {/* Step 2: 面试进行大厅 (Stress Room) */}
        {step === "interview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* 左侧核心：面试官提问区与作答控制 */}
            <div className="lg:col-span-2 flex flex-col justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl relative">
              
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800/50">
                <div className="flex items-center space-x-3">
                  <div className="px-2 py-1 bg-red-950 text-red-500 rounded text-[10px] font-bold uppercase tracking-wider">
                    Target: {jobTitle.split(" ")[0]}
                  </div>
                  <span className="text-xs text-zinc-500">Round {questionCount}</span>
                </div>
                
                {/* 满意度 */}
                <div className="flex items-center space-x-3 text-xs w-48">
                  <span className="text-zinc-500 whitespace-nowrap">满意度:</span>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        satisfaction > 60 ? "bg-zinc-400" : satisfaction > 30 ? "bg-amber-600" : "bg-red-600 animate-pulse"
                      }`}
                      style={{ width: `${satisfaction}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 考官问题区 */}
              <div className="flex-1 my-4">
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-3 font-bold uppercase tracking-wider">
                  <Terminal size={14} /> 严苛追问中 (Core Probing)
                </div>
                <h2 className="text-lg md:text-xl font-bold leading-relaxed text-zinc-100 pl-4 border-l-2 border-red-600">
                  {currentQuestion}
                </h2>
              </div>

              {/* 答题状态动态提示 */}
              <div className="mt-8 bg-zinc-950 border border-zinc-800/80 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`flex-shrink-0 text-amber-500 ${isRecording ? "animate-pulse" : ""}`} size={16} />
                  <div>
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wide">考场侦测反馈</div>
                    <div className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      {actionHint}
                    </div>
                  </div>
                </div>
              </div>

              {/* 控制按钮组 */}
              <div className="mt-8 flex flex-wrap gap-4 items-center">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`flex-shrink-0 flex items-center gap-2 px-6 py-4 rounded-lg font-bold text-xs tracking-wider uppercase transition ${
                    isRecording 
                      ? "bg-red-600 text-white animate-pulse" 
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square size={14} /> 暂停作答
                    </>
                  ) : (
                    <>
                      <Mic size={14} /> 开启麦克风作答
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="flex-shrink-0 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 px-6 py-4 rounded-lg font-bold text-xs tracking-wider uppercase transition"
                >
                  提交当前回答并深入追问
                </button>

                <button
                  type="button"
                  onClick={handleFinishInterview}
                  className="text-xs text-zinc-500 hover:text-red-400 underline decoration-dashed underline-offset-4 transition ml-auto"
                >
                  结束面试，生成评分
                </button>
              </div>
            </div>

            {/* 右侧：解耦后的摄像头监视器 & 计时器 */}
            <div className="flex flex-col space-y-6">
              <Timer timeRemaining={timeRemaining} />
              <CameraMonitor
                stream={stream}
                videoRef={videoRef}
                isRecording={isRecording}
              />
            </div>

          </div>
        )}

        {/* Step 3: 面试复盘报告 (Assess Report) */}
        {step === "report" && (
          <ReportCard
            jobTitle={jobTitle}
            stressLevel={stressLevel}
            onReset={handleReset}
          />
        )}

      </main>

      {/* 极简底部通栏 */}
      <footer className="border-t border-zinc-800 bg-zinc-950 px-6 py-4 flex justify-between items-center text-[10px] text-zinc-600">
        <div>
          <span>PROTOTYPE v1.0.0</span>
          <span className="mx-2">|</span>
          <span>PKU MLIC CHALLENGE 2026</span>
        </div>
        <div>
          <span>RECOMMENDED RATIO: 16:9</span>
        </div>
      </footer>

    </div>
  );
}