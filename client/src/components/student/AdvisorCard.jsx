import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsPersonCircle, BsClock, BsEye, BsCameraVideo, BsGeoAlt, BsLaptop, BsCalendarCheck } from "react-icons/bs";
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
  avatar = null,
  officeLocation = null,
  onBookClick,
  onNavigateToConsultations
}) {
  // Normalize asset URLs (absolute, blob, or server-relative)
  const resolveAssetUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const u = url.trim();
    if (!u) return null;
    if (/^(https?:\/\/|blob:)/i.test(u)) return u;
    if (u.startsWith('/')) return `${base}${u}`;
    return `${base}/${u.replace(/^\/*/, '')}`;
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [facultyData, setFacultyData] = useState({
    id: advisorId,
    name,
    title,
    avatar: resolveAssetUrl(avatar) || null,
    subjects: ["Academic Planning", "Course Selection", "Research Guidance"],
    availability: schedule && time ? `Available ${schedule}, ${time}` : null,
    status,
    schedule,
    time,
    coursesTaught,
    officeLocation,
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
        topicsCanHelpWith: data.topicsCanHelpWith || [],
        avatar: resolveAssetUrl(data.avatar) || resolveAssetUrl(avatar) || null,
        officeLocation: data.officeLocation || officeLocation || null,
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
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl flex-shrink-0">
              {facultyData.avatar ? (
                <img src={facultyData.avatar} alt={`${name}'s avatar`} className="w-full h-full rounded-full object-cover" />
              ) : (
                <BsPersonCircle />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-base truncate">{name}</div>
              <div className="text-sm text-gray-600 truncate">{title}</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1">
          {Array.isArray(coursesTaught) && coursesTaught.length > 0 && (
            <div className="advisor-card-courses">
              <div className="flex flex-wrap gap-1.5">
                {coursesTaught.slice(0,4).map((course, index) => {
                  const label = (typeof course === 'string')
                    ? course
                    : (course?.subject_code || course?.code || course?.course_code || '');
                  if (!label) return null;
                  return (
                    <Badge key={index} variant="outline" size="sm" className="text-xs font-semibold">
                      {label}
                    </Badge>
                  );
                })}
                {coursesTaught.length > 4 && (
                  <span className="text-xs text-gray-500 font-medium">+{coursesTaught.length - 4}</span>
                )}
              </div>
            </div>
          )}

          <div className="mt-3 border-t pt-3 space-y-2">
            {time && (
              <div className="advisor-card-detail-row">
                <div className="advisor-card-detail-label">Availability</div>
                <div className="advisor-card-detail-value">
                  <Badge variant="outline" size="sm" className="flex items-center gap-1 w-fit text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                    <BsClock className="w-3 h-3" />
                    {time}
                  </Badge>
                </div>
              </div>
            )}

              <div className="advisor-card-detail-row advisor-card-detail-row-mode">
                <div className="advisor-card-detail-label">Mode</div>
                <div className="advisor-card-detail-value advisor-card-detail-value-badges">
                  {modeInfo.showSeparate ? (
                    <>
                    <Badge variant="outline" size="sm" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 advisor-card-mode-badge">
                      <BsCameraVideo className="w-3 h-3" />
                      Online
                    </Badge>
                    <Badge variant="outline" size="sm" className="flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200 advisor-card-mode-badge">
                      <BsGeoAlt className="w-3 h-3" />
                      In-Person
                    </Badge>
                    </>
                  ) : (
                  <Badge 
                    variant="outline"
                    size="sm" 
                    className={`flex items-center gap-1 w-fit advisor-card-mode-badge ${modeInfo.class === 'online-mode' ? 'bg-blue-50 text-blue-700 border-blue-200' : modeInfo.class === 'inperson-mode' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                  >
                    {modeInfo.icons}
                    {modeInfo.text}
                  </Badge>
                  )}
                </div>
              </div>

            {!!facultyData.officeLocation && (
              <div className="advisor-card-detail-row">
                <div className="advisor-card-detail-label">Location</div>
                <div className="advisor-card-detail-value">
                  <Badge variant="outline" size="sm" className="flex items-center gap-1 w-fit bg-gray-50 text-gray-700 border-gray-200">
                    <BsGeoAlt className="w-3 h-3" />
                    {facultyData.officeLocation}
                  </Badge>
                </div>
              </div>
            )}
          </div>
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
            <BsCalendarCheck className="w-4 h-4 mr-1" />
            Consult
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
