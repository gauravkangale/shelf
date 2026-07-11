  // eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from 'react';
import { uGet } from '../utils/userKey';

export default function CalendarTimeline({
  selectedDate,
  setSelectedDate,
  visibleMonthYear,
  // eslint-disable-next-line no-unused-vars
  setVisibleMonthYear,
  goToToday,
  calendarDaysList,
  calendarContainerRef,
  handleCalendarScroll
}) {
  const [hasNotesMap, setHasNotesMap] = useState({});

  useEffect(() => {
    const updateNotesMap = () => {
      const parsed = uGet('shelf_daily_notes');
      if (parsed) {
        const map = {};
        Object.keys(parsed).forEach(key => {
          if (parsed[key] && parsed[key].length > 0) {
            map[key] = true;
          }
        });
        setHasNotesMap(map);
      } else {
        setHasNotesMap({});
      }
    };

    updateNotesMap();

    window.addEventListener('notes-updated', updateNotesMap);
    window.addEventListener('storage', updateNotesMap);
    return () => {
      window.removeEventListener('notes-updated', updateNotesMap);
      window.removeEventListener('storage', updateNotesMap);
    };
  }, []);

  return (
    <section className="schedule-container">
      <div className="calendar-header">
        <h2
          className="calendar-title"
          onClick={goToToday}
          style={{ fontSize: '16px', cursor: 'pointer' }}
          title="Go to Today"
        >
          {visibleMonthYear.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </h2>
        <div className="calendar-arrows">
          <button
            className="bg-[#F5F4EE]"
            onClick={goToToday}
            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
          >
            Today
          </button>
        </div>
      </div>

      <div
        className="calendar-days"
        ref={calendarContainerRef}
        onScroll={handleCalendarScroll}
      >
        {calendarDaysList.map((day) => {
          const isSelected = day.date.toDateString() === selectedDate.toDateString();
          const isToday = day.date.toDateString() === new Date().toDateString();
          const hasNotes = hasNotesMap[day.date.toDateString()];
          return (
            <div
              key={day.id}
              className={`day-pill ${isSelected ? 'active' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => setSelectedDate(day.date)}
              style={{ position: 'relative' }}
            >
              <span className="day-name">{day.dayName}</span>
              <span className="day-num">{day.dayNum}</span>
              {hasNotes && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-color, #e85d56)'
                }} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
