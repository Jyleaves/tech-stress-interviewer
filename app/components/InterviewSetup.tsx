"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal, Upload, Loader2, Video, Mic, FileText, X, ArrowRight, ArrowLeft } from "lucide-react";

interface InterviewSetupProps {
  jobTitle: string;
  setJobTitle: (val: string) => void;
  stressLevel: string;
  setStressLevel: (val: string) => void;
  resumeText: string;
  setResumeText: (val: string) => void;
  uploadedFiles: { name: string; content: string }[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<{ name: string; content: string }[]>>;
  interviewContext: string;
  setInterviewContext: (val: string) => void;
  onStart: (useCamera: boolean, useMic: boolean, customLimit: number, customRounds: number) => void;
}

export default function InterviewSetup({
  jobTitle, setJobTitle,
  stressLevel, setStressLevel,
  resumeText, setResumeText,
  uploadedFiles, setUploadedFiles,
  interviewContext, setInterviewContext,
  onStart,
}: InterviewSetupProps) {
  
  // 控制向导步骤：1 = 面试背景配置，2 = 硬件与简历配置
  const [step, setStep] = useState<1 | 2>(1);

  // 经典模版与自定义背景控制
  const [selectedTemplate, setSelectedTemplate] = useState<string>("template1");
  const [customCompany, setCustomCompany] = useState<string>("");
  const [customRole, setCustomRole] = useState<string>("");

  // 用于控制自定义参数
  const [customLimit, setCustomLimit] = useState<number>(300);
  const [customRounds, setCustomRounds] = useState<number>(4);

  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [hasMic, setHasMic] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化音视频偏好
  useEffect(() => {
    const savedCamera = localStorage.getItem("pref_camera");
    const savedMic = localStorage.getItem("pref_mic");
    
    const timer = setTimeout(() => {
      setHasCamera(savedCamera === "true");
      setHasMic(savedMic === "true");
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // 场景模版切换
  const handleTemplateChange = (val: string) => {
    setSelectedTemplate(val);
    if (val === "template1") {
      setJobTitle("求职开发（字节跳动 - 核心业务线后端开发一面）");
    } else if (val === "template2") {
      setJobTitle("学术保研（清华大学 - 计算机科学与技术夏令营学术面试）");
    } else if (val === "template3") {
      setJobTitle("前沿算法（微软亚洲研究院 - 自然语言处理方向研究员面试）");
    } else if (val === "custom") {
      setJobTitle(`${customCompany || "自主申报"} - ${customRole || "自定义领域"}`);
    }
  };

  // 监听自定义表单拼凑目标 jobTitle
  useEffect(() => {
    if (selectedTemplate === "custom") {
      setJobTitle(`${customCompany || "自主申报"} - ${customRole || "自定义领域"}`);
    }
  }, [customCompany, customRole, selectedTemplate, setJobTitle]);

  // 摄像头授权
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

  // 麦克风授权
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
    e.target.value = ""; 

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
        alert(errorData.error || "文件解析失败，请尝试手动复制。");
      }
    } catch (err) {
      console.error(err);
      alert("文件解析服务不可用，请手动粘贴技术经历。");
    } finally {
      setIsParsing(false);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setUploadedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="max-w-3xl mx-auto w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-10 shadow-2xl backdrop-blur relative overflow-hidden">
      
      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
        <Terminal size={140} />
      </div>

      <div className="text-center mb-8 pb-6 border-b border-zinc-800/60">
        <h1 className="text-xl font-bold tracking-tight text-zinc-100 mb-2">
          智能模拟面试系统
        </h1>
        <p className="text-xs text-zinc-400 max-w-lg mx-auto">
          {step === 1 ? "第一步：配置您的模拟面试靶标及规则设定" : "第二步：配置文件经历与本地音视频设备状态"}
        </p>
        
        {/* 进度提示条 */}
        <div className="flex justify-center items-center gap-2 mt-4">
          <div className={`h-1 rounded transition-all duration-300 ${step === 1 ? "w-8 bg-zinc-300" : "w-4 bg-zinc-700"}`} />
          <div className={`h-1 rounded transition-all duration-300 ${step === 2 ? "w-8 bg-zinc-300" : "w-4 bg-zinc-700"}`} />
        </div>
      </div>

      <div className="space-y-6">
        
        {/* 步骤 1：背景与模式配置 */}
        {step === 1 && (
          <div className="space-y-6 animate-[fadeIn_0.2s_ease]">
            {/* 场景选择：独占一整行，防止文字截断 */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-2.5 font-bold">
                选择面试场景与模版
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-xs focus:outline-none focus:border-zinc-700 transition text-zinc-300 truncate"
              >
                <option value="template1">求职开发（字节跳动 - 核心业务线后端开发一面）</option>
                <option value="template2">学术保研（清华大学 - 计算机科学与技术夏令营学术面试）</option>
                <option value="template3">前沿算法（微软亚洲研究院 - 自然语言处理方向研究员面试）</option>
                <option value="custom">✍️ 自定义面试场景背景</option>
              </select>
            </div>

            {/* 场景自定义表单 */}
            {selectedTemplate === "custom" && (
              <div className="p-4 bg-zinc-950/40 border border-zinc-800/80 rounded-xl space-y-4 animate-[fadeIn_0.3s_ease]">
                <div className="text-[10px] font-bold text-zinc-400 border-b border-zinc-800/60 pb-2 uppercase tracking-wider">✍️ 申报自定义面试背景</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 font-bold">机构/高校/企业名称</label>
                    <input
                      type="text"
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      placeholder="如：北京大学、谷歌"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 font-bold">考核方向/申请岗位</label>
                    <input
                      type="text"
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      placeholder="如：智能系统夏令营、高级研发岗"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 自定义面试背景与考查重点输入框 */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-2 font-bold flex justify-between items-center">
                <span>补充岗位要求或考查重点 (可选)</span>
                <span className="text-[9px] text-zinc-500 font-normal normal-case">支持贴入 JD 或细化面试风格</span>
              </label>
              <textarea
                value={interviewContext}
                onChange={(e) => setInterviewContext(e.target.value)}
                placeholder="输入您对面试的特殊要求、岗位侧重点或希望考察的技术栈等补充信息，帮助 AI 面试官更精准地模拟真实面试场景。"
                className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs focus:outline-none focus:border-zinc-700 transition resize-none font-mono text-zinc-400 leading-relaxed"
              />
            </div>

            {/* 评估模式选择：现在默认选择标准评估 */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-2.5 font-bold">
                面试评估模式
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setStressLevel("normal")}
                  className={`py-3 px-4 rounded-lg border text-left transition ${
                    stressLevel === "normal"
                      ? "border-zinc-400 bg-zinc-800/60"
                      : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                  }`}
                >
                  <div className="font-bold text-xs text-zinc-200">标准评估</div>
                  <div className="text-[10px] text-zinc-500 mt-1">专业严谨考核流，引导式对答与适中耐性。</div>
                </button>
                <button
                  type="button"
                  onClick={() => setStressLevel("hell")}
                  className={`py-3 px-4 rounded-lg border text-left transition ${
                    stressLevel === "hell"
                      ? "border-zinc-400 bg-zinc-800/60"
                      : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                  }`}
                >
                  <div className="font-bold text-xs text-zinc-200">压力测试</div>
                  <div className="text-[10px] text-zinc-500 mt-1">极高压连环追问，不给喘息，耐性随时间递减。</div>
                </button>
              </div>
            </div>

            {/* 回答时限与追问轮数 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-2 font-bold">
                  单题作答时限
                </label>
                <select
                  value={customLimit}
                  onChange={(e) => setCustomLimit(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-zinc-700 text-zinc-300"
                >
                  <option value={60}>60秒</option>
                  <option value={120}>120秒</option>
                  <option value={180}>180秒</option>
                  <option value={300}>300秒（推荐）</option>
                  <option value={450}>450秒</option>
                  <option value={600}>600秒</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-2 font-bold">
                  话题轮数上限
                </label>
                <select
                  value={customRounds}
                  onChange={(e) => setCustomRounds(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-zinc-700 text-zinc-300"
                >
                  <option value={3}>3 轮</option>
                  <option value={4}>4 轮（推荐）</option>
                  <option value={5}>5 轮</option>
                  <option value={6}>6 轮</option>
                </select>
              </div>
            </div>

            {/* 下一步按钮 */}
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full bg-zinc-800 hover:bg-zinc-750 text-zinc-100 font-bold py-3.5 rounded-lg transition text-xs tracking-wider uppercase flex items-center justify-center gap-2"
            >
              继续配置：设备与简历经历 <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* 步骤 2：硬件接入与简历上传 */}
        {step === 2 && (
          <div className="space-y-6 animate-[fadeIn_0.2s_ease]">
            {/* 本地设备检测 */}
            <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-5">
              <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-3.5 font-bold">
                本地设备接入配置（推荐全开以支持完整音视频交互）
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 摄像头开关 */}
                <div className="flex items-center justify-between bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-800/40">
                  <div className="flex items-center gap-3">
                    <Video size={16} className={hasCamera ? "text-emerald-500" : "text-zinc-500"} />
                    <div>
                      <div className="text-xs font-bold text-zinc-300">开启视频画面监控</div>
                      <div className="text-[10px] text-zinc-500">平视镜头有助于在模拟中调整仪态</div>
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

                {/* 麦克风开关 */}
                <div className="flex items-center justify-between bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-800/40">
                  <div className="flex items-center gap-3">
                    <Mic size={16} className={hasMic ? "text-emerald-500" : "text-zinc-500"} />
                    <div>
                      <div className="text-xs font-bold text-zinc-300">开启麦克风语音输入</div>
                      <div className="text-[10px] text-zinc-500">开启后可通过对话转换文字</div>
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

            {/* 简历背景配置 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
                  简历背景与补充项目说明
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsing}
                  className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 border border-zinc-850 px-2.5 py-1.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-950 transition"
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
                <div className="flex flex-wrap gap-2.5 mb-3.5 p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-lg">
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 pl-2.5 pr-3.5 relative min-w-[180px]"
                    >
                      <div className="p-1.5 bg-zinc-950 rounded text-zinc-400">
                        <FileText size={14} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[11px] text-zinc-200 font-medium truncate max-w-[130px]" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-[9px] text-zinc-500">已提取文本</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-zinc-500 hover:text-zinc-300 ml-1 transition"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="您可在此处粘贴您的文字版简历或项目描述背景（非必填）。"
                className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 text-xs focus:outline-none focus:border-zinc-700 transition resize-none font-mono text-zinc-300 leading-relaxed"
              />
            </div>

            {/* 上一步与开始流程控制 */}
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 py-3.5 rounded-lg transition text-xs tracking-wider uppercase flex items-center justify-center gap-2"
              >
                <ArrowLeft size={14} /> 返回第一步
              </button>
              
              <button
                type="button"
                onClick={() => onStart(hasCamera, hasMic, customLimit, customRounds)}
                className="col-span-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold py-3.5 rounded-lg transition duration-150 text-xs tracking-widest uppercase flex items-center justify-center"
              >
                进入智能面试大厅
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}