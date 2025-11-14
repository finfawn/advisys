import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "../../contexts/SidebarContext";
import AdminTopNavbar from "../../components/admin/AdminTopNavbar";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminContentLayout from "../../components/admin/AdminContentLayout";
import AdminManageTabs from "../../components/admin/manage/AdminManageTabs";
import AdminManageFilters from "../../components/admin/manage/AdminManageFilters";
import AdminManageUserList from "../../components/admin/manage/AdminManageUserList";
import AdminUserHistoryDrawer from "../../components/admin/manage/AdminUserHistoryDrawer";
import "./AdminManageUsers.css";
import "./AdminContent.css";
// Reuse shared admin layout styles for consistent heights and grid
import "./AdminDashboard.css";
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
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const [activeTab, setActiveTab] = useState("students");
  const [search, setSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [yearFilter, setYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadRows, setUploadRows] = useState([]);
  const [uploadRole, setUploadRole] = useState("students"); // students | advisors
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
    // advisor settings
    autoAcceptRequests: false,
    maxDailyConsultations: 10,
    defaultConsultationDuration: 30,
    onlineEnabled: true,
    inPersonEnabled: true,
    availability: {
      monday: { start: "09:00", end: "17:00" },
      tuesday: { start: "09:00", end: "17:00" },
      wednesday: { start: "09:00", end: "17:00" },
      thursday: { start: "09:00", end: "17:00" },
      friday: { start: "09:00", end: "17:00" },
      saturday: null,
      sunday: null,
    },
  });
  const [initialEditForm, setInitialEditForm] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [studentsData, setStudentsData] = useState([]);
  const [advisorData, setAdvisorData] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingAdvisors, setLoadingAdvisors] = useState(true);

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const fetchStudents = async () => {
      try {
        const res = await fetch(`${base}/api/users?role=student`);
        const data = await res.json();
        if (Array.isArray(data)) setStudentsData(data);
      } catch (err) {
        console.error('Failed to fetch students', err);
      } finally {
        setLoadingStudents(false);
      }
    };
    const fetchAdvisors = async () => {
      try {
        const res = await fetch(`${base}/api/users?role=advisor`);
        const data = await res.json();
        if (Array.isArray(data)) setAdvisorData(data);
      } catch (err) {
        console.error('Failed to fetch advisors', err);
      } finally {
        setLoadingAdvisors(false);
      }
    };
    fetchStudents();
    fetchAdvisors();
  }, []);

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
    else if (page === "manage-users") navigate("/admin-dashboard/manage-users");
    else if (page === "department-settings") navigate("/admin-dashboard/department-settings");
    else if (page === "logout") navigate("/logout");
  };

  // CSV export for current filtered list
  const exportCSV = () => {
    const headersStudents = ["First Name","Last Name","Email","Year","Program","Active"];
    const headersAdvisors = ["First Name","Last Name","Email","Department","Active"];
    const headers = activeTab === "students" ? headersStudents : headersAdvisors;
    const rows = filteredList.map((item) => {
      const [first = "", ...rest] = (item.name || "").split(" ");
      const last = rest.join(" ");
      if (activeTab === "students") {
        return [first,last,item.email || "", item.year || "", item.program || "", item.active ? "true" : "false"]; 
      }
      return [first,last,item.email || "", item.department || "", item.active ? "true" : "false"]; 
    });
    const csv = [headers.join(","), ...rows.map(r => r.map(v => String(v).replace(/\r|\n/g, " ")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeTab === "students" ? "students.csv" : "advisors.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const persistStatus = async (userId, active) => {
    try {
      const res = await fetch(`${apiBase}/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to update status');
      }
      return await res.json();
    } catch (err) {
      console.error('Persist status error:', err);
      throw err;
    }
  };

  const handleConfirmDeactivate = async () => {
    const item = confirmDeactivate;
    if (!item) return;

    // Clear any existing undo timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
    }

    const previousState = item.active;
    const actionType = item.active ? "deactivated" : "activated";

    // Update the user status immediately (optimistic)
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

    // Persist to backend
    try {
      await persistStatus(item.id, !previousState);
    } catch {
      // Revert optimistic update on error
      if (activeTab === "students") {
        setStudentsData((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, active: previousState } : u)),
        );
      } else {
        setAdvisorData((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, active: previousState } : u)),
        );
      }
      setPendingAction(null);
      alert('Failed to update user status. Please try again.');
    }
  };

  const handleUndoAction = async () => {
    if (!pendingAction) return;

    // Clear the timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }

    // Restore the user to previous state (optimistic)
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

    // Persist revert to backend
    try {
      await persistStatus(pendingAction.user.id, pendingAction.previousState);
    } catch {
      // If revert fails, reapply change visually
      if (pendingAction.tab === "students") {
        setStudentsData((prev) =>
          prev.map((u) =>
            u.id === pendingAction.user.id ? { ...u, active: !pendingAction.previousState } : u,
          ),
        );
      } else {
        setAdvisorData((prev) =>
          prev.map((u) =>
            u.id === pendingAction.user.id ? { ...u, active: !pendingAction.previousState } : u,
          ),
        );
      }
      alert('Failed to undo status change. Please try again.');
    }
  };

  const handleCancelDeactivate = () => {
    setConfirmClosing(true);
    setTimeout(() => {
      setConfirmDeactivate(null);
      setConfirmClosing(false);
    }, 150);
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

  // Upload Users (.csv only) — parse and stage rows
  const [uploadFile, setUploadFile] = useState(null);
  const getTemplateHeaders = () => {
    return uploadRole === "students"
      ? ["First Name","Last Name","Email","Year","Program"]
      : ["First Name","Last Name","Email","Department","Max Daily","Default Duration","Online","InPerson","Subjects"];
  };

  const downloadCSVTemplate = () => {
    const headers = getTemplateHeaders();
    const example = uploadRole === "students"
      ? ["Juan","Dela Cruz","juan@example.com","1st Year","BSIT"]
      : ["Jane","Doe","jane@example.com","CIT","10","30","true","true","CS101|Intro to CS;IT201|Networking Basics"];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = uploadRole === "students" ? "students_template.csv" : "advisors_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseCSVText = (text) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return { headers: [], rows: [] };
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const expectedStudents = ["first name","last name","email","year","program"];
    const expectedAdvisors = ["first name","last name","email","department","max daily","default duration","online","inperson","subjects"];
    const expected = uploadRole === "students" ? expectedStudents : expectedAdvisors;
    const ok = expected.every((h) => headers.includes(h));
    if (!ok) {
      throw new Error(`CSV headers must include: ${expected.join(", ")}`);
    }
    const rows = lines.slice(1).map(line => line.split(",").map(c => c.trim()));
    return { headers, rows };
  };

  const handleUploadFileChange = (file) => {
    setUploadError(null);
    setUploadRows([]);
    setUploadFile(file || null);
    if (!file) return;
    const nameLower = (file.name || "").toLowerCase();
    if (!nameLower.endsWith(".csv")) {
      setUploadError("Only .csv files are accepted.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target?.result || "");
        const { rows } = parseCSVText(text);
        // Filter out empty rows
        const cleaned = rows.filter(r => r.some(v => v && v.length));
        setUploadRows(cleaned);
      } catch (err) {
        console.error("Upload parse error", err);
        setUploadError(err.message || "Failed to parse CSV.");
      }
    };
    reader.onerror = () => {
      setUploadError("Failed to read file.");
    };
    reader.readAsText(file);
  };

  const processUpload = () => {
    if (!uploadFile) {
      setUploadError("Please select a .csv file.");
      return;
    }
    if (uploadRows.length === 0) {
      setUploadError("No valid rows found in CSV.");
      return;
    }
    const idStart = Date.now();
    if (uploadRole === "students") {
      let id = idStart;
      const toAdd = uploadRows.map((cols) => {
        // Expect: First Name, Last Name, Email, Year, Program
        const [first = "", last = "", email = "", year = "", program = ""] = cols;
        return {
          id: id++,
          name: `${first} ${last}`.trim(),
          email,
          year: year || "1st Year",
          program: program || "BSIT",
          active: true,
        };
      });
      setStudentsData((prev) => [...prev, ...toAdd]);
      setActiveTab("students");
    } else {
      let id = idStart;
      const toAdd = uploadRows.map((cols) => {
        // Expect: First Name, Last Name, Email, Department, Max Daily, Default Duration, Online, InPerson, Subjects
        const [first = "", last = "", email = "", department = "", maxDaily = "10", defDur = "30", online = "true", inperson = "true", subjects = ""] = cols;
        const parsedSubjects = String(subjects || "")
          .split(";")
          .map(s => s.trim())
          .filter(Boolean)
          .map(pair => {
            const [code = "", name = ""] = pair.split("|");
            return { code: code.trim(), name: name.trim() };
          })
          .filter(s => s.code && s.name);
        return {
          id: id++,
          name: `${first} ${last}`.trim(),
          email,
          department: department || "CIT",
          active: true,
          _settings: {
            maxDailyConsultations: Number(maxDaily || 10),
            defaultConsultationDuration: Number(defDur || 30),
            onlineEnabled: /^true$/i.test(String(online)),
            inPersonEnabled: /^true$/i.test(String(inperson)),
            subjects: parsedSubjects,
          }
        };
      });
      setAdvisorData((prev) => [...prev, ...toAdd]);
      setActiveTab("advisors");
    }
    setUploadOpen(false);
    setUploadFile(null);
    setUploadRows([]);
    setUploadError(null);
  };

  const handleHistory = (item) => {
    setHistoryUser(item);
    setHistoryOpen(true);
    (async () => {
      try {
        const isStudent = activeTab === "students" || item.role === "student";
        const base = apiBase;
        const url = isStudent
          ? `${base}/api/consultations/students/${item.id}/consultations`
          : `${base}/api/consultations/advisors/${item.id}/consultations`;
        const token = localStorage.getItem('advisys_token');
        const res = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error(`Failed to fetch consultations: ${res.status}`);
        let data = await res.json();
        if (!Array.isArray(data)) data = [];
        // Adapt response shapes to HistoryCard expectations (uses consultation.faculty)
        if (isStudent) {
          // Student endpoint returns advisor{}; map to faculty{}
          data = data.map((c) => {
            const name = c?.advisor?.name || item?.name || 'Advisor';
            const initials = String(name)
              .split(' ')
              .filter(Boolean)
              .map((p) => p[0])
              .slice(0, 2)
              .join('');
            return {
              ...c,
              faculty: {
                id: c?.advisor?.id,
                name,
                title: c?.advisor?.title || 'Advisor',
                avatar: initials || '👤',
              },
            };
          });
        } else {
          // Advisor endpoint returns student{}; map to faculty{} with student info
          data = data.map((c) => {
            const name = c?.student?.name || 'Student';
            const initials = String(name)
              .split(' ')
              .filter(Boolean)
              .map((p) => p[0])
              .slice(0, 2)
              .join('');
            return {
              ...c,
              faculty: {
                name,
                title: c?.student?.course || 'Student',
                avatar: initials || '👤',
              },
            };
          });
        }
        setHistoryItems(data);
      } catch (err) {
        console.error("History fetch error", err);
        // Fallback to mock consultations for now
        try {
          setHistoryItems(generateMockConsultations(item));
        } catch (_) {
          setHistoryItems([]);
        }
      }
    })();
  };

  const handleView = (item) => {
    setViewUser(item);
    const nameParts = item.name.split(" ");
    const baseForm = {
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      email: item.email || "",
      password: item.password || "",
      year: item.year || "1st Year",
      program: item.program || "BSIT",
      department: item.department || "CIT",
      active: item.active,
      autoAcceptRequests: false,
      maxDailyConsultations: 10,
      defaultConsultationDuration: 30,
      onlineEnabled: true,
      inPersonEnabled: true,
      availability: {
        monday: { start: "09:00", end: "17:00" },
        tuesday: { start: "09:00", end: "17:00" },
        wednesday: { start: "09:00", end: "17:00" },
        thursday: { start: "09:00", end: "17:00" },
        friday: { start: "09:00", end: "17:00" },
        saturday: null,
        sunday: null,
      },
      consultBio: "",
      consultTopics: [],
      consultGuidelines: [],
      consultSubjects: [],
    };
    setEditForm(baseForm);
    setInitialEditForm(baseForm);
    setShowPassword(false);
    setViewOpen(true);
    // Load advisor consultation info only
    (async () => {
      try {
        if (activeTab !== 'advisors') return;
        const base = apiBase;
        const res = await fetch(`${base}/api/advisors/${item.id}`);
        if (!res.ok) return;
        const a = await res.json();
        const extra = {
          consultBio: a?.bio || '',
          consultTopics: Array.isArray(a?.topicsCanHelpWith) ? a.topicsCanHelpWith : [],
          consultGuidelines: Array.isArray(a?.consultationGuidelines) ? a.consultationGuidelines : [],
          consultSubjects: Array.isArray(a?.coursesTaught) ? a.coursesTaught.map(c => ({ code: c.code || '', name: c.name || '' })) : [],
        };
        setEditForm(prev => ({ ...prev, ...extra }));
        setInitialEditForm(prev => ({ ...(prev || baseForm), ...extra }));
      } catch (err) {
        console.error('Load advisor consultation info failed', err);
      }
    })();
  };

  const handleCancelEdit = () => {
    if (initialEditForm) setEditForm(initialEditForm);
    setViewOpen(false);
  };

  const handleSaveProfile = async () => {
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      alert("Please enter first and last name");
      return;
    }
    if (!editForm.email.trim() || !/\S+@\S+\.\S+/.test(editForm.email)) {
      alert("Please enter a valid email");
      return;
    }

    const fullName = `${editForm.firstName.trim()} ${editForm.lastName.trim()}`;

    // Optimistic update UI first
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

    // Persist to backend
    try {
      const payload = {
        full_name: fullName,
        email: editForm.email.trim(),
        role: activeTab === "students" ? "student" : "advisor",
        status: editForm.active ? "active" : "inactive",
        program: activeTab === "students" ? editForm.program : undefined,
        year_level: activeTab === "students" ? (
          Number(editForm.year?.[0]) || 1
        ) : undefined,
        department: activeTab === "advisors" ? editForm.department : undefined,
        password: editForm.password?.trim() || undefined,
      };
      const res = await fetch(`${apiBase}/api/users/${viewUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to save changes');
      }
      if (activeTab === 'advisors') {
        // Save consultation info (bio, topics, guidelines, subjects)
        const topics = Array.isArray(editForm.consultTopics) ? editForm.consultTopics : [];
        const guidelines = Array.isArray(editForm.consultGuidelines) ? editForm.consultGuidelines : [];
        const courses = Array.isArray(editForm.consultSubjects) ? editForm.consultSubjects.map(s => ({ code: String(s.code||'').trim(), name: String(s.name||'').trim() })).filter(s => s.code || s.name) : [];
        await fetch(`${apiBase}/api/advisors/${viewUser.id}/consultation-settings`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bio: editForm.consultBio || null, topics, guidelines, courses })
        }).catch((e)=>console.error('Save consultation settings failed', e));
      }
      // Ensure the list reflects persisted changes
      await reloadActiveTab();
      setViewOpen(false);
      try {
        const { toast } = await import('../../components/hooks/use-toast');
        toast.success({ title: 'Profile saved', description: activeTab === 'advisors' ? 'Consultation info updated' : 'User details updated' });
      } catch {}
    } catch (err) {
      console.error('Failed to persist user changes', err);
      alert('Saving failed on the server. The drawer remains open so you can retry.');
    }
  };

  const reloadActiveTab = async () => {
    try {
      const role = activeTab === 'students' ? 'student' : 'advisor';
      // Show loading skeleton during refresh to avoid empty state flash
      if (activeTab === 'students') setLoadingStudents(true);
      else setLoadingAdvisors(true);
      const res = await fetch(`${apiBase}/api/users?role=${role}`);
      if (!res.ok) {
        if (activeTab === 'students') setLoadingStudents(false);
        else setLoadingAdvisors(false);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        if (activeTab === 'students') setStudentsData(data);
        else setAdvisorData(data);
      }
    } catch (err) {
      console.error('Failed to reload users', err);
    } finally {
      if (activeTab === 'students') setLoadingStudents(false);
      else setLoadingAdvisors(false);
    }
  };

  useEffect(() => {
    if (!viewOpen) {
      reloadActiveTab();
    }
  }, [viewOpen, activeTab]);

  const handleDeleteConsultation = async (consultation) => {
    try {
      const res = await fetch(`${apiBase}/api/consultations/${consultation.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete consultation');
      setHistoryItems((prev) => prev.filter((c) => c.id !== consultation.id));
    } catch (err) {
      console.error('Delete consultation failed', err);
      alert('Could not delete consultation. Please try again.');
    }
  };

  const handleDeleteUserPermanent = async () => {
    if (!viewUser) return;
    if (editForm.active) {
      alert('User must be inactive before permanent deletion.');
      return;
    }
    if (!confirm('This will permanently delete the user. Continue?')) return;
    try {
      const res = await fetch(`${apiBase}/api/users/${viewUser.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Delete failed');
      }
      if (activeTab === 'students') {
        setStudentsData((prev) => prev.filter((u) => u.id !== viewUser.id));
      } else {
        setAdvisorData((prev) => prev.filter((u) => u.id !== viewUser.id));
      }
      setViewOpen(false);
    } catch (err) {
      console.error('Permanent delete failed', err);
      alert('Failed to delete user permanently.');
    }
  };

  return (
    <div className="admin-dash-wrap">
      <AdminTopNavbar />

      <div className={`admin-dash-body ${collapsed ? "collapsed" : ""}`}>
        {/* Sidebar - Hide up to xl; show on ≥1280px */}
        <div className="hidden xl:block">
          <AdminSidebar
            collapsed={collapsed}
            onToggle={toggleSidebar}
            onNavigate={handleNavigation}
          />
        </div>

        <main className="admin-dash-main">
          {/* Page header outside the table/card */}
          <div className="page-header">
            <h1 className="page-title">Manage Users</h1>
            <p className="page-subtitle">
              {activeTab === "students"
                ? "Manage student accounts and records"
                : "Manage advisor accounts and records"}
            </p>
          </div>

          <AdminContentLayout
            tabs={<AdminManageTabs activeTab={activeTab} onChange={setActiveTab} />}
            filters={
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
                onExport={exportCSV}
              />
            }
          >
            <AdminManageUserList
              items={filteredList}
              isStudent={activeTab === "students"}
              onView={handleView}
              onToggleActive={handleToggleActive}
              onHistory={handleHistory}
              loading={activeTab === "students" ? loadingStudents : loadingAdvisors}
            />

            <AdminUserHistoryDrawer
              open={historyOpen}
              user={historyUser}
              consultations={historyItems}
              onClose={() => setHistoryOpen(false)}
              onDelete={handleDeleteConsultation}
            />
          </AdminContentLayout>
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
          <DrawerFooter style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #e5e7eb', zIndex: 10 }}>
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
              Required file extension: <strong>.csv</strong>
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            {/* Import Target Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Import for</label>
              <Select value={uploadRole} onValueChange={setUploadRole}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="students">Students</SelectItem>
                  <SelectItem value="advisors">Advisors</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <a href="#" className="text-sm text-blue-600" onClick={(e) => { e.preventDefault(); downloadCSVTemplate(); }}>
                Download CSV template
              </a>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700">
              <p className="mb-1"><strong>Expected columns</strong> ({uploadRole === "students" ? "Students" : "Advisors"}):</p>
              {uploadRole === "students" ? (
                <p>First Name, Last Name, Email, Year, Program</p>
              ) : (
                <p>First Name, Last Name, Email, Department</p>
              )}
            </div>
            <div>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleUploadFileChange(e.target.files?.[0] || null)}
              />
            </div>
            {uploadError && (
              <p className="text-sm text-red-600">{uploadError}</p>
            )}
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
        <DrawerContent className="max-w-2xl p-0 max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{viewUser?.name || "User"} Profile</DrawerTitle>
            <DrawerDescription>
              View and edit user information
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)', paddingBottom: '96px' }}>
            {/* Profile Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                {viewUser?.avatar_url ? (
                  <img src={viewUser.avatar_url} alt="Profile" className="w-16 h-16 rounded-full object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-2xl text-blue-700 font-bold">
                    {(viewUser?.name || 'U').split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{viewUser?.name}</h3>
                  <p className="text-sm text-gray-500">{activeTab === "students" ? "Student" : "Advisor"} • ID: {viewUser?.id}</p>
                </div>
              </div>
              {viewUser?.avatar_url && (
                <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white" onClick={async ()=>{
                  try {
                    const res = await fetch(`${apiBase}/api/users/${viewUser.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar_url: null, role: activeTab === 'students' ? 'student' : 'advisor' }) });
                    if (!res.ok) throw new Error('Failed to remove profile picture');
                    setViewUser({ ...viewUser, avatar_url: null });
                    try { const { toast } = await import('../../components/hooks/use-toast'); toast.success({ title: 'Profile picture removed' }); } catch {}
                  } catch (err) {
                    console.error(err);
                    try { const { toast } = await import('../../components/hooks/use-toast'); toast.destructive({ title: 'Failed to remove picture', description: err?.message || 'Error' }); } catch {}
                  }
                }}>Remove Picture</Button>
              )}
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

            {/* Advisor Consultation Info Only */}
            {activeTab === "advisors" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <Select value={editForm.department} onValueChange={(v) => setEditForm({ ...editForm, department: v })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CIT">CIT - College of Information Technology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea className="w-full border border-gray-300 rounded-md p-2 text-sm" rows="3" value={editForm.consultBio || ''} onChange={(e)=>setEditForm({ ...editForm, consultBio: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categories (topics)</label>
                  <Input type="text" placeholder="Comma-separated, e.g., Java, Networking, CSS" value={(editForm.consultTopics || []).join(', ')} onChange={(e)=>setEditForm({ ...editForm, consultTopics: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guidelines</label>
                  <textarea className="w-full border border-gray-300 rounded-md p-2 text-sm" rows="3" placeholder="One guideline per line" value={(editForm.consultGuidelines || []).join('\n')} onChange={(e)=>setEditForm({ ...editForm, consultGuidelines: e.target.value.split('\n').map(s=>s.trim()).filter(Boolean) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subjects Taught</label>
                  <div className="space-y-2">
                    {(editForm.consultSubjects || []).map((subj, idx) => (
                      <div key={idx} className="grid grid-cols-5 gap-2">
                        <Input className="col-span-2" placeholder="Code (e.g., CS101)" value={subj.code || ''} onChange={(e)=>{ const v = e.target.value; const next = [...(editForm.consultSubjects||[])]; next[idx] = { ...next[idx], code: v }; setEditForm({ ...editForm, consultSubjects: next }); }} />
                        <Input className="col-span-3" placeholder="Name (e.g., Intro to CS)" value={subj.name || ''} onChange={(e)=>{ const v = e.target.value; const next = [...(editForm.consultSubjects||[])]; next[idx] = { ...next[idx], name: v }; setEditForm({ ...editForm, consultSubjects: next }); }} />
                        <Button variant="outline" onClick={()=>{ const next = [...(editForm.consultSubjects||[])]; next.splice(idx,1); setEditForm({ ...editForm, consultSubjects: next }); }}>Remove</Button>
                      </div>
                    ))}
                    <Button variant="outline" onClick={()=>setEditForm({ ...editForm, consultSubjects: [ ...(editForm.consultSubjects || []), { code: '', name: '' } ] })}>Add Subject</Button>
                  </div>
                </div>
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
          <DrawerFooter style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #e5e7eb', zIndex: 10 }}>
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile}>Save Changes</Button>
            {!editForm.active && (
              <Button variant="destructive" onClick={handleDeleteUserPermanent}>
                Delete Permanently
              </Button>
            )}
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
