"use client";

import React, { useState } from "react";
import { Award, BarChart2, CornerDownRight, Flame, RefreshCw, Loader2, CheckCircle, AlertOctagon, TrendingUp, Download } from "lucide-react";

export interface ReportData {
  score: number;
  dimensions: {
    knowledgeDepth: number;
    logicSTAR: number;
    stressCoping: number;
    problemSolving: number;
    communication: number;
  };
  depthAnalysis: string;
  structureAnalysis: string;
  stressAnalysis: string;
  strongPoints: string[];
  weakPoints: string[];
  actionableAdvice: string[];
}

interface ReportCardProps {
  jobTitle: string;
  stressLevel: string;
  reportData: ReportData | null;
  isLoading: boolean;
  onReset: () => void;
}

export default function ReportCard({ jobTitle, stressLevel, reportData, isLoading, onReset }: ReportCardProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handleExportPDF = async () => {
    setIsPrinting(true);
    const reportElement = document.getElementById("printable-report-area");
    if (!reportElement) {
      setIsPrinting(false);
      return;
    }

    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      // 1. 生成高清 Canvas
      const canvas = await html2canvas(reportElement, {
        scale: 2, 
        useCORS: true,
        backgroundColor: "#09090b", 
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      
      // 🌟 设定 10mm 的呼吸感页边距
      const margin = 10; 
      const availWidth = pageWidth - margin * 2;  // 190mm
      const availHeight = pageHeight - margin * 2; // 277mm

      // 计算图片铺满可用宽度时的初始高度
      const ratio = availWidth / canvas.width;
      let imgWidth = availWidth;
      let imgHeight = canvas.height * ratio;

      // 🚀 核心：智能缩放逻辑 (Smart Fit)
      // 如果高度超出了可用高度，但超出的比例在 20% 以内，则强制等比缩小，塞进单页！
      const overflowRatio = imgHeight / availHeight;
      if (overflowRatio > 1 && overflowRatio <= 1.20) {
        const scaleDown = availHeight / imgHeight;
        imgWidth *= scaleDown;
        imgHeight = availHeight; // 高度锁定为可用高度
      }

      // 📄 场景 A：内容在一页内（包含被智能缩放后塞进一页的情况）
      if (imgHeight <= availHeight) {
        // 计算居中偏移量
        const offsetX = (pageWidth - imgWidth) / 2;
        const offsetY = (pageHeight - imgHeight) / 2;
        pdf.addImage(imgData, "JPEG", offsetX, offsetY, imgWidth, imgHeight);
      } 
      // 📑 场景 B：内容实在太长，必须多页分页
      else {
        let heightLeft = imgHeight;
        let position = margin; // 第一页 Y 轴起点
        let pageIndex = 0;

        while (heightLeft > 0) {
          if (pageIndex > 0) {
            pdf.addPage();
          }
          // 添加图片 (利用 position 为负数来实现长图向下滚动截断)
          pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
          
          heightLeft -= availHeight;
          position -= availHeight; // 下一页图片的 Y 坐标要往上移一页的高度
          pageIndex++;
        }
      }

      // 触发下载
      pdf.save(`AI面试能力诊断报告_${jobTitle.replace(/[\s\(\)（）]/g, "_")}.pdf`);
      
    } catch (error) {
      console.error("PDF 导出失败:", error);
      alert("导出失败，请查看控制台错误信息。");
    } finally {
      setIsPrinting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center shadow-2xl flex flex-col items-center justify-center min-h-[450px]">
        <Loader2 className="animate-spin text-zinc-400 mb-4" size={36} />
        <h2 className="text-sm font-bold text-zinc-200">AI 正在深度解析您的面试表现...</h2>
        <p className="text-[11px] text-zinc-500 mt-2 max-w-sm leading-relaxed">
          我们正在利用高阶模型研判本次面试的上下文。请稍候，我们将为您生成一份包含核心硬伤拆解、多维度评分的诊断复盘。
        </p>
      </div>
    );
  }

  const data: ReportData = reportData || {
    score: 60,
    dimensions: { knowledgeDepth: 60, logicSTAR: 60, stressCoping: 60, problemSolving: 60, communication: 60 },
    depthAnalysis: "未提取到足够长的对话记录，建议至少完整回答 2-3 轮以提供实质技术方案进行底层原理扫描。",
    structureAnalysis: "面试提前终止，当前对话文本中尚未收集到能够使用 STAR 模型评估的结构化表达上下文。",
    stressAnalysis: "当前常规压力下未能全面压榨出边界状态，若需要进行压力极限压测，建议在 Setup 开启“压力测试”模式。",
    strongPoints: ["在基础概念表述中，能保持完整的行业通用术语规范"],
    weakPoints: ["未能深度展开原理，有背诵概念和面经的嫌疑，对底层架构源码缺少深入探索"],
    actionableAdvice: ["建议结合项目难点，寻找 1-2 个业界主流开源方案（如 Redis / RocketMQ / React 内核）去精读其生命周期和一致性模型相关源码"]
  };

  const getDimensionLabel = (key: keyof ReportData["dimensions"]) => {
    switch(key) {
      case "knowledgeDepth": return "技术深度与原理掌握";
      case "logicSTAR": return "表达逻辑 (STAR结构化)";
      case "stressCoping": return "临场抗压与情绪调节";
      case "problemSolving": return "折中设计与实际防线";
      case "communication": return "沟通效率与语意压缩";
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      
      <div id="printable-report-area" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 border-b border-zinc-800/60 pb-6">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2.5 text-zinc-100">
              <Award className="text-amber-500" size={24} />
              AI 智能模拟面试复盘评估报告
            </h1>
            <p className="text-xs text-zinc-500">
              评测场景：<span className="text-zinc-300 font-bold">{jobTitle}</span> ｜ 压力级别：<span className="text-zinc-300 font-bold">{stressLevel === "hell" ? "HELL 极限施压" : "常规仿真模式"}</span>
            </p>
          </div>
          <div className="bg-zinc-950/80 p-3.5 border border-zinc-800 rounded-xl text-center min-w-[140px] shadow-lg">
            <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider">综合匹配度</span>
            <span className={`text-3xl font-extrabold block mt-1 ${data.score >= 80 ? "text-emerald-500" : data.score >= 60 ? "text-amber-500" : "text-red-500"}`}>
              {data.score}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-zinc-800/40">
          <div className="flex flex-col justify-center items-center bg-zinc-950/40 border border-zinc-800/40 p-6 rounded-xl">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">核心匹配透视图</h3>
            <div className="relative flex justify-center items-center w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="54" strokeWidth="6" stroke="#27272a" fill="transparent" />
                <circle cx="64" cy="64" r="54" strokeWidth="8" stroke={data.score >= 80 ? "#10b981" : data.score >= 60 ? "#f59e0b" : "#ef4444"} fill="transparent" strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - data.score / 100)} className="transition-all duration-1000" />
              </svg>
              <div className="absolute flex flex-col justify-center items-center">
                <span className="text-2xl font-black text-zinc-100">{data.score}</span>
                <span className="text-[9px] text-zinc-500 uppercase">Match Score</span>
              </div>
            </div>
            <div className="text-[10px] text-zinc-500 text-center mt-3 leading-relaxed max-w-[240px]">得分由大模型综合研判逻辑链、知识广度、面对深度追问时的临场反应加权产出。</div>
          </div>

          <div className="space-y-4 justify-center flex flex-col">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">能力维度细节诊断 (Sub-scores)</h3>
            {Object.keys(data.dimensions).map((key) => {
              const val = data.dimensions[key as keyof ReportData["dimensions"]];
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-medium">{getDimensionLabel(key as keyof ReportData["dimensions"])}</span>
                    <span className="text-zinc-200 font-bold font-mono">{val}/100</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${val >= 80 ? "bg-emerald-500" : val >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${val}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-zinc-950/40 p-5 rounded-xl border border-emerald-950/80 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3"><CheckCircle size={14} className="text-emerald-500" /> 亮点追踪 (Highlights)</div>
              <ul className="space-y-2.5">
                {data.strongPoints.map((item, idx) => (<li key={idx} className="text-xs text-zinc-400 leading-relaxed pl-4 relative before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:bg-emerald-500 before:rounded-full">{item}</li>))}
              </ul>
            </div>
            <div className="text-[9px] text-zinc-650 mt-4 text-right select-none uppercase tracking-wider font-bold">Excellent</div>
          </div>

          <div className="bg-zinc-950/40 p-5 rounded-xl border border-red-950/80 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider mb-3"><AlertOctagon size={14} className="text-red-500" /> 硬伤纠偏 (Deficiencies)</div>
              <ul className="space-y-2.5">
                {data.weakPoints.map((item, idx) => (<li key={idx} className="text-xs text-zinc-400 leading-relaxed pl-4 relative before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:bg-red-500 before:rounded-full">{item}</li>))}
              </ul>
            </div>
            <div className="text-[9px] text-zinc-650 mt-4 text-right select-none uppercase tracking-wider font-bold">Critical Flaws</div>
          </div>

          <div className="bg-zinc-950/40 p-5 rounded-xl border border-amber-950/80 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wider mb-3"><TrendingUp size={14} className="text-amber-500" /> 跃迁指南 (Action Plan)</div>
              <ul className="space-y-2.5">
                {data.actionableAdvice.map((item, idx) => (<li key={idx} className="text-xs text-zinc-400 leading-relaxed pl-4 relative before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:bg-amber-500 before:rounded-full">{item}</li>))}
              </ul>
            </div>
            <div className="text-[9px] text-zinc-650 mt-4 text-right select-none uppercase tracking-wider font-bold">Next Steps</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-950/50 p-5 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2"><BarChart2 size={13} className="text-zinc-550" /> 1. 技术功底与原理剖析深度 (Knowledge Base & Depth)</div>
            <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap pl-5">{data.depthAnalysis}</p>
          </div>
          <div className="bg-zinc-950/50 p-5 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2"><CornerDownRight size={13} className="text-zinc-550" /> 2. 表达流畅度与 STAR 结构组织 (STAR Logical Delivery)</div>
            <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap pl-5">{data.structureAnalysis}</p>
          </div>
          <div className="bg-zinc-950/50 p-5 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2"><Flame size={13} className="text-zinc-550" /> 3. 高压极限施压下情绪韧性诊断 (Resilience under Stress)</div>
            <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap pl-5">{data.stressAnalysis}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={handleExportPDF}
          disabled={isPrinting}
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-zinc-100 font-bold py-3.5 rounded-xl text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
        >
          {isPrinting ? (<><Loader2 className="animate-spin" size={13} /> 正在为您下载 PDF...</>) : (<><Download size={13} /> 导出为 PDF</>)}
        </button>

        <button
          type="button"
          onClick={onReset}
          className="flex-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold py-3.5 rounded-xl text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 border border-zinc-700/60"
        >
          <RefreshCw size={12} /> 重新开始
        </button>
      </div>
    </div>
  );
}