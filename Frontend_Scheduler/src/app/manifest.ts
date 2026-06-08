import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DojoClass — Smart Attendance Tracker",
    short_name: "DojoClass",
    description:
      "Track your college attendance by subject, plan weekly schedules, and never fall below 75%. Free for all students.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/favicon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
