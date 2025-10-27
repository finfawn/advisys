import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "../../contexts/SidebarContext";
import AdminTopNavbar from "../../components/admin/AdminTopNavbar";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminManageLeftTabs from "../../components/admin/manage/AdminManageLeftTabs";
import AdminManageFilters from "../../components/admin/manage/AdminManageFilters";
import AdminManageUserList from "../../components/admin/manage/AdminManageUserList";
import AdminUserHistoryModal from "../../components/admin/manage/AdminUserHistoryModal";
import "./AdminManageUsers.css";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "../../lightswind/drawer";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../lightswind/select";
import { Input } from "../../lightswind/input";
import { Button } from "../../lightswind/button";

export default function AdminManageUsers() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("students");
  const [search, setSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const [confirmClosing, setConfirmClosing] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [undoTimeout, setUndoTimeout] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    year: "",
    program: "",
    department: "",
    active: true,
  });
  const [showPassword, setShowPassword] = useState(false);

  const [studentsData, setStudentsData] = useState(
    Array.from({ length: 8 }).map((_, i) => ({
      id: i + 1,
      name: `Student ${i + 1}`,
      email: `student${i + 1}@example.com`,
      password: "password123",
      year: "1st Year",
      program: "BSIT",
      active: true,
    })),
  );

  const [advisorData, setAdvisorData] = useState(
    Array.from({ length: 8 }).map((_, i) => ({
      id: i + 1,
      name: `Advisor ${i + 1}`,
      email: `advisor${i + 1}@example.com`,
      password: "password123",
      department: "CIT",
      active: true,
    })),
  );

  const list = activeTab === "students" ? studentsData : advisorData;
  const query = search.trim().toLowerCase();
  let filteredList = list.filter((item) =>
    query ? item.name.toLowerCase().includes(query) : true,
  );
  if (activeTab === "students" && yearFilter !== "all") {
    filteredList = filteredList.filter((i) => i.year === yearFilter);
  }
  if (statusFilter !== "all") {
    const activeNeeded = statusFilter === "active";
    filteredList = filteredList.filter((i) => i.active === activeNeeded);
  }
  if (sortBy === "name-asc") {
    filteredList = [...filteredList].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  } else if (sortBy === "name-desc") {
    filteredList = [...filteredList].sort((a, b) =>
      b.name.localeCompare(a.name),
    );
  } else if (sortBy === "status") {
    filteredList = [...filteredList].sort(
      (a, b) => Number(b.active) - Number(a.active),
    );
  }

  const handleNavigation = (page) => {
    if (page === "dashboard") navigate("/admin-dashboard");
    if (page === "manage-users") navigate("/admin-dashboard/manage-users");
    if (page === "appointments") navigate("/admin-dashboard/appointments");
  };

  const handleToggleActive = (item) => {
    setConfirmDeactivate(item);
  };

  const generateMockConsultations = (user) => {
    // Simple mock data per user for demo purposes
    const baseId = user.id * 1000;
    return [
      {
        id: baseId + 1,
        status: "completed",
        mode: "online",
        topic: "Course planning session",
        date: "2025-09-10",
        time: "10:00 AM",
        faculty: { name: "Dr. Smith", title: "Advisor", avatar: "👤" },
      },
      {
        id: baseId + 2,
        status: "completed",
        mode: "in-person",
        topic: "Internship guidance",
        date: "2025-08-22",
        time: "2:30 PM",
        location: "Advising Office 2F",
        faculty: { name: "Prof. Lee", title: "Faculty Advisor", avatar: "👤" },
      },
      {
        id: baseId + 3,
        status: "cancelled",
        mode: "online",
        topic: "Thesis topic discussion",
        date: "2025-07-05",
        time: "9:00 AM",
        faculty: { name: "Dr. Gomez", title: "Program Chair", avatar: "👤" },
      },
    ];
  };

  const handleConfirmDeactivate = () => {
    const item = confirmDeactivate;
    if (!item) return;

    // Clear any existing undo timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
    }

    const previousState = item.active;
    const actionType = item.active ? "deactivated" : "activated";

    // Update the user status immediately
    if (activeTab === "students") {
      setStudentsData((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, active: !u.active } : u)),
      );
    } else {
      setAdvisorData((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, active: !u.active } : u)),
      );
    }

    // Set pending action for undo
    setPendingAction({
      user: item,
      previousState,
      actionType,
      tab: activeTab,
    });

    // Set timeout to finalize the action
    const timeout = setTimeout(() => {
      setPendingAction(null);
    }, 5000);

    setUndoTimeout(timeout);
    setConfirmClosing(true);
    setTimeout(() => {
      setConfirmDeactivate(null);
      setConfirmClosing(false);
    }, 150);
  };

  const handleUndoAction = () => {
    if (!pendingAction) return;

    // Clear the timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }

    // Restore the user to previous state
    if (pendingAction.tab === "students") {
      setStudentsData((prev) =>
        prev.map((u) =>
          u.id === pendingAction.user.id
            ? { ...u, active: pendingAction.previousState }
            : u,
        ),
      );
    } else {
      setAdvisorData((prev) =>
        prev.map((u) =>
          u.id === pendingAction.user.id
            ? { ...u, active: pendingAction.previousState }
            : u,
        ),
      );
    }

    // Clear pending action
    setPendingAction(null);
  };

  const handleCancelDeactivate = () => {
    setConfirmClosing(true);
    setTimeout(() => {
      setConfirmDeactivate(null);
      setConfirmClosing(false);
    }, 150);
  };

  const handleRoleChange = (val) => {
    setRoleFilter(val);
    if (val === "students") setActiveTab("students");
    else if (val === "advisors") setActiveTab("advisors");
  };

  // Add User form state
  const [newRole, setNewRole] = useState("student");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newYear, setNewYear] = useState("1st Year");
  const [newProgram, setNewProgram] = useState("BSIT");
  const [newDepartment, setNewDepartment] = useState("CIT");

  const resetAddUserForm = () => {
    setNewFirstName("");
    setNewLastName("");
    setNewEmail("");
    setNewRole("student");
    setNewYear("1st Year");
    setNewProgram("BSIT");
    setNewDepartment("CIT");
  };

  const submitAddUser = () => {
    // Validation
    if (!newFirstName.trim() || !newLastName.trim()) {
      alert("Please enter first and last name");
      return;
    }
    if (!newEmail.trim() || !/\S+@\S+\.\S+/.test(newEmail)) {
      alert("Please enter a valid email");
      return;
    }

    const fullName = `${newFirstName.trim()} ${newLastName.trim()}`;

    if (newRole === "student") {
      const id = studentsData.length
        ? Math.max(...studentsData.map((s) => s.id)) + 1
        : 1;
      setStudentsData((prev) => [
        ...prev,
        {
          id,
          name: fullName,
          year: newYear,
          program: newProgram,
          email: newEmail.trim(),
          active: true,
        },
      ]);
      setActiveTab("students");
    } else {
      const id = advisorData.length
        ? Math.max(...advisorData.map((f) => f.id)) + 1
        : 1;
      setAdvisorData((prev) => [
        ...prev,
        {
          id,
          name: fullName,
          department: newDepartment,
          email: newEmail.trim(),
          active: true,
        },
      ]);
      setActiveTab("advisors");
    }
    setAddOpen(false);
    resetAddUserForm();
  };

  // Upload Users stub
  const [uploadFile, setUploadFile] = useState(null);
  const processUpload = () => {
    // For now, simulate adding two users
    if (!uploadFile) {
      return;
    }
    const idBase = Date.now();
    setStudentsData((prev) => [
      ...prev,
      {
        id: idBase,
        name: "Imported Student A",
        year: "1st Year",
        program: "BSIT",
        active: true,
      },
      {
        id: idBase + 1,
        name: "Imported Student B",
        year: "2nd Year",
        program: "BSIT",
        active: true,
      },
    ]);
    setUploadOpen(false);
    setUploadFile(null);
  };

  const handleHistory = (item) => {
    setHistoryUser(item);
    setHistoryItems(generateMockConsultations(item));
    setHistoryOpen(true);
  };

  const handleView = (item) => {
    setViewUser(item);
    const nameParts = item.name.split(" ");
    setEditForm({
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      email: item.email || "",
      password: item.password || "",
      year: item.year || "1st Year",
      program: item.program || "BSIT",
      department: item.department || "CIT",
      active: item.active,
    });
    setShowPassword(false);
    setViewOpen(true);
  };

  const handleSaveProfile = () => {
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      alert("Please enter first and last name");
      return;
    }
    if (!editForm.email.trim() || !/\S+@\S+\.\S+/.test(editForm.email)) {
      alert("Please enter a valid email");
      return;
    }

    const fullName = `${editForm.firstName.trim()} ${editForm.lastName.trim()}`;

    if (activeTab === "students") {
      setStudentsData((prev) =>
        prev.map((u) =>
          u.id === viewUser.id
            ? {
                ...u,
                name: fullName,
                email: editForm.email.trim(),
                password: editForm.password.trim() || u.password,
                year: editForm.year,
                program: editForm.program,
                active: editForm.active,
              }
            : u,
        ),
      );
    } else {
      setAdvisorData((prev) =>
        prev.map((u) =>
          u.id === viewUser.id
            ? {
                ...u,
                name: fullName,
                email: editForm.email.trim(),
                password: editForm.password.trim() || u.password,
                department: editForm.department,
                active: editForm.active,
              }
            : u,
        ),
      );
    }

    setViewOpen(false);
  };

  return (
    <div className="admin-dash-wrap">
      <AdminTopNavbar />

      <div className={`admin-dash-body ${collapsed ? "collapsed" : ""}`}>
        {/* Sidebar - Hidden on mobile, visible on desktop */}
        <div className="hidden md:block">
          <AdminSidebar
            collapsed={collapsed}
            onToggle={toggleSidebar}
            onNavigate={handleNavigation}
          />
        </div>

        <main className="admin-dash-main">
          <div className="dashboard-card manage-users-card">
            <div className="manage-grid">
              {/* Left filter column */}
              <AdminManageLeftTabs
                activeTab={activeTab}
                onChange={setActiveTab}
              />

              {/* Main content */}
              <section className="manage-right">
                {/* Top filters */}
                <AdminManageFilters
                  search={search}
                  onSearchChange={setSearch}
                  onClearSearch={() => setSearch("")}
                  isStudent={activeTab === "students"}
                  yearFilter={yearFilter}
                  onYearChange={setYearFilter}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  onAddUserOpen={() => setAddOpen(true)}
                  onUploadUsersOpen={() => setUploadOpen(true)}
                  onExport={() => {}}
                />

                {/* List */}
                <AdminManageUserList
                  items={filteredList}
                  isStudent={activeTab === "students"}
                  onView={handleView}
                  onToggleActive={handleToggleActive}
                  onHistory={handleHistory}
                />

                <AdminUserHistoryModal
                  open={historyOpen}
                  user={historyUser}
                  consultations={historyItems}
                  onClose={() => setHistoryOpen(false)}
                />
              </section>
            </div>
          </div>
        </main>
      </div>

      {confirmDeactivate && (
        <div
          className={`admin-modal-overlay ${confirmClosing ? "closing" : ""}`}
        >
          <div
            className={`admin-modal ${confirmClosing ? "closing" : ""}`}
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Confirm Action</h3>
              <button
                className="admin-modal-close"
                onClick={handleCancelDeactivate}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              Are you sure you want to{" "}
              {confirmDeactivate.active ? "deactivate" : "activate"}{" "}
              {confirmDeactivate.name}?
            </div>
            <div
              className="p-3"
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <Button variant="outline" onClick={handleCancelDeactivate}>
                Cancel
              </Button>
              <Button
                variant={confirmDeactivate.active ? "destructive" : "default"}
                onClick={handleConfirmDeactivate}
              >
                {confirmDeactivate.active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Drawer */}
      <Drawer open={addOpen} onOpenChange={setAddOpen}>
        <DrawerContent className="max-w-xl p-0">
          <DrawerHeader>
            <DrawerTitle>Add New User</DrawerTitle>
            <DrawerDescription>
              Create a new student or advisor account
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Type
              </label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="advisor">Advisor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <Input
                  type="text"
                  placeholder="John"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <Input
                  type="text"
                  placeholder="Doe"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>

            {/* Conditional Fields for Students */}
            {newRole === "student" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year Level
                  </label>
                  <Select value={newYear} onValueChange={setNewYear}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st Year">1st Year</SelectItem>
                      <SelectItem value="2nd Year">2nd Year</SelectItem>
                      <SelectItem value="3rd Year">3rd Year</SelectItem>
                      <SelectItem value="4th Year">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Program
                  </label>
                  <Select value={newProgram} onValueChange={setNewProgram}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BSIT">
                        BSIT - Bachelor of Science in Information Technology
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Conditional Fields for Advisors */}
            {newRole === "advisor" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <Select value={newDepartment} onValueChange={setNewDepartment}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CIT">
                      CIT - College of Information Technology
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> A temporary password will be generated
                and sent to the user's email address.
              </p>
            </div>
          </div>
          <DrawerFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddOpen(false);
                resetAddUserForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={submitAddUser}>Add User</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Upload Users Drawer */}
      <Drawer open={uploadOpen} onOpenChange={setUploadOpen}>
        <DrawerContent className="max-w-xl p-0">
          <DrawerHeader>
            <DrawerTitle>Upload Users</DrawerTitle>
            <DrawerDescription>
              Import users from a CSV or Excel file
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <div>
              <a href="#" className="text-sm text-blue-600">
                Download CSV template
              </a>
            </div>
            <div>
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
            <p className="text-sm text-gray-500">
              A confirmation step will appear before import completes.
            </p>
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={processUpload}>Upload</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* View/Edit User Profile Drawer */}
      <Drawer open={viewOpen} onOpenChange={setViewOpen}>
        <DrawerContent className="max-w-2xl p-0">
          <DrawerHeader>
            <DrawerTitle>{viewUser?.name || "User"} Profile</DrawerTitle>
            <DrawerDescription>
              View and edit user information
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-6 space-y-5">
            {/* Profile Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-2xl text-blue-700 font-bold">
                {viewUser?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "U"}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {viewUser?.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {activeTab === "students" ? "Student" : "Advisor"} • ID:{" "}
                  {viewUser?.id}
                </p>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <Input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, firstName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <Input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm({ ...editForm, password: e.target.value })
                    }
                    placeholder="Enter new password or leave blank to keep current"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const chars =
                      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
                    const password = Array.from(
                      { length: 12 },
                      () => chars[Math.floor(Math.random() * chars.length)],
                    ).join("");
                    setEditForm({ ...editForm, password });
                    setShowPassword(true);
                  }}
                  className="whitespace-nowrap"
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Current:{" "}
                <span className="font-mono font-semibold">
                  {showPassword ? viewUser?.password : "••••••••"}
                </span>
                {editForm.password &&
                  editForm.password !== viewUser?.password && (
                    <span className="text-blue-600 ml-2">
                      • Will be changed on save
                    </span>
                  )}
              </p>
            </div>

            {/* Student-Specific Fields */}
            {activeTab === "students" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year Level
                    </label>
                    <Select
                      value={editForm.year}
                      onValueChange={(v) =>
                        setEditForm({ ...editForm, year: v })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1st Year">1st Year</SelectItem>
                        <SelectItem value="2nd Year">2nd Year</SelectItem>
                        <SelectItem value="3rd Year">3rd Year</SelectItem>
                        <SelectItem value="4th Year">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Program
                    </label>
                    <Select
                      value={editForm.program}
                      onValueChange={(v) =>
                        setEditForm({ ...editForm, program: v })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BSIT">
                          BSIT - Bachelor of Science in Information Technology
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Advisor-Specific Fields */}
            {activeTab === "advisors" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <Select
                  value={editForm.department}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, department: v })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CIT">
                      CIT - College of Information Technology
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Account Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Status
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                    editForm.active
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-500"
                  }`}
                  onClick={() => setEditForm({ ...editForm, active: true })}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                  Active
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                    !editForm.active
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 bg-white text-gray-500"
                  }`}
                  onClick={() => setEditForm({ ...editForm, active: false })}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                  Inactive
                </button>
              </div>
            </div>
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Undo Notification */}
      {pendingAction && (
        <div className="undo-notification">
          <div className="undo-content">
            <span className="undo-message">
              User "{pendingAction.user.name}" {pendingAction.actionType}
            </span>
            <button className="undo-btn" onClick={handleUndoAction}>
              Undo
            </button>
          </div>
          <div className="undo-timer">
            <div className="undo-timer-bar"></div>
          </div>
        </div>
      )}
    </div>
  );
}
