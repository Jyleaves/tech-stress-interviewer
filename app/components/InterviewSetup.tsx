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
  onStart: (useCamera: boolean, useMic: boolean, customLimit: number, customRounds: number) => void;
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
  
  // 经典模版与自定义背景控制
  const [selectedTemplate, setSelectedTemplate] = useState<string>("template1");
  const [customCompany, setCustomCompany] = useState<string>("");
  const [customRole, setCustomRole] = useState<string>("");

  // 用于控制自定义的单题回答时限（默认 120 秒）
  const [customLimit, setCustomLimit] = useState<number>(120);
  // 用于控制自定义的面试追问轮数上限（默认 4 轮）
  const [customRounds, setCustomRounds] = useState<number>(4);

  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [hasMic, setHasMic] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 💡 【修正】通过异步延迟更新解决 React 19 的同步渲染警告，防止 Hydration 报错 [1.1.9, 2.1.3]
  useEffect(() => {
    const savedCamera = localStorage.getItem("pref_camera");
    const savedMic = localStorage.getItem("pref_mic");
    
    const timer = setTimeout(() => {
      setHasCamera(savedCamera !== null ? savedCamera === "true" : false);
      setHasMic(savedMic !== null ? savedMic === "true" : false);
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
      setJobTitle(`${customCompany || "自主申报"} - ${customRole || "自定义研究方向"}`);
    }
  };

  // 监听自定义表单，拼凑成目标 jobTitle 并反馈给父组件
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

    // 立即清空 input 的内部值，强制下次选择同一文件时也能触发 onChange
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
        
        {/* 二级联动：场景模版切换 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-405 mb-2 font-bold">
              选择面试场景与模版
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-zinc-750 transition text-zinc-300"
            >
              <option value="template1">求职开发（字节跳动 - 核心业务线后端开发一面）</option>
              <option value="template2">学术保研（清华大学 - 计算机科学与技术夏令营学术面试）</option>
              <option value="template3">前沿算法（微软亚洲研究院 - 自然语言处理方向研究员面试）</option>
              <option value="custom">✍️ 自定义面试场景背景...</option>
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

        {/* 自定义回答时限与轮次上限面板 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-2 font-bold">
              单题回答时限
            </label>
            <select
              value={customLimit}
              onChange={(e) => setCustomLimit(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-zinc-750 transition text-zinc-300"
            >
              <option value={60}>60秒</option>
              <option value={120}>120秒</option>
              <option value={180}>180秒</option>
              <option value={300}>300秒</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-2 font-bold">
              交互轮数上限
            </label>
            <select
              value={customRounds}
              onChange={(e) => setCustomRounds(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-zinc-750 transition text-zinc-300"
            >
              <option value={3}>3 轮对答</option>
              <option value={4}>4 轮对答</option>
              <option value={5}>5 轮对答</option>
              <option value={6}>6 轮对答</option>
            </select>
          </div>
        </div>

        {/* 💡 当选择自定义场景时展示二级表单 */}
        {selectedTemplate === "custom" && (
          <div className="p-5 bg-zinc-950/40 border border-zinc-800/80 rounded-xl space-y-4 animate-[fadeIn_0.3s_ease]">
            <div className="text-xs font-bold text-zinc-300 border-b border-zinc-800/60 pb-2">✍️ 自定义您的面试靶标</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-bold">公司 / 高校 / 学术机构名称</label>
                <input
                  type="text"
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  placeholder="例如：北京大学、谷歌"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-300"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-bold">申请岗位 / 考核研究方向</label>
                <input
                  type="text"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="例如：智能系统夏令营、后端开发资深岗"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* 硬件测试栏 */}
        <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-5">
          <label className="block text-[11px] uppercase tracking-wider text-zinc-450 mb-3.5 font-bold">
            本地设备接入配置（推荐开启，可进行音视频模拟对练）
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="flex items-center justify-between bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-800/40">
              <div className="flex items-center gap-3">
                <Video size={16} className={hasCamera ? "text-emerald-500" : "text-zinc-500"} />
                <div>
                  <div className="text-xs font-bold text-zinc-300">开启视频画面监控 (推荐)</div>
                  <div className="text-[10px] text-zinc-500">平视镜头有助于在模拟中调整坐姿与仪态</div>
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
                  <div className="text-[10px] text-zinc-500">支持直接使用语音说话的方式陈述解答</div>
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
          onClick={() => onStart(hasCamera, hasMic, customLimit, customRounds)}
          className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold py-4 rounded-lg transition duration-150 text-xs tracking-widest uppercase"
        >
          进入智能面试大厅
        </button>

      </div>
    </div>
  );
}