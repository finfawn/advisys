export function normalizeCatalogText(value) {
  return String(value || "").trim();
}

export function normalizeSubjectCode(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

export function normalizeSubjectName(value) {
  return String(value || "").trim();
}

export function hasTopicValue(list, value) {
  const normalized = normalizeCatalogText(value).toLowerCase();
  return (list || []).some((item) => normalizeCatalogText(item).toLowerCase() === normalized);
}

export function hasSubjectCodeValue(list, code) {
  const normalized = normalizeSubjectCode(code);
  return (list || []).some((item) => {
    const existing = normalizeSubjectCode(item?.code || item?.subject_code || item?.course_code || "");
    return existing === normalized;
  });
}

export function buildSubjectLabel(subject) {
  const code = normalizeSubjectCode(subject?.subject_code || subject?.code || subject?.course_code || "");
  const name = normalizeSubjectName(subject?.subject_name || subject?.name || subject?.course_name || "");
  if (code && name) return `${name} (${code})`;
  return name || code;
}

export function sanitizeTextList(list) {
  return (list || []).map((value) => normalizeCatalogText(value)).filter(Boolean);
}

export function sanitizeConsultationCourses(list) {
  return (list || [])
    .map((course) => {
      const code = normalizeSubjectCode(course?.code || course?.subject_code || "");
      const name = normalizeSubjectName(course?.name || course?.subject_name || course?.course_name || "");
      if (!code || !name) return null;
      return {
        code: code.slice(0, 50),
        name: name.slice(0, 255),
        subject_code: code.slice(0, 50),
        subject_name: name.slice(0, 255),
        course_name: name.slice(0, 255),
      };
    })
    .filter(Boolean);
}
