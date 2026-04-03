import React, { useState } from 'react';
import { Calendar, MapPin, Clock, ExternalLink, CheckCircle } from 'lucide-react';
import { Appointment } from '../types/models';
import { appointmentService } from '../services/ChatService';

interface AppointmentCardProps {
  appointment: Appointment;
}

/**
 * AppointmentCard — shows appointment details with Google Calendar integration.
 *
 * Provides a direct Google Calendar deep-link using the standard URL format
 * so users can add appointments without needing OAuth from the frontend.
 */
const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment }) => {
  const [addedToCalendar, setAddedToCalendar] = useState(!!appointment.googleEventId);

  const apptDate = new Date(appointment.appointmentDatetime);
  const calLink = appointmentService.generateCalendarLink(
    appointment.title,
    appointment.appointmentDatetime,
    appointment.location,
    appointment.instructions
  );

  const handleCalendarClick = () => {
    window.open(calLink, '_blank', 'noopener,noreferrer');
    setAddedToCalendar(true);
  };

  const daysUntil = Math.ceil(
    (apptDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      className="glass-card overflow-hidden hover:scale-[1.01] transition-transform duration-300"
      role="article"
      aria-label={`Appointment: ${appointment.title}`}
    >
      {/* Gradient Header */}
      <div className="h-2 bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500" aria-hidden />

      <div className="p-6">
        {/* Title row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20">
              <Calendar className="w-5 h-5 text-sky-400" aria-hidden />
            </div>
            <div>
              <h3 className="font-bold text-white">{appointment.title}</h3>
              {daysUntil > 0 && (
                <p className="text-xs text-sky-400 mt-0.5">
                  in {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          {addedToCalendar && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
              <CheckCircle className="w-3 h-3" aria-hidden /> Added
            </span>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2.5 mb-5">
          <div className="flex items-center gap-2.5 text-sm text-slate-300">
            <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" aria-hidden />
            <span>
              {apptDate.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}{' '}
              at{' '}
              {apptDate.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          {appointment.location && (
            <div className="flex items-start gap-2.5 text-sm text-slate-300">
              <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" aria-hidden />
              <span>{appointment.location}</span>
            </div>
          )}
        </div>

        {/* Instructions */}
        {appointment.instructions && (
          <div className="bg-amber-900/20 border border-amber-500/20 rounded-xl p-3 mb-5">
            <p className="text-xs font-semibold text-amber-300 mb-1 uppercase tracking-wide">
              Preparation
            </p>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              {appointment.instructions}
            </p>
          </div>
        )}

        {/* Google Calendar Button */}
        <button
          onClick={handleCalendarClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold btn-primary focus-ring"
          aria-label={`Add ${appointment.title} to Google Calendar`}
        >
          <ExternalLink className="w-4 h-4" aria-hidden />
          {addedToCalendar ? 'Open in Google Calendar' : 'Add to Google Calendar'}
        </button>
      </div>
    </div>
  );
};

export default AppointmentCard;
