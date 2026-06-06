"use client";

import React from "react";
import { ShieldAlert, Terminal, Flame } from "lucide-react";

interface InterviewSetupProps {
  jobTitle: string;
  setJobTitle: (val: string) => void;
  stressLevel: string;
  setStressLevel: (val: string) => void;
  resumeText: string;
  setResumeText: (val: string) => void;
  onStart: () => void;
}

export default function InterviewSetup({
  jobTitle,
  setJobTitle,
  stressLevel,
  setStressLevel,
  resumeText,
  setResumeText,
  onStart,
}: InterviewSetupProps) {
  return (
    <div className="max-w-2xl mx-auto w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Terminal size={120} />
      </div>

      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 text-zinc-100">
        <ShieldAlert className="text-red-500" />
        构建高压面试靶场
      </h1>
      <p className="text-xs text-zinc-400 mb-8 leading-relaxed">
        这里不提供温和的聊天。系统将深度解析你的技术栈，并以大厂 P8/Leader 的严苛标准对你进行深度、连环、甚至带有压力测试的主动追问。
      </p>

      <div className="space-y-6">
        {/* 岗位选择 */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2 font-bold">
            目标大厂与技术方向
          </label>
          <select
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-3 text-sm focus:outline-none focus:border-red-600 transition text-zinc-300"
          >
            <option>字节跳动 - 核心业务线后端开发 (一面)</option>
            <option>腾讯 - 平台与内容运输群系统架构 (二面)</option>
            <option>阿里淘天 - 高并发交易链路重构技术专家 (终面)</option>
            <option>美团 - 核心配送算法与架构调优 (资深开发岗)</option>
          </select>
        </div>

        {/* 压力水平选择 */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2 font-bold">
            拟真压力烈度 (Stress Level)
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setStressLevel("normal")}
              className={`p-4 rounded border text-left transition ${
                stressLevel === "normal"
                  ? "border-zinc-400 bg-zinc-800/50"
                  : "border-zinc-800 hover:border-zinc-700 bg-zinc-950"
              }`}
            >
              <div className="font-bold text-sm text-zinc-200">常规拟真</div>
              <div className="text-xs text-zinc-500 mt-1">语速适中，正常追问。</div>
            </button>
            <button
              type="button"
              onClick={() => setStressLevel("hell")}
              className={`p-4 rounded border text-left transition ${
                stressLevel === "hell"
                  ? "border-red-600/80 bg-red-950/10"
                  : "border-zinc-800 hover:border-zinc-700 bg-zinc-950"
              }`}
            >
              <div className="font-bold text-sm text-red-500 flex items-center gap-1.5">
                <Flame size={14} className="animate-bounce" /> 地狱高压面
              </div>
              <div className="text-xs text-zinc-500 mt-1">冷酷追问、倒计时限制、不耐烦打压。</div>
            </button>
          </div>
        </div>

        {/* 粘贴个人简历 */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2 font-bold">
            贴入你的核心技术栈 / 项目经历（支持直接粘贴简历）
          </label>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="例如：主导过分布式电商 system 重构，利用 Redis 做多级缓存，基于 RabbitMQ 处理流量削峰，对 JVM 调优有一定实战经验..."
            className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded p-4 text-xs focus:outline-none focus:border-red-600 transition resize-none font-mono text-zinc-300 leading-relaxed"
          />
        </div>

        {/* 开启按钮 */}
        <button
          type="button"
          onClick={onStart}
          className="w-full bg-zinc-100 text-zinc-950 font-bold py-4 rounded-lg hover:bg-zinc-200 transition duration-150 text-sm tracking-widest uppercase shadow-lg shadow-white/5"
        >
          授权摄像头并加载战场
        </button>
      </div>
    </div>
  );
}