"use client";

import { useEffect, useState } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(target: Date): TimeLeft {
  const now = new Date().getTime();
  const diff = target.getTime() - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

interface CountdownTimerProps {
  targetDate: string; // ISO date string
  eventName: string;
}

export function CountdownTimer({ targetDate, eventName }: CountdownTimerProps) {
  const target = new Date(targetDate);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft(target));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const isPast = target.getTime() < Date.now();

  if (!mounted) return null;

  if (isPast) {
    return (
      <div
        className="text-center py-6 px-8 rounded-2xl border"
        style={{ background: "var(--muted)", borderColor: "var(--border)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--muted-fg)" }}>
          This event has passed
        </p>
      </div>
    );
  }

  const segments = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <div
      className="rounded-2xl border p-6 sm:p-8"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <p
        className="text-xs font-bold uppercase tracking-widest text-center mb-4"
        style={{ color: "var(--muted-fg)" }}
      >
        Countdown to {eventName}
      </p>
      <div className="grid grid-cols-4 gap-3">
        {segments.map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-xl p-3 sm:p-4"
            style={{ background: "var(--muted)" }}
          >
            <span
              className="text-2xl sm:text-3xl font-black tabular-nums"
              style={{ color: "var(--primary)" }}
            >
              {String(value).padStart(2, "0")}
            </span>
            <span
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--muted-fg)" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
