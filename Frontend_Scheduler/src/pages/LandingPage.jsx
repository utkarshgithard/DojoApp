import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { useDarkMode } from '../context/DarkModeContext';
import attendanceImg from '../assets/attendanceImg.png';
import scheduleImg from '../assets/scheduleImg.png';
import summaryImg from '../assets/summaryImg.png';

const slides = [
  { text: 'Track your attendance effortlessly.', image: attendanceImg },
  { text: 'Plan your weekly class schedule.', image: scheduleImg },
  { text: 'Visualize attendance subject-wise.', image: summaryImg }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (manual) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [manual]);


  const goToPrev = () => {
    setManual(true);
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setManual(true);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => goToNext(),
    onSwipedRight: () => goToPrev(),
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: true
  });

  return (
    <div className={`${darkMode ? 'bg-black text-white' : 'bg-white text-black'} min-h-screen transition duration-500 relative`}>
      {/* Cool SVG background */}
      <svg className="absolute top-0 left-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Header */}
      <div className="flex justify-between items-center px-4 py-6 sm:px-8 relative z-10">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">ClassMate</h1>
        <button onClick={toggleDarkMode} className='border border-gray-500 flex pr-2 justify-center items-center rounded-full '>
          <div  className="p-1.5 dark:hover:bg-gray-800  ">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </div>
          <p>{darkMode?'Light':'Dark'}</p>
        </button>


      </div>

      {/* Slideshow */}
      <div className="flex flex-col items-center justify-center px-4 relative z-10" {...swipeHandlers}>
        <div className="relative w-full max-w-xl h-52 sm:h-64 overflow-hidden rounded-xl shadow-lg">
          <div
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {slides.map((slide, index) => (
              <img
                key={index}
                src={slide.image}
                alt={`Slide ${index}`}
                className="w-full h-52 sm:h-64 flex-shrink-0 object-cover"
              />

            ))}
          </div>
        </div>

        {/* Fade-in Slide Text */}
        <p className="text-lg sm:text-xl mt-4 text-center font-medium px-2 sm:px-0 animate-fade-in">
          {slides[currentSlide].text}
        </p>

        {/* Clickable Dots */}
        <div className="flex mt-3 gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              onClick={() => {
                setManual(true);
                setCurrentSlide(i);
              }}
              className={`w-1 h-1 rounded-full cursor-pointer transition ${currentSlide === i
                  ? 'bg-blue-700  '
                  : 'bg-red-500 '
                }`}
            ></span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-4 mt-12 sm:mt-16 px-4 relative z-10">
        <button
          onClick={() => navigate('/register')}
          className="w-full sm:w-auto bg-black text-white px-8 py-2 rounded-lg hover:bg-gray-800"
        >
          🚀 Get Started
        </button>
        <button
          onClick={() => navigate('/login')}
          className=""
        >
          Already have an account? Log In
        </button>
      </div>
    </div>
  );
}
