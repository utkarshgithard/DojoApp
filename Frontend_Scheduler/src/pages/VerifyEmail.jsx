import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';

function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verifying...');

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const res = await API.get(`/auth/verify-email/${token}`);
        setStatus('✅ Email verified successfully! Redirecting to login...');
        setTimeout(() => navigate('/dashboard'), 3000);
      } catch (err) {
        setStatus('❌ Invalid or expired token.');
      }
    };

    verifyToken();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black text-black dark:text-white">
      <div className="text-center p-6">
        <h2 className="text-2xl font-bold">Email Verification</h2>
        <p className="mt-4">{status}</p>
      </div>
    </div>
  );
}

export default VerifyEmail;
