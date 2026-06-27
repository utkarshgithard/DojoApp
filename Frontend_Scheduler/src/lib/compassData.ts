export interface CompassFeature {
  id: number;
  title: string;
  description: string;
  angle: number;
  direction: string;
  icon: string;
}

export const features: CompassFeature[] = [
  {
    id: 0,
    title: "Smart Attendance Tracking",
    description: "Never guess how many classes you can afford to miss. Track your subjects, maintain your minimum required percentage, and stay ahead.",
    angle: 45,
    direction: "NE",
    icon: "CalendarCheck",
  },
  {
    id: 1,
    title: "Time & Focus Analytics",
    description: "Visualize your study habits. Track hours spent across different subjects and gain actionable insights into your most productive times.",
    angle: 90,
    direction: "E",
    icon: "Clock",
  },
  {
    id: 2,
    title: "Live Session Rooms",
    description: "Create private session rooms with your friends. Chat, collaborate, and study together in real-time, no matter where you are.",
    angle: 135,
    direction: "SE",
    icon: "Users",
  },
  {
    id: 3,
    title: "Vibrant Community",
    description: "Connect with classmates, share resources, and build a network. Ask questions, get help, and grow together in a dedicated learning space.",
    angle: 180,
    direction: "S",
    icon: "Sparkles",
  },
  {
    id: 4,
    title: "Seamless Management",
    description: "Everything you need in one place. From managing your daily schedule to keeping up with upcoming assignments—all designed for students.",
    angle: 270,
    direction: "W",
    icon: "BarChart3",
  },
  {
    id: 5,
    title: "Start Your Journey",
    description: "Your academic life, organized and amplified. Point your compass toward success, take the first step, and join DojoClass today.",
    angle: 360,
    direction: "N",
    icon: "Navigation",
  },
];
