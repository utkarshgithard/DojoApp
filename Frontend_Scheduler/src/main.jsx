import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { DarkModeProvider } from './context/DarkModeContext';

import App from './App.jsx'
import AuthProvider from './context/authContext.jsx'
import { AttendanceProvider } from './context/AttendanceContext.jsx';
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AttendanceProvider>
      <DarkModeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </DarkModeProvider>
    </AttendanceProvider>

  </BrowserRouter>,
)
