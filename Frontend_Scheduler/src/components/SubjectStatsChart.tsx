"use client";

import React, { useState, useRef, useEffect } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useAttendance } from "@/context/AttendanceContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { SubjectStats as SubjectStat } from "@/lib/types";

ChartJS.register(ArcElement, Tooltip, Legend);

const SubjectStatsChart = () => {
    const { subjectStats: stats } = useAttendance() as { subjectStats: SubjectStat[] };
    const { darkMode } = useDarkMode() as any;
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 200);
        return () => clearTimeout(timer);
    }, []);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-16">
                <span className="inline-block w-6 h-6 rounded-full border-[2px] border-current border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!stats || stats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className={`p-3 rounded-full mb-3 ${darkMode ? 'bg-zinc-950 text-zinc-500 border border-zinc-800' : 'bg-zinc-50 text-zinc-400 border border-zinc-100'}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" strokeDasharray="3 3" />
                        <path d="M12 6v6l4 2" />
                    </svg>
                </div>
                <p className={`text-[13px] font-semibold ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>No stats available</p>
                <p className={`text-[11px] text-gray-500 max-w-[240px] mt-1 leading-normal`}>
                    Your visual metrics and subject attendance breakdown will generate once you start marking your classes.
                </p>
            </div>
        );
    }

    const dark = darkMode;
    const border = dark ? "border-gray-800" : "border-gray-200";
    const muted = dark ? "text-gray-400" : "text-gray-500";

    const totalAttended = stats.reduce((total, s) => total + s.attended, 0);
    const totalMissed = stats.reduce((total, s) => total + s.missed, 0);
    const totalCancelled = stats.reduce((total, s) => total + s.cancelled, 0);

    return (
        <div className="relative">
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none !important;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none !important;
                    scrollbar-width: none !important;
                }
            `}</style>
            {/* Scroll Navigation Buttons */}
            <div className="absolute -left-2 top-[125px] z-10">
                <button
                    onClick={scrollLeft}
                    className={`p-1.5 rounded-full border transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 bg-white dark:bg-black ${border}`}
                    aria-label="Scroll left"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            </div>

            <div className="absolute -right-2 top-[125px] z-10">
                <button
                    onClick={scrollRight}
                    className={`p-1.5 rounded-full border transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 bg-white dark:bg-black ${border}`}
                    aria-label="Scroll right"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Total Metrics Dashboard Grid */}
            <div className={`grid grid-cols-3 border rounded-lg p-3 text-center mb-6 bg-transparent ${border}`}>
                <div>
                    <div className="text-[18px] font-mono font-medium text-green-500">{totalAttended}</div>
                    <div className={`text-[10px] uppercase tracking-wider mt-0.5 ${muted}`}>Attended</div>
                </div>
                <div className={`border-x ${border}`}>
                    <div className="text-[18px] font-mono font-medium text-red-500">{totalMissed}</div>
                    <div className={`text-[10px] uppercase tracking-wider mt-0.5 ${muted}`}>Missed</div>
                </div>
                <div>
                    <div className="text-[18px] font-mono font-medium text-amber-500">{totalCancelled}</div>
                    <div className={`text-[10px] uppercase tracking-wider mt-0.5 ${muted}`}>Cancelled</div>
                </div>
            </div>

            {/* Carousel Content */}
            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 snap-x snap-mandatory"
                style={{ scrollBehavior: "smooth" }}
            >
                {stats.map((subject, idx) => {
                    const total = subject.attended + subject.missed + subject.cancelled;
                    const attendedPercentage = total > 0 ? Math.round((subject.attended / total) * 100) : 0;

                    const data = {
                        labels: ["Attended", "Missed", "Cancelled"],
                        datasets: [
                            {
                                data: [subject.attended, subject.missed, subject.cancelled],
                                backgroundColor: [
                                    "#10B981", // Emerald green
                                    "#EF4444", // Crimson red
                                    "#F59E0B", // Bright amber
                                ],
                                borderWidth: 0,
                                hoverBackgroundColor: [
                                    "#34D399",
                                    "#F87171",
                                    "#FBBF24",
                                ],
                            },
                        ],
                    };

                    return (
                        <div
                            key={idx}
                            className={`min-w-[270px] snap-center flex-shrink-0 flex flex-col items-center 
                                border rounded-lg p-4 transition-all duration-350 bg-white dark:bg-black
                                ${border} ${activeIndex === idx ? "scale-[1.02]" : "opacity-95"}`}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            <h3 className="text-[14px] font-medium tracking-tight mb-4 truncate w-full text-center">
                                {subject.subject}
                            </h3>

                            {/* Ultra-sleek Thin Doughnut Ring */}
                            <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                                <Doughnut
                                    data={data}
                                    options={{
                                        plugins: {
                                            legend: { display: false },
                                            tooltip: {
                                                backgroundColor: dark ? "#000" : "#fff",
                                                titleColor: dark ? "#fff" : "#000",
                                                bodyColor: dark ? "#ccc" : "#444",
                                                borderColor: dark ? "#222" : "#eee",
                                                borderWidth: 1,
                                                displayColors: true,
                                                callbacks: {
                                                    label: function (context) {
                                                        const value = context.parsed;
                                                        const percentage = Math.round((value / total) * 100);
                                                        return ` ${context.label}: ${value} (${percentage}%)`;
                                                    },
                                                },
                                            },
                                        },
                                        cutout: "82%", // Very thin & premium looking cutout
                                        rotation: -90,
                                        circumference: 360,
                                        animation: {
                                            animateScale: true,
                                            animateRotate: true,
                                        },
                                    }}
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[20px] font-medium font-mono tracking-tighter">
                                        {attendedPercentage}%
                                    </span>
                                    <span className={`text-[9px] uppercase tracking-wider ${muted}`}>Attended</span>
                                </div>
                            </div>

                            {/* Detailed Rows */}
                            <div className="space-y-1.5 w-full text-[12px] mt-2">
                                <div className="flex justify-between items-center py-0.5 border-b border-gray-50/50 dark:border-gray-900/50">
                                    <div className="flex items-center">
                                        <span className="w-2 h-2 rounded-full bg-[#10B981] mr-2"></span>
                                        <span className={muted}>Attended</span>
                                    </div>
                                    <div className="font-medium font-mono">
                                        {subject.attended} <span className={`text-[10px] ${muted}`}>({total > 0 ? Math.round((subject.attended / total) * 100) : 0}%)</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center py-0.5 border-b border-gray-50/50 dark:border-gray-900/50">
                                    <div className="flex items-center">
                                        <span className="w-2 h-2 rounded-full bg-[#EF4444] mr-2"></span>
                                        <span className={muted}>Missed</span>
                                    </div>
                                    <div className="font-medium font-mono">
                                        {subject.missed} <span className={`text-[10px] ${muted}`}>({total > 0 ? Math.round((subject.missed / total) * 100) : 0}%)</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center py-0.5 border-b border-gray-50/50 dark:border-gray-900/50">
                                    <div className="flex items-center">
                                        <span className="w-2 h-2 rounded-full bg-[#F59E0B] mr-2"></span>
                                        <span className={muted}>Cancelled</span>
                                    </div>
                                    <div className="font-medium font-mono">
                                        {subject.cancelled} <span className={`text-[10px] ${muted}`}>({total > 0 ? Math.round((subject.cancelled / total) * 100) : 0}%)</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-2 text-[11px]">
                                    <span className={muted}>Total Sessions</span>
                                    <span className="font-medium font-mono">{total}</span>
                                </div>
                            </div>

                            {/* Minimal Clean Status Indicator */}
                            <div className="mt-4 w-full">
                                <div className={`text-center text-[11px] font-medium py-1 rounded border ${
                                    attendedPercentage >= 80 ? "border-green-500/20 text-green-500 bg-green-500/5" :
                                    attendedPercentage >= 60 ? "border-amber-500/20 text-amber-500 bg-amber-500/5" :
                                    "border-red-500/20 text-red-500 bg-red-500/5"
                                }`}>
                                    {attendedPercentage >= 80 ? "Excellent Standing" :
                                     attendedPercentage >= 60 ? "Fair Standing" :
                                     "Critical Warning"}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pill-shaped Slide Navigation Dots */}
            <div className="flex justify-center mt-3 gap-1.5">
                {stats.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => {
                            if (scrollContainerRef.current) {
                                scrollContainerRef.current.scrollTo({
                                    left: idx * 286,
                                    behavior: "smooth"
                                });
                            }
                        }}
                        style={{
                            width: activeIndex === idx ? 18 : 6,
                            height: 6,
                            borderRadius: 9999,
                            background: activeIndex === idx
                                ? dark ? "#f5f5f5" : "#111"
                                : dark ? "#333" : "#ddd",
                        }}
                        className="transition-all duration-300"
                        aria-label={`Go to card ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default SubjectStatsChart;
