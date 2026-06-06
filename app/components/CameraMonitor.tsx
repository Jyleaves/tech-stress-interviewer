"use client";

import React, { useEffect } from "react";
import { Video } from "lucide-react";

interface CameraMonitorProps {
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isRecording: boolean;
}

export default function CameraMonitor({ stream, videoRef, isRecording }: CameraMonitorProps) {
  // 侦听 stream 变化，一旦渲染 DOM，立刻绑定摄像头视频流
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl flex-1 flex flex-col justify-between min-h-[300px]">
      <div className="bg-zinc-950 p-3 border-b border-zinc-800/50 flex justify-between items-center text-[10px] font-bold text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Video size={12} /> APPLICANT_MONITOR
        </span>
        <span className="text-red-500 animate-pulse flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" /> REC
        </span>
      </div>

      {/* 摄像头实时预览容器 */}
      <div className="flex-1 bg-zinc-950 relative flex items-center justify-center overflow-hidden min-h-[200px]">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="text-center p-6 space-y-3 z-10">
            <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center mx-auto text-zinc-600 animate-pulse">
              <Video size={20} />
            </div>
            <div className="text-xs text-zinc-600 font-bold">摄像头未捕获</div>
            <p className="text-[10px] text-zinc-700 max-w-xs leading-relaxed">
              本地实时仪态监测有助于让你习惯视频面试中的审视视线。
            </p>
          </div>
        )}
      </div>

      {/* 录音波形状态条 (已移至视频下方并改为警告红) */}
      {isRecording && (
        <div className="bg-red-950/20 border-t border-b border-red-900/40 p-3 flex items-center space-x-3 transition-all duration-300">
          <div className="flex gap-0.5 h-5 items-end">
            <div className="w-1 bg-red-500 h-3 animate-[ping_1.2s_infinite]" />
            <div className="w-1 bg-red-400 h-5 animate-[ping_1s_infinite_0.2s]" />
            <div className="w-1 bg-red-500 h-2 animate-[ping_1.5s_infinite_0.4s]" />
            <div className="w-1 bg-red-400 h-4 animate-[ping_0.8s_infinite_0.1s]" />
            <div className="w-1 bg-red-300 h-1 animate-[ping_1.1s_infinite_0.3s]" />
          </div>
          <span className="text-[10px] text-red-400 font-bold tracking-wide animate-pulse">
            答题音频采集输入中 // REAL-TIME AUDIO CAPTURING...
          </span>
        </div>
      )}

      <div className="bg-zinc-950 p-4 border-t border-zinc-800/50 text-[10px] text-zinc-600 leading-relaxed">
        大厂面试官提示：请维持目光直视，避免眨眼过频或视线游离，后台正在根据心理模型判定你的抗压自信度。
      </div>
    </div>
  );
}