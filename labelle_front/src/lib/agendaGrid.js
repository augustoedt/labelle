export function minutes(value, fallback = 0) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value || "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : fallback;
}
export function clock(value) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
export function dayColumns(professionals, appointments, weekday) {
  return professionals.filter(p =>
    (p.is_active !== false && (!p.work_days?.length || p.work_days.map(Number).includes(weekday))) ||
    appointments.some(a => a.professional_id === p.id)
  );
}
export function gridRange(professionals, appointments) {
  const starts = professionals.map(p => minutes(p.work_start, 540));
  const ends = professionals.map(p => minutes(p.work_end, 1080));
  appointments.forEach(a => {
    const start = minutes(a.time, 540);
    starts.push(start); ends.push(start + Math.max(1, Number(a.duration_minutes) || 30));
  });
  return { start: Math.floor(Math.min(...starts, 540) / 30) * 30,
    end: Math.ceil(Math.max(...ends, 1080) / 30) * 30 };
}
// Assign a lane per overlapping reservation so simultaneous bookings remain visible.
export function appointmentLanes(appointments) {
  const sorted = [...appointments].sort((a,b) => minutes(a.time) - minutes(b.time));
  const groups = []; let group = [], until = -1;
  sorted.forEach(a => {
    const start = minutes(a.time), end = start + Math.max(1, Number(a.duration_minutes) || 30);
    if (start >= until && group.length) { groups.push(group); group = []; until = -1; }
    group.push({...a, gridStart:start, gridEnd:end}); until = Math.max(until, end);
  });
  if (group.length) groups.push(group);
  return groups.flatMap(items => {
    const ends = [];
    const assigned = items.map(a => {
      let lane = ends.findIndex(end => end <= a.gridStart);
      if (lane < 0) lane = ends.length;
      ends[lane] = a.gridEnd;
      return {...a, lane};
    });
    return assigned.map(a => ({...a, lanes:ends.length}));
  });
}
