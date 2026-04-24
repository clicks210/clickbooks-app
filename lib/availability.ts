export function timeToMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function formatTimeLabel(time: string) {
  const [hourStr, minuteStr] = time.split(':')
  const hour = Number(hourStr)
  const minute = Number(minuteStr)

  const suffix = hour >= 12 ? 'PM' : 'AM'
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12

  return `${normalizedHour}:${String(minute).padStart(2, '0')} ${suffix}`
}

export function generateStartTimesForRange(
  startTime: string,
  endTime: string,
  serviceDurationMinutes: number,
  slotIntervalMinutes: number
) {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)

  const slots: string[] = []

  for (
    let current = start;
    current + serviceDurationMinutes <= end;
    current += slotIntervalMinutes
  ) {
    slots.push(minutesToTime(current))
  }

  return slots
}

export function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
) {
  return startA < endB && endA > startB
}