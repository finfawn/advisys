import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import AdvisorCard from "../components/AdvisorCard";
import TopNavbar from "../components/TopNavbar";
import Sidebar from "../components/Sidebar";
import "./AdvisorListPage.css";

export default function AdvisorListPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();
  
  const toggleSidebar = () => setCollapsed((v) => !v);

  const handleNavigation = (page) => {
    if (page === 'dashboard') {
      navigate('/student-dashboard');
    } else if (page === 'consultations') {
      navigate('/student-dashboard/consultations');
    } else if (page === 'logout') {
      // Handle logout
      console.log('Logout');
    }
  };

  // Mock data for advisors
  const allAdvisors = [
    {
      id: 1,
      name: "Dr. Maria Santos",
      title: "Professor of Computer Science",
      department: "Computer Science",
      status: "Available",
      schedule: "Mon, Wed, Fri",
      time: "9:00 AM–12:00 PM",
      mode: "In-person/Online",
      isAvailableToday: true
    },
    {
      id: 2,
      name: "Prof. John Cruz",
      title: "Associate Professor of Mathematics",
      department: "Mathematics",
      status: "Available",
      schedule: "Tue, Thu",
      time: "1:00 PM–4:00 PM",
      mode: "Online",
      isAvailableToday: true
    },
    {
      id: 3,
      name: "Ms. Sarah Reyes",
      title: "Assistant Professor of Physics",
      department: "Physics",
      status: "Available",
      schedule: "Mon, Wed, Fri",
      time: "10:00 AM–2:00 PM",
      mode: "In-person",
      isAvailableToday: false
    },
    {
      id: 4,
      name: "Dr. Michael Dela Cruz",
      title: "Professor of Chemistry",
      department: "Chemistry",
      status: "Available",
      schedule: "Tue, Thu, Sat",
      time: "8:00 AM–11:00 AM",
      mode: "In-person/Online",
      isAvailableToday: true
    },
    {
      id: 5,
      name: "Prof. Lisa Garcia",
      title: "Associate Professor of Biology",
      department: "Biology",
      status: "Available",
      schedule: "Mon, Wed",
      time: "2:00 PM–5:00 PM",
      mode: "Online",
      isAvailableToday: false
    },
    {
      id: 6,
      name: "Dr. Robert Martinez",
      title: "Professor of Engineering",
      department: "Engineering",
      status: "Available",
      schedule: "Tue, Thu, Fri",
      time: "9:00 AM–1:00 PM",
      mode: "In-person/Online",
      isAvailableToday: true
    },
    {
      id: 7,
      name: "Ms. Jennifer Lopez",
      title: "Assistant Professor of Psychology",
      department: "Psychology",
      status: "Available",
      schedule: "Mon, Wed, Fri",
      time: "11:00 AM–3:00 PM",
      mode: "In-person",
      isAvailableToday: false
    },
    {
      id: 8,
      name: "Dr. David Wilson",
      title: "Professor of Economics",
      department: "Economics",
      status: "Available",
      schedule: "Tue, Thu",
      time: "1:00 PM–4:00 PM",
      mode: "Online",
      isAvailableToday: true
    }
  ];

  // Create generic categories for filter
  const categories = useMemo(() => {
    const deptSet = new Set(allAdvisors.map(advisor => advisor.department));
    const departments = Array.from(deptSet).sort();
    return departments.map((dept, index) => ({
      value: dept,
      label: `Category ${index + 1}`
    }));
  }, []);

  // Filter advisors based on selected filter
  const filteredAdvisors = useMemo(() => {
    if (filter === "all") return allAdvisors;
    return allAdvisors.filter(advisor => advisor.department === filter);
  }, [filter]);


  // Pagination logic
  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredAdvisors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = showAll ? filteredAdvisors.length : startIndex + itemsPerPage;
  const displayedAdvisors = filteredAdvisors.slice(0, endIndex);

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setCurrentPage(1);
    setShowAll(false);
  };

  const handleLoadMore = () => {
    if (endIndex >= filteredAdvisors.length) {
      setShowAll(true);
    } else {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleBookClick = (advisorName) => {
    console.log(`Book consultation with ${advisorName}`);
    // Add booking logic here
  };

  // Mock data for previously consulted advisors
  const previousConsultations = [
    {
      id: 1,
      name: "Dr. Maria Santos",
      title: "Professor of Computer Science",
      department: "Computer Science",
      status: "Available",
      schedule: "Mon, Wed, Fri",
      time: "9:00 AM–12:00 PM",
      mode: "In-person/Online",
      isAvailableToday: true,
      lastConsultation: "2 weeks ago",
      consultationCount: 3
    },
    {
      id: 2,
      name: "Prof. John Cruz",
      title: "Associate Professor of Mathematics",
      department: "Mathematics",
      status: "Available",
      schedule: "Tue, Thu",
      time: "1:00 PM–4:00 PM",
      mode: "Online",
      isAvailableToday: true,
      lastConsultation: "1 month ago",
      consultationCount: 1
    },
    {
      id: 4,
      name: "Dr. Michael Dela Cruz",
      title: "Professor of Chemistry",
      department: "Chemistry",
      status: "Available",
      schedule: "Tue, Thu, Sat",
      time: "8:00 AM–11:00 AM",
      mode: "In-person/Online",
      isAvailableToday: true,
      lastConsultation: "3 weeks ago",
      consultationCount: 2
    }
  ];

  return (
    <div className="dash-wrap">
      <TopNavbar />

      {/* Body */}
      <div className={`dash-body ${collapsed ? "collapsed" : ""}`}>
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />

        {/* Content */}
        <main className="dash-main">
          <div className="advisor-list-container">
            {/* Page Header */}
            <div className="page-header">
              <div className="page-title-section">
                <h1 className="page-title">Faculty Advisors</h1>
                <p className="page-subtitle">Browse and connect with faculty members for academic consultations</p>
              </div>
            </div>

            {/* Previous Consultations Section */}
            <section className="advisor-section">
              <div className="section-header">
                <h2 className="section-title">Previous Consultations</h2>
                <div className="section-controls">
                  <span className="section-count">{previousConsultations.length} advisors</span>
                </div>
              </div>
              
              <div className="advisor-grid">
                {previousConsultations.map(advisor => (
                  <AdvisorCard
                    key={`previous-${advisor.id}`}
                    name={advisor.name}
                    title={advisor.title}
                    status={advisor.status}
                    schedule={advisor.schedule}
                    time={advisor.time}
                    mode={advisor.mode}
                    onBookClick={() => handleBookClick(advisor.name)}
                  />
                ))}
              </div>
            </section>

            {/* All Faculty Section */}
            <section className="advisor-section">
              <div className="section-header">
                <h2 className="section-title">All Faculty</h2>
                
                <div className="section-controls">
                  {/* Filter Dropdown */}
                  <select 
                    id="advisor-filter" 
                    className="filter-dropdown"
                    value={filter}
                    onChange={handleFilterChange}
                  >
                    <option value="all">All Faculty</option>
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>{category.label}</option>
                    ))}
                  </select>
                  
                  <span className="section-count">{filteredAdvisors.length} total</span>
                </div>
              </div>
              
              {displayedAdvisors.length > 0 ? (
                <>
                  <div className="advisor-grid">
                    {displayedAdvisors.map(advisor => (
                      <AdvisorCard
                        key={advisor.id}
                        name={advisor.name}
                        title={advisor.title}
                        status={advisor.status}
                        schedule={advisor.schedule}
                        time={advisor.time}
                        mode={advisor.mode}
                        onBookClick={() => handleBookClick(advisor.name)}
                      />
                    ))}
                  </div>
                  
                  {/* Load More Button */}
                  {!showAll && endIndex < filteredAdvisors.length && (
                    <div className="load-more-section">
                      <Button 
                        variant="outline-primary" 
                        className="load-more-btn"
                        onClick={handleLoadMore}
                      >
                        Load More ({filteredAdvisors.length - endIndex} remaining)
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-results">
                  <p>No faculty members found matching your criteria.</p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
