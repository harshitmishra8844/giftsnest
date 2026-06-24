import React from "react";

/**
 * Premium Double-Ring Golden Loader with Particle Floating Layers
 * Used for full-screen loading or viewport-level mounting states.
 */
export function PremiumRingLoader({ text = "Loading..." }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF7F2] dark:bg-luxury-black transition-colors duration-300">
      {/* Floating Golden Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-2.5 h-2.5 rounded-full bg-gold-400/25 left-[15%] top-[20%] animate-particle-1" />
        <div className="absolute w-3.5 h-3.5 rounded-full bg-gold-500/20 right-[15%] top-[15%] animate-particle-2" />
        <div className="absolute w-2 h-2 rounded-full bg-gold-600/30 left-[25%] bottom-[25%] animate-particle-2" />
        <div className="absolute w-3 h-3 rounded-full bg-gold-400/20 right-[25%] bottom-[20%] animate-particle-1" />
      </div>

      {/* Luxury Loader Ring Setup */}
      <div className="relative flex items-center justify-center w-28 h-28 mb-5">
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-gold-500 border-b-gold-500 animate-spin-normal" />
        {/* Inner Reverse Ring */}
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-l-gold-400 border-r-gold-400 animate-spin-reverse opacity-70" />
        {/* Center Golden Branding Badge */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1C1C1C] via-[#2D2D2D] to-[#1C1C1C] flex items-center justify-center shadow-xl border border-gold-500/20 animate-pulse-gold">
          <span className="text-xl font-serif font-bold text-gold-500 select-none animate-float-subtle">
            N
          </span>
        </div>
      </div>

      {/* Branding Texts */}
      <div className="text-center px-4">
        <h2 className="text-xs font-serif tracking-[0.25em] shimmer-text mb-0.5 uppercase">
          Niyora Gifts
        </h2>
        <p className="text-[9px] uppercase tracking-[0.3em] text-gold-600 dark:text-gold-400 font-bold mb-3">
          Admin Console
        </p>
        <p className="text-xs text-gray-lux dark:text-gray-400 font-light max-w-xs leading-relaxed">
          {text}
        </p>
      </div>
    </div>
  );
}

/**
 * Transparent glassmorphic overlay for blocking action operations (e.g. Save, Upload)
 */
export function LoadingOverlay({ active, text = "Processing request..." }) {
  if (!active) return null;
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/45 backdrop-blur-xs animate-fade-in-backdrop">
      <div className="relative p-6 md:p-8 rounded-3xl border border-gold-500/25 bg-[#FAF7F2] dark:bg-[#1C1C1C] text-luxury-black dark:text-white shadow-2xl text-center max-w-xs w-full mx-4">
        {/* Small gold loader */}
        <div className="relative flex items-center justify-center w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-gold-500 border-b-gold-500 animate-spin-normal" />
          <div className="absolute inset-1 rounded-full border-3 border-transparent border-l-gold-400 border-r-gold-400 animate-spin-reverse opacity-70" />
        </div>
        <p className="text-xs font-semibold tracking-wider text-gold-600 dark:text-gold-400 uppercase mb-1">
          Securing Transaction
        </p>
        <p className="text-xs text-gray-lux dark:text-gray-400 font-light">
          {text}
        </p>
      </div>
    </div>
  );
}

/**
 * Shimmery skeleton card representing simple grid cells or stats
 */
export function CardSkeleton() {
  return (
    <div className="skeleton rounded-2xl p-5 min-h-[120px] flex flex-col justify-between border border-gold-100/10 bg-white dark:bg-[#1C1C1C]/50">
      <div className="flex justify-between items-start">
        <div className="w-12 h-12 rounded-xl skeleton opacity-60" />
        <div className="w-20 h-4 skeleton" />
      </div>
      <div className="mt-4">
        <div className="w-24 h-6 skeleton mb-1.5" />
        <div className="w-16 h-3 skeleton opacity-50" />
      </div>
    </div>
  );
}

/**
 * Dashboard Overview Tab Skeleton mockup
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse-subtle">
      {/* Welcome Banner Skeleton */}
      <div className="rounded-3xl p-6 min-h-[140px] border border-gold-200/20 bg-white dark:bg-[#1C1C1C] flex flex-col justify-center gap-3">
        <div className="w-28 h-3 skeleton opacity-40" />
        <div className="w-56 h-8 skeleton" />
        <div className="w-96 h-4 skeleton opacity-60" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Detail Block Mockup */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="skeleton lg:col-span-2 rounded-3xl p-6 min-h-[300px]" />
        <div className="skeleton rounded-3xl p-6 min-h-[300px]" />
      </div>
    </div>
  );
}

