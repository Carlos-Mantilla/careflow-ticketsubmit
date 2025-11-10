import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar, Clock, MapPin, User, CheckCircle, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface TimeSlot {
  startTime: string; // Display time in user's timezone (HH:MM:SS)
  endTime: string;
  available: boolean;
  originalGHLTime?: string; // Original ISO timestamp from GHL (e.g., "2025-11-03T16:00:00-06:00")
}

interface CalendarBookingProps {
  contactId: string;
  businessName: string;
  managerName: string;
  surveyData?: any; // Add survey data prop
  onAppointmentBooked?: (appointment: any) => void;
}

// Timezone options - offsets will be calculated dynamically
const TIMEZONES = [
  { value: 'America/Mexico_City', label: 'America/Mexico_City' },
  { value: 'America/Chihuahua', label: 'America/Chihuahua' },
  { value: 'America/Tijuana', label: 'America/Tijuana' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
  { value: 'America/Chicago', label: 'America/Chicago' },
  { value: 'Europe/Madrid', label: 'Europe/Madrid' },
  { value: 'Europe/London', label: 'Europe/London' },
];

// Helper function to get timezone offset in minutes for a specific date
const getTimezoneOffset = (timezone: string, date: Date = new Date()): number => {
  // Create a date formatter for UTC and the target timezone
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Format the same timestamp in both timezones
  const utcParts = utcFormatter.formatToParts(date);
  const tzParts = tzFormatter.formatToParts(date);
  
  // Extract hours and minutes
  const utcHour = parseInt(utcParts.find(p => p.type === 'hour')?.value || '0');
  const utcMin = parseInt(utcParts.find(p => p.type === 'minute')?.value || '0');
  const tzHour = parseInt(tzParts.find(p => p.type === 'hour')?.value || '0');
  const tzMin = parseInt(tzParts.find(p => p.type === 'minute')?.value || '0');
  
  // Calculate difference in minutes
  const utcMinutes = utcHour * 60 + utcMin;
  const tzMinutes = tzHour * 60 + tzMin;
  let diff = tzMinutes - utcMinutes;
  
  // Handle day boundaries (timezone can be +/- 12 hours from UTC)
  if (diff > 12 * 60) diff -= 24 * 60;
  if (diff < -12 * 60) diff += 24 * 60;
  
  return diff;
};

// Helper function to format timezone label with current offset
const getTimezoneLabel = (timezone: string): string => {
  const offsetMinutes = getTimezoneOffset(timezone);
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const offsetStr = `GMT${sign}${offsetHours.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`;
  return `${offsetStr} ${timezone}`;
};

export const CalendarBooking: React.FC<CalendarBookingProps> = ({
  contactId,
  businessName,
  managerName,
  surveyData,
  onAppointmentBooked
}) => {
  console.log('📅 CalendarBooking recibió props:', {
    contactId,
    businessName,
    managerName,
    hasSurveyData: !!surveyData
  });
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [allSlots, setAllSlots] = useState<Record<string, TimeSlot[]>>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { toast } = useToast();

  // Resolve a valid timezone for formatting when selectedTimezone isn't ready yet
  const getSafeTimeZone = (): string => {
    try {
      return selectedTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  };

  // Prefer user's local timezone as default
  useEffect(() => {
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Alias mapping for common equivalents to our supported list
      const TZ_ALIASES: Record<string, string> = {
        'America/Santa_Isabel': 'America/Tijuana',
      };

      const normalizedTz = TZ_ALIASES[browserTz] || browserTz;
      const supported = TIMEZONES.some(tz => tz.value === normalizedTz);
      if (supported) {
        setSelectedTimezone(normalizedTz);
        return;
      }
      // Fallbacks by country/region cues
      if (normalizedTz.includes('Tijuana')) {
        setSelectedTimezone('America/Tijuana');
        return;
      }
      if (normalizedTz.includes('Los_Angeles') || normalizedTz.includes('Vancouver') || normalizedTz.includes('Phoenix')) {
        setSelectedTimezone('America/Los_Angeles');
        return;
      }
      if (normalizedTz.includes('Mexico') || normalizedTz.includes('Mexico_City') || normalizedTz.includes('Guatemala') || normalizedTz.includes('Belize') || normalizedTz.includes('Chicago')) {
        setSelectedTimezone('America/Mexico_City');
        return;
      }
      // Final fallback
      setSelectedTimezone('America/Mexico_City');
    } catch (_) {
      setSelectedTimezone('America/Mexico_City');
    }
  }, []);

  // Generate calendar month view
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get first day of month and calculate starting date
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const today = new Date();
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < today;
      const hasSlots = allSlots[dateString] && allSlots[dateString].length > 0;
      
      days.push({
        date: dateString,
        day: date.getDate(),
        isCurrentMonth,
        isToday,
        isPast,
        isSelected: selectedDate === dateString,
        hasSlots
      });
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  // Fetch slots when timezone is ready (handles both initial load and manual changes)
  useEffect(() => {
    if (!selectedTimezone) return;
    
    const hasExistingSlots = Object.keys(allSlots).length > 0;
    
    if (hasExistingSlots) {
      // Manual timezone change: clear and refetch
      setAllSlots({});
      setAvailableSlots([]);
      setSelectedDate('');
      setSelectedTime('');
    }
    // Fetch slots (both initial load and after manual change)
    fetchAllAvailableSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimezone]);

  // Update available slots when date is selected (from pre-loaded data)
  useEffect(() => {
    if (selectedDate && allSlots[selectedDate]) {
      setAvailableSlots(allSlots[selectedDate]);
    } else if (selectedDate) {
      // If we don't have pre-loaded data for this date, fetch it
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate, allSlots]);

  const fetchAllAvailableSlots = async () => {
    setInitialLoading(true);
    try {
      // Guard against race: capture timezone at start and ignore results if it changes
      const tzAtStart = selectedTimezone;

      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 28); // Add 28 days
      
      // GHL calendar is in America/Mexico_City (GMT-6)
      const ghlTimezone = 'America/Mexico_City';
      
      // Create dates in GHL timezone (Mexico City)
      const todayInGHL = new Date(today.toLocaleString('en-US', { timeZone: ghlTimezone }));
      const endDateInGHL = new Date(endDate.toLocaleString('en-US', { timeZone: ghlTimezone }));
      
      // Set to start/end of day in GHL timezone
      const startOfToday = new Date(todayInGHL);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfEndDate = new Date(endDateInGHL);
      endOfEndDate.setHours(23, 59, 59, 999);
      
      // Convert to UTC timestamps for API
      const startTimestamp = startOfToday.getTime() - (getTimezoneOffset(ghlTimezone, startOfToday) * 60 * 1000);
      const endTimestamp = endOfEndDate.getTime() - (getTimezoneOffset(ghlTimezone, endOfEndDate) * 60 * 1000);
      
      console.log('📅 Fetching slots for next 28 days:', {
        selectedTimezone,
        startTimestamp,
        endTimestamp
      });

      const response = await fetch(
        `/api/calendar/slots?startDate=${startTimestamp}&endDate=${endTimestamp}&timezone=${tzAtStart}`
      );
      
      if (!response.ok) {
        throw new Error('Error fetching available slots');
      }

      const data = await response.json();

      // If timezone changed while fetching, ignore these results
      if (tzAtStart !== selectedTimezone) {
        return;
      }
      
      // Transform the GHL response to our TimeSlot format for all dates
      // GHL returns: { "2025-01-23": { "slots": ["2025-01-23T08:00:00-06:00", ...] }, ... }
      // We need to convert these times from GMT-6 (GHL) to the user's selected timezone
      const slotsMap: Record<string, TimeSlot[]> = {};
      
      Object.keys(data).forEach((dateKey) => {
        const daySlots = data[dateKey]?.slots || [];
        slotsMap[dateKey] = daySlots.map((slotTime: string) => {
          // Parse the slot time from GHL (e.g., "2025-01-23T08:00:00-06:00")
          // This time is in GMT-6
          const slotDate = new Date(slotTime);
          
          // Convert to user's selected timezone
          const timeInUserTz = slotDate.toLocaleString('en-US', {
            timeZone: selectedTimezone,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          
          // Extract time part (HH:MM:SS)
          const timePart = timeInUserTz.split(', ')[1] || timeInUserTz;
          
          return {
            startTime: timePart,
            endTime: timePart,
            available: true,
            originalGHLTime: slotTime // Store original GHL timestamp
          };
        });
      });

      console.log('📅 Loaded slots for dates:', Object.keys(slotsMap));
      setAllSlots(slotsMap);
    } catch (error) {
      console.error('Error fetching all slots:', error);
      toast({
        title: "Advertencia",
        description: "No se pudieron cargar los horarios disponibles. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchAvailableSlots = async (date: string) => {
    setLoading(true);
    try {
      const tzAtStart = selectedTimezone;
      // GHL calendar is in America/Mexico_City (GMT-6)
      const ghlTimezone = 'America/Mexico_City';
      
      // Create date in GHL timezone
      const dateInGHL = new Date(`${date}T00:00:00`);
      const startOfDay = new Date(dateInGHL);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateInGHL);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Convert to UTC timestamps for API
      const startTimestamp = startOfDay.getTime() - (getTimezoneOffset(ghlTimezone, startOfDay) * 60 * 1000);
      const endTimestamp = endOfDay.getTime() - (getTimezoneOffset(ghlTimezone, endOfDay) * 60 * 1000);
      
      console.log('📅 Buscando slots para:', {
        date,
        selectedTimezone,
        ghlTimezone,
        startTimestamp,
        endTimestamp
      });

      const response = await fetch(
        `/api/calendar/slots?startDate=${startTimestamp}&endDate=${endTimestamp}&timezone=${tzAtStart}`
      );
      
      if (!response.ok) {
        throw new Error('Error fetching available slots');
      }

      const data = await response.json();

      if (tzAtStart !== selectedTimezone) {
        return;
      }
      
      // Transform the GHL response to our TimeSlot format
      // GHL returns: { "2025-10-23": { "slots": ["2025-10-23T08:00:00-06:00", ...] } }
      const dateKey = date;
      const daySlots = data[dateKey]?.slots || [];
      
      // Convert slots from GMT-6 (GHL) to user's selected timezone
      const slots: TimeSlot[] = daySlots.map((slotTime: string) => {
        // Parse the slot time from GHL (e.g., "2025-10-23T08:00:00-06:00")
        const slotDate = new Date(slotTime);
        
        // Convert to user's selected timezone
        const timeInUserTz = slotDate.toLocaleString('en-US', {
          timeZone: selectedTimezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        // Extract time part (HH:MM:SS)
        const timePart = timeInUserTz.split(', ')[1] || timeInUserTz;
        
        return {
          startTime: timePart,
          endTime: timePart,
          available: true,
          originalGHLTime: slotTime // Store original GHL timestamp
        };
      });

      console.log('📅 Slots procesados:', slots);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching slots:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron cargar los horarios disponibles",
        variant: "destructive"
      });
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  // Calculate end time (45 minutes duration)
  const getEndTime = (startTime: string) => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + 45;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  // Format time for display without re-applying timezone
  // timeString ya está en la zona seleccionada para la FECHA del slot
  const formatTimeForDisplay = (timeString: string) => {
    const parts = timeString.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1] ?? '00';
    const hours12 = ((hours % 12) || 12).toString().padStart(2, '0');
    const suffix = hours >= 12 ? 'p. m.' : 'a. m.';
    return `${hours12}:${minutes} ${suffix}`;
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime(''); // Reset time selection
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    // Fix: avoid overflow when current day is 29/30/31 by setting to 1st
    newMonth.setDate(1);
    newMonth.setMonth(newMonth.getMonth() + (direction === 'prev' ? -1 : 1));
    setCurrentMonth(newMonth);

    // Auto-select first available date in the target month (if any)
    const year = newMonth.getFullYear();
    const month = String(newMonth.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${year}-${month}-`; // e.g., 2025-11-

    const candidateDates = Object.keys(allSlots)
      .filter((d) => d.startsWith(monthPrefix) && (allSlots[d]?.length ?? 0) > 0)
      .sort();

    if (candidateDates.length > 0) {
      const firstDate = candidateDates[0];
      setSelectedDate(firstDate);
      setAvailableSlots(allSlots[firstDate]);
    } else {
      // If no slots in that month, clear selection
      setSelectedDate('');
      setAvailableSlots([]);
    }
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('es-MX', { 
      month: 'long', 
      year: 'numeric',
      timeZone: getSafeTimeZone()
    });
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) return;

    setBooking(true);
    try {
      // Debug the values
      console.log('🔍 Debug values:', {
        selectedDate,
        selectedTime,
        selectedTimeType: typeof selectedTime,
        contactId,
        businessName,
        managerName,
        surveyData: surveyData ? 'Present' : 'Missing'
      });

      // Check if contactId is valid
      if (!contactId) {
        throw new Error('No se ha creado el contacto en GoHighLevel. Por favor, completa la encuesta primero.');
      }

      // Find the selected slot to get the original GHL timestamp
      const selectedSlot = availableSlots.find(slot => slot.startTime === selectedTime);
      
      if (!selectedSlot || !selectedSlot.originalGHLTime) {
        throw new Error('No se pudo encontrar el horario seleccionado. Por favor, selecciona otro horario.');
      }
      
      // Use the original GHL timestamp
      const ghlStartTime = selectedSlot.originalGHLTime; // e.g., "2025-11-03T16:00:00-06:00"
      
      // Parse the GHL timestamp to extract date, time, and offset
      const ghlMatch = ghlStartTime.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})([+-]\d{2}:\d{2})$/);
      if (!ghlMatch) {
        throw new Error('Formato de timestamp de GHL inválido');
      }
      
      const [, ghlDate, ghlHour, ghlMin, ghlSec, ghlOffsetStr] = ghlMatch;
      
      // Calculate end time by adding 45 minutes directly to the time components
      const startMinutes = parseInt(ghlHour, 10) * 60 + parseInt(ghlMin, 10);
      const endMinutes = startMinutes + 45;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      
      // Handle day overflow (if end time goes past 23:59, it will be next day, but GHL handles this)
      const endHourStr = String(endHours % 24).padStart(2, '0');
      const endMinStr = String(endMins).padStart(2, '0');
      
      // If hours overflow past 23, the date will change, but we'll keep same date string
      // GHL API should handle date changes correctly
      const startTime = ghlStartTime;
      const endTime = `${ghlDate}T${endHourStr}:${endMinStr}:${ghlSec}${ghlOffsetStr}`;
      
      console.log('🕐 Usando timestamp original de GHL:', {
        userTimezone: selectedTimezone,
        selectedTime,
        originalGHLTime: ghlStartTime,
        startTime,
        endTime,
        duration: '45 min'
      });
      
      // Validate dates
      const startDateObj = new Date(startTime);
      const endDateObj = new Date(endTime);
      
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        console.error('Invalid date/time values:', {
          selectedDate,
          selectedTime,
          originalGHLTime: ghlStartTime,
          startTime,
          endTime,
          startDateValue: startDateObj.getTime(),
          endDateValue: endDateObj.getTime()
        });
        throw new Error('Invalid date/time format');
      }
      
      const requestData = {
        contactId: contactId,
        startTime: startTime, // Already in ISO 8601 format with timezone
        endTime: endTime, // Already in ISO 8601 format with timezone
        title: `Kickoff - ${businessName}`,
        description: `Videollamada de kickoff con ${managerName} de ${businessName}`,
        surveyData: surveyData // Include survey data
      };

      console.log('🔍 SurveyData que se está enviando:', {
        hasSurveyData: !!surveyData,
        servicesTranscript: surveyData?.servicesTranscript || 'MISSING',
        whatsappWorkflowTranscript: surveyData?.whatsappWorkflowTranscript || 'MISSING',
        firstPatientServicesTranscript: surveyData?.firstPatientServicesTranscript || 'MISSING',
        doctorCalendarTranscript: surveyData?.doctorCalendarTranscript || 'MISSING',
        patientVolumeTranscript: surveyData?.patientVolumeTranscript || 'MISSING',
        fullSurveyData: surveyData
      });

      console.log('📅 Creando cita con datos:', {
        selectedDate,
        selectedTime,
        startTime: startTime,
        endTime: endTime,
        timezone: selectedTimezone,
        requestData: requestData
      });

      console.log('📤 Enviando petición con datos:', JSON.stringify(requestData, null, 2));

      const response = await fetch('/api/calendar/appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error del servidor:', errorData);
        throw new Error(`Error creating appointment: ${errorData.error || 'Unknown error'}`);
      }

      const appointment = await response.json();
      setBooked(true);
      
      toast({
        title: "¡Cita agendada!",
        description: "Tu cita ha sido confirmada exitosamente",
      });

      onAppointmentBooked?.(appointment);
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: "Error",
        description: "No se pudo agendar la cita. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setBooking(false);
    }
  };

  if (booked) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-green-600 mb-2">
            ¡Cita Confirmada!
          </h3>
          <p className="text-gray-600 mb-4">
            Tu videollamada de kickoff ha sido agendada exitosamente
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>Fecha:</strong> {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-MX', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                  timeZone: getSafeTimeZone()
              })}
            </p>
            <p className="text-sm text-green-800">
              <strong>Hora:</strong> {formatTimeForDisplay(selectedTime)} - {formatTimeForDisplay(getEndTime(selectedTime))} (45 min)
            </p>
            <p className="text-sm text-green-800">
              <strong>Zona horaria:</strong> {getTimezoneLabel(selectedTimezone)}
            </p>
            <p className="text-sm text-green-800">
              <strong>Empresa:</strong> {businessName}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Agendar Videollamada de Kickoff
        </CardTitle>
        <p className="text-sm text-gray-600">
          Selecciona una fecha y hora para tu videollamada de kickoff
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Calendar View */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Selecciona una fecha
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium min-w-[120px] text-center">
                {getMonthName(currentMonth)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Calendar Grid */}
          <div className="border rounded-lg p-4">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const isDisabled = day.isPast || (!day.hasSlots && !day.isPast);
                
                return (
                  <Button
                    key={index}
                    variant={day.isSelected ? "default" : "ghost"}
                    size="sm"
                    onClick={() => !isDisabled && handleDateSelect(day.date)}
                    disabled={isDisabled}
                    className={`
                      h-10 w-10 p-0 text-sm
                      ${!day.isCurrentMonth ? 'text-gray-300' : ''}
                      ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                      ${day.isSelected ? 'bg-blue-600 text-white' : ''}
                    `}
                  >
                    {day.day}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Time Selection */}
        {selectedDate && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Horarios disponibles
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Cargando horarios...</span>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {availableSlots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={selectedTime === slot.startTime ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTimeSelect(slot.startTime)}
                    disabled={!slot.available}
                    className="text-xs flex flex-col h-auto py-2"
                  >
                    <div className="font-medium">
                      {formatTimeForDisplay(slot.startTime)}
                    </div>
                    <div className="text-xs opacity-75">
                      - {formatTimeForDisplay(getEndTime(slot.startTime))}
                    </div>
                    <div className="text-xs opacity-60">(45 min)</div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No hay horarios disponibles para esta fecha</p>
              </div>
            )}
          </div>
        )}

        {/* Timezone Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Zona horaria
          </label>
          <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {getTimezoneLabel(tz.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Booking Button */}
        {selectedDate && selectedTime && (
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full">
              <h4 className="font-semibold text-blue-900 mb-2">Resumen de la cita</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>Empresa:</strong> {businessName}</p>
                <p><strong>Contacto:</strong> {managerName}</p>
                <p><strong>Fecha:</strong> {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-MX', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  timeZone: getSafeTimeZone()
                })}</p>
                <p><strong>Hora:</strong> {formatTimeForDisplay(selectedTime)} - {formatTimeForDisplay(getEndTime(selectedTime))} (45 minutos)</p>
                <p><strong>Zona horaria:</strong> {getTimezoneLabel(selectedTimezone)}</p>
              </div>
            </div>
            
            <Button
              onClick={handleBooking}
              disabled={booking}
              size="lg"
              className="w-full md:w-auto"
            >
              {booking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Agendando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar Cita
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
