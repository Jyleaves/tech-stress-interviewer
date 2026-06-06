"use client";

import React from "react";
import { Award, BarChart2, CornerDownRight, Flame, RefreshCw } from "lucide-react";

interface ReportCardProps {
  jobTitle: string;
  stressLevel: string;
  onReset: () => void;
}

export default function ReportCard({ jobTitle, stressLevel, onReset }: ReportCardProps) {
  return (
    <div className="max-w-3xl mx-auto w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl relative">
      <div className="flex justify-between items-start mb-8 border-b border-zinc-800/50 pb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-zinc-100">
            <Award className="text-zinc-400" />
            大厂技术评估复盘报告
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            岗位：{jobTitle} ｜ 压力：{stressLevel === "hell" ? "地狱压力" : "标准考核"}
          </p>
        </div>
        <div className="bg-zinc-950 px-4 py-2 border border-zinc-800 rounded text-center">
          <span className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider">技术综合匹配度</span>
          <span className="text-3xl font-extrabold text-zinc-200">59%</span>
        </div>
      </div>

      {/* 三大维度分析 */}
      <div className="space-y-6">
        {/* 维度 1 */}
        <div className="bg-zinc-950/50 p-5 rounded-lg border border-zinc-800">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
              <BarChart2 size={14} className="text-red-500" />
              1. 技术深度与底层刨析 (Depth of Knowledge)
            </div>
            <span className="text-xs text-red-500 font-bold">及格线边缘 (D+)</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            在回答 Redis 双检锁实现时，只背诵了基本概念。当面试官深度追问 JVM 锁升级细节时，表述含糊，未能分析出多级线程在多核 CPU 中的争抢瓶颈。大厂极其看重对分布式细节和极端并发情况下的兜底设计。
          </p>
        </div>

        {/* 维度 2 */}
        <div className="bg-zinc-950/50 p-5 rounded-lg border border-zinc-800">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
              <CornerDownRight size={14} className="text-amber-500" />
              2. STAR结构化表达 (Structured Delivery)
            </div>
            <span className="text-xs text-amber-500 font-bold">待提升 (C)</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            有严重的倾听和跑题倾向。在追问 MySQL 强一致性策略时，回答绕回到缓存层面。未能做到“结论先行”，每句话中带有较多“大概、差不多”等非自信修饰词，极易在团队高负荷沟通中产生高昂成本。
          </p>
        </div>

        {/* 维度 3 */}
        <div className="bg-zinc-950/50 p-5 rounded-lg border border-zinc-800">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
              <Flame size={14} className="text-zinc-400" />
              3. 极限抗压表现 (Stress Tolerance)
            </div>
            <span className="text-xs text-zinc-300 font-bold">符合大厂基本盘 (B)</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            当计时器进入红闪预警、面试官耐心值大幅度下降时，你能基本稳住语速，没有出现大规模语塞，体现了较好的现场自我调整心态。但眼神在思考时容易向上方瞟，后续需要克制这一肢体小动作。
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
          <RefreshCw size={12} /> 重新匹配调整配置
        </button>
        <button
          type="button"
          onClick={() => alert("功能开发中，可在 Product Memo 中体现为下一步研发计划...")}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-lg text-xs tracking-wider uppercase transition"
        >
          导出 PDF 战绩到简历
        </button>
      </div>
    </div>
  );
}