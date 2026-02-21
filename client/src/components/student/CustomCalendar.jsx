import React from 'react';
import { Button } from '../../lightswind/button';
// using simple characters for chevrons to avoid icon package resolution issues
import './CustomCalendar.css';

const CustomCalendar = ({ selectedDate, onDateSelect, availabilityData = {}, onMonthChange }) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  const [displayMonth, setDisplayMonth] = React.useState(currentMonth);
  const [displayYear, setDisplayYear] = React.useState(currentYear);

  // Notify parent of initial month/year on mount
  React.useEffect(() => {
    if (typeof onMonthChange === 'function') {
      onMonthChange(displayYear, displayMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(displayYear, displayMonth);
    const firstDay = getFirstDayOfMonth(displayYear, displayMonth);
    const daysInPrevMonth = getDaysInMonth(displayYear, displayMonth - 1);
    
    const days = [];
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isPrevMonth: true,
        date: new Date(displayYear, displayMonth - 1, daysInPrevMonth - i)
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        isPrevMonth: false,
        date: new Date(displayYear, displayMonth, i)
      });
    }
    
    // Next month days to fill the grid
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isPrevMonth: false,
        date: new Date(displayYear, displayMonth + 1, i)
      });
    }
    
    return days;
  };

  const handlePrevMonth = () => {
    let nextMonth = displayMonth - 1;
    let nextYear = displayYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear = displayYear - 1;
    }
    setDisplayMonth(nextMonth);
    setDisplayYear(nextYear);
    if (typeof onMonthChange === 'function') {
      onMonthChange(nextYear, nextMonth);
    }
  };

  const handleNextMonth = () => {
    let nextMonth = displayMonth + 1;
    let nextYear = displayYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear = displayYear + 1;
    }
    setDisplayMonth(nextMonth);
    setDisplayYear(nextYear);
    if (typeof onMonthChange === 'function') {
      onMonthChange(nextYear, nextMonth);
    }
  };

  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const isToday = (date) => {
    return isSameDay(date, today);
  };

  // Use local date (not UTC) to build the YYYY-MM-DD key
  const formatLocalDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getAvailabilityForDate = (date) => {
    if (!date) return null;
    const dateKey = formatLocalDateKey(date);
    return availabilityData[dateKey] || null;
  };

  const getAvailabilityType = (date) => {
    const availability = getAvailabilityForDate(date);
    if (!availability || availability.length === 0) return null;
    
    // Check if there are any online or in-person consultations
    const hasOnline = availability.some(a => a.mode === 'Online');
    const hasInPerson = availability.some(a => a.mode === 'In-person');
    
    // If both types exist, prioritize online (green)
    // Otherwise return the type that exists
    if (hasOnline) return 'online';
    if (hasInPerson) return 'in-person';
    return null;
  };

  const handleDateClick = (dateObj) => {
    if (onDateSelect) {
      onDateSelect(dateObj.date);
    }
  };

  const calendarDays = generateCalendarDays();
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="custom-calendar">
      <div className="calendar-header-wrap">
        <div className="calendar-header">
          <h3 className="calendar-month-year">
            {monthNames[displayMonth]} {displayYear}
          </h3>
        </div>
        <div className="calendar-nav" aria-label="Calendar navigation">
          <Button
            size="icon"
            variant="outline"
            color="gray"
            onClick={handlePrevMonth}
            className="calendar-nav-btn"
            aria-label="Previous month"
          >
            <span className="w-5 h-5 flex items-center justify-center">&lsaquo;</span>
          </Button>
          <Button
            size="icon"
            variant="outline"
            color="gray"
            onClick={handleNextMonth}
            className="calendar-nav-btn"
            aria-label="Next month"
          >
            <span className="w-5 h-5 flex items-center justify-center">&rsaquo;</span>
          </Button>
        </div>
      </div>

      <table className="calendar-table">
        <thead>
          <tr>
            {daysOfWeek.map((day) => (
              <th key={day} className="calendar-weekday">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex} className="calendar-week">
              {week.map((dateObj, dayIndex) => {
                const availabilityType = getAvailabilityType(dateObj.date);
                return (
                  <td 
                    key={dayIndex} 
                    className={`calendar-day-cell ${
                      !dateObj.isCurrentMonth ? 'outside-month' : ''
                    } ${
                      isSameDay(dateObj.date, selectedDate) ? 'selected' : ''
                    } ${
                      isToday(dateObj.date) ? 'today' : ''
                    } ${
                      availabilityType ? `has-availability ${availabilityType}` : ''
                    }`}
                  >
                    <button
                      className="calendar-day-button"
                      onClick={() => handleDateClick(dateObj)}
                    >
                      {dateObj.day}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomCalendar;
