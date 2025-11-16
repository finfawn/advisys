import React from "react";
import { Input } from "../../../lightswind/input";
import { Button } from "../../../lightswind/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../lightswind/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../../../lightswind/dropdown-menu";
import { BsPlus, BsThreeDotsVertical } from "react-icons/bs";

export default function AdminManageFilters({ 
  search,
  onSearchChange,
  isStudent,
  yearFilter,
  onYearChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  onAddUserOpen,
  onUploadUsersOpen,
  onExport,
  onExportMembers,
  terms,
  termId,
  onTermChange,
  termStatus,
  onTermStatusChange,
  programFilter,
  onProgramFilterChange,
  yearSnapshotFilter,
  onYearSnapshotFilterChange,
  programOptions = [],
  yearOptions = [],
  showTermSelector = true,
}) {
  return (
    <form className="manage-filters w-full" autoComplete="off" onSubmit={(e)=>e.preventDefault()}>
      {/* Hidden decoy inputs to satisfy browser autofill heuristics */}
      <input type="text" name="username" autoComplete="username" style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} tabIndex={-1} aria-hidden="true" />
      <input type="password" name="password" autoComplete="new-password" style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} tabIndex={-1} aria-hidden="true" />
      <div className="flex w-full items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-2">
          {showTermSelector && Array.isArray(terms) && terms.length > 0 && (
            <Select value={termId || 'current'} onValueChange={onTermChange}>
              <SelectTrigger className="select-trigger w-[180px] h-7 px-2 py-1 text-[11px] md:h-8 md:text-xs">
                <SelectValue placeholder="Show data for" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="current">Current Term</SelectItem>
                <SelectItem value="all">All Terms</SelectItem>
                {terms.map(t => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.year_label} • {t.semester_label} Semester
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative min-w-[200px] max-w-[440px]">
            <Input
              placeholder="Search users"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-7 px-2 py-1 text-[11px] md:h-8 md:text-xs"
              type="search"
              name="q"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
              onFocus={(e)=>{ e.currentTarget.setAttribute('autocomplete','off'); }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="icon" aria-label="Add user" className="h-7 w-7 md:h-8 md:w-8" onClick={onAddUserOpen}>
            <BsPlus className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions" className="h-7 w-7 md:h-8 md:w-8">
                <BsThreeDotsVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onUploadUsersOpen}>Upload Users</DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>Download CSV</DropdownMenuItem>
              {onExportMembers && termId !== 'all' && (
                <DropdownMenuItem onClick={onExportMembers}>Export Term Members</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mt-1.5 flex w-full items-center gap-1.5 flex-wrap rounded-md border border-gray-200 bg-white p-1.5">
        {isStudent && (
          <Select value={yearFilter} onValueChange={onYearChange}>
            <SelectTrigger className="select-trigger w-[130px] h-7 px-2 py-1 text-[11px] md:h-8 md:text-xs"><SelectValue placeholder="Year Level" /></SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="1st Year">1st Year</SelectItem>
              <SelectItem value="2nd Year">2nd Year</SelectItem>
              <SelectItem value="3rd Year">3rd Year</SelectItem>
              <SelectItem value="4th Year">4th Year</SelectItem>
            </SelectContent>
          </Select>
        )}
        {showTermSelector && termId !== 'all' && (
          <Select value={termStatus} onValueChange={onTermStatusChange}>
            <SelectTrigger className="select-trigger w-[150px] h-7 px-2 py-1 text-[11px] md:h-8 md:text-xs"><SelectValue placeholder="Term Status" /></SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All Term Status</SelectItem>
              <SelectItem value="enrolled">Enrolled</SelectItem>
              <SelectItem value="dropped">Dropped</SelectItem>
              <SelectItem value="graduated">Graduated</SelectItem>
            </SelectContent>
          </Select>
        )}
        {showTermSelector && isStudent && termId !== 'all' && (
          <>
            <Select value={programFilter} onValueChange={(v)=>onProgramFilterChange && onProgramFilterChange(v)}>
              <SelectTrigger className="select-trigger w-[190px] h-7 px-2 py-1 text-[11px] md:h-8 md:text-xs"><SelectValue placeholder="Program (term)" /></SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="">All Programs</SelectItem>
                {programOptions.map((p) => (
                  <SelectItem key={p.id || p.name} value={p.name || ''}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearSnapshotFilter} onValueChange={(v)=>onYearSnapshotFilterChange && onYearSnapshotFilterChange(v)}>
              <SelectTrigger className="select-trigger w-[130px] h-7 px-2 py-1 text-[11px] md:h-8 md:text-xs"><SelectValue placeholder="Year (term)" /></SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="">All Years</SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem key={y.id || y.name} value={y.name || ''}>{y.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="select-trigger w-[130px] h-7 px-2 py-1 text-[11px] md:h-8 md:text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="select-trigger w-[150px] h-7 px-2 py-1 text-[11px] md:h-8 md:text-xs"><SelectValue placeholder="Sort By" /></SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="name-asc">Name A-Z</SelectItem>
            <SelectItem value="name-desc">Name Z-A</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] md:h-8 md:text-xs" onClick={()=>{
          onYearChange && onYearChange('all');
          onTermStatusChange && onTermStatusChange('all');
          onProgramFilterChange && onProgramFilterChange('');
          onYearSnapshotFilterChange && onYearSnapshotFilterChange('');
          onStatusChange && onStatusChange('all');
        }}>Clear Filters</Button>
      </div>
    </form>
  );
}
