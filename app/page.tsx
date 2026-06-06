// app/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Terminal, AlertTriangle } from "lucide-react";

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

  // 用来控制在面试中是否开启视/音采集与展示
  const [useCamera, setUseCamera] = useState<boolean>(true);
  const [useMic, setUseMic] = useState<boolean>(true);
  const [typedAnswer, setTypedAnswer] = useState<string>(""); // 文本模式下的打字回答内容
  
  // 面试运行状态
  const [currentQuestion, setCurrentQuestion] = useState(
    "请结合你的项目，谈谈在超高并发场景下，你是如何防止 Redis 缓存击穿与雪崩的？请详细阐述你的双检锁设计与降级方案，不要背诵八股文。"
  );
  const [questionCount, setQuestionCount] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120); // 单题 120 秒倒计时
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [satisfaction, setSatisfaction] = useState(85); // 面试官耐心值 (0-100)
  const [actionHint, setActionHint] = useState("系统准备就绪。请您梳理答题思路，点击下方按钮开始录音作答。");

  // 用于接收并保存 AI 生成的复盘报告
  const [reportData, setReportData] = useState<{
    score: number;
    depthAnalysis: string;
    structureAnalysis: string;
    stressAnalysis: string;
  } | null>(null);
  
  // 生成报告时的加载等待状态
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // 摄像头流控制
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // 维护面试对话历史，供大模型追问和最后生成报告
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  // 麦克风录音控制引用
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const finalAudioBlobRef = useRef<Blob | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // 存储多个已解析的文件：包含文件名和解析出的具体内容
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content: string }[]>([]);

  // 辅助函数：安全地停止当前正在播放的所有面试官语音，并清空引用
  const stopActiveAudio = () => {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0; // 重置进度
      } catch (e) {
        console.warn("停止语音播放时发生非阻断异常:", e);
      }
      activeAudioRef.current = null;
    }
  };

  // 组件卸载时强制静音，防止页面关闭或切走后后台依然在播音的内存泄漏
  useEffect(() => {
    return () => {
      stopActiveAudio();
    };
  }, []);

  // 倒计时与高压计时逻辑
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "interview" && isTimerActive) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setSatisfaction((s) => Math.max(s - 15, 10));
            setActionHint("【警告】回答超时！面试官认为你缺乏结构化表达能力。");
            return 120;
          }
          if (stressLevel === "hell" && prev % 15 === 0) {
            setSatisfaction((s) => Math.max(s - 2, 5));
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, stressLevel, isTimerActive]);

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

  // TTS 语音播放逻辑
  const speakQuestion = async (text: string) => {
    try {
      stopActiveAudio();

      setIsTimerActive(false); // 提问开始，暂停考场倒计时
      setActionHint("面试官正在对你进行技术发问，请认真倾听，梳理答题思路...");
      
      console.log("【TTS】正在向后端请求语音合成...");
      const ttsResponse = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (ttsResponse.ok) {
        const ttsBlob = await ttsResponse.blob();
        const audioUrl = URL.createObjectURL(ttsBlob);
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;
        audio.onended = () => {
          console.log("【TTS】播音结束。考场倒计时正式启动。");
          setIsTimerActive(true);
          // 根据用户是否开启麦克风，显示不同的提示词
          if (useMic) {
            setActionHint("【语音模式】倒计时已开启！请点击下方“开启麦克风作答”开始陈述您的方案...");
          } else {
            setActionHint("【打字模式】倒计时已开启！请在输入框内键入您的技术解答并提交...");
          }
        };

        audio.play(); 
        console.log("【TTS】开始自动播音。");
      } else {
        setIsTimerActive(true);
      }
    } catch (ttsErr) {
      console.warn("TTS 自动播放失败: ", ttsErr);
      setIsTimerActive(true);
    }
  };

  // 将文本框补充内容与多个上传的文件内容拼接，以便统一传给大模型
  const getFormattedResumeAndFiles = () => {
    let result = "";
    if (resumeText.trim()) {
      result += `候选人补充的项目说明或文字背景：\n${resumeText.trim()}\n\n`;
    }
    if (uploadedFiles.length > 0) {
      result += `候选人上传的文件与简历清单：\n`;
      uploadedFiles.forEach((file, index) => {
        result += `--- 文件 [${index + 1}]: ${file.name} ---\n【内容】：\n${file.content}\n\n`;
      });
    }
    return result || "未提供简历，按大厂标准考察通用计算机与系统设计能力";
  };

  // 进入面试
  const handleStartInterview = (cameraPref: boolean, micPref: boolean) => {
    setUseCamera(cameraPref);
    setUseMic(micPref);
    setStep("interview");
    setTypedAnswer(""); // 清空临时打字区

    if (cameraPref) {
      startCamera(); // 只有用户勾选了摄像头，才请求开启
    }

    setTimeRemaining(120);
    setSatisfaction(stressLevel === "hell" ? 90 : 80);
    setQuestionCount(1);
    setHistory([{ role: "assistant", content: currentQuestion }]);

    // 口头播放题目
    speakQuestion(currentQuestion);
  };

  // 核心闭环：结束录音/直接读取打字内容 -> 语音转文字(ASR) -> 大模型追问(LLM) -> 语音合成(TTS)
  const handleNextQuestion = async () => {
    let userText = "";

    // 💡 场景一：开启了麦克风（语音采集流程）
    if (useMic) {
      console.log("【Trigger】handleNextQuestion (语音模式). 当前 isRecording：", isRecording);
      let audioBlob: Blob | null = null;
      const recorder = mediaRecorderRef.current;
      
      if (isRecording && recorder) {
        try {
          audioBlob = await new Promise<Blob>((resolve, reject) => {
            recorder.onstop = () => {
              try {
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                if (audioStreamRef.current) {
                  audioStreamRef.current.getTracks().forEach(track => track.stop());
                  audioStreamRef.current = null;
                }
                resolve(blob);
              } catch (err) {
                reject(err);
              }
            };
            recorder.stop();
          });
        } catch (err) {
          console.error("【ASR】音频提取故障：", err);
        }
        setIsRecording(false);
      } else if (finalAudioBlobRef.current) {
        audioBlob = finalAudioBlobRef.current;
        finalAudioBlobRef.current = null;
      } else {
        alert("请先开启麦克风，或开始说话后再点击提交！");
        return;
      }

      if (!audioBlob || audioBlob.size === 0) {
        alert("未采集到有效的录音，请重新尝试。");
        return;
      }

      setActionHint("正在对您的录音进行高精度声学分析 (ASR)...");

      try {
        const formData = new FormData();
        formData.append("file", audioBlob, "answer.webm");
        const transcribeResponse = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!transcribeResponse.ok) throw new Error("语音识别服务异常");
        const transcribeData = await transcribeResponse.json();
        userText = transcribeData.text;

        if (!userText || userText.trim() === "") {
          setActionHint("【错误】未侦测到清晰的声音，请大声、清晰地再次重试。");
          return;
        }
      } catch (err) {
        console.error("ASR Error: ", err);
        setActionHint("语音识别通信异常，请重试或检查后台配置。");
        return;
      }
    } 
    // 💡 场景二：关闭了麦克风（无障碍键盘打字作答流程）
    else {
      console.log("【Trigger】handleNextQuestion (文本模式).");
      if (!typedAnswer.trim()) {
        alert("回答内容不能为空，请先在下方输入框中键入您的技术解答方案。");
        return;
      }
      userText = typedAnswer;
      setTypedAnswer(""); // 提交后清空打字框
    }

    // 统一将获取到的文本投递给 DeepSeek
    setActionHint(`已接收您的解答，面试官正在使用 DeepSeek 研判您的底层逻辑...`);

    try {
      const updatedHistory = [
        ...history,
        { role: "user" as const, content: userText }
      ];
      setHistory(updatedHistory);

      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: updatedHistory,
          jobTitle: jobTitle,
          stressLevel: stressLevel,
          resumeText: getFormattedResumeAndFiles(),
          isFinish: false
        }),
      });

      if (!chatResponse.ok) throw new Error("大模型追问服务异常");

      const chatData = await chatResponse.json();
      setCurrentQuestion(chatData.question);

      setHistory([
        ...updatedHistory,
        { role: "assistant" as const, content: chatData.question }
      ]);

      setQuestionCount((c) => c + 1);
      setTimeRemaining(120);

      // 调用 TTS 播放
      await speakQuestion(chatData.question);
    } catch (error) {
      console.error("【ERROR】面试闭环联调失败: ", error);
      setActionHint("大模型通信异常，请检查接口密钥或网络。");
    }
  };

  // 麦克风录音控制
  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        audioChunksRef.current = []; 
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = audioStream;
        
        const mediaRecorder = new MediaRecorder(audioStream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
        setActionHint("【麦克风已开启】正在倾听您的陈述。完成后，请点击下方“提交当前回答并深入追问”...");
      } catch (err) {
        alert("麦克风权限受限，请在浏览器中开启授权。");
      }
    } else {
      try {
        const recorder = mediaRecorderRef.current; 
        if (recorder && recorder.state !== "inactive") {
          recorder.onstop = () => {
            finalAudioBlobRef.current = new Blob(audioChunksRef.current, { type: "audio/webm" });
          };
          recorder.stop();
        }
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
      } catch (err) {
        console.error(err);
      }
      setIsRecording(false);
      setActionHint("作答录音已暂时挂起，您可以再次点击开启录制，或直接提交。");
    }
  };

  const handleFinishInterview = async () => {
    stopCamera();
    stopActiveAudio();
    setStep("report");
    setIsGeneratingReport(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: history,
          jobTitle: jobTitle,
          stressLevel: stressLevel,
          resumeText: getFormattedResumeAndFiles(),
          isFinish: true
        }),
      });

      if (!response.ok) throw new Error("报告生成接口异常");
      const reportJson = await response.json();
      setReportData(reportJson);
    } catch (error) {
      console.error(error);
      setReportData({
        score: 60,
        depthAnalysis: "由于网络异常，无法获取智能技术评估。请检查大模型配置。",
        structureAnalysis: "无法获取结构化表达评估。请确保您的回答在历史记录中成功保存。",
        stressAnalysis: "由于网络原因无法获取抗压能力诊断。"
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // 重新开始：彻底重置所有面试相关的 Context 状态，防止上下文污染
  const handleReset = () => {
    console.log("【System】触发系统彻底重置。");
    setStep("setup");
    stopCamera();
    stopActiveAudio();

    // 彻底重置所有核心数据流状态
    setUploadedFiles([]);
    setCurrentQuestion(
      "请结合你的项目，谈谈在超高并发场景下，你是如何防止 Redis 缓存击穿与雪崩的？请详细阐述你的双检锁设计与降级方案，不要背诵八股文。"
    );
    setHistory([]);
    setQuestionCount(1);
    setSatisfaction(85);
    setActionHint("系统准备就绪。请您梳理答题思路，点击下方按钮开始录音作答。");
    setIsRecording(false);
    setIsTimerActive(false); // 重设计时器活跃态
    setReportData(null); // 清空上次报告数据
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    finalAudioBlobRef.current = null;
  };

  // 中途退出面试返回配置页面（不生成报告，仅干净重置面试状态，保留已填简历和文件）
  const handleExitToSetup = () => {
    stopActiveAudio();
    stopCamera();
    setStep("setup");
    
    // 干净重置所有面试过程变量，避免状态污染
    setCurrentQuestion(
      "请结合你的项目，谈谈在超高并发场景下，你是如何防止 Redis 缓存击穿与雪崩的？请详细阐述你的双检锁设计与降级方案，不要背诵八股文。"
    );
    setHistory([]);
    setQuestionCount(1);
    setSatisfaction(85);
    setActionHint("面试即将开始，请做好准备...");
    setIsRecording(false);
    setIsTimerActive(false);
    setReportData(null);
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    finalAudioBlobRef.current = null;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between font-mono">
      
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          <span className="text-xs tracking-wider font-semibold text-zinc-300">
            AI 面试官正式接入 // 专业模拟评估系统
          </span>
        </div>
        <div className="text-[10px] text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded border border-zinc-800">
          系统状态: <span className="text-emerald-500 font-bold">准备就绪</span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col justify-center">
        
        {step === "setup" && (
          <InterviewSetup
            jobTitle={jobTitle}
            setJobTitle={setJobTitle}
            stressLevel={stressLevel}
            setStressLevel={setStressLevel}
            resumeText={resumeText}
            setResumeText={setResumeText}
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
            onStart={handleStartInterview}
          />
        )}

        {step === "interview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            <div className="lg:col-span-2 flex flex-col justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl relative">
              
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800/50">
                <div className="flex items-center space-x-3">
                  <div className="px-2 py-1 bg-zinc-800 text-zinc-300 border border-zinc-700/60 rounded text-[10px] font-bold tracking-wider">
                    {jobTitle.split(" ")[0]}
                  </div>
                  <span className="text-xs text-zinc-500">第 {questionCount} 轮追问</span>
                </div>
                
                <div className="flex items-center space-x-3 text-xs w-48">
                  <span className="text-zinc-500 whitespace-nowrap">耐心值:</span>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        satisfaction > 60 ? "bg-emerald-600" : satisfaction > 30 ? "bg-amber-600" : "bg-red-600 animate-pulse"
                      }`}
                      style={{ width: `${satisfaction}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 my-4">
                <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] mb-3 font-bold uppercase tracking-wider">
                  <Terminal size={12} /> 仿真对练中 (Core Probing)
                </div>
                <h2 className="text-base md:text-lg font-bold leading-relaxed text-zinc-100 pl-4 border-l-2 border-zinc-500">
                  {currentQuestion}
                </h2>
              </div>

              {/* 如果关闭了麦克风，自动在此展示一个精美的文本作答输入框 */}
              {!useMic && (
                <div className="mt-6 mb-2">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-550 mb-2 font-bold">
                    请在此处键入您的解答 (键盘作答模式)
                  </label>
                  <textarea
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    placeholder="结合前述项目背景与架构原理进行阐述..."
                    className="w-full h-36 bg-zinc-950 border border-zinc-800/80 rounded-lg p-4 text-xs focus:outline-none focus:border-zinc-700 transition resize-none font-mono text-zinc-300 leading-relaxed"
                  />
                </div>
              )}

              <div className="mt-8 bg-zinc-950 border border-zinc-800/80 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`flex-shrink-0 text-amber-500 ${isRecording ? "animate-pulse" : ""}`} size={16} />
                  <div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">考场侦测反馈</div>
                    <div className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                      {actionHint}
                    </div>
                  </div>
                </div>
              </div>

              {/* 控制按钮组 */}
              <div className="mt-8 flex flex-wrap gap-4 items-center">
                {/* 只有开启了麦克风才渲染录音按钮 */}
                {useMic && (
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`flex-shrink-0 flex items-center gap-2 px-6 py-4 rounded-lg font-bold text-xs tracking-wider uppercase transition ${
                      isRecording 
                        ? "bg-red-600 text-white animate-pulse" 
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                    }`}
                  >
                    {isRecording ? <Square size={14} /> : <Mic size={14} />}
                    {isRecording ? "暂停作答" : "开启麦克风作答"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="flex-shrink-0 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 px-6 py-4 rounded-lg font-bold text-xs tracking-wider uppercase transition"
                >
                  提交当前回答并深入追问
                </button>

                {/* 右侧增加中途返回配置入口 */}
                <div className="flex items-center space-x-3 ml-auto text-xs text-zinc-500">
                  <button
                    type="button"
                    onClick={handleExitToSetup}
                    className="hover:text-zinc-300 underline decoration-dashed underline-offset-4 transition"
                  >
                    返回修改配置
                  </button>
                  <span className="text-zinc-700">|</span>
                  <button
                    type="button"
                    onClick={handleFinishInterview}
                    className="hover:text-red-400 underline decoration-dashed underline-offset-4 transition animate-pulse"
                  >
                    结束面试，生成复盘报告
                  </button>
                </div>
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

        {step === "report" && (
          <ReportCard
            jobTitle={jobTitle}
            stressLevel={stressLevel}
            reportData={reportData}
            isLoading={isGeneratingReport}
            onReset={handleReset}
          />
        )}

      </main>

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