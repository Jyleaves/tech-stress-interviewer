// app/page.tsx
"use client";

import React, { useState } from "react";
import InterviewSetup from "./components/InterviewSetup";
import InterviewRoom from "./components/InterviewRoom";
import ReportCard from "./components/ReportCard";

type Step = "setup" | "interview" | "report";

interface HistoryItem {
  role: "user" | "assistant";
  content: string;
}

interface ReportData {
  score: number;
  depthAnalysis: string;
  structureAnalysis: string;
  stressAnalysis: string;
}

export default function Home() {
  const [step, setStep] = useState<Step>("setup");
  
  // 面试前置配置字典
  const [jobTitle, setJobTitle] = useState("求职开发（字节跳动 - 核心业务线后端开发一面）");
  const [stressLevel, setStressLevel] = useState("normal"); 
  const [resumeText, setResumeText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content: string }[]>([]);
  const [maxQuestions, setMaxQuestions] = useState<number>(4); 
  const [initTimeLimit, setInitTimeLimit] = useState<number>(300);
  const [useCamera, setUseCamera] = useState<boolean>(true);
  const [useMic, setUseMic] = useState<boolean>(true);

  // 自定义面试背景与考查重点状态
  const [interviewContext, setInterviewContext] = useState("");

  // 结案报告数据
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const handleStartInterview = (cameraPref: boolean, micPref: boolean, customLimit: number, customRounds: number) => {
    setUseCamera(cameraPref);
    setUseMic(micPref);
    setInitTimeLimit(customLimit);
    setMaxQuestions(customRounds);
    setStep("interview");
  };

  const handleInterviewFinish = async (
    reportDataFallback: unknown, 
    satisfaction: number, 
    timeoutCount: number, 
    finalHistory: HistoryItem[]
  ) => {
    setStep("report");
    setIsGeneratingReport(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: finalHistory,
          jobTitle, stressLevel, satisfaction, timeoutCount,
          interviewContext,
          isFinish: true 
        }),
      });
      if (!response.ok) throw new Error("API 异常");
      
      const json = await response.json();
      setReportData(json as ReportData);
    } catch (e) {
      setReportData({
        score: 60,
        depthAnalysis: "网络异常，无法获取技术评估。",
        structureAnalysis: "无法获取结构化表达评估。",
        stressAnalysis: "由于网络原因无法诊断。"
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleReset = () => {
    setStep("setup");
    setUploadedFiles([]);
    setReportData(null);
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
          系统状态: <span className="text-emerald-500 font-bold">
            {step === "interview" ? "对线中 (Probing)" : "准备就绪"}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col justify-center">
        {step === "setup" && (
          <InterviewSetup
            jobTitle={jobTitle} setJobTitle={setJobTitle}
            stressLevel={stressLevel} setStressLevel={setStressLevel}
            resumeText={resumeText} setResumeText={setResumeText}
            uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles}
            interviewContext={interviewContext} setInterviewContext={setInterviewContext}
            onStart={handleStartInterview}
          />
        )}

        {step === "interview" && (
          <InterviewRoom
            jobTitle={jobTitle} stressLevel={stressLevel}
            resumeText={resumeText} uploadedFiles={uploadedFiles}
            interviewContext={interviewContext}
            maxQuestions={maxQuestions} initTimeLimit={initTimeLimit}
            useCamera={useCamera} useMic={useMic}
            onFinish={handleInterviewFinish}
            onExit={() => setStep("setup")}
          />
        )}

        {step === "report" && (
          <ReportCard
            jobTitle={jobTitle} stressLevel={stressLevel}
            reportData={reportData} isLoading={isGeneratingReport}
            onReset={handleReset}
          />
        )}
      </main>

      <footer className="border-t border-zinc-800 bg-zinc-950 px-6 py-4 flex justify-between items-center text-[10px] text-zinc-600">
        <div><span>PROTOTYPE v2.0.0</span><span className="mx-2">|</span><span>PKU MLIC CHALLENGE 2026</span></div>
        <div><span>RECOMMENDED RATIO: 16:9</span></div>
      </footer>
    </div>
  );
}