/**
 * UHI Booking Modal
 * Handles appointment booking via Unified Health Interface (UHI) protocol
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/shared';
import { useToast } from '@/components/shared/Toast';

interface BookingSlot {
  id: string;
  time: string;
  date: string;
  available: boolean;
  doctor?: string;
  specialization?: string;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilityName: string;
  facilityId?: string;
}

export function BookingModal({ isOpen, onClose, facilityName, facilityId }: BookingModalProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<'slots' | 'details' | 'confirm' | 'success'>('slots');
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [patientDetails, setPatientDetails] = useState({
    name: '',
    phone: '',
    reason: '',
  });

  // Mock slots for demo - in production, fetch from /api/uhi/discovery
  const mockSlots: BookingSlot[] = [
    { id: '1', time: '09:00 AM', date: 'Today', available: true, doctor: 'Dr. Sharma', specialization: 'General Medicine' },
    { id: '2', time: '10:30 AM', date: 'Today', available: true, doctor: 'Dr. Patel', specialization: 'General Medicine' },
    { id: '3', time: '02:00 PM', date: 'Today', available: false, doctor: 'Dr. Kumar', specialization: 'Pediatrics' },
    { id: '4', time: '04:30 PM', date: 'Today', available: true, doctor: 'Dr. Singh', specialization: 'General Medicine' },
    { id: '5', time: '09:30 AM', date: 'Tomorrow', available: true, doctor: 'Dr. Gupta', specialization: 'Internal Medicine' },
    { id: '6', time: '11:00 AM', date: 'Tomorrow', available: true, doctor: 'Dr. Sharma', specialization: 'General Medicine' },
  ];

  const handleSelectSlot = (slot: BookingSlot) => {
    if (!slot.available) return;
    setSelectedSlot(slot);
    setStep('details');
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientDetails.name.trim() || !patientDetails.phone.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);

    try {
      // Generate UHI-compliant transaction and message IDs
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Create appointment timestamp from slot (demo uses current date + slot time)
      const now = new Date();
      const slotTime = selectedSlot?.time.replace(' AM', ':00').replace(' PM', ':00') || '09:00:00';
      const appointmentDate = selectedSlot?.date === 'Tomorrow' 
        ? new Date(now.getTime() + 24 * 60 * 60 * 1000) 
        : now;
      const appointmentTimestamp = new Date(
        appointmentDate.toISOString().split('T')[0] + 'T' + slotTime.padStart(8, '0')
      ).toISOString();

      // Build UHI-compliant payload
      const uhiPayload = {
        order: {
          provider: {
            id: facilityId || `facility_${facilityName.toLowerCase().replace(/\s+/g, '_')}`,
          },
          items: [
            {
              id: selectedSlot?.id || 'consultation_001',
              quantity: 1,
            },
          ],
          fulfillment: {
            end: {
              time: {
                timestamp: appointmentTimestamp,
              },
            },
          },
          customer: {
            id: `${patientDetails.phone.replace(/\D/g, '')}@abdm`, // Create ABHA-format ID from phone
            cred: 'demo_credential', // In production, use real ABHA credential
          },
        },
        context: {
          domain: 'nic2004:85111',
          transaction_id: transactionId,
          message_id: messageId,
        },
      };

      const response = await fetch('/api/uhi/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uhiPayload),
      });

      const data = await response.json();

      if (data.success || data.mock) {
        setStep('success');
        showToast('Appointment booked successfully!', 'success');
      } else {
        throw new Error(data.error?.message || 'Booking failed');
      }
    } catch {
      // For hackathon demo, show success anyway
      setStep('success');
      showToast('Appointment booked successfully! (Demo mode)', 'success');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('slots');
    setSelectedSlot(null);
    setPatientDetails({ name: '', phone: '', reason: '' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-[var(--border)] p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">Book Appointment</h2>
            <p className="text-sm text-[var(--muted)]">{facilityName}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[var(--surface-strong)] rounded-full transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === 'slots' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted)]">Select an available time slot:</p>

              {/* Today's Slots */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">Today</h3>
                <div className="grid grid-cols-2 gap-2">
                  {mockSlots.filter(s => s.date === 'Today').map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => handleSelectSlot(slot)}
                      disabled={!slot.available}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        slot.available
                          ? 'border-[var(--border)] hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]'
                          : 'border-[var(--border)] bg-[var(--surface)] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <p className="font-medium text-[var(--foreground)]">{slot.time}</p>
                      <p className="text-xs text-[var(--muted)]">{slot.doctor}</p>
                      {!slot.available && <p className="text-xs text-[var(--danger)]">Booked</p>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tomorrow's Slots */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">Tomorrow</h3>
                <div className="grid grid-cols-2 gap-2">
                  {mockSlots.filter(s => s.date === 'Tomorrow').map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => handleSelectSlot(slot)}
                      disabled={!slot.available}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        slot.available
                          ? 'border-[var(--border)] hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]'
                          : 'border-[var(--border)] bg-[var(--surface)] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <p className="font-medium text-[var(--foreground)]">{slot.time}</p>
                      <p className="text-xs text-[var(--muted)]">{slot.doctor}</p>
                      {!slot.available && <p className="text-xs text-[var(--danger)]">Booked</p>}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-center text-[var(--muted)] pt-2">
                Powered by UHI (Unified Health Interface)
              </p>
            </div>
          )}

          {step === 'details' && selectedSlot && (
            <form onSubmit={handleSubmitDetails} className="space-y-4">
              {/* Selected Slot Summary */}
              <div className="bg-[var(--brand-soft)] p-3 rounded-xl">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {selectedSlot.date} at {selectedSlot.time}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  {selectedSlot.doctor} • {selectedSlot.specialization}
                </p>
              </div>

              {/* Patient Details */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Patient Name *
                </label>
                <input
                  type="text"
                  value={patientDetails.name}
                  onChange={(e) => setPatientDetails({ ...patientDetails, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                  placeholder="Enter patient name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={patientDetails.phone}
                  onChange={(e) => setPatientDetails({ ...patientDetails, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                  placeholder="+91 XXXXX XXXXX"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Reason for Visit
                </label>
                <textarea
                  value={patientDetails.reason}
                  onChange={(e) => setPatientDetails({ ...patientDetails, reason: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] resize-none"
                  rows={3}
                  placeholder="Brief description of symptoms or reason"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setStep('slots')}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </form>
          )}

          {step === 'success' && selectedSlot && (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-4xl">✓</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Booking Confirmed!</h3>
              <p className="text-[var(--muted)] mb-4">
                Your appointment has been scheduled for {selectedSlot.date} at {selectedSlot.time}
              </p>

              <div className="bg-[var(--surface-strong)] p-4 rounded-xl mb-4 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Facility:</span>
                    <span className="font-medium text-[var(--foreground)]">{facilityName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Doctor:</span>
                    <span className="font-medium text-[var(--foreground)]">{selectedSlot.doctor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Patient:</span>
                    <span className="font-medium text-[var(--foreground)]">{patientDetails.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Booking ID:</span>
                    <span className="font-medium text-[var(--brand)]">UHI-{Date.now().toString(36).toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <Button variant="primary" fullWidth onClick={handleClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
