"use client";

import React from "react";
import { Timer as TimerIcon } from "lucide-react";

interface TimerProps {
  timeRemaining: number;
  initTimeLimit: number;
}

export default function Timer({ timeRemaining, initTimeLimit }: TimerProps) {
  const isUrgent = timeRemaining < 30;

  return (
    <div 
      className={`bg-zinc-900 border rounded-xl p-6 shadow-xl flex items-center justify-between transition-all duration-300 relative overflow-hidden ${
        isUrgent 
          ? "border-red-900/50 ring-1 ring-red-500/10 bg-red-950/5" 
          : "border-zinc-800"
      }`}
    >
      <div 
        className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-500 ${
          isUrgent ? "bg-red-500 animate-pulse" : "bg-emerald-500"
        }`}
      />

      <div className="flex items-center space-x-3 pl-1.5">
        <TimerIcon 
          className={`transition-colors duration-300 ${
            isUrgent ? "text-red-500 animate-pulse" : "text-zinc-500"
          }`} 
          size={22} 
        />
        <div>
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            答题倒计时
          </div>
          <div className="text-xs text-zinc-400 font-bold font-mono">
            {initTimeLimit}s
          </div>
        </div>
      </div>

      <div 
        className={`font-black font-mono transition-all duration-300 leading-none ${
          isUrgent 
            ? "text-red-500 text-4xl animate-pulse" 
            : "text-zinc-200 text-4xl"
        }`}
      >
        {timeRemaining}s
      </div>
    </div>
  );
}