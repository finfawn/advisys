import React from "react";
import { Card, CardHeader, CardContent, CardFooter } from "../../../lightswind/card";
import { Button } from "../../../lightswind/button";
import { Badge } from "../../../lightswind/badge";
import "../../../components/student/AdvisorCard.css";

export default function StudentCard({
  name = "",
  program = "",
  year = "",
  avatar = null,
  onViewThread,
  onAssign,
}) {
  const toAcronym = (text) => {
    const raw = String(text || '').trim();
    if (!raw) return '';

    const leadingCode = raw.match(/^([A-Za-z]{2,10})\s*[-–—:]/);
    if (leadingCode) return leadingCode[1].toUpperCase();

    if (/^[A-Za-z]{2,10}$/.test(raw) && raw.length <= 6) {
      return raw.toUpperCase();
    }

    const stop = new Set(['OF', 'IN', 'AND', 'THE', 'ON', 'AT', 'FOR', 'WITH']);
    const words = raw
      .replace(/[-/]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return '';
    const letters = words
      .map(w => w.toUpperCase())
      .filter(w => !stop.has(w))
      .map(w => w[0] || '')
      .join('');
    return letters;
  };
  
  const programAcr = toAcronym(program);
  
  const initials = React.useMemo(() => {
    const t = String(name || "").trim();
    if (!t) return "ST";
    const parts = t.split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() || "").join("") || "ST";
  }, [name]);

  return (
    <Card className="advisor-card-new" style={{ padding: 0, overflow: 'hidden', minHeight: 10 }}>
      <CardHeader spacing="compact" className="advisor-card-header" style={{ padding: '1rem 1rem 0.25rem 1rem', alignItems: 'flex-start', marginBottom: '-20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-start' }}>
          <div
            className="advisor-card-avatar"
            style={{
              width: 48,
              height: 48,
              minWidth: 48,
              fontSize: 20,
              background: '#e5e7eb',
              color: '#1f2937',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            {avatar ? (
              <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div 
              className="advisor-card-name" 
              style={{ 
                fontSize: '1.2rem', 
                fontWeight: 600, 
                color: '#111827',
                marginBottom: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {name || "Student"}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent padding="sm" removeTopPadding={true} className="pt-0">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '60px' }}>
          {programAcr ? (
            <Badge 
              variant="outline" 
              size="sm" 
              className="advisor-course-tag"
              style={{
                backgroundColor: '#f3f4f6',
                color: '#4b5563',
                borderColor: '#e5e7eb',
                fontSize: '0.75rem',
                padding: '2px 8px'
              }}
            >
              {programAcr}
            </Badge>
          ) : null}
          
          {year ? (
            <Badge 
              variant="outline" 
              size="sm" 
              className="advisor-card-mode-badge"
              style={{
                backgroundColor: '#f9fafb',
                color: '#6b7280',
                borderColor: '#e5e7eb',
                fontSize: '0.75rem',
                padding: '2px 8px'
              }}
            >
              {year}
            </Badge>
          ) : null}
        </div>
      </CardContent>
      
      <CardFooter 
        className="advisor-card-actions" 
        style={{ 
          padding: '0.75rem 1rem 0.75rem',
          display: 'flex',
          gap: '8px',
          borderTop: '1px solid #f3f4f6',
          marginTop: 0
        }}
      >
        <Button 
          size="sm" 
          variant="outline" 
          className="advisor-card-button secondary"
          onClick={onViewThread}
          style={{ 
            flex: 1,
            backgroundColor: 'white',
            borderColor: '#e5e7eb',
            color: '#374151'
          }}
        >
          View Thread
        </Button>
        <Button 
          size="sm" 
          className="advisor-card-button primary"
          onClick={onAssign}
          style={{ 
            flex: 1,
            backgroundColor: '#3360c2',
            color: 'white',
            border: 'none'
          }}
        >
          Assign
        </Button>
      </CardFooter>
    </Card>
  );
}
