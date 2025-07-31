// src/pages/Login.jsx
import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { AuthContext } from '../context/authContext';
import { useDarkMode } from '../context/DarkModeContext';

export default function Login() {
  const { login } = useContext(AuthContext);
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/auth/login', form);
      console.log(res)
      login(res.data.token);
      navigate('/dashboard');
    } catch (err) {
      alert('❌ Login failed.');
    }
  };

  return (
    <div className={`min-h-screen flex justify-center items-center transition duration-300 ${darkMode ? 'bg-black text-white' : 'bg-gradient-to-br from-gray-100 to-white text-black'}`}>
      <form
        onSubmit={handleSubmit}
        className={`p-8 shadow-xl rounded-xl w-full max-w-md space-y-4 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}
      >
        <h2 className="text-2xl font-bold text-center">Welcome Back</h2>

        <input
          type="email"
          placeholder="Email"
          className={`w-full border px-4 py-2 rounded ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : ''}`}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className={`w-full border px-4 py-2 rounded ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : ''}`}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Log In
        </button>
        <p className="text-center text-sm">
          Don’t have an account?{' '}
          <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => navigate('/register')}>
            Sign Up
          </span>
        </p>
      </form>
    </div>
  );
}
