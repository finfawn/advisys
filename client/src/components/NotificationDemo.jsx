import React from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { Button } from "react-bootstrap";

function NotificationDemo() {
  const {
    addNotification,
    resetToSampleNotifications,
    createConsultationApprovedNotification,
    createConsultationRequestNotification,
    createConsultationReminderNotification,
    createConsultationCancelledNotification,
    createDocumentUploadedNotification,
    createSystemAnnouncementNotification,
    requestNotificationPermission
  } = useNotifications();

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      alert("Notification permission granted! You'll now receive browser notifications.");
    } else {
      alert("Notification permission denied. You can still use the in-app notifications.");
    }
  };

  const demoNotifications = {
    student: [
      () => addNotification(createConsultationApprovedNotification(
        "Dr. Maria Santos",
        { topic: "Academic Planning", date: "Dec 22, 2024", time: "2:00 PM" }
      )),
      () => addNotification(createConsultationReminderNotification(
        { advisorName: "Dr. Sarah Johnson", timeRemaining: "30 minutes" },
        true
      )),
      () => addNotification(createConsultationCancelledNotification(
        "Dr. David Kim",
        { date: "Dec 22, 2024", time: "10:00 AM" },
        true
      )),
      () => addNotification(createDocumentUploadedNotification(
        "Dr. Maria Santos",
        [
          { name: "Consultation Notes.pdf", size: "2.1 MB" },
          { name: "Academic Plan.docx", size: "1.8 MB" }
        ]
      ))
    ],
    advisor: [
      () => addNotification(createConsultationRequestNotification(
        "John Santos",
        { topic: "Research Guidance", date: "Dec 22, 2024", time: "2:00 PM" }
      )),
      () => addNotification(createConsultationReminderNotification(
        { studentName: "Maria Garcia", timeRemaining: "15 minutes" },
        false
      )),
      () => addNotification(createConsultationCancelledNotification(
        "David Lee",
        { date: "Dec 21, 2024", time: "3:00 PM" },
        false
      )),
      () => addNotification(createSystemAnnouncementNotification(
        "System maintenance scheduled",
        "AdviSys will undergo maintenance on Dec 25, 2024 from 2:00 AM to 4:00 AM. Plan accordingly."
      ))
    ]
  };

  return (
    <div className="notification-demo p-4">
      <h4>Notification System Demo</h4>
      <p className="text-muted mb-3">
        Click the buttons below to test different types of notifications. 
        These will appear in the notification modal when you click the bell icon.
      </p>
      
      <div className="mb-3">
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={handleRequestPermission}
          className="me-2"
        >
          Request Browser Notification Permission
        </Button>
        <Button 
          variant="outline-success" 
          size="sm" 
          onClick={resetToSampleNotifications}
        >
          Load Sample Notifications
        </Button>
      </div>

      <div className="row">
        <div className="col-md-6">
          <h6>Student Notifications</h6>
          <div className="d-flex flex-column gap-2">
            <Button 
              variant="outline-success" 
              size="sm" 
              onClick={demoNotifications.student[0]}
            >
              Consultation Approved
            </Button>
            <Button 
              variant="outline-warning" 
              size="sm" 
              onClick={demoNotifications.student[1]}
            >
              Consultation Reminder
            </Button>
            <Button 
              variant="outline-danger" 
              size="sm" 
              onClick={demoNotifications.student[2]}
            >
              Consultation Cancelled
            </Button>
            <Button 
              variant="outline-info" 
              size="sm" 
              onClick={demoNotifications.student[3]}
            >
              Document Uploaded
            </Button>
          </div>
        </div>
        
        <div className="col-md-6">
          <h6>Advisor Notifications</h6>
          <div className="d-flex flex-column gap-2">
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={demoNotifications.advisor[0]}
            >
              New Consultation Request
            </Button>
            <Button 
              variant="outline-warning" 
              size="sm" 
              onClick={demoNotifications.advisor[1]}
            >
              Consultation Reminder
            </Button>
            <Button 
              variant="outline-danger" 
              size="sm" 
              onClick={demoNotifications.advisor[2]}
            >
              Student Cancelled
            </Button>
            <Button 
              variant="outline-secondary" 
              size="sm" 
              onClick={demoNotifications.advisor[3]}
            >
              System Announcement
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationDemo;
