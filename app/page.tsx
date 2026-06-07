// app/page.tsx
"use client";

import React, { useState } from "react";
import InterviewSetup from "./components/InterviewSetup";
import InterviewRoom from "./components/InterviewRoom";
import ReportCard, { ReportData } from "./components/ReportCard";

type Step = "setup" | "interview" | "report";

interface HistoryItem {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [step, setStep] = useState<Step>("setup");
  
  // 面试前置配置
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

  // 用于在内存中暂存最后的面试数据，以便网络出错时支持手动无损重试生成
  const [savedHistory, setSavedHistory] = useState<HistoryItem[]>([]);
  const [savedSatisfaction, setSavedSatisfaction] = useState(80);
  const [savedTimeout, setSavedTimeout] = useState(0);

  const handleStartInterview = (cameraPref: boolean, micPref: boolean, customLimit: number, customRounds: number) => {
    setUseCamera(cameraPref);
    setUseMic(micPref);
    setInitTimeLimit(customLimit);
    setMaxQuestions(customRounds);
    setStep("interview");
  };

  // 将报告生成逻辑封装成高内聚方法，同时支持首次生成和重试生成
  const triggerReportGeneration = async (
    historyToUse: HistoryItem[], 
    satisfactionToUse: number, 
    timeoutToUse: number
  ) => {
    setIsGeneratingReport(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: historyToUse,
          jobTitle, stressLevel, interviewContext,
          satisfaction: satisfactionToUse, 
          timeoutCount: timeoutToUse,
          isFinish: true 
        }),
      });
      if (!response.ok) throw new Error("API 异常");
      
      const json = await response.json();
      setReportData(json as ReportData);
    } catch (e) {
      // 结构体完美匹配新版商业复盘报告，阻断 React 渲染树崩溃
      setReportData({
        score: 60,
        dimensions: {
          knowledgeDepth: 50,
          logicSTAR: 50,
          stressCoping: 50,
          problemSolving: 50,
          communication: 50
        },
        depthAnalysis: "【网络连接超时】由于公网数据传输发生波动，未能成功拉取技术原理评估。请放心，您的作答数据已安全锁定保存，请点击下方的重试按钮重新生成复盘。",
        structureAnalysis: "由于网络异常，未能成功拉取结构化表达评估。",
        stressAnalysis: "由于网络异常，未能成功拉取情绪抗压能力评价。",
        strongPoints: ["未检测到（报告生成超时，请重试）"],
        weakPoints: ["未检测到（报告生成超时，请重试）"],
        actionableAdvice: ["网络连接出现波动，请点击底部的“重新尝试生成诊断报告”按钮进行无损重试。"]
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleInterviewFinish = async (
    reportDataFallback: unknown, 
    satisfaction: number, 
    timeoutCount: number, 
    finalHistory: HistoryItem[]
  ) => {
    setStep("report");
    
    // 暂存数据进入内存，保障可以手动一键重刷
    setSavedHistory(finalHistory);
    setSavedSatisfaction(satisfaction);
    setSavedTimeout(timeoutCount);

    await triggerReportGeneration(finalHistory, satisfaction, timeoutCount);
  };

  // 提供给 ReportCard 调用的手动重试恢复接口
  const handleRegenerateReport = async () => {
    await triggerReportGeneration(savedHistory, savedSatisfaction, savedTimeout);
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
            onRegenerate={handleRegenerateReport} // 注入重试接口
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