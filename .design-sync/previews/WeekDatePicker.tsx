import { useState } from 'react'
import { WeekDatePicker } from 'caddiedaddy-community-frontend'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Swipeable week strip — tap a day to select; swipe between weeks. Selected day
// is filled with the brand colour, today gets the soft tint.
export function Default() {
  const [d, setD] = useState('2026-07-15')
  return (
    <div style={{ width: 340 }}>
      <WeekDatePicker selectedDate={d} onDateSelect={setD} dayLabels={DAYS} />
    </div>
  )
}
