// app/components/Timer.tsx
"use client";

import React from "react";
import { Timer as TimerIcon } from "lucide-react";

interface TimerProps {
  timeRemaining: number;
}

export default function Timer({ timeRemaining }: TimerProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <TimerIcon className={timeRemaining < 30 ? "text-red-500 animate-spin" : "text-zinc-500"} size={24} />
        <div>
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">答题倒计时</div>
          <div className="text-xs text-zinc-400 font-bold">120s 结构化硬上限</div>
        </div>
      </div>
      <div className={`text-4xl font-extrabold font-mono ${timeRemaining < 30 ? "text-red-500 text-5xl" : "text-zinc-200"}`}>
        {timeRemaining}s
      </div>
    </div>
  );
}