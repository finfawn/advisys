import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../lightswind/dialog';
import { Button } from '../lightswind/button';
import { Label } from '../lightswind/label';
import { Input } from '../lightswind/input';

// Simple, system-style modal for approving/declining summary edits
// Props:
// - isOpen: boolean
// - mode: 'approve' | 'decline'
// - initialConsultationId: number | null
// - onClose: () => void
// - onConfirm: (consultationId: number, payload: { note?: string, reason?: string }) => Promise<void> | void
export default function SummaryEditActionModal({ isOpen, mode = 'approve', initialConsultationId, onClose, onConfirm }) {
  const [consultationId, setConsultationId] = useState(initialConsultationId || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setConsultationId(initialConsultationId || '');
    setError('');
    setSubmitting(false);
  }, [isOpen, initialConsultationId, mode]);

  const title = mode === 'approve' ? 'Approve Summary Edit' : 'Decline Summary Edit';
  const primaryText = mode === 'approve' ? 'Approve' : 'Decline';

  const requiresId = !initialConsultationId;

  const handleConfirm = async () => {
    setError('');
    const cidNum = Number(consultationId);
    if (!cidNum || !Number.isFinite(cidNum)) {
      setError('Please enter a valid consultation ID.');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(cidNum);
      onClose();
    } catch (e) {
      setError(e?.message || 'Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open)=>{ if(!open) onClose(); }}>
      <DialogContent className="slot-modal-content">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="slot-modal-body grid gap-3">
          {requiresId && (
            <div className="grid gap-1">
              <Label htmlFor="summary-edit-consultation-id" className="text-sm text-gray-600">Consultation ID</Label>
              <Input
                id="summary-edit-consultation-id"
                type="number"
                value={consultationId}
                onChange={(e)=>setConsultationId(e.target.value)}
                placeholder="Enter consultation ID"
              />
            </div>
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={submitting}>{primaryText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}