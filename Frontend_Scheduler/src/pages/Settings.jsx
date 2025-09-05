import React, { useState } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import API from '../api/axios';
import { useEffect } from 'react';

const Setting = () => {
  const [details, setDetails] = useState({})
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState('profile');
  const [userData, setUserData] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    bio: 'Computer Science student',
    department: 'Computer Science',
    notifications: {
      email: true,
      push: true,
      sessionInvites: true,
      sessionReminders: true,
      friendRequests: true,
      messages: true
    },
    privacy: {
      profileVisibility: 'friends',
      activityStatus: true,
      dataSharing: false
    }
  });



  const fetchUser = async () => {
    try {
      const res = await API.get("/auth/userDetails");
      setDetails(res.data.user);
      console.log(res)
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    fetchUser()
  }, [])
  const [message, setMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      // Handle nested objects for notifications and privacy
      if (name.includes('.')) {
        const [category, field] = name.split('.');
        setUserData(prev => ({
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
      setUserData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (section) => {
    try {
      const response = await API.put('/user/settings', {
        [section]: userData[section]
      });
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving settings');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
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
      e.target.reset();
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
        <div>Code to Coneect  {details.friendCode}</div>
        {message && (
          <div className={`p-4 mb-6 rounded-lg ${message.includes('Error')
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
            }`}>
            {message}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className={`rounded-lg shadow-md p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
              

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
                    className={`w-full text-left  px-4 py-3 rounded-md transition-colors flex items-center ${activeTab === item.id
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

          {/* Main Content */}
          <div className="flex-1">
            <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
              {/* Profile Settings */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Profile Information</h2>

                  <div className="mb-6 flex items-center">
                    <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center mr-4">
                      <span className="text-2xl">👤</span>
                    </div>
                    <div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2">
                        Upload Photo
                      </button>
                      <button className="px-4 py-2 border border-gray-300 rounded-md dark:border-gray-600">
                        Remove
                      </button>
                    </div>
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
                        className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Bio</label>
                      <textarea
                        name="bio"
                        value={userData.bio}
                        onChange={handleInputChange}
                        rows="3"
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

              {/* Account Settings */}
              {activeTab === 'account' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Account Settings</h2>

                  <div className="mb-8">
                    <h3 className="text-lg font-medium mb-4">Change Password</h3>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Current Password</label>
                        <input
                          type="password"
                          name="currentPassword"
                          required
                          className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">New Password</label>
                        <input
                          type="password"
                          name="newPassword"
                          required
                          minLength="6"
                          className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          name="confirmPassword"
                          required
                          className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>

                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Change Password
                      </button>
                    </form>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-lg font-medium mb-4">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between p-4 border rounded-md dark:border-gray-600">
                      <div>
                        <p className="font-medium">2FA is currently disabled</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Enable
                      </button>
                    </div>
                  </div>

                  <div className="border-t pt-6 dark:border-gray-700">
                    <h3 className="text-lg font-medium mb-4 text-red-600">Danger Zone</h3>
                    <div className="p-4 border border-red-300 rounded-md bg-red-50 dark:bg-red-900/20 dark:border-red-700">
                      <p className="mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                      <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notification Settings */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Notification Channels</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Email Notifications</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Receive notifications via email
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name="notifications.email"
                              checked={userData.notifications.email}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Push Notifications</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Receive browser push notifications
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name="notifications.push"
                              checked={userData.notifications.push}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-4">Notification Types</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Session Invitations</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Get notified when invited to study sessions
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name="notifications.sessionInvites"
                              checked={userData.notifications.sessionInvites}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Session Reminders</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Get reminders before study sessions start
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name="notifications.sessionReminders"
                              checked={userData.notifications.sessionReminders}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Friend Requests</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Get notified when you receive friend requests
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name="notifications.friendRequests"
                              checked={userData.notifications.friendRequests}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Chat Messages</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Get notified when you receive new messages
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name="notifications.messages"
                              checked={userData.notifications.messages}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSave('notifications')}
                    className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Preferences
                  </button>
                </div>
              )}

              {/* Privacy & Security Settings */}
              {activeTab === 'privacy' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Privacy & Security</h2>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Profile Visibility</h3>
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="visibility-public"
                            name="privacy.profileVisibility"
                            value="public"
                            checked={userData.privacy.profileVisibility === 'public'}
                            onChange={handleInputChange}
                            className="mr-3"
                          />
                          <label htmlFor="visibility-public" className="flex-1">
                            <p className="font-medium">Public</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Anyone can see your profile and activity
                            </p>
                          </label>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="visibility-friends"
                            name="privacy.profileVisibility"
                            value="friends"
                            checked={userData.privacy.profileVisibility === 'friends'}
                            onChange={handleInputChange}
                            className="mr-3"
                          />
                          <label htmlFor="visibility-friends" className="flex-1">
                            <p className="font-medium">Friends Only</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Only your friends can see your profile and activity
                            </p>
                          </label>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="visibility-private"
                            name="privacy.profileVisibility"
                            value="private"
                            checked={userData.privacy.profileVisibility === 'private'}
                            onChange={handleInputChange}
                            className="mr-3"
                          />
                          <label htmlFor="visibility-private" className="flex-1">
                            <p className="font-medium">Private</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Your profile is hidden from everyone
                            </p>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show Activity Status</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Allow others to see when you're active in study sessions
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="privacy.activityStatus"
                          checked={userData.privacy.activityStatus}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Data Sharing for Analytics</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Allow anonymous usage data to help improve the application
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="privacy.dataSharing"
                          checked={userData.privacy.dataSharing}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="pt-6 border-t dark:border-gray-700">
                      <h3 className="text-lg font-medium mb-4">Login Activity</h3>
                      <div className="p-4 border rounded-md dark:border-gray-600">
                        <p className="text-sm mb-4">Recent account activity</p>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <div>
                              <p>Chrome on Windows</p>
                              <p className="text-gray-500 dark:text-gray-400">New York, US • Just now</p>
                            </div>
                            <button className="text-red-600 hover:text-red-800 text-sm">
                              Log out
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div>
                              <p>Safari on iPhone</p>
                              <p className="text-gray-500 dark:text-gray-400">Chicago, US • 2 hours ago</p>
                            </div>
                            <button className="text-red-600 hover:text-red-800 text-sm">
                              Log out
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSave('privacy')}
                    className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Preferences
                  </button>
                </div>
              )}

              {/* Appearance Settings */}
              {activeTab === 'appearance' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Appearance</h2>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Theme</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div
                          className={`border-2 rounded-lg p-4 cursor-pointer flex flex-col items-center ${!darkMode ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
                            }`}
                          onClick={() => toggleDarkMode(false)}
                        >
                          <div className="w-full h-24 bg-white rounded-md mb-3 border dark:border-gray-600"></div>
                          <span>Light</span>
                        </div>

                        <div
                          className={`border-2 rounded-lg p-4 cursor-pointer flex flex-col items-center ${darkMode ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
                            }`}
                          onClick={() => toggleDarkMode(true)}
                        >
                          <div className="w-full h-24 bg-gray-800 rounded-md mb-3 border dark:border-gray-600"></div>
                          <span>Dark</span>
                        </div>

                        <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 cursor-pointer flex flex-col items-center opacity-50">
                          <div className="w-full h-24 bg-gradient-to-r from-white to-gray-800 rounded-md mb-3 border dark:border-gray-600"></div>
                          <span>System Default</span>
                          <span className="text-xs text-gray-500">Coming soon</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-4">Font Size</h3>
                      <div className="flex items-center space-x-4">
                        <button className="px-4 py-2 border rounded-md dark:border-gray-600">Small</button>
                        <button className="px-4 py-2 border rounded-md bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700">Medium</button>
                        <button className="px-4 py-2 border rounded-md dark:border-gray-600">Large</button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Reduced Motion</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Reduce animations and transitions throughout the app
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">High Contrast Mode</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Increase color contrast for better visibility
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Study Preferences */}
              {activeTab === 'preferences' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Study Preferences</h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Default Session Duration (minutes)</label>
                      <input
                        type="number"
                        min="15"
                        max="240"
                        step="15"
                        defaultValue="60"
                        className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Preferred Subjects</label>
                      <select
                        multiple
                        className="w-full p-3 border rounded-md h-32 dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="math">Mathematics</option>
                        <option value="science">Science</option>
                        <option value="history">History</option>
                        <option value="english">English</option>
                        <option value="programming">Programming</option>
                        <option value="art">Art</option>
                        <option value="music">Music</option>
                        <option value="business">Business</option>
                      </select>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Hold Ctrl/Cmd to select multiple subjects
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Study Group Size Preference</label>
                      <select className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                        <option value="2">2 people</option>
                        <option value="3">3 people</option>
                        <option value="4">4 people</option>
                        <option value="5">5+ people</option>
                        <option value="any">Any size</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Sound Notifications</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Play sounds for notifications
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  <button className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Save Preferences
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setting;