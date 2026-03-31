// Day alignment utilities for workout plans
// Ensures workouts start from today's day, not always Monday

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * Get today's day name
 */
export function getTodayName(): string {
  const today = new Date();
  const dayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  // Convert JS day (0=Sun) to our format (0=Mon)
  const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  return DAYS[adjustedIndex];
}

/**
 * Get the index of a day (Monday = 0, Sunday = 6)
 */
export function getDayIndex(dayName: string): number {
  return DAYS.indexOf(dayName);
}

/**
 * Reorder workout days to start from today
 * If user's workout days are [Mon, Wed, Fri] and today is Wednesday:
 * - Wednesday becomes "today's workout"
 * - Monday is marked as skipped (it's in the past)
 * - The plan still shows all 7 days but aligned to current week
 */
export function alignWorkoutsToToday(
  workouts: any[],
  userWorkoutDays: string[],
  todayName: string = getTodayName(),
): { alignedWorkouts: any[]; skippedDays: string[] } {
  const todayIndex = getDayIndex(todayName);
  const skippedDays: string[] = [];

  // Find which of the user's workout days are before today (should be skipped)
  userWorkoutDays.forEach((day) => {
    const dayIndex = getDayIndex(day);
    if (dayIndex < todayIndex) {
      skippedDays.push(day);
    }
  });

  // The workouts array already has the correct day names
  // We just need to mark which ones are skipped
  const alignedWorkouts = workouts.map((workout) => ({
    ...workout,
    isSkippedDay: skippedDays.includes(workout.day),
  }));

  return { alignedWorkouts, skippedDays };
}

/**
 * Calculate the plan start date based on today and user's workout days
 * The plan_start_date is today's date, which represents when this week's workouts begin
 */
export function calculatePlanStartDate(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

/**
 * Check if a plan's week has expired (more than 7 days since plan_start_date)
 */
export function isPlanWeekExpired(planStartDate: string | Date): boolean {
  const startDate = new Date(planStartDate);
  startDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 7;
}

/**
 * Get the number of days since plan started
 */
export function getDaysSincePlanStart(planStartDate: string | Date): number {
  const startDate = new Date(planStartDate);
  startDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - startDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determine which days should be marked as skipped based on plan start date
 * Any workout day that has passed without a log should be skipped
 */
export function getAutoSkippedDays(
  planStartDate: string | Date,
  userWorkoutDays: string[],
  completedDayIndices: number[],
  allWorkouts: any[],
): { day: string; dayIndex: number }[] {
  const startDate = new Date(planStartDate);
  startDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayIndex = getDayIndex(getTodayName());
  const skippedDays: { day: string; dayIndex: number }[] = [];

  // Find workout days that are before today and haven't been completed
  allWorkouts.forEach((workout, index) => {
    if (workout.isRestDay) return;

    const workoutDayIndex = getDayIndex(workout.day);
    const isBeforeToday = workoutDayIndex < todayIndex;
    const isCompleted = completedDayIndices.includes(index);

    if (isBeforeToday && !isCompleted) {
      skippedDays.push({ day: workout.day, dayIndex: index });
    }
  });

  return skippedDays;
}

/**
 * Format the workout schedule message based on today's day
 */
export function getScheduleMessage(
  todayName: string,
  userWorkoutDays: string[],
): string {
  const todayIndex = getDayIndex(todayName);
  const todayIsWorkoutDay = userWorkoutDays.includes(todayName);

  if (todayIsWorkoutDay) {
    return `Today is ${todayName} — let's crush this workout!`;
  }

  // Find next workout day
  const futureDays = userWorkoutDays.filter(
    (day) => getDayIndex(day) > todayIndex,
  );
  const pastDays = userWorkoutDays.filter(
    (day) => getDayIndex(day) < todayIndex,
  );

  if (futureDays.length > 0) {
    return `Rest day today. Next workout: ${futureDays[0]}`;
  } else if (pastDays.length > 0) {
    return `Rest day today. Next workout: ${pastDays[0]} (next week)`;
  }

  return "Enjoy your rest day!";
}
