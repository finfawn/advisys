import React, { useState } from "react";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import "./AvailabilityCalendar.css";

const localizer = momentLocalizer(moment);

export default function AvailabilityCalendar() {
  // Helper to build dates
  const d = (y, m, day, h = 0, min = 0) => new Date(y, m, day, h, min);
  // Controlled current date for navigation
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 5));

  // Sample month: October 2025
  // Build events that match the design: a day mode label + repeating availability chips + a few holidays
  const [events, setEvents] = useState([
    // Day mode labels
    { id: 1, title: 'Online', start: d(2025, 9, 1), end: d(2025, 9, 1), allDay: true, type: 'mode', mode: 'online' },
    { id: 2, title: 'In-person/Online', start: d(2025, 9, 2), end: d(2025, 9, 2), allDay: true, type: 'mode', mode: 'hybrid' },
    { id: 3, title: 'In-person/Online', start: d(2025, 9, 3), end: d(2025, 9, 3), allDay: true, type: 'mode', mode: 'hybrid' },
    { id: 4, title: 'Online', start: d(2025, 9, 5), end: d(2025, 9, 5), allDay: true, type: 'mode', mode: 'online' },
    { id: 5, title: 'In-person/Online', start: d(2025, 9, 6), end: d(2025, 9, 6), allDay: true, type: 'mode', mode: 'hybrid' },
    { id: 6, title: 'Online', start: d(2025, 9, 7), end: d(2025, 9, 7), allDay: true, type: 'mode', mode: 'online' },
    { id: 7, title: 'In-person', start: d(2025, 9, 8), end: d(2025, 9, 8), allDay: true, type: 'mode', mode: 'inperson' },
    { id: 8, title: 'Online', start: d(2025, 9, 10), end: d(2025, 9, 10), allDay: true, type: 'mode', mode: 'online' },
    { id: 9, title: 'In-person', start: d(2025, 9, 13), end: d(2025, 9, 13), allDay: true, type: 'mode', mode: 'inperson' },
    { id: 10, title: 'In-person', start: d(2025, 9, 14), end: d(2025, 9, 14), allDay: true, type: 'mode', mode: 'inperson' },
    { id: 11, title: 'Online', start: d(2025, 9, 20), end: d(2025, 9, 20), allDay: true, type: 'mode', mode: 'online' },
    { id: 12, title: 'In-person', start: d(2025, 9, 21), end: d(2025, 9, 21), allDay: true, type: 'mode', mode: 'inperson' },
    { id: 13, title: 'Online', start: d(2025, 9, 28), end: d(2025, 9, 28), allDay: true, type: 'mode', mode: 'online' },

    // Availability chips
    ...[1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 20, 21, 22, 23, 24, 26, 27, 28].flatMap((day, i) => ([
      { id: 100 + i * 3 + 1, title: '4:00-8:00 pm', start: d(2025, 9, day, 16, 0), end: d(2025, 9, day, 20, 0), type: 'available' },
      { id: 100 + i * 3 + 2, title: '4:00-8:00 pm', start: d(2025, 9, day, 16, 0), end: d(2025, 9, day, 20, 0), type: 'available' },
      { id: 100 + i * 3 + 3, title: '4:00-8:00 pm', start: d(2025, 9, day, 16, 0), end: d(2025, 9, day, 20, 0), type: 'available' },
    ])),

    // Holidays
    { id: 9001, title: 'Holiday', start: d(2025, 9, 9), end: d(2025, 9, 9), allDay: true, type: 'holiday' },
    { id: 9002, title: 'Holiday', start: d(2025, 9, 19), end: d(2025, 9, 19), allDay: true, type: 'holiday' },
  ]);

  // Class-based styling
  const eventPropGetter = (event) => ({
    className: `ev-${event.type} ${event.mode ? `mode-${event.mode}` : ''}`,
    style: {}
  });

  // Event renderer
  const AvailabilityEvent = ({ event }) => {
    if (event.type === 'mode') return <span className={`day-mode-label ${event.mode}`}>{event.title}</span>;
    if (event.type === 'holiday') return <div className="holiday-event">Holiday</div>;
    if (event.type === 'available') {
      const timeText = `${moment(event.start).format('h:mm')}-${moment(event.end).format('h:mm a')}`;
      return <div className="availability-chip">{timeText}</div>;
    }
    return <div className="availability-chip">{event.title}</div>;
  };

  // Custom toolbar for month navigation + year dropdown
  const CustomToolbar = (props) => {
    const { views, view, onView } = props;
    const year = currentDate.getFullYear();
    const monthLabel = moment(currentDate).format('MMMM');
    const years = Array.from({ length: 11 }, (_, i) => year - 5 + i); // ±5 years around current

    const goToPrevMonth = () => setCurrentDate(moment(currentDate).subtract(1, 'month').toDate());
    const goToNextMonth = () => setCurrentDate(moment(currentDate).add(1, 'month').toDate());
    const goToToday = () => setCurrentDate(new Date());
    const onYearChange = (e) => setCurrentDate(moment(currentDate).year(Number(e.target.value)).toDate());

    return (
      <div className="rbc-toolbar">
        <span className="rbc-btn-group">
          <button type="button" onClick={goToPrevMonth}>‹ Month</button>
          <button type="button" onClick={goToToday}>Today</button>
          <button type="button" onClick={goToNextMonth}>Month ›</button>
        </span>

        <span className="rbc-toolbar-label">
          {monthLabel}
          {' '}
          <select className="rbc-year-select" value={year} onChange={onYearChange}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </span>

        <span className="rbc-btn-group">
          {Array.isArray(views) && views.map((v) => (
            <button
              key={v}
              type="button"
              className={view === v ? 'rbc-active' : ''}
              onClick={() => onView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </span>
      </div>
    );
  };

  // Selection handlers
  const handleSelectEvent = (event) => {
    console.log('Selected event:', event);
  };
  const handleSelectSlot = (slotInfo) => {
    const title = window.prompt('Create new availability block:');
    if (title) setEvents((prev) => ([...prev, { id: prev.length + 1, title, start: slotInfo.start, end: slotInfo.end, type: 'available' }]));
  };
  return (
    <div className="availability-calendar-wrapper">
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot consultation"></span>
          <span className="legend-text">Consultations</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot available"></span>
          <span className="legend-text">Available</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot blocked"></span>
          <span className="legend-text">Blocked</span>
        </div>
      </div>

      <div className="calendar-container">
        <Calendar
          localizer={localizer}
          date={currentDate}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 740 }}
          eventPropGetter={eventPropGetter}
          components={{ event: AvailabilityEvent, toolbar: CustomToolbar }}
          onNavigate={(newDate) => setCurrentDate(newDate)}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          views={["month", "week", "day", "agenda"]}
          popup
        />
      </div>
    </div>
  );
}