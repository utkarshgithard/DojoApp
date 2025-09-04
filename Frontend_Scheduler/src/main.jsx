import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { DarkModeProvider } from './context/DarkModeContext';
import { SocketProvider } from './context/SocketContext.jsx';

import App from './App.jsx'
import AuthProvider from './context/authContext.jsx'
import { AttendanceProvider } from './context/AttendanceContext.jsx';
createRoot(document.getElementById('root')).render(
  <BrowserRouter>

    <AttendanceProvider>
      <SocketProvider>
        <DarkModeProvider>
          <AuthProvider>

            <App />

          </AuthProvider>
        </DarkModeProvider>
      </SocketProvider>
    </AttendanceProvider>

  </BrowserRouter>,
)
