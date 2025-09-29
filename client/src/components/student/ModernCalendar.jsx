import React, { useState, useEffect } from "react";
import { BsChevronLeft, BsChevronRight, BsCalendar } from "react-icons/bs";
import "./ModernCalendar.css";

const ModernCalendar = ({ selectedDate, onDateSelect, minDate = new Date() }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isAnimating, setIsAnimating] = useState(false);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Get the first day of the month and number of days
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Get previous month's trailing days
  const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 0);
  const prevMonthDays = prevMonth.getDate();
  const trailingDays = [];

  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    trailingDays.push(prevMonthDays - i);
  }

  // Get next month's leading days
  const leadingDays = [];
  const totalCells = 42; // 6 weeks * 7 days
  const usedCells = trailingDays.length + daysInMonth;
  const remainingCells = totalCells - usedCells;

  for (let i = 1; i <= remainingCells; i++) {
    leadingDays.push(i);
  }

  const navigateMonth = (direction) => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentMonth(prev => {
        const newMonth = new Date(prev);
        if (direction === 'prev') {
          newMonth.setMonth(prev.getMonth() - 1);
        } else {
          newMonth.setMonth(prev.getMonth() + 1);
        }
        return newMonth;
      });
      setIsAnimating(false);
    }, 150);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateSelect(today);
  };

  const clearSelection = () => {
    onDateSelect(null);
  };

  const handleDateClick = (day, isCurrentMonth = true) => {
    if (!isCurrentMonth) return;
    
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    // Check if date is in the past
    if (clickedDate < minDate) return;
    
    onDateSelect(clickedDate);
  };

  const isDateSelected = (day) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isDateToday = (day) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isDateDisabled = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date < minDate;
  };

  return (
    <div className="modern-calendar">
      {/* Header */}
      <div className="calendar-header">
        <div className="calendar-nav">
          <button 
            className="nav-button" 
            onClick={() => navigateMonth('prev')}
            aria-label="Previous month"
          >
            <BsChevronLeft size={14} />
          </button>
          
          <div className="month-year">
            <h3 className="month-title">
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
          </div>
          
          <button 
            className="nav-button" 
            onClick={() => navigateMonth('next')}
            aria-label="Next month"
          >
            <BsChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Days of week */}
      <div className="calendar-weekdays">
        {daysOfWeek.map((day) => (
          <div key={day} className="weekday">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`calendar-grid ${isAnimating ? 'animating' : ''}`}>
        {/* Previous month trailing days */}
        {trailingDays.map((day, index) => (
          <button
            key={`prev-${day}`}
            className="calendar-day prev-month"
            disabled
          >
            {day}
          </button>
        ))}

        {/* Current month days */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const isSelected = isDateSelected(day);
          const isToday = isDateToday(day);
          const isDisabled = isDateDisabled(day);
          
          return (
            <button
              key={day}
              className={`calendar-day current-month ${
                isSelected ? 'selected' : ''
              } ${isToday ? 'today' : ''} ${
                isDisabled ? 'disabled' : ''
              }`}
              onClick={() => handleDateClick(day)}
              disabled={isDisabled}
            >
              {day}
            </button>
          );
        })}

        {/* Next month leading days */}
        {leadingDays.map((day) => (
          <button
            key={`next-${day}`}
            className="calendar-day next-month"
            disabled
          >
            {day}
          </button>
        ))}
      </div>

      {/* Footer actions */}
      <div className="calendar-footer">
        <button className="footer-button clear" onClick={clearSelection}>
          Clear
        </button>
        <button className="footer-button today" onClick={goToToday}>
          Today
        </button>
      </div>
    </div>
  );
};

export default ModernCalendar;
