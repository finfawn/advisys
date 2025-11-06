import React from "react";

export default function AdminContentLayout({ title, subtitle, tabs, filters, children }) {
  return (
    <div className="admin-content">
      <div className="content-card">
        <div className="content-header">
          <div className="content-left">
            <div>
              {title && <h2 className="content-title">{title}</h2>}
              {subtitle && <p className="content-subtitle">{subtitle}</p>}
            </div>
            {tabs && <div className="content-tabs">{tabs}</div>}
          </div>
          <div className="content-right">
            {filters}
          </div>
        </div>
        <div className="content-body">
          {children}
        </div>
      </div>
    </div>
  );
}