/**
 * Generic Table Shimmer Skeleton
 */
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full rounded-3xl border border-gold-200/20 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm animate-pulse-subtle">
      {/* Table Header Controls mock */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gold-200/10 pb-4 mb-4">
        <div className="flex flex-col gap-1">
          <div className="w-36 h-5 skeleton" />
          <div className="w-56 h-3 skeleton opacity-65" />
        </div>
        <div className="w-24 h-8 rounded-full skeleton" />
      </div>

      {/* Table body mock */}
      <div className="overflow-x-auto">
        <div className="min-w-full space-y-4">
          {/* Header Row */}
          <div className="flex justify-between items-center py-2 border-b border-gold-250/10 opacity-70">
            {Array.from({ length: cols }).map((_, i) => (
              <div
                key={`th-${i}`}
                style={{ width: `${100 / cols - 5}%` }}
                className="h-4 skeleton"
              />
            ))}
          </div>

          {/* Table Data Rows */}
          {Array.from({ length: rows }).map((_, r) => (
            <div
              key={`tr-${r}`}
              className="flex justify-between items-center py-3 border-b border-gold-200/5 hover:bg-gold-500/5 transition-colors"
            >
              {Array.from({ length: cols }).map((_, c) => (
                <div
                  key={`td-${r}-${c}`}
                  style={{ width: `${100 / cols - 5}%` }}
                  className={`h-5 skeleton ${c === 0 ? "opacity-90" : "opacity-60"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Product Card Shimmer Grid
 */
export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 animate-pulse-subtle">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`prod-sk-${i}`}
          className="rounded-3xl border border-gold-200/20 bg-white dark:bg-[#1C1C1C] p-4 flex flex-col justify-between min-h-[340px]"
        >
          {/* Shimmer Image Box */}
          <div className="skeleton rounded-2xl w-full aspect-square mb-4" />
          {/* Title line */}
          <div className="w-3/4 h-5 skeleton mb-2" />
          {/* Category line */}
          <div className="w-1/2 h-3 skeleton opacity-60 mb-4" />
          {/* Bottom Row */}
          <div className="flex justify-between items-center mt-auto">
            <div className="w-16 h-5 skeleton" />
            <div className="w-20 h-6 rounded-full skeleton opacity-80" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Analytics/Graph Placeholder Widget
 */
export function AnalyticsSkeleton() {
  return (
    <div className="skeleton rounded-3xl p-6 min-h-[260px] flex flex-col justify-between border border-gold-200/20 bg-white dark:bg-[#1C1C1C]">
      <div className="space-y-1.5">
        <div className="w-32 h-5 skeleton" />
        <div className="w-48 h-3.5 skeleton opacity-65" />
      </div>
      <div className="flex items-end justify-between h-32 px-4 gap-2 border-b border-gold-500/10">
        <div className="w-full h-[30%] skeleton opacity-60" />
        <div className="w-full h-[60%] skeleton opacity-80" />
        <div className="w-full h-[45%] skeleton opacity-60" />
        <div className="w-full h-[90%] skeleton" />
        <div className="w-full h-[70%] skeleton opacity-80" />
      </div>
    </div>
  );
}

/**
 * Support Tickets Thread & Message bubble skeleton
 */
export function ChatSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 rounded-3xl border border-gold-200/20 bg-white dark:bg-[#1C1C1C] min-h-[500px] overflow-hidden animate-pulse-subtle">
      {/* Sidebar Thread Mockup */}
      <div className="md:col-span-4 border-r border-gold-200/10 p-4 space-y-4">
        <div className="w-32 h-6 skeleton" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`thr-sk-${i}`} className="flex items-center gap-3 p-2 border-b border-gold-200/5">
              <div className="w-10 h-10 rounded-full skeleton shrink-0" />
              <div className="w-full space-y-1.5">
                <div className="w-20 h-3 skeleton" />
                <div className="w-32 h-2.5 skeleton opacity-60" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Conversation Bubble Mockup */}
      <div className="md:col-span-8 p-6 flex flex-col justify-between min-h-[450px]">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-gold-200/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full skeleton" />
            <div className="space-y-1.5">
              <div className="w-24 h-4 skeleton" />
              <div className="w-16 h-3 skeleton opacity-60" />
            </div>
          </div>
          <div className="w-16 h-6 rounded-full skeleton" />
        </div>

        {/* Message timeline mockup */}
        <div className="flex-1 space-y-4 overflow-y-auto mb-6">
          <div className="flex justify-start">
            <div className="skeleton rounded-2xl rounded-tl-none p-3 max-w-sm w-44 min-h-[50px] opacity-75" />
          </div>
          <div className="flex justify-end">
            <div className="skeleton rounded-2xl rounded-tr-none p-3 max-w-sm w-56 min-h-[60px] bg-gold-500/10" />
          </div>
          <div className="flex justify-start">
            <div className="skeleton rounded-2xl rounded-tl-none p-3 max-w-sm w-36 min-h-[45px] opacity-75" />
          </div>
        </div>

        {/* Reply input mock */}
        <div className="w-full h-10 rounded-full skeleton opacity-85" />
      </div>
    </div>
  );
}
