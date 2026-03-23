import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  buildSubjectLabel,
  hasSubjectCodeValue,
  hasTopicValue,
  normalizeCatalogText,
  normalizeSubjectCode,
  normalizeSubjectName,
} from "../../lib/consultationCatalog";

export default function AdminManageUsers({ __forceTab, __title, __subtitle }) {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const [activeTab, setActiveTab] = useState(__forceTab || "students");
  const [search, setSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyTerms, setHistoryTerms] = useState([]);
  const [historyTermId, setHistoryTermId] = useState('');
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
  const [singleDeactivate, setSingleDeactivate] = useState({ reason: 'graduated', otherReason: '' });
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
  const [drawerDeactivate, setDrawerDeactivate] = useState({ reason: 'graduated', otherReason: '', termId: 'current' });

  const [studentsData, setStudentsData] = useState([]);
  const [advisorData, setAdvisorData] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingAdvisors, setLoadingAdvisors] = useState(true);
  const [terms, setTerms] = useState([]);
  const [termFilter, setTermFilter] = useState(__forceTab ? 'all' : 'current');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkModal, setBulkModal] = useState({ open: false, reason: 'graduated', otherReason: '', termId: 'current', archiveOpen: true, cancelSlots: true });
  const [memberSet, setMemberSet] = useState(new Set());
  const [memberStatusMap, setMemberStatusMap] = useState(new Map());
  const [promoteModal, setPromoteModal] = useState({ open: false, toTermId: '' });
  const [promoteSearch, setPromoteSearch] = useState({ program: '', year: '' });
  const [termStatusFilter, setTermStatusFilter] = useState('all');
  const [memberList, setMemberList] = useState([]);
  const [programFilter, setProgramFilter] = useState("");
  const [yearSnapshotFilter, setYearSnapshotFilter] = useState("");
  const [memberMetaMap, setMemberMetaMap] = useState(new Map());
  const [programOptions, setProgramOptions] = useState([]);
  const [yearOptions, setYearOptions] = useState([]);
  const [adminProgramOptions, setAdminProgramOptions] = useState([]);
  const [adminYearLevelOptions, setAdminYearLevelOptions] = useState([]);
  const [consultationTopicOptions, setConsultationTopicOptions] = useState([]);
  const [consultationSubjectOptions, setConsultationSubjectOptions] = useState([]);
  const [advisorTopicPreset, setAdvisorTopicPreset] = useState("");
  const [advisorTopicOther, setAdvisorTopicOther] = useState("");
  const [advisorSubjectPreset, setAdvisorSubjectPreset] = useState("");
  const [advisorSubjectOtherCode, setAdvisorSubjectOtherCode] = useState("");
  const [advisorSubjectOtherName, setAdvisorSubjectOtherName] = useState("");

  const showToast = async (type, title, description) => {
    try {
      const { toast } = await import("../../components/hooks/use-toast");
      if (type === "success") {
        toast.success({ title, description });
      } else if (type === "warning") {
        toast.warning({ title, description });
      } else if (type === "destructive") {
        toast.destructive({ title, description });
      } else {
        toast({ title, description });
      }
    } catch {
      console.error(title, description);
    }
  };

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
    const fetchTerms = async () => {
      try {
        const res = await fetch(`${base}/api/settings/academic/terms`);
        const data = await res.json();
        if (Array.isArray(data)) setTerms(data);
      } catch (err) {
        console.error('Failed to fetch terms', err);
      }
    };
    const fetchProgramYearOptions = async () => {
      try {
        const [pRes, yRes, cRes] = await Promise.all([
          fetch(`${base}/api/programs`),
          fetch(`${base}/api/settings/year-levels`),
          fetch(`${base}/api/consultation-catalog`),
        ]);
        const p = await pRes.json();
        const y = await yRes.json();
        const c = await cRes.json().catch(() => ({}));
        if (Array.isArray(p)) { setProgramOptions(p); setAdminProgramOptions(p); }
        if (Array.isArray(y)) { setYearOptions(y); setAdminYearLevelOptions(y); }
        setConsultationTopicOptions(Array.isArray(c?.topics) ? c.topics : []);
        setConsultationSubjectOptions(Array.isArray(c?.subjects) ? c.subjects : []);
      } catch (_) {}
    };
    fetchStudents();
    fetchAdvisors();
    fetchTerms();
    fetchProgramYearOptions();
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
  } else if (sortBy === "recent") {
    filteredList = [...filteredList].sort(
      (a, b) => Number(b.id || 0) - Number(a.id || 0),
    );
  }

  const handleNavigation = (page) => {
    if (page === "dashboard") navigate("/admin-dashboard");
    else if (page === "manage-users") navigate("/admin-dashboard/manage-students");
    else if (page === "manage-students") navigate("/admin-dashboard/manage-students");
    else if (page === "manage-advisors") navigate("/admin-dashboard/manage-advisors");
    else if (page === "department-settings") navigate("/admin-dashboard/department-settings");
    else if (page === "logout") navigate("/logout");
  };

  const toggleSelect = (id, checked) => {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (checked) set.add(id); else set.delete(id);
      return Array.from(set);
    });
  };
  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(prev => Array.from(new Set([...prev, ...renderedList.map(i => i.id)])));
    } else {
      const visibleIds = new Set(renderedList.map(i => i.id));
      setSelectedIds(prev => prev.filter(id => !visibleIds.has(id)));
    }
  };

  const openBulkDeactivate = () => {
    if (selectedIds.length === 0) return;
    setBulkModal((m) => ({ ...m, open: true }));
  };

  const submitBulkDeactivate = async () => {
    try {
      const body = {
        userIds: selectedIds,
        reason: bulkModal.reason,
        otherReason: bulkModal.otherReason || undefined,
        termId: bulkModal.termId === 'current' ? undefined : Number(bulkModal.termId),
        archiveOpenConsultations: !!bulkModal.archiveOpen,
        cancelAdvisorSlots: !!bulkModal.cancelSlots,
      };
      const res = await fetch(`${apiBase}/api/users/bulk-deactivate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Bulk deactivate failed');
      setBulkModal((m)=>({ ...m, open: false }));
      setSelectedIds([]);
      // Optimistically reflect status
      if (activeTab === 'students') {
        setStudentsData(prev => prev.map(u => selectedIds.includes(u.id) ? { ...u, active: false } : u));
        // Reload term members to reflect enrollment status changes
        await loadTermMembers();
      } else {
        setAdvisorData(prev => prev.map(u => selectedIds.includes(u.id) ? { ...u, active: false } : u));
      }
    } catch (err) {
      await showToast('destructive', 'Bulk update failed', err.message || String(err));
    }
  };

  const loadTermMembers = async () => {
    try {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      let termId = termFilter;
      if (termId === 'current' || termId === 'all') {
        const res = await fetch(`${base}/api/settings/academic/terms`);
        const data = await res.json();
        const current = Array.isArray(data) ? data.find(t=>t.is_current) : null;
        termId = current?.id;
      }
      if (!termId) { setMemberSet(new Set()); return; }
      const role = activeTab === 'students' ? 'student' : 'advisor';
      const res = await fetch(`${base}/api/settings/academic/terms/${termId}/members?role=${role}`);
      const data = await res.json();
      const set = new Set(Array.isArray(data) ? data.map(x=>x.id) : []);
      const map = new Map(Array.isArray(data) ? data.map(x => [x.id, x.active ? x.status_in_term : undefined]) : []);
      setMemberSet(set);
      setMemberStatusMap(map);
      setMemberList(Array.isArray(data) ? data : []);
      // Build snapshot metadata and options for filters
      if (role === 'student') {
        const meta = new Map(Array.isArray(data) ? data.map(x => [x.id, { program: x.program_snapshot || x.program || '', year: String(x.year_level_snapshot || x.year_level || '') }]) : []);
        setMemberMetaMap(meta);
        const pset = new Set(); const yset = new Set();
        if (Array.isArray(data)) {
          for (const m of data) {
            const p = String(m.program_snapshot || m.program || '').trim(); if (p) pset.add(p);
            const y = String(m.year_level_snapshot || m.year_level || '').trim(); if (y) yset.add(y);
          }
        }
        setProgramOptions(Array.from(pset).sort());
        setYearOptions(Array.from(yset).sort());
      } else {
        setMemberMetaMap(new Map());
        setProgramOptions([]);
        setYearOptions([]);
      }
    } catch (_) {
      setMemberSet(new Set());
      setMemberStatusMap(new Map());
      setMemberList([]);
      setMemberMetaMap(new Map());
      setProgramOptions([]);
      setYearOptions([]);
    }
  };

  useEffect(() => { loadTermMembers(); }, [termFilter, activeTab]);

  const addToTerm = async () => {
    try {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      let termId = termFilter;
      if (termId === 'current' || termId === 'all') {
        const res = await fetch(`${base}/api/settings/academic/terms`);
        const data = await res.json();
        const current = Array.isArray(data) ? data.find(t=>t.is_current) : null;
        termId = current?.id;
      }
      if (!termId) {
        try { const { toast } = await import('../../components/hooks/use-toast'); toast.warning({ title: 'Select a term', description: 'Choose a specific term (or Current Term) first.' }); } catch {}
        return;
      }
      const res = await fetch(`${base}/api/settings/academic/terms/${termId}/members`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userIds: selectedIds, role: activeTab === 'students' ? 'student' : 'advisor' })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data?.error || 'Add failed');
      await loadTermMembers();
      // Refresh students data since they'll be deactivated when added to term
      if (activeTab === 'students') {
        try {
          const res = await fetch(`${base}/api/users?role=student`);
          const data = await res.json();
          if (Array.isArray(data)) setStudentsData(data);
        } catch (err) {
          console.error('Failed to refresh students data', err);
        }
      }
      try { const { toast } = await import('../../components/hooks/use-toast'); toast.success({ title: 'Added to term', description: `${selectedIds.length} user(s) added and deactivated` }); } catch {}
    } catch (e) {
      await showToast('destructive', 'Error', e?.message || 'Failed to add to term');
    }
  };

  const removeFromTerm = async () => {
    try {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      let termId = termFilter;
      if (termId === 'current' || termId === 'all') {
        const res = await fetch(`${base}/api/settings/academic/terms`);
        const data = await res.json();
        const current = Array.isArray(data) ? data.find(t=>t.is_current) : null;
        termId = current?.id;
      }
      if (!termId) {
        try { const { toast } = await import('../../components/hooks/use-toast'); toast.warning({ title: 'Select a term', description: 'Choose a specific term (or Current Term) first.' }); } catch {}
        return;
      }
      const res = await fetch(`${base}/api/settings/academic/terms/${termId}/members`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userIds: selectedIds })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data?.error || 'Remove failed');
      await loadTermMembers();
      try { const { toast } = await import('../../components/hooks/use-toast'); toast.success({ title: 'Removed from term', description: `${selectedIds.length} user(s) removed` }); } catch {}
    } catch (e) {
      await showToast('destructive', 'Error', e?.message || 'Failed to remove from term');
    }
  };

  // CSV export for current visible rows (respects all filters and term context)
  const exportCSV = () => {
    const rows = renderedList.map((item) => {
      const [first = "", ...rest] = (item.name || "").split(" ");
      const last = rest.join(" ");
      if (activeTab === "students") {
        const termStatus = (memberStatusMap.get(item.id) || '').toString();
        const meta = memberMetaMap.get(item.id) || {};
        return [first,last,item.email || "", item.program || "", item.year || "", item.active ? "true" : "false", termStatus, meta.program || '', meta.year || ''];
      }
      const termStatus = (memberStatusMap.get(item.id) || '').toString();
      return [first,last,item.email || "", item.department || "", item.active ? "true" : "false", termStatus];
    });
    const headers = activeTab === "students"
      ? ["First Name","Last Name","Email","Program","Year","Active","Term Status","Program (term)","Year (term)"]
      : ["First Name","Last Name","Email","Department","Active","Term Status"];
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""').replace(/\r|\n/g, ' ')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeTab === "students" ? "students_visible.csv" : "advisors_visible.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // CSV export of raw term members (from current term selection)
  const exportMembersCSV = () => {
    const headers = ["User ID","Name","Email","Role","Status in Term","Program (term)","Year (term)"];
    const rows = (memberList || []).map(m => [m.id, m.name, m.email, m.role, m.status_in_term, m.program_snapshot || '', m.year_level_snapshot || '']);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v||'').replace(/"/g,'""').replace(/\r|\n/g,' ')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "term_members.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleToggleActive = (item) => {
    setSingleDeactivate({ reason: 'graduated', otherReason: '' });
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

  const persistStatus = async (userId, active, extras) => {
    try {
      const res = await fetch(`${apiBase}/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active, ...(extras || {}) })
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
        prev.map((u) => {
          if (u.id !== item.id) return u;
          const goingInactive = item.active === true;
          return {
            ...u,
            active: !u.active,
            deactivationReason: goingInactive ? singleDeactivate.reason : null,
            deactivationOther: goingInactive && singleDeactivate.reason === 'other' ? (singleDeactivate.otherReason || '') : null,
          };
        }),
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
      let extras = undefined;
      if (previousState === true && activeTab === 'students') {
        let termId = null;
        if (termFilter && termFilter !== 'all') {
          if (termFilter === 'current') {
            const current = (terms || []).find(t => Number(t.is_current) === 1);
            termId = current?.id || null;
          } else {
            const n = Number(termFilter);
            termId = Number.isFinite(n) ? n : null;
          }
        }
        extras = { reason: singleDeactivate.reason, otherReason: singleDeactivate.reason === 'other' ? (singleDeactivate.otherReason || '') : undefined, termId: termId || undefined };
      }
      await persistStatus(item.id, !previousState, extras);
      // Reload term members to reflect enrollment status changes when student status changes
      // (deactivation updates enrollment status, activation removes from term memberships)
      if (activeTab === 'students') {
        await loadTermMembers();
      }
    } catch {
      // Revert optimistic update on error
      if (activeTab === "students") {
        setStudentsData((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, active: previousState, deactivationReason: previousState ? u.deactivationReason : null, deactivationOther: previousState ? u.deactivationOther : null } : u)),
        );
      } else {
        setAdvisorData((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, active: previousState } : u)),
        );
      }
      setPendingAction(null);
      await showToast('destructive', 'Update failed', 'Failed to update user status. Please try again.');
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
      await showToast('destructive', 'Undo failed', 'Failed to undo status change. Please try again.');
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
    setNewRole(activeTab === 'students' ? 'student' : 'advisor');
    setNewYear("1st Year");
    setNewProgram("BSIT");
    setNewDepartment("CIT");
  };

  useEffect(() => {
    if (addOpen) {
      setNewRole(activeTab === 'students' ? 'student' : 'advisor');
    }
  }, [addOpen, activeTab]);

  useEffect(() => {
    if (uploadOpen) {
      setUploadRole(activeTab === 'students' ? 'students' : 'advisors');
    }
  }, [uploadOpen, activeTab]);

  const submitAddUser = async () => {
    const invalids = new Set(['-', '--', '---', 'n/a', 'na', 'none', 'null', 'undefined']);
    const first = newFirstName.trim();
    const last = newLastName.trim();
    const firstLetters = first.replace(/[^A-Za-z]/g, '').length;
    const lastLetters = last.replace(/[^A-Za-z]/g, '').length;
    const nameOk = first && last && !invalids.has(first.toLowerCase()) && !invalids.has(last.toLowerCase()) && /^[A-Za-z\s.'-]+$/.test(first) && /^[A-Za-z\s.'-]+$/.test(last) && firstLetters >= 2 && lastLetters >= 2;
    if (!nameOk) {
      await showToast('warning', 'Invalid name', 'Please enter a valid first and last name.');
      return;
    }
    const fullCandidate = `${first} ${last}`.replace(/\s+/g, ' ').trim().toLowerCase();
    const existingList = activeTab === 'students' ? studentsData : advisorData;
    const duplicateExists = Array.isArray(existingList) && existingList.some((u) => {
      const baseName = String(
        u.name ||
        `${u.first_name || u.firstName || ''} ${u.last_name || u.lastName || ''}`
      ).replace(/\s+/g, ' ').trim().toLowerCase();
      return baseName && baseName === fullCandidate;
    });
    if (duplicateExists) {
      await showToast('warning', 'Name already exists', 'A user with this full name already exists.');
      return;
    }
    const mail = newEmail.trim().toLowerCase();
    const emailOk = mail && !invalids.has(mail) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail);
    if (!emailOk) {
      await showToast('warning', 'Invalid email', 'Please enter a valid email address.');
      return;
    }
    const role = activeTab === 'students' ? 'student' : 'advisor';
    try {
      const token = localStorage.getItem('advisys_token');
      const cleanText = (s) => {
        const t = String(s || '').trim();
        const l = t.toLowerCase();
        return (!t || invalids.has(l)) ? null : t;
      };
      const payload = role === 'student'
        ? { role, firstName: first, lastName: last, email: mail, program: cleanText(newProgram), year: newYear }
        : { role, firstName: first, lastName: last, email: mail, department: cleanText(newDepartment) };
      const res = await fetch(`${apiBase}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error ? `${data.error}${data?.reason ? ': ' + data.reason : ''}` : 'Failed to create user';
        await showToast('destructive', 'Create user failed', msg);
        return;
      }
      try { const { toast } = await import('../../components/hooks/use-toast'); toast.success({ title: 'User added', description: (data?.full_name || `${newFirstName} ${newLastName}`).trim() }); } catch {}
      const [sRes, aRes] = await Promise.all([
        fetch(`${apiBase}/api/users?role=student`),
        fetch(`${apiBase}/api/users?role=advisor`),
      ]);
      const sData = await sRes.json();
      const aData = await aRes.json();
      if (Array.isArray(sData)) setStudentsData(sData);
      if (Array.isArray(aData)) setAdvisorData(aData);
      setActiveTab(role === 'student' ? 'students' : 'advisors');
      setAddOpen(false);
      resetAddUserForm();
    } catch (err) {
      await showToast('destructive', 'Create user failed', err?.message || 'Failed to create user');
    }
  };

  // Upload Users (.csv only) — parse and stage rows
  const [uploadFile, setUploadFile] = useState(null);
  const getTemplateHeaders = () => {
    return uploadRole === "students"
      ? ["First Name","Last Name","Email","Year","Program"]
      : ["First Name","Last Name","Email","Department","Bio","Categories","Guidelines","Subjects"];
  };

  const downloadCSVTemplate = () => {
    const headers = getTemplateHeaders();
    const example = uploadRole === "students"
      ? ["Juan","Dela Cruz","juan@example.com","1st Year","BSIT"]
      : ["Jane","Doe","jane@example.com","CIT","Computer Science faculty","Academic Advising;Career Planning","Arrive 10 minutes early;Bring student ID","CS101|Intro to CS;IT201|Networking Basics"];
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
    const expectedAdvisors = ["first name","last name","email","department","bio","categories","guidelines","subjects"];
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
    (async () => {
      try {
        const token = localStorage.getItem('advisys_token');
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const role = uploadRole === 'students' ? 'students' : 'advisors';
        const invalids = new Set(['-','--','---','n/a','na','none','null','undefined']);
        const isValidName = (s) => {
          const t = String(s || '').trim();
          if (!t || invalids.has(t.toLowerCase())) return false;
          if (!/^[A-Za-z\s.'-]+$/.test(t)) return false;
          const letters = (t.match(/[A-Za-z]/g) || []).length;
          return letters >= 2 && t.length <= 100;
        };
        const isValidEmail = (s) => {
          const t = String(s || '').trim().toLowerCase();
          if (!t || invalids.has(t)) return false;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
        };
        const cleanText = (s) => {
          const t = String(s || '').trim();
          return (!t || invalids.has(t.toLowerCase())) ? null : t;
        };
        const rows = uploadRows.map((cols, idx) => {
          if (role === 'students') {
            const [first = '', last = '', email = '', year = '', program = ''] = cols;
            return { __row: idx + 2, firstName: first, lastName: last, email, year, program };
          } else {
            const [first = '', last = '', email = '', department = '', bio = '', categories = '', guidelines = '', subjects = ''] = cols;
            return { __row: idx + 2, firstName: first, lastName: last, email, department, bio, categories, guidelines, subjects };
          }
        });
        // Client-side validation for CSV rows
        const errors = [];
        for (const r of rows) {
          if (!isValidName(r.firstName)) errors.push(`Row ${r.__row}: invalid First Name`);
          if (!isValidName(r.lastName)) errors.push(`Row ${r.__row}: invalid Last Name`);
          if (!isValidEmail(r.email)) errors.push(`Row ${r.__row}: invalid Email`);
        }
        if (errors.length) {
          setUploadError(`Validation failed. Please fix:\n- ${errors.join('\n- ')}`);
          return;
        }
        const prepared = rows.map((r) => {
          if (role === 'students') {
            return { role: 'student', firstName: r.firstName, lastName: r.lastName, email: r.email, year: r.year, program: cleanText(r.program) };
          }
          return {
            role: 'advisor',
            firstName: r.firstName,
            lastName: r.lastName,
            email: r.email,
            department: cleanText(r.department),
            bio: cleanText(r.bio),
            categories: cleanText(r.categories),
            guidelines: cleanText(r.guidelines),
            subjects: r.subjects
          };
        });
        const res = await fetch(`${base}/api/users/bulk-create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ role, rows: prepared }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Upload failed');
        try { const { toast } = await import('../../components/hooks/use-toast'); toast.success({ title: 'Users added', description: `${data.createdCount} created, ${data.failedCount} failed` }); } catch {}
        // Reload lists
        const [sRes, aRes] = await Promise.all([
          fetch(`${base}/api/users?role=student`),
          fetch(`${base}/api/users?role=advisor`),
        ]);
        const sData = await sRes.json();
        const aData = await aRes.json();
        if (Array.isArray(sData)) setStudentsData(sData);
        if (Array.isArray(aData)) setAdvisorData(aData);
        setActiveTab(uploadRole === 'students' ? 'students' : 'advisors');
        setUploadOpen(false);
        setUploadFile(null);
        setUploadRows([]);
        setUploadError(null);
      } catch (err) {
        console.error('Bulk upload failed', err);
        setUploadError(err?.message || 'Bulk upload failed');
      }
    })();
  };

  const handleHistory = (item) => {
    setHistoryUser(item);
    setHistoryOpen(true);
    (async () => {
      try {
        const isStudent = activeTab === "students" || item.role === "student";
        const termsRes = await fetch(`${apiBase}/api/settings/academic/terms`);
        let termsJson = await termsRes.json();
        const terms = Array.isArray(termsJson) ? termsJson : [];
        const sorted = terms.sort((a,b)=>{
          // put current first, then start_date desc
          if (b.is_current - a.is_current !== 0) return b.is_current - a.is_current;
          return String(b.start_date).localeCompare(String(a.start_date));
        });
        // Prepare friendly labels: Previous/Current/Next around the current
        const ci = sorted.findIndex(t=>Number(t.is_current)===1);
        const withFriendly = sorted.map((t, idx)=>{
          let prefix = '';
          if (idx === ci - 1) prefix = 'Previous Semester - ';
          if (idx === ci) prefix = 'Current Semester - ';
          if (idx === ci + 1) prefix = 'Next Semester - ';
          return { ...t, _friendly: `${prefix}${t.semester_label} Semester S.Y. ${t.year_label}` };
        });
        setHistoryTerms(withFriendly);
        const currentId = withFriendly.find(t=>Number(t.is_current)===1)?.id;
        setHistoryTermId(String(currentId || ''));
        const token = localStorage.getItem('advisys_token');
        const u = new URL(isStudent
          ? `${apiBase}/api/consultations/students/${item.id}/consultations`
          : `${apiBase}/api/consultations/advisors/${item.id}/consultations`);
        if (currentId) u.searchParams.set('termId', String(currentId));
        const r = await fetch(u.toString(), {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!r.ok) throw new Error(`Failed to fetch consultations: ${r.status}`);
        const raw = await r.json();
        const toArray = (x) => {
          if (Array.isArray(x)) return x;
          if (!x || typeof x !== 'object') return [];
          const direct = x.consultations || x.items || x.data || x.results || x.rows || x.list;
          if (Array.isArray(direct)) return direct;
          const nestedCandidates = [x.data?.items, x.data?.consultations, x.result?.items, x.result?.data, x.payload?.items, x.payload?.data];
          for (const c of nestedCandidates) { if (Array.isArray(c)) return c; }
          for (const v of Object.values(x)) { if (Array.isArray(v)) return v; }
          return [];
        };
        let data = toArray(raw);
        // Adapt response shapes to HistoryCard expectations (uses consultation.faculty)
        const normalizeDateFields = (c) => {
          const dt = c?.date || c?.scheduled_at || c?.scheduledAt || c?.start_time || c?.startTime || c?.datetime || c?.date_time || c?.starts_at || c?.startsAt || c?.start || c?.timestamp || c?.created_at || c?.createdAt;
          if (dt) {
            const d = new Date(dt);
            if (!isNaN(d)) {
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              const hh = String(d.getHours()).padStart(2, '0');
              const mi = String(d.getMinutes()).padStart(2, '0');
              return { ...c, date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
            }
          }
          return c;
        };
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
            return normalizeDateFields({
              ...c,
              faculty: {
                id: c?.advisor?.id,
                name,
                title: c?.advisor?.title || 'Advisor',
                avatarUrl: c?.advisor?.avatar_url || c?.advisor?.avatar || null,
                avatarText: initials || '👤',
              },
            });
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
            return normalizeDateFields({
              ...c,
              faculty: {
                name,
                title: c?.student?.course || 'Student',
                avatarUrl: c?.student?.avatar_url || c?.student?.avatar || null,
                avatarText: initials || '👤',
              },
            });
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

  const handleHistoryTermChange = async (termId) => {
    setHistoryTermId(termId);
    try {
      if (!historyUser) return;
      const isStudent = activeTab === "students" || historyUser.role === "student";
      const u = new URL(isStudent
        ? `${apiBase}/api/consultations/students/${historyUser.id}/consultations`
        : `${apiBase}/api/consultations/advisors/${historyUser.id}/consultations`);
      if (termId) u.searchParams.set('termId', String(termId));
      const token = localStorage.getItem('advisys_token');
      const res = await fetch(u.toString(), {
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error(`Failed to fetch consultations: ${res.status}`);
      let data = await res.json();
      const toArray = (x) => Array.isArray(x) ? x : (Array.isArray(x?.consultations) ? x.consultations : (Array.isArray(x?.data) ? x.data : (Array.isArray(x?.items) ? x.items : (Array.isArray(x?.results) ? x.results : []))));
      data = toArray(data);
      setHistoryItems(data);
    } catch (e) {
      console.error('Term change fetch error', e);
    }
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
    setDrawerDeactivate({ reason: 'graduated', otherReason: '', termId: 'current' });
    setAdvisorTopicPreset("");
    setAdvisorTopicOther("");
    setAdvisorSubjectPreset("");
    setAdvisorSubjectOtherCode("");
    setAdvisorSubjectOtherName("");
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
    setAdvisorTopicPreset("");
    setAdvisorTopicOther("");
    setAdvisorSubjectPreset("");
    setAdvisorSubjectOtherCode("");
    setAdvisorSubjectOtherName("");
    setViewOpen(false);
  };

  const handleSaveProfile = async () => {
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      await showToast('warning', 'Missing name', 'Please enter first and last name.');
      return;
    }
    if (!editForm.email.trim() || !/\S+@\S+\.\S+/.test(editForm.email)) {
      await showToast('warning', 'Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (editForm.password && editForm.password.trim() && editForm.password.trim().length < 6) {
      await showToast('warning', 'Weak password', 'Password must be at least 6 characters');
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
      const statusChanged = viewUser && typeof viewUser.active === 'boolean' && (editForm.active !== viewUser.active);
      if (statusChanged) {
        if (!editForm.active) {
          let termId = null;
          if (drawerDeactivate.termId === 'current') {
            const current = (terms || []).find(t => Number(t.is_current) === 1);
            termId = current?.id || null;
          } else if (drawerDeactivate.termId) {
            const n = Number(drawerDeactivate.termId); termId = Number.isFinite(n) ? n : null;
          }
          await persistStatus(viewUser.id, false, {
            reason: drawerDeactivate.reason,
            otherReason: drawerDeactivate.reason === 'other' ? (drawerDeactivate.otherReason || '') : undefined,
            termId: termId || undefined,
          });
          try {
            if (termId && drawerDeactivate.reason && (drawerDeactivate.reason === 'graduated' || drawerDeactivate.reason === 'dropped') && activeTab === 'students') {
              setMemberStatusMap(prev => new Map(prev.set(viewUser.id, String(drawerDeactivate.reason))));
            }
          } catch {}
        } else {
          await persistStatus(viewUser.id, true);
        }
      }
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
      await showToast('destructive', 'Save failed', 'Saving failed on the server. The drawer remains open so you can retry.');
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
      await showToast('destructive', 'Delete failed', 'Could not delete consultation. Please try again.');
    }
  };

  const handleDeleteUserPermanent = async () => {
    if (!viewUser) return;
    if (editForm.active) {
      await showToast('warning', 'Cannot delete active user', 'User must be inactive before permanent deletion.');
      return;
    }
    const user = viewUser;
    if (activeTab === 'students') {
      setStudentsData(prev => prev.filter(u => u.id !== user.id));
    } else {
      setAdvisorData(prev => prev.filter(u => u.id !== user.id));
    }
    setViewOpen(false);
    try {
      const res = await fetch(`${apiBase}/api/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data?.error || 'Delete failed');
      setPendingAction(null);
      setUndoTimeout(null);
      try { const { toast } = await import('../../components/hooks/use-toast'); toast.success({ title: 'User deleted' }); } catch {}
      await reloadActiveTab();
      await loadTermMembers();
    } catch (err) {
      if (activeTab === 'students') {
        setStudentsData(prev => [user, ...prev]);
      } else {
        setAdvisorData(prev => [user, ...prev]);
      }
      try { const { toast } = await import('../../components/hooks/use-toast'); toast.destructive({ title: 'Delete failed', description: err?.message || 'Error' }); } catch {}
      setPendingAction(null);
      setUndoTimeout(null);
    }
  };

  // Determine which list to render (respect term member filter)
  const renderedList = React.useMemo(() => {
    const useTermFiltering = !__forceTab;
    if (termFilter === 'all') return filteredList;
    if (!useTermFiltering) return filteredList;
    if (!memberSet || memberSet.size === 0) return [];
    let arr = filteredList.filter(i => memberSet.has(i.id));
    if (termStatusFilter !== 'all') {
      arr = arr.filter(i => (memberStatusMap.get(i.id) || '').toLowerCase() === termStatusFilter);
    }
    // Program/Year snapshot filters (students only) - CSV multi and partial
    const pTokens = String(programFilter || '')
      .split(',')
      .map(s=>s.trim().toLowerCase())
      .filter(Boolean);
    const yTokens = String(yearSnapshotFilter || '')
      .split(',')
      .map(s=>s.trim())
      .filter(Boolean);
    if (pTokens.length || yTokens.length) {
      arr = arr.filter(i => {
        const meta = memberMetaMap.get(i.id) || {};
        const prog = String(meta.program || '').toLowerCase();
        const yr = String(meta.year || '');
        const okProg = pTokens.length ? pTokens.some(tok => prog.includes(tok)) : true;
        const okYear = yTokens.length ? yTokens.includes(yr) : true;
        return okProg && okYear;
      });
    }
    return arr;
  }, [filteredList, termFilter, memberSet, termStatusFilter, memberStatusMap, programFilter, yearSnapshotFilter, memberMetaMap]);

  const programsForAdvance = React.useMemo(() => {
    if (Array.isArray(adminProgramOptions) && adminProgramOptions.length) return adminProgramOptions;
    const names = new Set();
    (memberList || []).forEach(m => { const v = String(m.program_snapshot || m.program || '').trim(); if (v) names.add(v); });
    if (!names.size) {
      (studentsData || []).forEach(s => { const v = String(s.program || '').trim(); if (v) names.add(v); });
    }
    const uniq = Array.from(names);
    return uniq.map((name, idx) => ({ id: idx + 1, name }));
  }, [adminProgramOptions, memberList, studentsData]);

  const yearsForAdvance = React.useMemo(() => {
    if (Array.isArray(adminYearLevelOptions) && adminYearLevelOptions.length) return adminYearLevelOptions;
    return [ { id: 1, name: '1' }, { id: 2, name: '2' }, { id: 3, name: '3' }, { id: 4, name: '4' } ];
  }, [adminYearLevelOptions]);

  const programsForProfile = React.useMemo(() => {
    if (Array.isArray(adminProgramOptions) && adminProgramOptions.length) return adminProgramOptions;
    const names = new Set();
    (studentsData || []).forEach(s => { const v = String(s.program || '').trim(); if (v) names.add(v); });
    return Array.from(names).map((name, idx) => ({ id: idx + 1, name }));
  }, [adminProgramOptions, studentsData]);

  const yearsForProfile = React.useMemo(() => {
    if (Array.isArray(adminYearLevelOptions) && adminYearLevelOptions.length) return adminYearLevelOptions;
    return [ { id: 1, name: '1' }, { id: 2, name: '2' }, { id: 3, name: '3' }, { id: 4, name: '4' } ];
  }, [adminYearLevelOptions]);

  useEffect(() => {
    if (!promoteModal.open) return;
    (async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const [pRes, yRes] = await Promise.all([
          fetch(`${base}/api/programs`),
          fetch(`${base}/api/settings/year-levels`),
        ]);
        const p = await pRes.json();
        const y = await yRes.json();
        if (Array.isArray(p) && p.length) setAdminProgramOptions(p);
        if (Array.isArray(y) && y.length) setAdminYearLevelOptions(y);
      } catch (_) {}
    })();
  }, [promoteModal.open]);

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
            <h1 className="page-title">{__title || "Manage Users"}</h1>
            <p className="page-subtitle">{__subtitle || (activeTab === "students" ? "Manage student accounts and records" : "Manage advisor accounts and records")}</p>
          </div>

          {!__forceTab && (
            <div className="mb-3">
              <AdminManageTabs activeTab={activeTab} onChange={setActiveTab} />
            </div>
          )}

          {/* Filters and actions outside of the table/card */}
          <div className="manage-filters-bar">
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
              onExportMembers={termFilter !== 'all' ? exportMembersCSV : undefined}
              terms={terms}
              termId={termFilter}
              onTermChange={setTermFilter}
              termStatus={termStatusFilter}
              onTermStatusChange={setTermStatusFilter}
              programFilter={programFilter}
              onProgramFilterChange={setProgramFilter}
              yearSnapshotFilter={yearSnapshotFilter}
              onYearSnapshotFilterChange={setYearSnapshotFilter}
              programOptions={programOptions}
              yearOptions={yearOptions}
              showTermSelector={!__forceTab}
            />
            <AnimatePresence>
              {selectedIds.length > 0 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 8 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="bulk-actions-top flex items-center justify-between py-2 px-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <div className="text-sm font-medium text-blue-700">{selectedIds.length} selected</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="bg-white" onClick={openBulkDeactivate}>Bulk Deactivate</Button>
                      {activeTab === 'students' && (
                        <>
                          <Button variant="outline" size="sm" className="bg-white font-semibold text-blue-700 border-blue-200" onClick={() => setPromoteModal({ open: true, toTermId: '' })}>Promote</Button>
                          <Button variant="outline" size="sm" className="bg-white" onClick={addToTerm}>Enroll</Button>
                          <Button variant="outline" size="sm" className="bg-white" onClick={removeFromTerm}>Remove</Button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AdminContentLayout>
            <AdminManageUserList
              items={renderedList}
              isStudent={activeTab === "students"}
              onView={handleView}
              onToggleActive={handleToggleActive}
              onHistory={handleHistory}
              loading={activeTab === "students" ? loadingStudents : loadingAdvisors}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              memberSet={memberSet}
              memberStatusMap={memberStatusMap}
              canEditTermStatus={termFilter !== 'all'}
              onChangeTermStatus={async (item, newStatus) => {
                try {
                  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                  let tId = termFilter;
                  if (tId === 'current' || tId === 'all') {
                    const r = await fetch(`${base}/api/settings/academic/terms`);
                    const d = await r.json();
                    const curr = Array.isArray(d) ? d.find(x=>x.is_current) : null;
                    tId = curr?.id;
                  }
                  if (!tId) {
                    await showToast('warning', 'Select a term', 'Select a specific term to edit status');
                    return;
                  }
                  const res = await fetch(`${base}/api/settings/academic/terms/${tId}/members/status`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: item.id, status_in_term: newStatus }) });
                  if (!res.ok) throw new Error('Failed to update');
                  setMemberStatusMap(prev => new Map(prev.set(item.id, newStatus)));
                } catch (err) {
                  console.error('Failed to update term status', err);
                  await showToast('destructive', 'Update failed', 'Failed to update term status');
                }
              }}
              showTermStatus={activeTab === 'students' && termFilter !== 'all'}
            />

            <AdminUserHistoryDrawer
              open={historyOpen}
              user={historyUser}
              consultations={historyItems}
              onClose={() => setHistoryOpen(false)}
              terms={historyTerms}
              selectedTermId={historyTermId}
              onTermChange={handleHistoryTermChange}
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
            <div className="admin-modal-body space-y-3">
              <div>
                Are you sure you want to {confirmDeactivate.active ? 'deactivate' : 'activate'} {confirmDeactivate.name}?
              </div>
              {confirmDeactivate.active && activeTab === 'students' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Reason</label>
                    <select
                      className="w-full border rounded px-2 py-2"
                      value={singleDeactivate.reason}
                      onChange={(e)=> setSingleDeactivate(prev => ({ ...prev, reason: e.target.value }))}
                    >
                      <option value="graduated">Graduated</option>
                      <option value="dropped">Dropped</option>
                      <option value="other">Other (specify)</option>
                    </select>
                  </div>
                  {singleDeactivate.reason === 'other' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Other Reason</label>
                      <input
                        type="text"
                        className="w-full border rounded px-2 py-2"
                        value={singleDeactivate.otherReason}
                        onChange={(e)=> setSingleDeactivate(prev => ({ ...prev, otherReason: e.target.value }))}
                      />
                    </div>
                  )}
                </>
              )}
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

      {bulkModal.open && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" role="dialog" aria-modal="true">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Bulk Deactivate Users</h3>
              <button className="admin-modal-close" onClick={()=>setBulkModal(m=>({ ...m, open: false }))}>×</button>
            </div>
            <div className="admin-modal-body space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <select className="w-full border rounded px-2 py-2" value={bulkModal.reason} onChange={(e)=>setBulkModal(m=>({ ...m, reason: e.target.value }))}>
                  <option value="graduated">Graduated</option>
                  <option value="dropped">Dropped</option>
                  <option value="other">Other (specify)</option>
                </select>
              </div>
              {bulkModal.reason === 'other' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Other Reason</label>
                  <input type="text" className="w-full border rounded px-2 py-2" value={bulkModal.otherReason} onChange={(e)=>setBulkModal(m=>({ ...m, otherReason: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Apply to Term</label>
                <select className="w-full border rounded px-2 py-2" value={bulkModal.termId} onChange={(e)=>setBulkModal(m=>({ ...m, termId: e.target.value }))}>
                  <option value="current">Current Term</option>
                  {terms.map(t => (
                    <option key={t.id} value={String(t.id)}>{t.year_label} • {t.semester_label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={bulkModal.archiveOpen} onChange={(e)=>setBulkModal(m=>({ ...m, archiveOpen: e.target.checked }))} /> Archive open consultations in term</label>
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={bulkModal.cancelSlots} onChange={(e)=>setBulkModal(m=>({ ...m, cancelSlots: e.target.checked }))} /> Cancel advisors' future slots in term</label>
              </div>
            </div>
            <div className="p-3 flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setBulkModal(m=>({ ...m, open: false }))}>Cancel</Button>
              <Button variant="destructive" onClick={submitBulkDeactivate} disabled={selectedIds.length===0}>Deactivate</Button>
            </div>
          </div>
        </div>
      )}

      {promoteModal.open && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" role="dialog" aria-modal="true">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Promote Students</h3>
              <button className="admin-modal-close" onClick={()=>setPromoteModal({ open: false, toTermId: '' })}>×</button>
            </div>
            <div className="admin-modal-body space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">To Term</label>
                <Select value={promoteModal.toTermId} onValueChange={(v)=>setPromoteModal(m=>({ ...m, toTermId: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 4000 }}>
                    {terms.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.year_label} • {t.semester_label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Filter Program (optional)</label>
                  <Select value={promoteModal.program || ''} onValueChange={(v)=>setPromoteModal(m=>({ ...m, program: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="All programs" /></SelectTrigger>
                    <SelectContent style={{ zIndex: 4000 }}>
                      <div className="px-2 py-1"><input
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="Search..."
                        value={promoteSearch.program}
                        onChange={(e)=>setPromoteSearch(s=>({ ...s, program: e.target.value }))}
                        onClick={(e)=>e.stopPropagation()}
                      /></div>
                      <SelectItem value="">All programs</SelectItem>
                      {(programsForAdvance || [])
                        .filter(p => !promoteSearch.program || String(p.name).toLowerCase().includes(promoteSearch.program.toLowerCase()))
                        .map(p => (
                         <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                       ))}
                      {(!programsForAdvance || programsForAdvance.length === 0) && (
                        <div className="px-2 py-1 text-xs text-gray-500">No programs found</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Filter Year (optional)</label>
                  <Select value={promoteModal.year || ''} onValueChange={(v)=>setPromoteModal(m=>({ ...m, year: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="All years" /></SelectTrigger>
                    <SelectContent style={{ zIndex: 4000 }}>
                      <div className="px-2 py-1"><input
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="Search..."
                        value={promoteSearch.year}
                        onChange={(e)=>setPromoteSearch(s=>({ ...s, year: e.target.value }))}
                        onClick={(e)=>e.stopPropagation()}
                      /></div>
                      <SelectItem value="">All years</SelectItem>
                      {(yearsForAdvance || [])
                        .filter(y => {
                          if (!promoteSearch.year) return true;
                          const label = `${y.name}${y.name==='1'?'st':y.name==='2'?'nd':y.name==='3'?'rd':'th'} Year`;
                          return label.toLowerCase().includes(promoteSearch.year.toLowerCase());
                        })
                        .map(y => (
                          <SelectItem key={y.id} value={String(y.name)}>
                            {`${y.name}${y.name==='1'?'st':y.name==='2'?'nd':y.name==='3'?'rd':'th'} Year`}
                          </SelectItem>
                        ))}
                      {(!yearsForAdvance || yearsForAdvance.length === 0) && (
                        <div className="px-2 py-1 text-xs text-gray-500">No years available</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!promoteModal.onlySelected} onChange={(e)=>setPromoteModal(m=>({ ...m, onlySelected: e.target.checked }))} /> Advance only selected rows</label>
              <div className="text-sm text-gray-600">
                {(() => {
                  let fromMembers = memberList.filter(m => String(m.status_in_term).toLowerCase() === 'enrolled');
                  if (promoteModal.onlySelected) {
                    const set = new Set(selectedIds || []);
                    fromMembers = fromMembers.filter(m => set.has(m.id));
                  }
                  const program = (promoteModal.program || '').trim();
                  const year = (promoteModal.year || '').trim();
                  const filtered = fromMembers.filter(m => (
                    (!program || String(m.program_snapshot || m.program || '').toLowerCase() === program.toLowerCase()) &&
                    (!year || String(m.year_level_snapshot || m.year_level || '') === year)
                  ));
                  const n = filtered.length;
                  return n > 0 ? `${n} students will be advanced` : `0 students match the current term and filters`;
                })()}
              </div>
            </div>
            <div className="p-3 flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setPromoteModal({ open: false, toTermId: '' })}>Cancel</Button>
              <Button onClick={async()=>{
                try{
                  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                  let fromTerm = termFilter;
                  if (fromTerm === 'current' || fromTerm === 'all') {
                    const res = await fetch(`${base}/api/settings/academic/terms`);
                    const data = await res.json();
                    const current = Array.isArray(data) ? data.find(t=>t.is_current) : null;
                    fromTerm = current?.id;
                  }
                  if (!fromTerm || !promoteModal.toTermId) {
                    await showToast('warning', 'Select terms', 'Select specific from/to terms');
                    return;
                  }
                  const body = promoteModal.onlySelected ? { toTermId: Number(promoteModal.toTermId), userIds: selectedIds } : { toTermId: Number(promoteModal.toTermId), program: promoteModal.program || undefined, year: promoteModal.year || undefined };
                  await fetch(`${base}/api/settings/academic/terms/${fromTerm}/promote`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
                  setPromoteModal({ open:false, toTermId:'' });
                }catch(e){
                  console.error('Failed to advance students', e);
                  await showToast('destructive', 'Advance failed', 'Failed to advance students');
                }
              }}>Advance</Button>
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
            {/* Role is implied by the current tab */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Type
              </label>
              <div className="w-full rounded-md border px-3 py-2 text-sm border-gray-300 bg-gray-50">
                {activeTab === 'students' ? 'Student' : 'Advisor'}
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
            { (activeTab === 'students') && (
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
            {(activeTab === 'advisors') && (
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
                <strong>Note:</strong> A password will be generated and sent to the user's email address. They will be asked to change it after signing in.
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

      {/* Bulk Upload Users Drawer */}
      <Drawer open={uploadOpen} onOpenChange={setUploadOpen}>
        <DrawerContent className="max-w-xl p-0">
          <DrawerHeader>
            <DrawerTitle>Bulk Upload Users</DrawerTitle>
            <DrawerDescription>
              Required file extension: <strong>.csv</strong>
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            {/* Import target role is implied by the active tab */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Import for</label>
              <div className="w-full rounded-md border px-3 py-2 text-sm border-gray-300 bg-gray-50">
                {activeTab === 'students' ? 'Students' : 'Advisors'}
              </div>
            </div>
            <div>
              <a href="#" className="text-sm text-[#3360c2]" onClick={(e) => { e.preventDefault(); downloadCSVTemplate(); }}>
                Download CSV template
              </a>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700">
              <p className="mb-1"><strong>Expected columns</strong> ({uploadRole === "students" ? "Students" : "Advisors"}):</p>
              {uploadRole === "students" ? (
                <p>First Name, Last Name, Email, Year, Program</p>
              ) : (
                <p>
                  First Name, Last Name, Email, Department,
                  Bio (optional), Categories (optional),
                  Guidelines (optional), Subjects (optional)
                </p>
              )}
              {uploadRole !== "students" && (
                <div className="mt-2 space-y-1">
                  <p>For multiple values use a semicolon (;) between items:</p>
                  <p>Categories: Academic Advising;Career Planning</p>
                  <p>Guidelines: Arrive 10 minutes early;Bring student ID</p>
                  <p>Subjects: CS101|Intro to CS;IT201|Networking Basics</p>
                </div>
              )}
            </div>
            <div>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleUploadFileChange(e.target.files?.[0] || null)}
              />
            </div>
            {uploadRows.length > 0 && (
              <p className="text-sm text-gray-600">
                {uploadRows.length} data row{uploadRows.length === 1 ? "" : "s"} detected (header and blank rows ignored).
              </p>
            )}
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
              <div className="password-field-wrapper">
                <div className="password-input-container">
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
                    className="password-toggle-btn"
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
                  className="generate-password-btn"
                >
                  Generate
                </Button>
              </div>
              
            </div>

            {/* Student-Specific Fields */}
            {activeTab === "students" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year Level
                    </label>
                    <Select value={editForm.year} onValueChange={(v) => setEditForm({ ...editForm, year: v })}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(yearsForProfile || []).map(y => (
                          <SelectItem key={y.id} value={`${y.name}${y.name==='1'?'st':y.name==='2'?'nd':y.name==='3'?'rd':'th'} Year`}>
                            {`${y.name}${y.name==='1'?'st':y.name==='2'?'nd':y.name==='3'?'rd':'th'} Year`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Program
                    </label>
                    <Select value={editForm.program} onValueChange={(v) => setEditForm({ ...editForm, program: v })}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(programsForProfile || []).map(p => (
                          <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                        ))}
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
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(editForm.consultTopics || []).map((topic, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-300"
                      >
                        <span>{topic}</span>
                        <button
                          type="button"
                          className="text-blue-700 hover:text-red-600"
                          onClick={() => {
                            const next = (editForm.consultTopics || []).filter((_, i) => i !== idx);
                            setEditForm({ ...editForm, consultTopics: next });
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-col md:flex-row gap-2">
                    <Select
                      value={advisorTopicPreset}
                      onValueChange={(v) => {
                        setAdvisorTopicPreset(v);
                        if (v !== "other") setAdvisorTopicOther("");
                      }}
                    >
                      <SelectTrigger className="w-full md:w-64">
                        <SelectValue placeholder="Select topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {consultationTopicOptions
                          .filter((opt) => !hasTopicValue(editForm.consultTopics, opt?.name || ""))
                          .map((opt) => (
                          <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                        ))}
                        <SelectItem value="other">Other, specify</SelectItem>
                      </SelectContent>
                    </Select>
                    {advisorTopicPreset === "other" && (
                      <Input
                        className="flex-1"
                        placeholder="Specify other topic"
                        value={advisorTopicOther}
                        onChange={(e)=>setAdvisorTopicOther(e.target.value)}
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const picked = advisorTopicPreset === "other"
                          ? normalizeCatalogText(advisorTopicOther)
                          : normalizeCatalogText(advisorTopicPreset);
                        if (!picked) return;
                        const existing = editForm.consultTopics || [];
                        if (hasTopicValue(existing, picked)) return;
                        setEditForm({ ...editForm, consultTopics: [...existing, picked] });
                        setAdvisorTopicPreset("");
                        setAdvisorTopicOther("");
                      }}
                    >
                      Add
                    </Button>
                  </div>
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
                    <div className="flex flex-col md:flex-row gap-2">
                      <Select
                        value={advisorSubjectPreset}
                        onValueChange={(v) => {
                          setAdvisorSubjectPreset(v);
                          if (v !== "other") {
                            setAdvisorSubjectOtherCode("");
                            setAdvisorSubjectOtherName("");
                          }
                        }}
                      >
                      <SelectTrigger className="w-full md:w-64">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                          {consultationSubjectOptions
                            .filter((opt) => !hasSubjectCodeValue(editForm.consultSubjects, opt?.subject_code || ""))
                            .map((opt) => (
                              <SelectItem key={opt.id} value={String(opt.id)}>
                                {buildSubjectLabel(opt)}
                              </SelectItem>
                            ))}
                          <SelectItem value="other">Other, specify</SelectItem>
                      </SelectContent>
                    </Select>
                      {advisorSubjectPreset === "other" && (
                        <>
                          <Input
                            className="w-full md:w-40"
                            placeholder="Code (e.g., CS101)"
                            value={advisorSubjectOtherCode}
                            onChange={(e)=>setAdvisorSubjectOtherCode(e.target.value)}
                          />
                          <Input
                            className="flex-1"
                            placeholder="Name (e.g., Intro to CS)"
                            value={advisorSubjectOtherName}
                            onChange={(e)=>setAdvisorSubjectOtherName(e.target.value)}
                          />
                        </>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          const existing = editForm.consultSubjects || [];
                          if (!advisorSubjectPreset) return;

                          if (advisorSubjectPreset === "other") {
                            const code = normalizeSubjectCode(advisorSubjectOtherCode);
                            const name = normalizeSubjectName(advisorSubjectOtherName);
                            if (!code || !name) {
                              await showToast('warning', 'Required', 'Please enter both subject code and name.');
                              return;
                            }
                            const exists = hasSubjectCodeValue(existing, code);
                            if (exists) return;
                            setEditForm({
                              ...editForm,
                              consultSubjects: [...existing, { code, name }],
                            });
                            setAdvisorSubjectPreset("");
                            setAdvisorSubjectOtherCode("");
                            setAdvisorSubjectOtherName("");
                            return;
                          }

                          const opt = consultationSubjectOptions.find(o => String(o.id) === String(advisorSubjectPreset));
                          if (!opt) return;
                          const exists = hasSubjectCodeValue(existing, opt.subject_code);
                          if (exists) return;
                          setEditForm({
                            ...editForm,
                            consultSubjects: [...existing, { code: opt.subject_code, name: opt.subject_name }],
                          });
                          setAdvisorSubjectPreset("");
                        }}
                      >
                        Add Subject
                      </Button>
                    </div>
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
              {!editForm.active && activeTab === 'students' && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Reason</label>
                    <select className="w-full border rounded px-2 py-2" value={drawerDeactivate.reason} onChange={(e)=>setDrawerDeactivate(d=>({ ...d, reason: e.target.value }))}>
                      <option value="graduated">Graduated</option>
                      <option value="dropped">Dropped</option>
                      <option value="other">Other (specify)</option>
                    </select>
                  </div>
                  {drawerDeactivate.reason === 'other' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Other Reason</label>
                      <input className="w-full border rounded px-2 py-2" value={drawerDeactivate.otherReason} onChange={(e)=>setDrawerDeactivate(d=>({ ...d, otherReason: e.target.value }))} />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">Apply to Term</label>
                    <select className="w-full border rounded px-2 py-2" value={drawerDeactivate.termId} onChange={(e)=>setDrawerDeactivate(d=>({ ...d, termId: e.target.value }))}>
                      <option value="current">Current Term</option>
                      {terms.map(t => (
                        <option key={t.id} value={String(t.id)}>{t.year_label} • {t.semester_label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
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
        <span className="undo-message">{pendingAction.actionType === 'deleted' ? `User "${pendingAction.user.name}" deleted` : `User "${pendingAction.user.name}" ${pendingAction.actionType}`}</span>
        <button className="undo-btn" onClick={async()=>{
          if (pendingAction.actionType === 'deleted') {
            if (undoTimeout) { clearTimeout(undoTimeout); setUndoTimeout(null); }
            const user = pendingAction.user;
            if (pendingAction.tab === 'students') setStudentsData(prev => [user, ...prev]); else setAdvisorData(prev => [user, ...prev]);
            setPendingAction(null);
          } else {
            await handleUndoAction();
          }
        }}>Undo</button>
      </div>
      <div className="undo-timer">
        <div className="undo-timer-bar"></div>
      </div>
    </div>
  )}
    </div>
  );
}
