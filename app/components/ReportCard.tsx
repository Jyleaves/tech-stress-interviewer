// app/components/ReportCard.tsx
"use client";

import React from "react";
import { Award, BarChart2, CornerDownRight, Flame, RefreshCw, Loader2 } from "lucide-react";

interface ReportCardProps {
  jobTitle: string;
  stressLevel: string;
  reportData: {
    score: number;
    depthAnalysis: string;
    structureAnalysis: string;
    stressAnalysis: string;
  } | null;
  isLoading: boolean;
  onReset: () => void;
}

export default function ReportCard({ jobTitle, stressLevel, reportData, isLoading, onReset }: ReportCardProps) {
  // 如果大模型正在解析、生成报告，显示加载骨架屏
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto w-full bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center shadow-2xl flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-zinc-400 mb-4" size={32} />
        <h2 className="text-sm font-bold text-zinc-200">AI 正在深度解析您的面试表现...</h2>
        <p className="text-[11px] text-zinc-500 mt-2">请稍候，我们正在基于面试上下文评估您的技术深度、逻辑表达和抗压自信度。</p>
      </div>
    );
  }

  // 兜底默认值 (如果报告未成功获取)
  const data = reportData || {
    score: 60,
    depthAnalysis: "暂无提取结果，可能是因面试中对话轮数太少，未收集到有效作答技术方案。",
    structureAnalysis: "未能在历史记录中提取出符合 STAR 表达逻辑的主体陈述。",
    stressAnalysis: "由于面试被提前打断，暂无在极端高压场景下的反应诊断。"
  };

  return (
    <div className="max-w-3xl mx-auto w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl relative">
      <div className="flex justify-between items-start mb-8 border-b border-zinc-800/50 pb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-zinc-100">
            <Award className="text-zinc-400 animate-pulse" size={20} />
            智能模拟面试复盘报告
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            测评岗位：{jobTitle} ｜ 面试压力：{stressLevel === "hell" ? "压力测试模式" : "常规仿真模式"}
          </p>
        </div>
        <div className="bg-zinc-950 px-4 py-2 border border-zinc-800 rounded text-center">
          <span className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider">综合推荐匹配度</span>
          <span className={`text-2xl font-extrabold ${data.score >= 80 ? "text-emerald-500" : data.score >= 60 ? "text-amber-500" : "text-red-500"}`}>
            {data.score}%
          </span>
        </div>
      </div>

      {/* 评估主卡片 */}
      <div className="space-y-6">
        {/* 维度 1 */}
        <div className="bg-zinc-950/50 p-5 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
            <BarChart2 size={14} className="text-zinc-400" />
            1. 技术深度与底层原理 (Depth of Knowledge)
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
            {data.depthAnalysis}
          </p>
        </div>

        {/* 维度 2 */}
        <div className="bg-zinc-950/50 p-5 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
            <CornerDownRight size={14} className="text-zinc-400" />
            2. STAR结构化表达 (Structured Delivery)
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
            {data.structureAnalysis}
          </p>
        </div>

        {/* 维度 3 */}
        <div className="bg-zinc-950/50 p-5 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
            <Flame size={14} className="text-zinc-400" />
            3. 抗压表现与情绪调整 (Stress Tolerance)
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
            {data.stressAnalysis}
          </p>
        </div>
      </div>

      {/* 复盘底部按钮 */}
      <div className="mt-8 pt-6 border-t border-zinc-800/50 flex gap-4">
        <button
          type="button"
          onClick={onReset}
          className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold py-3 rounded-lg text-xs tracking-wider uppercase transition flex items-center justify-center gap-2"
        >
          <RefreshCw size={12} /> 重新开始新对练
        </button>
      </div>
    </div>
  );
}