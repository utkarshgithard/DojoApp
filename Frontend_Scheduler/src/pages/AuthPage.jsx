import { useState } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';

function AuthPage() {
  const [isSignup, setIsSignup] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();

  const handleToggle = () => {
    setIsSignup((prev) => !prev);
    setForm({ name: '', email: '', password: '' });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isSignup) {
        await API.post('/auth/register', form);
        alert('Signup successful, now login.');
        setIsSignup(false);
      } else {
        const res = await API.post('/auth/login', form);
        console.log(res);
        localStorage.setItem('token', res.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <div className="p-8 space-y-6">
          <h2 className="text-2xl font-bold text-center">
            {isSignup ? 'Sign Up' : 'Log In'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Name"
                className="w-full border p-2 rounded"
                required
              />
            )}
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className="w-full border p-2 rounded"
              required
            />
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              className="w-full border p-2 rounded"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              {isSignup ? 'Sign Up' : 'Log In'}
            </button>
          </form>
          <p className="text-center text-sm">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              onClick={handleToggle}
              className="text-blue-600 ml-1 hover:underline"
            >
              {isSignup ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </div>
        <div className="hidden md:flex items-center justify-center bg-gray-200">
          <p className="text-lg font-semibold text-center px-6">
            Focus on learning. Let us handle your schedule. 📚
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
