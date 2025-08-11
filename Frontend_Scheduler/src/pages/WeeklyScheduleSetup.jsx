import { useState } from 'react';
import API from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';

const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const hours = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12
const minutes = ['00', '15', '30', '45'];
const meridiems = ['AM', 'PM'];

function WeeklyScheduleSetup() {
  const { darkMode } = useDarkMode();

  const [schedule, setSchedule] = useState(
    weekdays.reduce((acc, day) => {
      acc[day] = [{
        subject: '',
        startHour: '9',
        startMinute: '00',
        startMeridiem: 'AM',
        endHour: '10',
        endMinute: '00',
        endMeridiem: 'AM'
      }];
      return acc;
    }, {})
  );

  // Handle input changes
  const handleChange = (day, index, field, value) => {
    const updated = [...schedule[day]];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setSchedule({ ...schedule, [day]: updated });
  };

  // Add new class for a day
  const addClass = (day) => {
    setSchedule({
      ...schedule,
      [day]: [
        ...schedule[day],
        {
          subject: '',
          startHour: '9',
          startMinute: '00',
          startMeridiem: 'AM',
          endHour: '10',
          endMinute: '00',
          endMeridiem: 'AM',
        }
      ]
    });
  };

  // Remove class from a day
  const removeClass = (day, index) => {
    const updated = [...schedule[day]];
    updated.splice(index, 1);
    setSchedule({ ...schedule, [day]: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formattedSchedule = {};
    for (const day of weekdays) {
      const validClasses = schedule[day]
        .filter(cls => cls.subject.trim() !== '')
        .map(cls => ({
          subjectName: cls.subject.trim(),
          time: `${cls.startHour.toString().padStart(2, '0')}:${cls.startMinute} ${cls.startMeridiem} - ${cls.endHour.toString().padStart(2, '0')}:${cls.endMinute} ${cls.endMeridiem}`
        }));

      if (validClasses.length > 0) {
        if (!formattedSchedule[day]) {
          formattedSchedule[day] = [];
        }
        formattedSchedule[day].push(...validClasses);
      }
    }

    try {
      await API.post('/schedule', { weeklySchedule: formattedSchedule }); // Use 'weeklySchedule'
      alert('✅ Schedule saved (subjects inserted)!');
    } catch (err) {
      alert('❌ Failed to save schedule.');
      console.error(err);
    }
  };


  return (
    <div className={`relative py-20 px-10 min-h-screen transition duration-300  ${darkMode ? 'dark bg-gray-800 text-white' : 'bg-white text-black'}`}>
      <div className="absolute inset-0 bg-opacity-10 backdrop-blur-sm"></div>

      <div className="relative z-10 max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center  mb-6">
          Set Schedule
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {weekdays.map((day) => (
            <div
              key={day}
              className={`p-4 rounded-xl border-2 border-gray-400 text-md`}
            >
              <div className='flex justify-center'>
                <h3 className="capitalize font-semibold text-2xl
              mb-3">{day}</h3>
              </div>


              {schedule[day].map((item, idx) => (
                <div key={idx} className="grid justify-center grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-center ">
                  {/* Subject */}
                  <input
                    type="text"
                    placeholder="Subject name"
                    value={item.subject}
                    onChange={(e) => handleChange(day, idx, 'subject', e.target.value)}
                    className={`p-2 rounded border-2  border-gray-400 w-full ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}
                  />

                  {/* Start Time */}
                  <div className="flex gap-2">
                    <select
                      value={item.startHour}
                      onChange={(e) => handleChange(day, idx, 'startHour', e.target.value)}
                      className={`border p-2 rounded ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}
                    >
                      {hours.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <select
                      value={item.startMinute}
                      onChange={(e) => handleChange(day, idx, 'startMinute', e.target.value)}
                      className={`border p-2 rounded ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}
                    >
                      {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                      value={item.startMeridiem}
                      onChange={(e) => handleChange(day, idx, 'startMeridiem', e.target.value)}
                      className={`border p-2 rounded ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}
                    >
                      {meridiems.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  {/* End Time */}
                  <div className="flex gap-2">
                    <select
                      value={item.endHour}
                      onChange={(e) => handleChange(day, idx, 'endHour', e.target.value)}
                      className={`border p-2 rounded ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}
                    >
                      {hours.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <select
                      value={item.endMinute}
                      onChange={(e) => handleChange(day, idx, 'endMinute', e.target.value)}
                      className={`border p-2 rounded ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}
                    >
                      {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                      value={item.endMeridiem}
                      onChange={(e) => handleChange(day, idx, 'endMeridiem', e.target.value)}
                      className={`border p-2 rounded ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}
                    >
                      {meridiems.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              ))}

              {/* Add/Remove Buttons */}
              <div className="flex justify-between items-center mt-2">
                <button
                  type="button"
                  onClick={() => addClass(day)}
                  className="text-md  dark:text-blue-300 hover:text-gray-600"
                >
                   Add Another Class
                </button>
                {schedule[day].length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeClass(day, schedule[day].length - 1)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    🗑 Remove Last
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Submit Button */}
          <div className="text-center mt-6">
            <button
              type="submit"
              className="bg-blue-700 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-800 transition"
            >
              ✅ Save Weekly Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WeeklyScheduleSetup;
