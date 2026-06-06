// app/components/InterviewSetup.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal, Upload, Loader2, Video, Mic, FileText, X } from "lucide-react";

interface InterviewSetupProps {
  jobTitle: string;
  setJobTitle: (val: string) => void;
  stressLevel: string;
  setStressLevel: (val: string) => void;
  resumeText: string;
  setResumeText: (val: string) => void;
  uploadedFiles: { name: string; content: string }[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<{ name: string; content: string }[]>>;
  onStart: (useCamera: boolean, useMic: boolean) => void; // 将硬件偏好传回给父组件
}

export default function InterviewSetup({
  jobTitle,
  setJobTitle,
  stressLevel,
  setStressLevel,
  resumeText,
  setResumeText,
  uploadedFiles,
  setUploadedFiles,
  onStart,
}: InterviewSetupProps) {
  
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [hasMic, setHasMic] = useState<boolean>(false);

  const [isParsing, setIsParsing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedCamera = localStorage.getItem("pref_camera");
    const savedMic = localStorage.getItem("pref_mic");
    
    const timer = setTimeout(() => {
      setHasCamera(savedCamera !== null ? savedCamera === "true" : false);
      setHasMic(savedMic !== null ? savedMic === "true" : false);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // 摄像头开关与存储
  const toggleCamera = async () => {
    const nextState = !hasCamera;
    if (nextState) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCamera(true);
        localStorage.setItem("pref_camera", "true");
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        alert("摄像头授权失败，请检查浏览器权限设置。");
        setHasCamera(false);
        localStorage.setItem("pref_camera", "false");
      }
    } else {
      setHasCamera(false);
      localStorage.setItem("pref_camera", "false");
    }
  };

  // 麦克风开关与存储
  const toggleMic = async () => {
    const nextState = !hasMic;
    if (nextState) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMic(true);
        localStorage.setItem("pref_mic", "true");
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        alert("麦克风授权失败，请检查浏览器权限设置。");
        setHasMic(false);
        localStorage.setItem("pref_mic", "false");
      }
    } else {
      setHasMic(false);
      localStorage.setItem("pref_mic", "false");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const textContent = event.target?.result as string;
        setUploadedFiles((prev) => [...prev, { name: file.name, content: textContent }]);
      };
      reader.readAsText(file);
      return;
    }

    setIsParsing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadedFiles((prev) => [...prev, { name: file.name, content: data.text }]);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "文件解析失败，请检查格式或尝试手动复制文本。");
      }
    } catch (err) {
      console.error(err);
      alert("文件解析服务暂时不可用，请手动粘贴您的技术经历。");
    } finally {
      setIsParsing(false);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setUploadedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="max-w-3xl mx-auto w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-12 shadow-2xl backdrop-blur relative overflow-hidden">
      
      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
        <Terminal size={160} />
      </div>

      <div className="text-center mb-10 pb-8 border-b border-zinc-800/60">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 mb-3">
          智能模拟面试系统
        </h1>
        <p className="text-xs text-zinc-400 max-w-lg mx-auto leading-relaxed">
          基于您提供的项目文档与简历背景，系统将模拟针对性的专业级互动追问。建议在开始前确保摄像头与麦克风处于就绪状态。
        </p>
      </div>

      <div className="space-y-8">
        
        {/* 岗位选择与评估模式 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-450 mb-2 font-bold">
              目标岗位与技术方向
            </label>
            <select
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-zinc-750 transition text-zinc-300"
            >
              <option>字节跳动 - 核心业务线后端开发 (一面)</option>
              <option>腾讯 - 平台与内容群系统架构 (二面)</option>
              <option>阿里淘天 - 高并发交易链路重构 (终面)</option>
              <option>美团 - 配送系统算法与架构调优 (资深开发)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-450 mb-2 font-bold">
              面试评估模式
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStressLevel("normal")}
                className={`py-2 px-3 rounded-lg border text-left transition ${
                  stressLevel === "normal"
                    ? "border-zinc-500 bg-zinc-800"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                }`}
              >
                <div className="font-bold text-xs text-zinc-200">标准评估</div>
                <div className="text-[10px] text-zinc-500 mt-1">标准考核流与适中反馈。</div>
              </button>
              <button
                type="button"
                onClick={() => setStressLevel("hell")}
                className={`py-2 px-3 rounded-lg border text-left transition ${
                  stressLevel === "hell"
                    ? "border-zinc-500 bg-zinc-800"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                }`}
              >
                <div className="font-bold text-xs text-zinc-200">压力测试</div>
                <div className="text-[10px] text-zinc-500 mt-1">多重追问与严苛追问限制。</div>
              </button>
            </div>
          </div>
        </div>

        {/* 硬件测试栏 */}
        <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-5">
          <label className="block text-[11px] uppercase tracking-wider text-zinc-450 mb-3.5 font-bold">
            本地设备接入配置（推荐开启，以获得完整音视频仿真对练体验）
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="flex items-center justify-between bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-800/40">
              <div className="flex items-center gap-3">
                <Video size={16} className={hasCamera ? "text-emerald-500" : "text-zinc-500"} />
                <div>
                  <div className="text-xs font-bold text-zinc-300">开启视频画面监控 (推荐)</div>
                  <div className="text-[10px] text-zinc-500">平视镜头有助于调整面试仪态</div>
                </div>
              </div>
              
              <button
                type="button"
                onClick={toggleCamera}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  hasCamera ? "bg-emerald-600" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    hasCamera ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-800/40">
              <div className="flex items-center gap-3">
                <Mic size={16} className={hasMic ? "text-emerald-500" : "text-zinc-500"} />
                <div>
                  <div className="text-xs font-bold text-zinc-300">开启麦克风语音输入 (推荐)</div>
                  <div className="text-[10px] text-zinc-500">支持使用语音进行面试</div>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleMic}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  hasMic ? "bg-emerald-600" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    hasMic ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

          </div>
        </div>

        {/* 简历配置 */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-[11px] uppercase tracking-wider text-zinc-450 font-bold">
              简历背景与补充项目说明
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 border border-zinc-850 px-3 py-1.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-950 transition"
            >
              {isParsing ? <Loader2 className="animate-spin text-zinc-400" size={12} /> : <Upload size={12} />}
              添加文件 (.txt / .pdf / .docx)
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.pdf,.docx"
              className="hidden"
            />
          </div>

          {/* 已解析卡片展示 */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4 p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg">
              {uploadedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-3 pr-4 relative min-w-[200px]"
                >
                  <div className="p-1.5 bg-zinc-950 rounded text-zinc-400">
                    <FileText size={16} />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span
                      className="text-xs text-zinc-200 font-medium truncate max-w-[150px]"
                      title={file.name}
                    >
                      {file.name}
                    </span>
                    <span className="text-[10px] text-zinc-500">已解析文本</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-zinc-500 hover:text-zinc-300 ml-1 transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="您可在此处输入文字版项目经历或个人补充说明（非必填）。"
            className="w-full h-36 bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs focus:outline-none focus:border-zinc-750 transition resize-none font-mono text-zinc-300 leading-relaxed"
          />
        </div>

        {/* 开始按钮 */}
        <button
          type="button"
          // 将当前的硬件选择偏好，在点击开始时向上传递
          onClick={() => onStart(hasCamera, hasMic)}
          className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold py-4 rounded-lg transition duration-150 text-xs tracking-widest uppercase"
        >
          进入智能面试大厅
        </button>

      </div>
    </div>
  );
}