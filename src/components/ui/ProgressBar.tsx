import React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number; // 0 to 100
  className?: string;
  showText?: boolean;
}

export function ProgressBar({ progress, className, showText = false }: ProgressBarProps) {
  const safeProgress = Math.min(100, Math.max(0, isNaN(progress) ? 0 : progress));

  const getColor = (val: number) => {
    if (val >= 100) return "bg-emerald-500";
    if (val >= 60) return "bg-indigo-500";
    if (val >= 25) return "bg-sky-500";
    return "bg-amber-500";
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500 rounded-full", getColor(safeProgress))}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
      {showText && (
        <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
          <span>Progress</span>
          <span className="font-semibold text-slate-700">{safeProgress}%</span>
        </div>
      )}
    </div>
  );
}
