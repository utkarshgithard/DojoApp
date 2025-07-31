import { useState, useContext } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import { useDarkMode } from '../context/DarkModeContext';

function Register() {
  const { login } = useContext(AuthContext);
  const { darkMode } = useDarkMode(); // 🌓 Access global dark mode
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log(form)
      const res = await API.post('/auth/register', form);
      console.log(res)
      alert("✅ Registered successfully! Please check your email to verify your account.");
      navigate('/verify');
      // login(res.data.verificationToken);
    } catch (err) {
      alert('❌ Registration failed.');
    }
  };

  return (
    <div className={`${darkMode ? 'bg-black text-white' : 'bg-gradient-to-br from-blue-100 to-white'} min-h-screen flex justify-center items-center transition duration-300`}>
      <form
        onSubmit={handleSubmit}
        className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white'} p-8 shadow-xl rounded-xl w-full max-w-md space-y-4 transition duration-300`}
      >
        <h2 className="text-2xl font-bold text-center">Create Account</h2>
        <input
          type="text"
          placeholder="Name"
          className="w-full border px-4 py-2 rounded bg-transparent"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full border px-4 py-2 rounded bg-transparent"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border px-4 py-2 rounded bg-transparent"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Sign Up
        </button>
        <p className="text-center text-sm">
          Already have an account?{' '}
          <span
            className="text-blue-700 cursor-pointer hover:underline"
            onClick={() => navigate('/login')}
          >
            Log In
          </span>
        </p>
      </form>
    </div>
  );
}

export default Register;
