"use client";
import React, { useState } from 'react';
import { io } from 'socket.io-client';
import API from '@/lib/axios'; // your axios instance

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

const CreateStudySession = ({ socket, onClose }: { socket: any, onClose: () => void }) => {
    const [subject, setSubject] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [duration, setDuration] = useState(30);
    const [invitedFriends, setInvitedFriends] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreateSession = async () => {
        if (!subject || !date || !time || !invitedFriends) return alert('Fill all fields');
        console.log(invitedFriends)
        setLoading(true);
        try {
            // Create session in backend
            const response = await API.post('/study-session', {
                subject,
                date,
                time,
                duration,
                invitedFriends: invitedFriends.split(',').map(f => f.trim())
            });

            const session = response.data;
            console.log(session)

            // The backend REST API automatically emits 'receiveInvite' to the invited friends
            // and 'sessionCreated' to the creator via Socket.io. No need to emit from client.

            // Clear form
            setSubject('');
            setDate('');
            setTime('');
            setDuration(30);
            setInvitedFriends('');

            // Callback to parent (Dashboard) to update state
            if (onClose) onClose();

            alert('Study session created and invites sent!');
        } catch (err) {
            console.error(err);
            alert('Error creating study session');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border p-4 rounded-lg dark:border-white border-black">
            <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="mb-2 w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            />
            <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="mb-2 w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            />
            <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="mb-2 w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            />
            <input
                type="number"
                placeholder="Duration (minutes)"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="mb-2 w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            />
            <input
                type="text"
                placeholder="Invite friends (comma separated Friend Codes)"
                value={invitedFriends}
                onChange={e => setInvitedFriends(e.target.value)}
                className="mb-2 w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            />
            <button
                onClick={handleCreateSession}
                disabled={loading}
                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
            >
                {loading ? 'Creating...' : 'Create Study Session'}
            </button>
        </div>
    );
};

export default CreateStudySession;


