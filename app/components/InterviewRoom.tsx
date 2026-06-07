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
  interviewContext: string;
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
  jobTitle, stressLevel, resumeText, uploadedFiles, interviewContext, maxQuestions,
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

  // 安全重试机制与语音实时转换状态
  const [isApiError, setIsApiError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false); // 语音转写中
  const [lastSubmittedText, setLastSubmittedText] = useState("");
  const [lastSubmittedHistory, setLastSubmittedHistory] = useState<HistoryItem[]>([]);

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
      setActionHint(useMic ? "倒计时已开启！请键入或使用麦克风录入作答..." : "倒计时已开启！请在输入框键入解答...");
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
          setActionHint(useMic ? "倒计时已开启！请键入或使用麦克风录入作答..." : "倒计时已开启！请在输入框键入解答...");
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
          interviewContext,
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

  // 💡 对话请求发送器
  async function sendChatRequest(userText: string, currentHistory: HistoryItem[]) {
    setIsSubmitting(true);
    setIsApiError(false);
    setActionHint("面试官正在研判您的逻辑...");

    const newHistory = [...currentHistory, { role: "user" as const, content: userText }];
    
    // 更新本地渲染历史并暂存上一轮历史状态
    setHistory(newHistory);
    setLastSubmittedHistory(currentHistory); 

    try {
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: newHistory, jobTitle, stressLevel, resumeText: getResumeContext(),
          interviewContext,
          isFinish: false, topicCount, maxQuestions
        }),
      });

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
      } else {
        setFollowUpCount(c => c + 1);
      }

      setTimeRemaining(initTimeLimit);
      setTypedAnswer("");

      setCurrentQuestion(chatData.question);
      setHistory([...newHistory, { role: "assistant", content: chatData.question }]);
      speakQuestion(chatData.question);

    } catch (e) {
      if (isComponentMounted.current) {
        setIsApiError(true);
        setActionHint("【网络波动】生成面试官提问失败，您的解答已暂存，请尝试手动重试。");
      }
    } finally {
      if (isComponentMounted.current) {
        setIsSubmitting(false);
      }
    }
  }

  // 💡 统一提交处理：直接从文本框读取数据提交
  async function handleNextQuestion() {
    if (isSubmitting || isTranscribing) return;

    const userText = typedAnswer;
    if (!userText || !userText.trim()) {
      return alert("解答内容不能为空，请手动键入或使用语音辅助输入。");
    }

    setLastSubmittedText(userText);
    await sendChatRequest(userText, history);
  }

  // 手动一键重试逻辑
  async function handleRetry() {
    if (!lastSubmittedText || isSubmitting) return;
    await sendChatRequest(lastSubmittedText, lastSubmittedHistory);
  }

  function triggerFinish(finalHistory: HistoryItem[]) {
    stopCamera(); stopActiveAudio();
    onFinish(null, satisfaction, timeoutCount, finalHistory); 
  }

  // 麦克风独立控制：仅作为“语音辅助打字机”，录音结束后进行 ASR 翻译并将文本无缝追加到输入框
  async function toggleRecording() {
    if (isSubmitting || isTranscribing) return;

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
        setActionHint("【语音输入中】请开始陈述，说完后再次点击该按钮以转换成文字...");
      } catch (err) { alert("获取麦克风失败，请确认设备权限是否已授权。"); }
    } else {
      setIsRecording(false);
      setActionHint("录音已结束，正在呼唤语音识别转换中...");

      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }

      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          if (!audioBlob || audioBlob.size === 0) {
            setActionHint("未采集到清晰录音，请重新尝试。");
            return;
          }

          setIsTranscribing(true);
          setActionHint("语音智能转换中 (ASR)...");
          try {
            const fd = new FormData();
            fd.append("file", audioBlob, "a.webm");
            const asrRes = await fetch("/api/transcribe", { method: "POST", body: fd });
            if (!asrRes.ok) throw new Error("语音转换异常");
            const asrResult = await asrRes.json();

            if (asrResult.text && asrResult.text.trim()) {
              // 将转写出来的文字追加到当前 typedAnswer 的尾部，并加上空格分隔
              setTypedAnswer(prev => prev ? prev + " " + asrResult.text : asrResult.text);
              setActionHint("语音翻译成功！您可在输入框中直接检查微调，随后提交。");
            } else {
              setActionHint("未检测到清晰发音，请直接键入，或重新录音。");
            }
          } catch (e) {
            setActionHint("【语音服务暂时断开】无法自动转换为文字，请使用键盘输入。");
          } finally {
            setIsTranscribing(false);
          }
        };
        mediaRecorderRef.current.stop();
      }
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

        {/* 面试官核心提问区域（思考中、断开异常、正常追问） */}
        <div className="flex-1 my-4 min-h-[140px] flex flex-col justify-center">
          {isSubmitting ? (
            <div className="flex flex-col justify-center py-4 pl-4 border-l-2 border-amber-500/60 animate-pulse">
              <div className="flex items-center gap-2 text-amber-500 text-[10px] mb-2.5 font-bold uppercase tracking-wider">
                <Loader2 className="animate-spin" size={12} />
                研判中 (Evaluating)...
              </div>
              <p className="text-zinc-400 text-sm md:text-base italic leading-relaxed">
                面试官正在仔细梳理您的回答，并准备下一轮深挖提问...
              </p>
            </div>
          ) : isApiError ? (
            <div className="flex flex-col justify-center py-4 pl-4 border-l-2 border-red-500/60">
              <div className="text-red-500 text-[10px] mb-2.5 font-bold uppercase tracking-wider">
                ⚠️ 面试官断开连接 (Disconnection)
              </div>
              <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-4">
                由于公网连接出现短暂波动，面试官未能及时做出回应。您的解答已暂存，请尝试重新生成。
              </p>
              <div>
                <button 
                  onClick={handleRetry} 
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-zinc-100 rounded text-xs font-bold tracking-wider transition uppercase shadow-lg"
                >
                  重新生成提问
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] mb-3 font-bold uppercase tracking-wider">
                <Terminal size={12} /> {followUpCount === 0 ? "新话题引入" : "极压追问 (Follow-up)"}
              </div>
              <h2 className="text-base md:text-lg font-bold leading-relaxed text-zinc-100 pl-4 border-l-2 border-zinc-500">
                {currentQuestion}
              </h2>
            </div>
          )}
        </div>

        {/* 统一输入框（始终存在） */}
        <div className="mt-6 mb-2">
          <textarea 
            value={typedAnswer} 
            onChange={e => setTypedAnswer(e.target.value)} 
            disabled={isSubmitting || isTranscribing}
            placeholder={
              isSubmitting 
                ? "面试官思考中，内容暂时锁定..." 
                : isTranscribing 
                  ? "正在智能转写中，请稍候..." 
                  : useMic 
                    ? "请键入您的技术解答，或者利用下方的麦克风直接说出您的想法并在编辑微调后点击提交..." 
                    : "请在这里键入技术解答并点击提交..."
            }
            className="w-full h-36 bg-zinc-950 border border-zinc-800/80 rounded-lg p-4 text-xs focus:border-zinc-700 font-mono text-zinc-300 resize-none disabled:opacity-40 leading-relaxed" 
          />
        </div>

        {/* 考场反馈实时条 */}
        <div className="mt-8 bg-zinc-950 border border-zinc-800/80 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className={`text-amber-500 mt-0.5 ${isRecording || isSubmitting || isTranscribing ? "animate-pulse" : ""}`} size={16} />
          <div>
            <div className="text-[10px] font-bold text-zinc-400">考场反馈</div>
            <div className="text-[10px] text-zinc-500 mt-1">{actionHint}</div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-4 items-center">
          {/* 麦克风输入辅助：只有在 Setup 页面打开麦克风录音授权时才呈现 */}
          {useMic && (
            <button 
              onClick={toggleRecording} 
              disabled={isSubmitting || isTranscribing}
              className={`flex items-center gap-2 px-6 py-4 rounded-lg font-bold text-xs uppercase transition ${isSubmitting || isTranscribing ? "opacity-40 cursor-not-allowed" : ""} ${isRecording ? "bg-red-600 animate-pulse" : "bg-zinc-800 hover:bg-zinc-750 text-zinc-200"}`}
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="animate-spin text-zinc-300" size={14} />
                  识别中...
                </>
              ) : (
                <>
                  {isRecording ? <Square size={14} /> : <Mic size={14} />} 
                  {isRecording ? "说完了（点击转换）" : "麦克风语音输入辅助"}
                </>
              )}
            </button>
          )}
          
          <button 
            onClick={handleNextQuestion} 
            disabled={isSubmitting || isTranscribing}
            className={`bg-zinc-100 text-zinc-950 hover:bg-zinc-200 px-6 py-4 rounded-lg font-bold text-xs uppercase transition flex items-center gap-2 ${isSubmitting || isTranscribing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin text-zinc-900" size={14} />
                正在评判解答...
              </>
            ) : "提交回答并继续"}
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