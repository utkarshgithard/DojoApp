// components/CreateStudySession.js
import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';

const CreateStudySession = () => {
  const { unmarkedSubjects, friends, createSession } = useAttendance();
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [selectedFriends, setSelectedFriends] = useState([]);

  const handleSubmit = () => {
    const datetime = new Date(`${date}T${time}`);
    createSession({ subject, datetime, duration, invitedFriends: selectedFriends });
  };

  return (
    <div className="p-6 border rounded space-y-4">
      <h2 className="text-xl font-bold">Create Study Session</h2>

      <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-2 border rounded">
        <option value="">Select Subject</option>
        {unmarkedSubjects.map(s => (
          <option key={s._id} value={s.subjectName || s.subject}>{s.subjectName || s.subject}</option>
        ))}
      </select>

      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded" />
      <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-2 border rounded" />
      <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full p-2 border rounded" placeholder="Duration (minutes)" />

      <div>
        <p>Invite Friends:</p>
        <div className="flex flex-wrap gap-2">
          {friends.map(friend => (
            <label key={friend._id} className="flex items-center gap-1 border rounded p-1 cursor-pointer">
              <input type="checkbox" value={friend._id} onChange={e => {
                if (e.target.checked) setSelectedFriends([...selectedFriends, friend._id]);
                else setSelectedFriends(selectedFriends.filter(id => id !== friend._id));
              }} />
              {friend.name}
            </label>
          ))}
        </div>
      </div>

      <button onClick={handleSubmit} className="px-4 py-2 bg-blue-500 text-white rounded">Create Session</button>
    </div>
  );
};

export default CreateStudySession;
