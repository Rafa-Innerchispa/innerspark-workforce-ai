"use client";

import React from "react";
import Link from "next/link";

type Props = {
  children: React.ReactNode;
  fallbackTitle?: string;
};

type State = {
  hasError: boolean;
};

export default class ClientErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Dashboard component failed:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
        <h2 className="text-lg font-semibold mb-2">{this.props.fallbackTitle || "Panel section unavailable"}</h2>
        <p className="text-sm text-amber-100/80 mb-4">
          This section failed to load, but the system is still available.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/people" className="px-3 py-2 rounded-lg bg-zinc-900 text-white border border-zinc-700">People</Link>
          <Link href="/reports" className="px-3 py-2 rounded-lg bg-zinc-900 text-white border border-zinc-700">Reports</Link>
          <Link href="/devices" className="px-3 py-2 rounded-lg bg-zinc-900 text-white border border-zinc-700">Devices</Link>
        </div>
      </div>
    );
  }
}
