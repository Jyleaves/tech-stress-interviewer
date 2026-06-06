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
  };

  // 模拟切换下一题
  const handleNextQuestion = () => {
    setQuestionCount((c) => c + 1);
    setTimeRemaining(120);
    setIsRecording(false);
    // 模拟大厂面试官高频追问
    const mockQuestions = [
      "针对你刚才提到的双检锁方案，如果瞬间涌入十万级并发，JVM 锁升级会引发怎样的 CPU 抖动？如何用分布式锁平替？",
      "如果此时底层的 MySQL 出现主从延迟，你的方案如何确保数据强一致性？请详述脏数据产生的窗口期是多少毫秒？",
      "好，那我们聊聊工程基础。在 Linux 线上服务器中，当发现某个 Java / Go 进程 CPU 飙升至 300% 时，你的排查命令和精准定位链路是什么？",
      "（终战追问）最后一个问题：如果该服务目前需要整体进行容器化迁移，如何在 K8s 调度中做好资源的 Requests 和 Limits 规划，防止因为 OOM 导致核心链路崩溃？"
    ];
    const nextQ = mockQuestions[(questionCount - 1) % mockQuestions.length];
    setCurrentQuestion(nextQ);
    setActionHint("面试官对你的上一个回答表示怀疑，正在进行深度追问...");
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

  // 重新开始
  const handleReset = () => {
    setStep("setup");
    stopCamera();
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