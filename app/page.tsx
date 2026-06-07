// app/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Terminal, AlertTriangle, Loader2 } from "lucide-react";

import InterviewSetup from "./components/InterviewSetup";
import CameraMonitor from "./components/CameraMonitor";
import Timer from "./components/Timer";
import ReportCard from "./components/ReportCard";

type Step = "setup" | "interview" | "report";

export default function Home() {
  // 核心状态控制
  const [step, setStep] = useState<Step>("setup");
  const [jobTitle, setJobTitle] = useState("求职开发（字节跳动 - 核心业务线后端开发一面）");
  const [stressLevel, setStressLevel] = useState("hell"); // normal | hell
  const [resumeText, setResumeText] = useState("");

  const [maxQuestions, setMaxQuestions] = useState<number>(4);
  const [initTimeLimit, setInitTimeLimit] = useState<number>(120);

  // 用来控制在面试中是否开启视/音采集与展示
  const [useCamera, setUseCamera] = useState<boolean>(true);
  const [useMic, setUseMic] = useState<boolean>(true);
  const [typedAnswer, setTypedAnswer] = useState<string>(""); // 文本模式下的打字回答内容
  
  // 面试运行状态
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionCount, setQuestionCount] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120); // 单题 120 秒倒计时
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [satisfaction, setSatisfaction] = useState(85); // 面试官耐心值 (0-100)
  const [actionHint, setActionHint] = useState("系统准备就绪。请您梳理答题思路，点击下方按钮开始录音作答。");

  // 记录候选人在这场面试中严重超时的次数
  const [timeoutCount, setTimeoutCount] = useState<number>(0);

  // 用于控制首题大模型动态拟制时的等待加载动画
  const [isScannedLoading, setIsScannedLoading] = useState<boolean>(false);

  // 存储多个已解析的文件：包含文件名和解析出的具体内容
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content: string }[]>([]);
  
  // 生成报告时的加载等待状态
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState<{
    score: number;
    depthAnalysis: string;
    structureAnalysis: string;
    stressAnalysis: string;
  } | null>(null);

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
  const activeAudioRef = useRef<{ pause: () => void; currentTime: number } | null>(null);
  const isInterviewActiveRef = useRef<boolean>(false);

  // 原生浏览器本地 TTS 播音方案（免去任何服务器网络依赖，作为顶级降级兜底）
  const playNativeTTS = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setIsTimerActive(true);
      return;
    }
    
    // 强制终止当前所有的原生播放，防叠音
    window.speechSynthesis.cancel();

    // 剔除可能干扰机器人朗读的文本标记
    const cleanedText = text
      .replace(/（[^）]*）/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/【[^】]*】/g, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`/g, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    
    // 寻找本地较自然的中文声音
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      v => v.lang.includes("zh-CN") && (v.name.includes("Xiaoxiao") || v.name.includes("Yunxi") || v.name.includes("Google"))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 1.0; // 正常语速
    utterance.pitch = 1.0;

    utterance.onend = () => {
      console.log("【本地TTS】语音播报结束。");
      setIsTimerActive(true);
      if (useMic) {
        setActionHint("【语音模式】倒计时已开启！请点击下方“开启麦克风作答”开始陈述您的方案...");
      } else {
        setActionHint("【打字模式】倒计时已开启！请在输入框内键入您的技术解答并提交...");
      }
    };

    utterance.onerror = () => {
      setIsTimerActive(true);
    };

    window.speechSynthesis.speak(utterance);

    // 模拟成一个包含 pause 的虚拟实例存入 activeAudioRef，确保退出时能在这里被统一关闭
    activeAudioRef.current = {
      pause: () => window.speechSynthesis.cancel(),
      currentTime: 0
    };
  };

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

  // 倒计时与高压计时逻辑（打通超时次数累加）
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "interview" && isTimerActive) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setSatisfaction((s) => Math.max(s - 15, 10));
            setTimeoutCount((c) => c + 1); // 超时次数累加
            setActionHint("【警告】回答超时！面试官认为你缺乏结构化表达能力。");
            return initTimeLimit;
          }
          if (stressLevel === "hell" && prev % 15 === 0) {
            setSatisfaction((s) => Math.max(s - 2, 5));
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, stressLevel, isTimerActive, initTimeLimit]);

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
        // 【降级】如果后端语音接口挂了，调用浏览器本地的原生语音引擎
        console.warn("【TTS 降级】后端语音合成异常，正在调用浏览器本地语音...");
        playNativeTTS(text);
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
  const handleStartInterview = async (cameraPref: boolean, micPref: boolean, customLimit: number, customRounds: number) => {
    setUseCamera(cameraPref);
    setUseMic(micPref);
    setInitTimeLimit(customLimit);
    setMaxQuestions(customRounds);
    setTypedAnswer(""); 
    setTimeoutCount(0); // 初始化超时次数

    // 1. 开启“简历解析与定制拟题中”过渡状态
    setIsScannedLoading(true);
    isInterviewActiveRef.current = true;

    const fallbackIntoRoomWithLocalTTS = (text: string) => {
      setCurrentQuestion(text);
      setHistory([{ role: "assistant", content: text }]);
      setIsScannedLoading(false);
      setStep("interview");
      if (cameraPref) startCamera();
      setTimeRemaining(customLimit);
      setSatisfaction(80);
      setQuestionCount(1);
      
      // 💡 唤醒本地语音
      playNativeTTS(text);
    };

    try {
      console.log("【LLM】正在向后端请求首个定制面试问题...");
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: [],
          jobTitle: jobTitle,
          stressLevel: stressLevel,
          resumeText: getFormattedResumeAndFiles(),
          isFirst: true, // 告诉后端，我们需要第一题
          isFinish: false
        }),
      });

      // 安全防泄漏检查
      if (!isInterviewActiveRef.current) {
        console.log("【异步安全】获取首题前用户已退出，终止面试加载。");
        return;
      }

      if (!response.ok) throw new Error("首题获取服务异常");
      const data = await response.json();
      const firstQuestionText = data.question;

      // 在大厅还未开启时，在加载界面静默发起首题语音合成请求！
      console.log("【TTS】正在后台静默合成首题语音...");
      const ttsResponse = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: firstQuestionText }),
      });

      // 安全防泄漏检查
      if (!isInterviewActiveRef.current) {
        console.log("【异步安全】语音合成返回前用户已退出，放弃播放。");
        return;
      }
      
      if (ttsResponse.ok) {
        const ttsBlob = await ttsResponse.blob();
        const audioUrl = URL.createObjectURL(ttsBlob);
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;
        
        audio.onended = () => {
          console.log("【TTS】播音结束。考场倒计时正式启动。");
          setIsTimerActive(true);
          if (micPref) {
            setActionHint("【语音模式】倒计时已开启！请点击下方“开启麦克风作答”开始陈述您的方案...");
          } else {
            setActionHint("【打字模式】倒计时已开启！请在输入框内键入您的技术解答并提交...");
          }
        };

        // 准备就绪，关闭等待动画，进入房间
        setCurrentQuestion(firstQuestionText);
        setHistory([{ role: "assistant", content: firstQuestionText }]);
        setIsScannedLoading(false);
        setStep("interview");

        if (cameraPref) {
          startCamera(); 
        }

        setTimeRemaining(customLimit);
        setSatisfaction(stressLevel === "hell" ? 90 : 80);
        setQuestionCount(1);

        // 瞬间播放准备完毕的音轨，零延时开播
        audio.play();
        console.log("【TTS】首题语音预载成功并立即播放！");
      } else {
        fallbackIntoRoomWithLocalTTS(firstQuestionText);
      }

    } catch (err) {
      console.error(err);
      const fallbackQ = "请简要介绍一下你简历中最具挑战性的项目，你在其中承担了什么角色，以及如何解决当时遇到的技术瓶颈？";
      fallbackIntoRoomWithLocalTTS(fallbackQ);
    }
  };

  // 核心闭环：结束录音/直接读取打字内容 -> 语音转文字(ASR) -> 大模型追问(LLM) -> 语音合成(TTS)
  const handleNextQuestion = async () => {
    let userText = "";

    // 场景一：开启了麦克风（语音采集流程）
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
    // 场景二：关闭了麦克风（无障碍键盘打字作答流程）
    else {
      console.log("【Trigger】handleNextQuestion (文本模式).");
      if (!typedAnswer.trim()) {
        alert("回答内容不能为空，请先在下方输入框中键入您的技术解答方案。");
        return;
      }
      userText = typedAnswer;
      setTypedAnswer(""); // 提交后清空打字框
    }

    // 第四次追问提交时，自动进入结案生成报告
    if (questionCount >= maxQuestions) {
      setActionHint(`最终回答已录入，正在为您汇总本场所有对话生成多维复盘报告...`);
      // 先保存最后一次的用户回答历史
      const finalHistory = [
        ...history,
        { role: "user" as const, content: userText }
      ];
      setHistory(finalHistory);
      
      stopCamera();
      stopActiveAudio();
      setStep("report");
      setIsGeneratingReport(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            history: finalHistory, // 包含用户最后一轮解答
            jobTitle: jobTitle,
            stressLevel: stressLevel,
            resumeText: getFormattedResumeAndFiles(),
            satisfaction: satisfaction, // 投递最终耐心值
            timeoutCount: timeoutCount, // 投递答题超时次数
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
      return;
    }

    // 正常进入下一轮追问流程
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

      // 安全防泄漏检查
      if (!isInterviewActiveRef.current) {
        console.log("【异步安全】大模型追问返回前用户已退出，放弃后续流程。");
        return;
      }

      const chatData = await chatResponse.json();
      setCurrentQuestion(chatData.question);

      setHistory([
        ...updatedHistory,
        { role: "assistant" as const, content: chatData.question }
      ]);

      setQuestionCount((c) => c + 1);
      setTimeRemaining(initTimeLimit);

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

  // 手动中途生成报告
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
          satisfaction: satisfaction,
          timeoutCount: timeoutCount,
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

  // 彻底重置
  const handleReset = () => {
    console.log("【System】触发系统彻底重置。");
    setStep("setup");
    stopCamera();
    stopActiveAudio();

    setUploadedFiles([]);
    setCurrentQuestion("");
    setHistory([]);
    setQuestionCount(1);
    setSatisfaction(85);
    setTimeoutCount(0); // 重置超时次数
    setActionHint("系统准备就绪。请您梳理答题思路，点击下方按钮开始录音作答。");
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

  // 中途退出
  const handleExitToSetup = () => {
    stopActiveAudio();
    stopCamera();
    setStep("setup");
    
    setCurrentQuestion("");
    setHistory([]);
    setQuestionCount(1);
    setSatisfaction(85);
    setTimeoutCount(0); // 重置超时次数
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

      {/* 当用户点击开始、后端正在拼凑出第一题时显示 */}
      {isScannedLoading ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col justify-center items-center text-center">
          <Loader2 className="animate-spin text-zinc-400 mb-4" size={40} />
          <h2 className="text-sm font-bold text-zinc-200">正在审阅您的经历并生成定制化破冰问题...</h2>
          <p className="text-[11px] text-zinc-500 mt-2 max-w-sm leading-relaxed">
            AI 面试官正在根据您上传的简历文件与补充背景，为您量身定制第一道技术问题。这通常需要几秒钟。
          </p>
        </main>
      ) : (
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
                    {/* 进度条自适应显示：当前第几轮对答 */}
                    <span className="text-xs text-zinc-500">
                      进度: {questionCount} / {maxQuestions} 轮
                    </span>
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
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-555 mb-2 font-bold">
                      请在此处键入您的解答 (键盘作答模式)
                    </label>
                    <textarea
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      placeholder="请结合您上传的简历文件、项目背景详细解答本题..."
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
                    {/* 动态提示：当轮到最后一题时，按钮自适应变更文字，提升闭环引导体验 */}
                    {questionCount >= maxQuestions ? "提交最终回答并生成报告" : "提交当前回答并深入追问"}
                  </button>

                  <div className="flex items-center space-x-3 ml-auto text-xs text-zinc-500">
                    <button
                      type="button"
                      onClick={handleExitToSetup}
                      className="hover:text-zinc-300 underline decoration-dashed underline-offset-4 transition"
                    >
                      中途返回
                    </button>
                    <span className="text-zinc-700">|</span>
                    <button
                      type="button"
                      onClick={handleFinishInterview}
                      className="hover:text-red-400 underline decoration-dashed underline-offset-4 transition animate-pulse"
                    >
                      提前结束面试并评估
                    </button>
                  </div>
                </div>
              </div>

              {/* 摄像头监视器 & 计时器 */}
              <div className="flex flex-col space-y-6">
                <Timer timeRemaining={timeRemaining} initTimeLimit={initTimeLimit} />
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
      )}

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