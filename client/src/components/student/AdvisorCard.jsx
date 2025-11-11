import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsPersonCircle, BsClock, BsEye, BsCameraVideo, BsGeoAlt, BsLaptop } from "react-icons/bs";
import { Card, CardHeader, CardContent, CardFooter } from "../../lightswind/card";
import { Badge } from "../../lightswind/badge";
import { Button } from "../../lightswind/button";
import ConsultationModal from "./ConsultationModal";
import "./AdvisorCard.css";

function AdvisorCard({ 
  name = "Lorem Ipsum", 
  title = "Academic Title", 
  status = "Available", 
  schedule = "Tue, Thu", 
  time = "10:00 AM–01:00 PM", 
  mode = "In-person/Online",
  coursesTaught = ["CS 101", "CS 301", "CS 401"],
  advisorId = "1",
  onBookClick,
  onNavigateToConsultations
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [facultyData, setFacultyData] = useState({
    id: advisorId,
    name,
    title,
    avatar: null,
    subjects: ["Academic Planning", "Course Selection", "Research Guidance"],
    availability: schedule && time ? `Available ${schedule}, ${time}` : null,
    status,
    schedule,
    time,
    coursesTaught,
  });
  const navigate = useNavigate();

  const handleBookClick = async () => {
    // Load full advisor profile so the modal shows categories and modes
    try {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/api/advisors/${advisorId}`);
      const data = await res.json();
      // Merge card-known fields for graceful fallbacks
      const merged = {
        ...data,
        id: advisorId,
        name: data.name || name,
        title: data.title || title,
        status,
        schedule,
        time,
        coursesTaught: data.coursesTaught || coursesTaught,
      };
      setFacultyData(merged);
    } catch (err) {
      // If fetch fails, proceed with existing minimal data
      console.warn('Failed to load advisor profile for booking modal from card:', err);
    }
    setIsModalOpen(true);
    if (onBookClick) {
      onBookClick();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleNavigateToConsultations = () => {
    // Navigate directly if parent didn't provide a handler; otherwise delegate
    if (onNavigateToConsultations) {
      onNavigateToConsultations();
    } else {
      navigate('/student-dashboard/consultations');
    }
  };

  const handleViewProfile = () => {
    navigate(`/student-dashboard/advisors/${advisorId}`);
  };

  // Parse consultation mode and get appropriate icons
  const getConsultationModeInfo = (modeString) => {
    const mode = modeString.toLowerCase();
    
    if (mode.includes('online') && mode.includes('in-person')) {
      return {
        icons: [<BsCameraVideo key="online" />, <BsGeoAlt key="inperson" />],
        text: 'Both',
        class: 'both-modes',
        showSeparate: true
      };
    } else if (mode.includes('online')) {
      return {
        icons: [<BsCameraVideo key="online" />],
        text: 'Online',
        class: 'online-mode'
      };
    } else if (mode.includes('in-person')) {
      return {
        icons: [<BsGeoAlt key="inperson" />],
        text: 'In-Person',
        class: 'inperson-mode'
      };
    } else {
      return {
        icons: [<BsLaptop key="default" />],
        text: modeString,
        class: 'default-mode'
      };
    }
  };

  const modeInfo = getConsultationModeInfo(mode);

  return (
    <>
      <Card hoverable className="advisor-card-new h-full flex flex-col">
        <CardHeader spacing="compact" className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl flex-shrink-0">
              <BsPersonCircle />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-base truncate">{name}</div>
              <div className="text-sm text-gray-600 truncate">{title}</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 flex-1">
          {Array.isArray(coursesTaught) && coursesTaught.length > 0 && (
            <div className="advisor-card-courses">
              <div className="flex flex-wrap gap-1.5">
                {coursesTaught.map((course, index) => {
                  // Prefer course code for compact pills; fallback to name
                  const label = (typeof course === 'string')
                    ? course
                    : (course?.subject_code || course?.code || course?.course_code || course?.name || course?.course_name || '');
                  if (!label) return null;
                  return (
                    <Badge key={index} variant="outline" size="sm" className="text-xs font-semibold">
                      {label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
          
          {time && (
            <div className="advisor-card-availability">
              <Badge variant="info" size="sm" className="flex items-center gap-1 w-fit text-xs font-medium">
                <BsClock className="w-3 h-3" />
                {time}
              </Badge>
            </div>
          )}
          {modeInfo.showSeparate ? (
            <div className="flex gap-2 mt-2">
              <Badge variant="info" size="sm" className="flex items-center gap-1">
                <BsCameraVideo className="w-3 h-3" />
                Online
              </Badge>
              <Badge variant="warning" size="sm" className="flex items-center gap-1">
                <BsGeoAlt className="w-3 h-3" />
                In-Person
              </Badge>
            </div>
          ) : (
            <div className="mt-2">
              <Badge 
                variant={modeInfo.class === 'online-mode' ? 'info' : modeInfo.class === 'inperson-mode' ? 'warning' : 'secondary'} 
                size="sm" 
                className="flex items-center gap-1 w-fit"
              >
                {modeInfo.icons}
                {modeInfo.text}
              </Badge>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-3 gap-2" align="between">
          <Button 
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={handleViewProfile}
          >
            <BsEye className="w-4 h-4 mr-1" />
            View Profile
          </Button>
          <Button 
            size="sm"
            className="flex-1"
            onClick={handleBookClick}
          >
            Book Consultation
          </Button>
        </CardFooter>
      </Card>

      <ConsultationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        faculty={facultyData}
        onNavigateToConsultations={handleNavigateToConsultations}
      />
    </>
  );
}

export default AdvisorCard;
