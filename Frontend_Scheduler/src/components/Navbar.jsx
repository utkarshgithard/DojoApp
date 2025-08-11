import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { AuthContext } from '../context/authContext';

const Navbar = () => {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { logout, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Scroll detection logic
  useEffect(() => {
    let timeout;
    const controlNavbar = () => {
      if (window.scrollY < lastScrollY) {
        setShowNavbar(true); // scrolling up → show
      } else {
        setShowNavbar(false); // scrolling down → hide
      }
      setLastScrollY(window.scrollY);

      clearTimeout(timeout);
      timeout = setTimeout(() => setShowNavbar(true), 1500); // auto-show after pause
    };

    window.addEventListener('scroll', controlNavbar);
    return () => {
      window.removeEventListener('scroll', controlNavbar);
      clearTimeout(timeout);
    };
  }, [lastScrollY]);

  return (
    <nav
      className={`
        fixed top-0 left-0 w-full z-50 transition-transform duration-300 ease-in-out 
        ${showNavbar ? 'translate-y-0' : '-translate-y-full'}
        ${darkMode ? 'bg-black/40 text-white' : 'bg-white/40 text-black'}
        backdrop-blur-md shadow-lg border-b border-gray-800/30
      `}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Dojo</h1>

        <div className="flex items-center gap-4">
          {/* Dark Mode Toggle */}
          <button onClick={toggleDarkMode} className="hover:scale-110 transition duration-200">
            {darkMode ? <Sun size={22} className="text-yellow-300" /> : <Moon size={22} className="text-gray-600" />}
          </button>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/dashboard"
              className={`hover:text-emerald-500 transition duration-200 text-lg ${
                location.pathname === '/dashboard' ? 'text-gray-500 border-b-2  dark:text-rose-400 font-bold' : ''
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/setup-schedule"
              className={`hover:text-emerald-500 transition duration-200 text-lg ${
                location.pathname === '/setup-schedule' ? 'text-gray-500 dark:text-rose-400 border-b-2 font-bold' : ''
              }`}
            >
              Schedule
            </Link>
            <Link
              to="/calender"
              className={`hover:text-emerald-500  transition duration-200 text-lg ${
                location.pathname === '/calender' ? 'text-gray-500 border-b-2  dark:text-rose-400 font-bold' : ''
              }`}
            >
              Calender
            </Link>
            <Link
              to="/settings"
              className={`hover:text-emerald-500 transition duration-200 text-lg ${
                location.pathname === '/settings' ? 'text-gray-500 border-b-2  dark:text-rose-400 font-bold' : ''
              }`}
            >
              Settings
            </Link>

            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1 rounded-full text-sm transition duration-200"
              >
                Logout
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button onClick={toggleMenu} className="md:hidden">
            {isOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div
          className={`${darkMode ? 'bg-gray-900/90 text-white' : 'bg-gray-100/90 text-black'} 
          md:hidden px-4 pb-4 space-y-3 backdrop-blur-lg`}
        >
          <Link
            to="/dashboard"
            onClick={closeMenu}
            className={`block ${
              location.pathname === '/dashboard'
                ? 'font-semibold text-gray-700 border-l-2 border-gray-500 px-2  dark:text-rose-400'
                : 'hover:text-gray-300'
            } transition duration-200`}
          >
            Dashboard
          </Link>
          <Link
            to="/setup-schedule"
            onClick={closeMenu}
            className={`block ${
              location.pathname === '/setup-schedule'
                ? 'text-gray-700 font-semibold border-l-2 border-gray-500 px-2  dark:text-rose-400'
                : 'hover:text-gray-300'
            } transition duration-200`}
          >
            Schedule
          </Link>
          <Link
            to="/calender"
            onClick={closeMenu}
            className={`block ${
              location.pathname === '/calender'
                ? 'text-gray-700 font-semibold border-l-2 border-gray-500 px-2  dark:text-rose-400'
                : 'hover:text-gray-300'
            } transition duration-200`}
          >
            Calender
          </Link>
          <Link
            to="/settings"
            onClick={closeMenu}
            className={`block ${
              location.pathname === '/settings'
                ? 'text-gray-700 font-semibold border-l-2 border-gray-500 px-2  dark:text-rose-400'
                : 'hover:text-gray-300'
            } transition duration-200`}
          >
            Settings
          </Link>

          {isAuthenticated && (
            <button
              onClick={() => {
                handleLogout();
                closeMenu();
              }}
              className="block bg-gray-800 hover:bg-gray-700 text-white w-full py-1 rounded-md mt-2 transition duration-200"
            >
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
