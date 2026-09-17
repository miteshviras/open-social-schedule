'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  MoveHorizontal,
} from 'lucide-react';
import Link from 'next/link';

interface PostTarget {
  id: string;
  publishAtUtc: string;
  timezone: string;
  status: string;
  post: {
    canonicalContent: string;
  };
  socialAccount: {
    provider: string;
    displayName: string;
  };
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [targets, setTargets] = useState<PostTarget[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/post-targets');
        if (res.ok) {
          const data = await res.json();
          setTargets(data);
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  // Calendar calculations
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Calendar Planner</h2>
          <p className="text-sm text-slate-500 mt-1">
            Visual month overview of your social posting schedule.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-xs">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 sm:px-4 text-xs font-bold text-slate-800 whitespace-nowrap">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Link
            href="/compose"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Schedule
          </Link>
        </div>
      </div>

      {/* Mobile Swipe Notice */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 sm:hidden px-1">
        <MoveHorizontal className="w-3.5 h-3.5 text-slate-400" />
        <span>Swipe horizontally on the calendar to navigate days.</span>
      </div>

      {/* Calendar Grid with horizontal scroll wrap on small viewports */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="min-w-[650px]">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-bold text-slate-600 py-3">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 min-h-[500px]">
            {days.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="bg-slate-50/30 min-h-[110px]" />;
              }

              const dateStr = date.toISOString().split('T')[0];
              const dayTargets = targets.filter((t) => t.publishAtUtc.startsWith(dateStr));
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              return (
                <div
                  key={dateStr}
                  className={`p-2.5 min-h-[110px] flex flex-col justify-between transition hover:bg-slate-50/50 ${
                    isToday ? 'bg-blue-50/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                        isToday
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {dayTargets.length > 0 && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        {dayTargets.length} post{dayTargets.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 mt-2 flex-1">
                    {dayTargets.slice(0, 3).map((item) => (
                      <Link
                        key={item.id}
                        href="/queue"
                        className="block p-1.5 rounded-md text-[11px] bg-white border border-slate-200 hover:border-blue-400 shadow-xs transition group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-3.5 h-3.5 rounded text-[8px] font-bold text-white flex items-center justify-center flex-shrink-0 ${
                              item.socialAccount.provider === 'linkedin'
                                ? 'bg-[#0077B5]'
                                : item.socialAccount.provider === 'x'
                                ? 'bg-black'
                                : 'bg-indigo-600'
                            }`}
                          >
                            {item.socialAccount.provider === 'linkedin' ? 'in' : item.socialAccount.provider === 'x' ? '𝕏' : 'M'}
                          </span>
                          <span className="text-slate-800 font-medium truncate group-hover:text-blue-600">
                            {item.post.canonicalContent}
                          </span>
                        </div>
                      </Link>
                    ))}

                    {dayTargets.length > 3 && (
                      <span className="text-[10px] font-semibold text-slate-500 block text-center">
                        +{dayTargets.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
