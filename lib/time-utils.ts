export function timeToAngle(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  
  // For 12-hour format, convert to angle (0° = 12 o'clock)
  const angle = (totalMinutes / (12 * 60)) * 360 - 90; // -90 to start from top
  return angle;
}

export function timeToRadians(timeString: string): number {
  return (timeToAngle(timeString) * Math.PI) / 180;
}

export function formatTime(timeString: string): string {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${(minutes ?? 0).toString().padStart(2, '0')} ${period}`;
}

export function isTimeInRange(time: string, start: string, end: string): boolean {
  const timeMinutes = timeStringToMinutes(time);
  const startMinutes = timeStringToMinutes(start);
  const endMinutes = timeStringToMinutes(end);
  
  if (startMinutes <= endMinutes) {
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  } else {
    // Handle overnight range
    return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
  }
}

export function timeStringToMinutes(timeString: string): number {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function minutesToTimeString(minutes: number): string {
  // Normalize minutes within 0..1440
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function getTaskDuration(startTime: string, endTime: string): number {
  const start = timeStringToMinutes(startTime);
  const end = timeStringToMinutes(endTime);
  
  if (end >= start) {
    return end - start;
  } else {
    // Handle overnight tasks
    return (24 * 60) - start + end;
  }
}

export function formatDuration(durationInMinutes: number): string {
  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;
  
  if (hours === 0) {
    return `${minutes} min`;
  } else if (minutes === 0) {
    return `${hours} hr`;
  } else {
    return `${hours} hr ${minutes} min`;
  }
}

// -------------------------------------------------------------
// Interactive Circular Clock Math & Utilities
// -------------------------------------------------------------

/**
 * Computes standard mathematical angle (0-360 degrees, clockwise starting from +X axis)
 * from mouse coordinates relative to circle center (cx, cy).
 */
export function getAngleFromCoordinates(x: number, y: number, cx: number, cy: number): number {
  const dx = x - cx;
  const dy = y - cy;
  const rad = Math.atan2(dy, dx);
  const deg = (rad * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * Converts a circle angle (degrees) to a 24-hour time string ("HH:mm") based on clock period.
 * 6:00 position is at angle 90° (bottom of clock).
 * AM period covers 06:00 to 18:00 (12 hours = 720 minutes).
 * PM period covers 18:00 to 06:00 (next day, 12 hours = 720 minutes).
 */
export function angleToClockTime(
  angle: number,
  period: '6AM-6PM' | '6PM-6AM',
  snapMinutes: number = 5
): string {
  // Clockwise angle offset from 6:00 position (which is at 90 deg)
  const cwAngle = (angle - 90 + 360) % 360;
  const fraction = cwAngle / 360;
  let totalClockMinutes = fraction * (12 * 60); // 0 to 720

  if (snapMinutes > 1) {
    totalClockMinutes = Math.round(totalClockMinutes / snapMinutes) * snapMinutes;
  }

  if (totalClockMinutes >= 720) {
    totalClockMinutes = 720;
  }

  if (period === '6AM-6PM') {
    const totalMinutes = 6 * 60 + totalClockMinutes;
    if (totalMinutes >= 18 * 60) return '18:00';
    return minutesToTimeString(totalMinutes);
  } else {
    // 6PM-6AM
    const totalMinutes = (18 * 60 + totalClockMinutes) % (24 * 60);
    if (totalClockMinutes === 720) return '06:00';
    return minutesToTimeString(totalMinutes);
  }
}

/**
 * Converts a 24-hour time string ("HH:mm") to an angle in degrees on the specified clock.
 * Returns null if the time does not fall into the clock's coverage.
 */
export function timeToClockAngle(timeString: string, period: '6AM-6PM' | '6PM-6AM'): number | null {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  const isAMPeriod = period === '6AM-6PM';

  if (isAMPeriod) {
    // 6AM-6PM clock (6:00 AM to 6:00 PM)
    if (hours < 6 || hours > 18) return null;
    if (hours === 18 && minutes > 0) return null;

    const adjustedHours = hours - 6;
    return (adjustedHours * 30 + minutes * 0.5 + 90) % 360;
  } else {
    // 6PM-6AM clock (6:00 PM to 6:00 AM next day)
    if (hours > 6 && hours < 18) return null;
    if (hours === 6 && minutes > 0) return null;

    const adjustedHours = hours >= 18 ? hours - 18 : hours + 6;
    return (adjustedHours * 30 + minutes * 0.5 + 90) % 360;
  }
}

/**
 * Returns SVG arc path description for clockwise arc between startAngle and endAngle.
 */
export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);

  const diff = (endAngle - startAngle + 360) % 360;
  const largeArcFlag = diff > 180 ? 1 : 0;

  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
}

export interface SnapTarget {
  time: string;
  label?: string;
  taskId?: string;
}

/**
 * Finds the closest magnetic snap target (e.g. adjacent task start or end)
 * if within snapToleranceMinutes.
 */
export function findMagneticSnapTime(
  rawTime: string,
  snapTargets: SnapTarget[],
  snapToleranceMinutes: number = 8
): { time: string; snappedTarget: SnapTarget | null } {
  const rawMinutes = timeStringToMinutes(rawTime);

  let closestTarget: SnapTarget | null = null;
  let minDiff = Infinity;

  for (const target of snapTargets) {
    const targetMinutes = timeStringToMinutes(target.time);
    let diff = Math.abs(rawMinutes - targetMinutes);
    if (diff > 720) {
      diff = 1440 - diff;
    }

    if (diff <= snapToleranceMinutes && diff < minDiff) {
      minDiff = diff;
      closestTarget = target;
    }
  }

  if (closestTarget) {
    return { time: closestTarget.time, snappedTarget: closestTarget };
  }

  return { time: rawTime, snappedTarget: null };
}

// -------------------------------------------------------------
// Overlap Detection & Prevention Utilities
// -------------------------------------------------------------

/**
 * Decomposes a task's start and end time into one or two 24-hour minute intervals [start, end].
 */
export function getTimeIntervals(startTime: string, endTime: string): Array<[number, number]> {
  const startM = timeStringToMinutes(startTime);
  const endM = timeStringToMinutes(endTime);
  if (startM === endM) {
    return [[0, 1440]];
  }
  if (startM < endM) {
    return [[startM, endM]];
  }
  // Overnight cross-midnight task
  return [
    [startM, 1440],
    [0, endM],
  ];
}

/**
 * Returns true if two sets of 24-hour intervals have a non-zero overlap.
 * Touching exactly at boundary (e.g. 06:00 and 06:00) does NOT count as overlap.
 */
export function doIntervalsOverlap(
  intervals1: Array<[number, number]>,
  intervals2: Array<[number, number]>
): boolean {
  for (const [a1, a2] of intervals1) {
    for (const [b1, b2] of intervals2) {
      if (Math.max(a1, b1) < Math.min(a2, b2)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Checks if two time spans overlap.
 */
export function checkTaskOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const int1 = getTimeIntervals(start1, end1);
  const int2 = getTimeIntervals(start2, end2);
  return doIntervalsOverlap(int1, int2);
}

/**
 * Finds the first conflicting task that overlaps with the proposed start and end time.
 */
export function findOverlappingTask<T extends { id: string; name: string; start_time: string; end_time: string }>(
  newStart: string,
  newEnd: string,
  allTasks: T[],
  excludeTaskId?: string
): T | null {
  const newIntervals = getTimeIntervals(newStart, newEnd);
  for (const task of allTasks) {
    if (excludeTaskId && task.id === excludeTaskId) continue;
    const taskIntervals = getTimeIntervals(task.start_time, task.end_time);
    if (doIntervalsOverlap(newIntervals, taskIntervals)) {
      return task;
    }
  }
  return null;
}