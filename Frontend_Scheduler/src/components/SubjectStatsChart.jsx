// SubjectStatsChart.jsx
import React, { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import API from "../api/axios";

ChartJS.register(ArcElement, Tooltip, Legend);

const SubjectStatsChart = () => {
    const [stats, setStats] = useState([]);

    useEffect(() => {
        API.get("/subject/stats")
            .then((res) => {
                setStats(res.data.data);
            })
            .catch((err) => {
                console.error("Error fetching stats:", err);
            });
    }, []);

    return (
        <div className="overflow-x-auto scrollbar-hide p-6">
            <div className="flex gap-6 snap-x snap-mandatory">
                {stats.map((subject, idx) => {
                    const data = {
                        labels: ["Attended", "Missed", "Cancelled"],
                        datasets: [
                            {
                                data: [
                                    subject.attended,
                                    subject.missed,
                                    subject.cancelled,
                                ],
                                backgroundColor: ["#6EE7B7", "#FCA5A5", "#FDE68A"], // soft pastel
                                borderWidth: 0, // no borders for a clean look
                            },
                        ],
                    };

                    return (
                        <div
                            key={idx}
                            className="min-w-[240px] snap-center flex-shrink-0 flex flex-col items-center 
              bg-white/30 dark:bg-gray-800/40 backdrop-blur-md p-5 rounded-2xl shadow-lg
              hover:scale-105 transition-transform duration-300"
                        >
                            <h2 className="text-lg font-semibold mb-4 shadow-inner text-gray-800 dark:text-gray-100">
                                {subject.subject}
                            </h2>
                            <div className="w-20 h-20 ">
                                <Doughnut
                                    data={data}
                                    options={{
                                        plugins: {
                                            legend: { display: false },
                                            tooltip: {
                                                backgroundColor: "#1f2937",
                                                titleColor: "#fff",
                                                bodyColor: "#fff",
                                                displayColors: false,
                                            },
                                        },
                                        cutout: "70%",       // thicker ring for depth
                                        rotation: -90,       // start from top
                                        circumference: 360,  // full circle
                                    }}
                                    className=""
                                />

                            </div>
                            <div className="flex gap-3 text-sm mt-3">
                                <span className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-[#6EE7B7]"></span>
                                    {subject.attended}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-[#FCA5A5]"></span>
                                    {subject.missed}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-[#FDE68A]"></span>
                                    {subject.cancelled}
                                </span>
                            </div>
                    </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SubjectStatsChart;
