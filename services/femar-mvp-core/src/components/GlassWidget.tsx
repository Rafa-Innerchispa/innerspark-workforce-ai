"use client";

import React, { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface GlassWidgetProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}

export default function GlassWidget({ title, icon: Icon, children, className = "" }: GlassWidgetProps) {
  return (
    <div className={`glass-card rounded-2xl p-4 md:p-6 flex flex-col h-full ${className}`}>
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="p-2 md:p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <h3 className="font-semibold text-base md:text-lg text-zinc-100">{title}</h3>
      </div>
      <div className="flex-1 flex flex-col w-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
