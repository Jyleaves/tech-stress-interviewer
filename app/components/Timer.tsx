"use client";

import React from "react";
import { Timer as TimerIcon, AlertCircle } from "lucide-react";

interface TimerProps {
  timeRemaining: number;
  initTimeLimit: number;
}

export default function Timer({ timeRemaining, initTimeLimit }: TimerProps) {
  const isOvertime = timeRemaining < 0; // 小于 0 代表进入超时阶段
  const isUrgent = timeRemaining >= 0 && timeRemaining < 30; // 正常倒计时且小于 30 秒为紧急状态
  const absTime = Math.abs(timeRemaining);

  return (
    <div 
      className={`bg-zinc-900 border rounded-xl p-6 shadow-xl flex items-center justify-between transition-all duration-300 relative overflow-hidden ${
        isOvertime 
          ? "border-red-600 ring-2 ring-red-500/20 bg-red-950/10 animate-[pulse_2.5s_infinite]" 
          : isUrgent 
            ? "border-amber-900/50 ring-1 ring-amber-500/10 bg-amber-950/5" 
            : "border-zinc-800"
      }`}
    >
      <div 
        className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-500 ${
          isOvertime 
            ? "bg-red-500 animate-pulse" 
            : isUrgent 
              ? "bg-amber-500 animate-pulse" 
              : "bg-emerald-500"
        }`}
      />

      <div className="flex items-center space-x-3 pl-1.5">
        {isOvertime ? (
          <AlertCircle className="text-red-500 animate-bounce" size={22} />
        ) : (
          <TimerIcon 
            className={`transition-colors duration-300 ${
              isUrgent ? "text-amber-500 animate-pulse" : "text-zinc-500"
            }`} 
            size={22} 
          />
        )}
        <div>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${isOvertime ? "text-red-400" : "text-zinc-500"}`}>
            {isOvertime ? "已超出答题时限" : "答题倒计时"}
          </div>
          <div className="text-xs text-zinc-400 font-bold font-mono">
            {isOvertime ? `推荐时限 ${initTimeLimit}s` : `${initTimeLimit}s`}
          </div>
        </div>
      </div>

      <div 
        className={`font-black font-mono transition-all duration-300 leading-none ${
          isOvertime 
            ? "text-red-500 text-3xl" 
            : isUrgent 
              ? "text-amber-500 text-4xl animate-pulse" 
              : "text-zinc-200 text-4xl"
        }`}
      >
        {isOvertime ? `+${absTime}s` : `${timeRemaining}s`}
      </div>
    </div>
  );
}