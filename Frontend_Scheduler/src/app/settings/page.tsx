"use client";

import React, { useState, useEffect } from 'react';
import { useDarkMode } from '@/context/DarkModeContext';
import API from '@/lib/axios';
import { useAuth } from '@/context/authContext';

export default function SettingsPage() {
  const [details, setDetails] = useState<any>({});
  const { darkMode, toggleDarkMode } = useDarkMode() as any;
  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    bio: '',
    department: '',
    notifications: {
      email: true,
      push: true,
      sessionInvites: true,
      sessionReminders: true,
      friendRequests: true,
      messages: true
    },
    privacy: {
      profileVisibility: 'friends' as const,
      activityStatus: true,
      dataSharing: false
    }
  });

  const { isAuthenticated } = useAuth() as any;

  const fetchUser = async () => {
    try {
      const res = await API.get("/auth/userDetails");
      if (res.data.user) {
        setDetails(res.data.user);
        setUserData(prev => ({
          ...prev,
          name: res.data.user.name,
          email: res.data.user.email,
          bio: res.data.user.bio || '',
          department: res.data.user.department || ''
        }));
      }
    } catch (err) {
      console.error("Failed to fetch user details:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUser();
    }
  }, [isAuthenticated]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;

    if (type === 'checkbox') {
      if (name.includes('.')) {
        const [category, field] = name.split('.');
        setUserData((prev: any) => ({
          ...prev,
          [category]: {
            ...prev[category],
            [field]: checked
          }
        }));
      } else {
        setUserData(prev => ({ ...prev, [name]: checked }));
      }
    } else {
      if (name.includes('.')) {
        const [category, field] = name.split('.');
        setUserData((prev: any) => ({
          ...prev,
          [category]: {
            ...prev[category],
            [field]: value
          }
        }));
      } else {
        setUserData(prev => ({ ...prev, [name]: value }));
      }
    }
  };

  const handleSave = async (section: string) => {
    try {
      if (section === 'profile') {
        const res = await API.put('/auth/profile', {
          name: userData.name,
          bio: userData.bio,
          department: userData.department
        });
        setDetails(res.data.user);
      } else {
        // Handle other sections if implemented
        await API.put(`/auth/${section}`, (userData as any)[section]);
      }
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
      setMessage('Error saving settings');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }

    try {
      await API.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      setMessage('Password changed successfully!');
      e.currentTarget.reset();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error changing password');
    }
  };

  return (
    <div className={`min-h-screen py-20 px-4 md:px-10 transition-colors duration-300 ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        
        {message && (
          <div className={`p-4 mb-6 rounded-lg ${message.includes('Error')
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
            }`}>
            {message}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-64 flex-shrink-0">
            <div className={`rounded-lg shadow-md p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <nav className="space-y-2">
                {[
                  { id: 'profile', label: 'Profile', icon: '👤' },
                  { id: 'account', label: 'Account', icon: '🔐' },
                  { id: 'notifications', label: 'Notifications', icon: '🔔' },
                  { id: 'privacy', label: 'Privacy & Security', icon: '🛡️' },
                  { id: 'appearance', label: 'Appearance', icon: '🎨' },
                  { id: 'preferences', label: 'Preferences', icon: '⚙️' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-md transition-colors flex items-center ${activeTab === item.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="flex-1">
            <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
                  
                  {/* Friend Code Section */}
                  <div className="mb-8 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Your Friend Code</p>
                      <p className="text-2xl font-mono font-bold tracking-widest">{details.friendCode || 'Loading...'}</p>
                    </div>
                    <button 
                      onClick={() => {
                        if (details.friendCode) {
                          navigator.clipboard.writeText(details.friendCode);
                          setMessage('Code copied to clipboard!');
                          setTimeout(() => setMessage(''), 2000);
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm active:scale-95"
                    >
                      Copy Code
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Name</label>
                      <input
                        type="text"
                        name="name"
                        value={userData.name}
                        onChange={handleInputChange}
                        className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={userData.email}
                        onChange={handleInputChange}
                        readOnly
                        className="w-full p-3 border rounded-md dark:bg-gray-800 dark:border-gray-700 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Bio</label>
                      <textarea
                        name="bio"
                        value={userData.bio}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Department/Major</label>
                      <input
                        type="text"
                        name="department"
                        value={userData.department}
                        onChange={handleInputChange}
                        className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleSave('profile')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Appearance</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`border-2 rounded-lg p-4 cursor-pointer flex flex-col items-center ${!darkMode ? 'border-blue-500 bg-blue-50' : 'border-gray-300 dark:border-gray-600'}`}
                      onClick={() => darkMode && toggleDarkMode()}
                    >
                      <div className="w-full h-24 bg-white rounded-md mb-3 border"></div>
                      <span>Light</span>
                    </div>
                    <div
                      className={`border-2 rounded-lg p-4 cursor-pointer flex flex-col items-center ${darkMode ? 'border-blue-500 bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}
                      onClick={() => !darkMode && toggleDarkMode()}
                    >
                      <div className="w-full h-24 bg-gray-800 rounded-md mb-3 border dark:border-gray-600"></div>
                      <span>Dark</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Add other tabs as needed or keep simple for now */}
              {activeTab === 'account' && (
                 <div>
                    <h2 className="text-xl font-semibold mb-6">Change Password</h2>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <input type="password" name="currentPassword" placeholder="Current Password" required className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                      <input type="password" name="newPassword" placeholder="New Password" required minLength={6} className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                      <input type="password" name="confirmPassword" placeholder="Confirm New Password" required className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                      <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Change Password</button>
                    </form>
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
