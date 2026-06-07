// app/components/InterviewRoom.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Terminal, AlertTriangle, Loader2 } from "lucide-react";
import CameraMonitor from "./CameraMonitor";
import Timer from "./Timer";

interface HistoryItem {
  role: "user" | "assistant";
  content: string;
}

interface InterviewRoomProps {
  jobTitle: string;
  stressLevel: string;
  resumeText: string;
  uploadedFiles: { name: string; content: string }[];
  maxQuestions: number;
  initTimeLimit: number;
  useCamera: boolean;
  useMic: boolean;
  onFinish: (
    reportData: unknown, 
    finalSatisfaction: number, 
    finalTimeoutCount: number, 
    finalHistory: HistoryItem[]
  ) => void;
  onExit: () => void;
}

export default function InterviewRoom({
  jobTitle, stressLevel, resumeText, uploadedFiles, maxQuestions,
  initTimeLimit, useCamera, useMic, onFinish, onExit
}: InterviewRoomProps) {

  const [isScannedLoading, setIsScannedLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // 双轨制状态控制：话题进度 vs 深入追问
  const [topicCount, setTopicCount] = useState(1); 
  const [followUpCount, setFollowUpCount] = useState(0); 
  
  const [typedAnswer, setTypedAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(initTimeLimit);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [satisfaction, setSatisfaction] = useState(stressLevel === "hell" ? 90 : 80);
  const [timeoutCount, setTimeoutCount] = useState(0);
  const [actionHint, setActionHint] = useState("正在为您准备问题...");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<{ pause: () => void; currentTime: number } | null>(null);
  const isComponentMounted = useRef(true);

  async function startCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setStream(mediaStream);
    } catch (err) { console.warn("摄像头权限受限"); }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }

  function stopActiveAudio() {
    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); } catch (e) {}
      activeAudioRef.current = null;
    }
  }

  function playNativeTTS(text: string) {
    if (!text || typeof text !== "string") {
      setIsTimerActive(true);
      return;
    }
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setIsTimerActive(true); return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[（【\[].*?[）】\]]/g, "").replace(/[*`]/g, ""));
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.includes("zh-CN") && (v.name.includes("Xiaoxiao") || v.name.includes("Yunxi")));
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      setIsTimerActive(true);
      setActionHint(useMic ? "倒计时已开启！请开启麦克风作答..." : "倒计时已开启！请在输入框键入解答...");
    };
    window.speechSynthesis.speak(utterance);
    activeAudioRef.current = { pause: () => window.speechSynthesis.cancel(), currentTime: 0 };
  }

  async function speakQuestion(text: string) {
    if (!text || typeof text !== "string") {
      setIsTimerActive(true);
      return;
    }
    try {
      stopActiveAudio();
      setIsTimerActive(false);
      setActionHint("面试官正在发问，请梳理思路...");
      const ttsRes = await fetch("/api/tts", { method: "POST", body: JSON.stringify({ text }) });
      if (ttsRes.ok) {
        const audioUrl = URL.createObjectURL(await ttsRes.blob());
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;
        audio.onended = () => {
          setIsTimerActive(true);
          setActionHint(useMic ? "倒计时已开启！请开启麦克风作答..." : "倒计时已开启！请在输入框键入解答...");
        };
        audio.play();
      } else { playNativeTTS(text); }
    } catch { playNativeTTS(text); }
  }

  function getResumeContext() {
    let res = resumeText ? `补充背景：\n${resumeText}\n\n` : "";
    uploadedFiles.forEach((f, i) => res += `文件[${i+1}]:${f.name}\n${f.content}\n\n`);
    return res;
  }

  async function initFirstQuestion() {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          history: [], jobTitle, stressLevel, resumeText: getResumeContext(),
          isFirst: true, isFinish: false, topicCount: 1, maxQuestions
        }),
      });
      const data = await res.json();
      if (!isComponentMounted.current) return;
      setCurrentQuestion(data.question);
      setHistory([{ role: "assistant", content: data.question }]);
      setIsScannedLoading(false);
      speakQuestion(data.question);
    } catch (e) {
      const fb = "请简要介绍一下你简历中最具挑战性的项目？";
      setCurrentQuestion(fb);
      setIsScannedLoading(false);
      playNativeTTS(fb);
    }
  }

  // 初始化音视频与考场
  useEffect(() => {
    isComponentMounted.current = true;

    // 将状态初始化推迟到下一个事件循环 Tick，确保 React 初次 Mount 完全结束后再触发
    const timer = setTimeout(() => {
      if (isComponentMounted.current) {
        if (useCamera) {
          startCamera();
        }
        initFirstQuestion();
      }
    }, 0);

    return () => {
      isComponentMounted.current = false;
      clearTimeout(timer);
      stopCamera();
      stopActiveAudio();
    };
  }, []);

  // 倒计时逻辑
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerActive) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setSatisfaction((s) => Math.max(s - 15, 10));
            setTimeoutCount((c) => c + 1);
            setActionHint("【警告】回答超时！面试官认为你缺乏结构化表达能力。");
            return initTimeLimit;
          }
          if (stressLevel === "hell" && prev % 15 === 0) setSatisfaction((s) => Math.max(s - 2, 5));
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerActive, stressLevel, initTimeLimit]);

  async function handleNextQuestion() {
    let userText = typedAnswer;
    if (useMic) {
      if (isRecording && mediaRecorderRef.current) {
         await new Promise<void>(res => {
           mediaRecorderRef.current!.onstop = () => res();
           mediaRecorderRef.current!.stop();
         });
         setIsRecording(false);
      }
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      if (!audioBlob || audioBlob.size === 0) return alert("未采集到录音！");
      setActionHint("正在分析...");
      const fd = new FormData(); fd.append("file", audioBlob, "a.webm");
      const asr = await fetch("/api/transcribe", { method: "POST", body: fd });
      userText = (await asr.json()).text;
    } else {
      if (!userText.trim()) return alert("解答不能为空");
      setTypedAnswer("");
    }

    if (!userText) { setActionHint("未检测到声音，请重试。"); return; }
    setActionHint("面试官正在研判您的逻辑...");

    // 确认输入文本已被正确抓取
    // console.log("[Frontend] 准备提交的 userText:", userText);
    
    const newHistory = [...history, { role: "user" as const, content: userText }];
    // console.log("[Frontend] 准备发送的完整 history:", newHistory);
    setHistory(newHistory);

    try {
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          history: newHistory, jobTitle, stressLevel, resumeText: getResumeContext(),
          isFinish: false, topicCount, maxQuestions
        }),
      });

      // 检测并强行拦截非 200 HTTP 状态响应，直接抛异常进入 catch 分支
      if (!chatRes.ok) {
        throw new Error("大模型追问服务响应异常");
      }
      
      if (!isComponentMounted.current) return;
      const chatData = await chatRes.json();

      if (chatData.action === "finish" || topicCount > maxQuestions) {
        triggerFinish(newHistory);
        return;
      }

      if (chatData.action === "new-topic") {
        setTopicCount(c => c + 1);
        setFollowUpCount(0);
        setTimeRemaining(initTimeLimit);
      } else {
        setFollowUpCount(c => c + 1);
      }

      setCurrentQuestion(chatData.question);
      setHistory([...newHistory, { role: "assistant", content: chatData.question }]);
      speakQuestion(chatData.question);

    } catch (e) { setActionHint("【网络或服务异常】大模型追问解析失败，请检查网络后点击重新提交。"); }
  }

  function triggerFinish(finalHistory: HistoryItem[]) {
    stopCamera(); stopActiveAudio();
    onFinish(null, satisfaction, timeoutCount, finalHistory); 
  }

  async function toggleRecording() {
    if (!isRecording) {
      try {
        audioChunksRef.current = [];
        const streamInstance = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = streamInstance;
        const recorder = new MediaRecorder(streamInstance);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        recorder.start();
        setIsRecording(true);
        setActionHint("【录音中】正在倾听您的陈述...");
      } catch (err) { alert("麦克风受限"); }
    } else {
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      setActionHint("作答已挂起，可再次开启或提交。");
    }
  }

  if (isScannedLoading) return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col justify-center items-center text-center">
      <Loader2 className="animate-spin text-zinc-400 mb-4" size={40} />
      <h2 className="text-sm font-bold text-zinc-200">正在审阅经历并生成问题...</h2>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch w-full max-w-7xl mx-auto">
      <div className="lg:col-span-2 flex flex-col justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800/50">
          <div className="flex items-center space-x-3">
            <div className="px-2 py-1 bg-zinc-800 text-zinc-300 border border-zinc-700/60 rounded text-[10px] font-bold tracking-wider">
              {jobTitle.split(" ")[0]}
            </div>
            <span className="text-xs text-zinc-500 font-bold">
              话题: {topicCount}/{maxQuestions} <span className="mx-1">|</span> 连环追问: {followUpCount}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-xs w-48">
            <span className="text-zinc-500 whitespace-nowrap">耐心值:</span>
            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
              <div className={`h-full transition-all duration-500 ${satisfaction > 60 ? "bg-emerald-600" : "bg-red-600 animate-pulse"}`} style={{ width: `${satisfaction}%` }} />
            </div>
          </div>
        </div>

        <div className="flex-1 my-4">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] mb-3 font-bold uppercase tracking-wider">
            <Terminal size={12} /> {followUpCount === 0 ? "新话题引入" : "极压追问 (Follow-up)"}
          </div>
          <h2 className="text-base md:text-lg font-bold leading-relaxed text-zinc-100 pl-4 border-l-2 border-zinc-500">
            {currentQuestion}
          </h2>
        </div>

        {!useMic && (
          <div className="mt-6 mb-2">
            <textarea value={typedAnswer} onChange={e => setTypedAnswer(e.target.value)} placeholder="键入技术解答..." className="w-full h-36 bg-zinc-950 border border-zinc-800/80 rounded-lg p-4 text-xs focus:border-zinc-700 font-mono text-zinc-300 resize-none" />
          </div>
        )}

        <div className="mt-8 bg-zinc-950 border border-zinc-800/80 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className={`text-amber-500 ${isRecording ? "animate-pulse" : ""}`} size={16} />
          <div><div className="text-[10px] font-bold text-zinc-400">考场反馈</div><div className="text-[10px] text-zinc-500 mt-1">{actionHint}</div></div>
        </div>

        <div className="mt-8 flex flex-wrap gap-4 items-center">
          {useMic && (
            <button onClick={toggleRecording} className={`flex items-center gap-2 px-6 py-4 rounded-lg font-bold text-xs uppercase ${isRecording ? "bg-red-600 animate-pulse" : "bg-zinc-800"}`}>
              {isRecording ? <Square size={14} /> : <Mic size={14} />} {isRecording ? "暂停作答" : "开启麦克风"}
            </button>
          )}
          <button onClick={handleNextQuestion} className="bg-zinc-100 text-zinc-950 hover:bg-zinc-200 px-6 py-4 rounded-lg font-bold text-xs uppercase transition">
            提交回答并继续
          </button>
          <div className="flex items-center space-x-3 ml-auto text-xs text-zinc-500">
            <button onClick={onExit} className="hover:text-zinc-300 underline underline-offset-4">中途返回</button>
            <span className="text-zinc-700">|</span>
            <button onClick={() => triggerFinish(history)} className="hover:text-red-400 underline underline-offset-4 animate-pulse">提前结束</button>
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-6">
        <Timer timeRemaining={timeRemaining} initTimeLimit={initTimeLimit} />
        <CameraMonitor stream={stream} videoRef={videoRef} isRecording={isRecording} />
      </div>
    </div>
  );
}