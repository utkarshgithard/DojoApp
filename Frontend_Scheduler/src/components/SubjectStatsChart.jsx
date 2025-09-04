// SubjectStatsChart.jsx
import React, { useEffect, useState, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import API from "../api/axios";

ChartJS.register(ArcElement, Tooltip, Legend);

const SubjectStatsChart = () => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(null);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        API.get("/subject/stats")
            .then((res) => {
                setStats(res.data.data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching stats:", err);
                setLoading(false);
            });
    }, []);

    // Scroll functions for navigation buttons
    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!stats || stats.length === 0) {
        return (
            <div className="text-center p-12 bg-white/30 dark:bg-gray-800/40 rounded-2xl backdrop-blur-md">
                <p className="text-gray-600 dark:text-gray-300">No subject statistics available</p>
            </div>
        );
    }

    return (
        <div className="p-6 relative">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100 text-center font-serif">
                Subject Attendance Overview
            </h2>
            
            {/* Navigation buttons */}
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10">
                <button 
                    onClick={scrollLeft}
                    className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-md hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Scroll left"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            </div>
            
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10">
                <button 
                    onClick={scrollRight}
                    className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-md hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Scroll right"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Stats summary bar */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 p-4 rounded-xl mb-6 shadow-sm">
                <div className="flex flex-wrap justify-center gap-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                            {stats.reduce((total, subject) => total + subject.attended, 0)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Total Attended</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400 font-mono">
                            {stats.reduce((total, subject) => total + subject.missed, 0)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Total Missed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                            {stats.reduce((total, subject) => total + subject.cancelled, 0)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Total Cancelled</div>
                    </div>
                </div>
            </div>
            
            <div 
                ref={scrollContainerRef}
                className="flex overflow-x-auto scrollbar-hide gap-6 pb-6 snap-x snap-mandatory"
                style={{ scrollBehavior: 'smooth' }}
            >
                {stats.map((subject, idx) => {
                    const total = subject.attended + subject.missed + subject.cancelled;
                    const attendedPercentage = total > 0 ? Math.round((subject.attended / total) * 100) : 0;
                    
                    const data = {
                        labels: ["Attended", "Missed", "Cancelled"],
                        datasets: [
                            {
                                data: [
                                    subject.attended,
                                    subject.missed,
                                    subject.cancelled,
                                ],
                                backgroundColor: [
                                    "#10B981", // More vibrant green
                                    "#EF4444", // More vibrant red
                                    "#F59E0B", // More vibrant yellow
                                ],
                                borderWidth: 2,
                                borderColor: "#fff",
                                hoverBackgroundColor: [
                                    "#34D399", // Lighter green on hover
                                    "#F87171", // Lighter red on hover
                                    "#FBBF24", // Lighter yellow on hover
                                ],
                            },
                        ],
                    };

                    return (
                        <div
                            key={idx}
                            className={`min-w-[300px] snap-center flex-shrink-0 flex flex-col items-center 
                                bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-lg transition-all duration-300
                                ${activeIndex === idx ? "ring-2 ring-indigo-500 scale-105" : "hover:shadow-xl"}`}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            <h2 className="text-lg font-semibold mb-4 text-center text-gray-800 dark:text-gray-100 truncate w-full font-sans">
                                {subject.subject}
                            </h2>
                            
                            <div className="flex items-center justify-center mb-4">
                                <div className="relative w-28 h-28">
                                    <Doughnut
                                        data={data}
                                        options={{
                                            plugins: {
                                                legend: { display: false },
                                                tooltip: {
                                                    backgroundColor: "#1f2937",
                                                    titleColor: "#fff",
                                                    bodyColor: "#fff",
                                                    displayColors: true,
                                                    callbacks: {
                                                        label: function(context) {
                                                            const value = context.parsed;
                                                            const percentage = Math.round((value / total) * 100);
                                                            return `${context.label}: ${value} (${percentage}%)`;
                                                        }
                                                    }
                                                },
                                            },
                                            cutout: "65%",
                                            rotation: -90,
                                            circumference: 360,
                                            animation: {
                                                animateScale: true,
                                                animateRotate: true
                                            }
                                        }}
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold text-gray-800 dark:text-gray-100 font-mono">
                                            {attendedPercentage}%
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-sans">attended</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2 mt-4 w-full">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center">
                                        <span className="w-3 h-3 rounded-full bg-[#10B981] mr-2"></span>
                                        <span className="text-sm font-sans">Attended</span>
                                    </div>
                                    <div className="font-medium font-mono">
                                        {subject.attended} <span className="text-xs text-gray-500">({Math.round((subject.attended / total) * 100)}%)</span>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center">
                                        <span className="w-3 h-3 rounded-full bg-[#EF4444] mr-2"></span>
                                        <span className="text-sm font-sans">Missed</span>
                                    </div>
                                    <div className="font-medium font-mono">
                                        {subject.missed} <span className="text-xs text-gray-500">({Math.round((subject.missed / total) * 100)}%)</span>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center">
                                        <span className="w-3 h-3 rounded-full bg-[#F59E0B] mr-2"></span>
                                        <span className="text-sm font-sans">Cancelled</span>
                                    </div>
                                    <div className="font-medium font-mono">
                                        {subject.cancelled} <span className="text-xs text-gray-500">({Math.round((subject.cancelled / total) * 100)}%)</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 w-full">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400 font-sans">Total sessions:</span>
                                    <span className="font-medium font-mono">{total}</span>
                                </div>
                            </div>

                            {/* Student-focused status indicator */}
                            <div className="mt-4 w-full">
                                <div className={`text-center text-sm px-3 py-1 rounded-full font-sans ${
                                    attendedPercentage >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                                    attendedPercentage >= 60 ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                                    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                }`}>
                                    {attendedPercentage >= 80 ? "Excellent Attendance" :
                                     attendedPercentage >= 60 ? "Good Attendance" :
                                     "Needs Improvement"}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Scroll indicators for better UX */}
            <div className="flex justify-center mt-4 space-x-1">
                {stats.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => {
                            if (scrollContainerRef.current) {
                                scrollContainerRef.current.scrollTo({
                                    left: idx * 324, // 300px card width + 24px gap
                                    behavior: 'smooth'
                                });
                            }
                        }}
                        className="w-2 h-2 rounded-full bg-gray-300 hover:bg-indigo-400 transition-colors"
                        aria-label={`Go to card ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default SubjectStatsChart;