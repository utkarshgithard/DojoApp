import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';
import Swal from 'sweetalert2';
import moment from 'moment';

const AttendanceContext = createContext();

export const useAttendance = () => useContext(AttendanceContext);

export const AttendanceProvider = ({ children }) => {
    const [date, setDate] = useState(moment().format('YYYY-MM-DD'));
    const [unmarkedSubjects, setUnmarkedSubjects] = useState([]);
    const [markedSubjects, setMarkedSubjects] = useState([]);
    // New: Study friends & sessions
    const [friends, setFriends] = useState([]);
    const [sessions, setSessions] = useState([]);

    const fetchSubjects = async (latestMarkedSubjects = []) => {
        try {
            const res = await API.get(`/subject?date=${date}`);
            const allSubjects = res.data.unmarkedSubjects || [];
            const filteredSubjects = allSubjects.filter(
                (subject) =>
                    !latestMarkedSubjects.some(
                        (marked) =>
                            marked.subject.toLowerCase() === subject.subject.toLowerCase()
                    )
            );
            setUnmarkedSubjects(filteredSubjects);
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    const fetchSummary = async () => {
        try {
            const res = await API.get(`/attendance/summary?date=${date}`);
            const summaryArray = res.data.summary;
            setMarkedSubjects(summaryArray);
            await fetchSubjects(summaryArray);
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    };

    const handleAttendance = async (subject, status) => {
        try {
            const result = await Swal.fire({
                title: `Mark "${subject.subjectName || subject.subject}" as "${status}"?`,
                text: "This action cannot be undone.",
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes',
                cancelButtonText: 'No',
            });

            if (!result.isConfirmed) return;

            await API.post('/attendance/mark', {
                date,
                status: [{
                    subject: subject.subjectName || subject.subject,
                    status
                }]
            });

            setUnmarkedSubjects(prev => prev.filter(s => s._id !== subject._id));
            setMarkedSubjects(prev => [...prev, { ...subject, status }]);

            Swal.fire('Success', 'Attendance marked successfully.', 'success');
        } catch (error) {
            console.error('Error marking attendance:', error);
            Swal.fire('Error', 'Could not mark attendance.', 'error');
        }
    };

    // New: Study With Friends
    const fetchFriends = async () => {
        try {
            const res = await API.get('/friends/list');
            setFriends(res.data);
        } catch (error) {
            console.error('Error fetching friends:', error);
        }
    };

    const fetchSessions = async () => {
        try {
            const res = await API.get('/sessions/mine');
            setSessions(res.data);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    };

    const createSession = async ({ subject, datetime, duration, invitedFriends }) => {
        try {
            await API.post('/sessions/create', { subject, date: datetime, duration, invitedFriends });
            await fetchSessions();
            Swal.fire('Success', 'Study session created!', 'success');
        } catch (error) {
            console.error('Error creating session:', error);
            Swal.fire('Error', 'Could not create session.', 'error');
        }
    };

    useEffect(() => {
        fetchSummary();
        fetchFriends();
        fetchSessions();
    }, [date]);

    return (
        <AttendanceContext.Provider value={{
            date, setDate,
            unmarkedSubjects,
            markedSubjects,
            fetchSubjects,
            fetchSummary,
            handleAttendance, friends,
            sessions,
            createSession
        }}>
            {children}
        </AttendanceContext.Provider>
    );
};
