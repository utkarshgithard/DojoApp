import { Routes, Route,useLocation } from "react-router-dom";
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import Navbar from './components/Navbar';
// import AuthPage from "./pages/AuthPage";
import WeeklyScheduleSetup from "./pages/WeeklyScheduleSetup";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Verify from "./pages/Verify";
import VerifyEmail from "./pages/VerifyEmail";
const noNavbarRoutes = ['/', '/login', '/register','/verify','/verify-email/:token'];

function App() {

  const location = useLocation();

  return (
      <>
      {!noNavbarRoutes.includes(location.pathname) && <Navbar />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<Register/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/verify" element={<Verify />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/dashboard" element={<Dashboard/>}/>
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/setup-schedule" element={<WeeklyScheduleSetup />} />
      </Routes>
      </>
      

  );
}

export default App;
