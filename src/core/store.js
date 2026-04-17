import { ASSESSMENT_LABELS, DAYS_IN_MONTH_GRID, DEFAULT_GOALS, DEFAULT_HABITS, KEYS } from "./constants.js";
import { getCompletionRating, normalizeProfile, toStoredRating } from "./utils.js";

export function createDefaultState() {
  return {
    month: "",
    habits: [...DEFAULT_HABITS],
    goals: [...DEFAULT_GOALS],
    entries: Array.from({ length: DAYS_IN_MONTH_GRID }, (_, dayIndex) => ({
      day: dayIndex + 1,
      habits: Array.from({ length: DEFAULT_HABITS.length }, () => false),
      rating: null,
      assessments: Array.from({ length: ASSESSMENT_LABELS.length }, () => ""),
    })),
    journalEntries: [],
    financeEntries: [],
    workouts: [],
    foods: [],
    foodDailyTarget: 2200,
    bodyWeightKg: 70,
  };
}

export function normalizeState(parsed) {
  const fallback = createDefaultState();

  const safeHabits = Array.isArray(parsed?.habits) ? parsed.habits.slice(0, DEFAULT_HABITS.length) : fallback.habits;
  while (safeHabits.length < DEFAULT_HABITS.length) safeHabits.push(DEFAULT_HABITS[safeHabits.length]);

  const safeGoals = Array.isArray(parsed?.goals) ? parsed.goals.slice(0, DEFAULT_GOALS.length) : fallback.goals;
  while (safeGoals.length < DEFAULT_GOALS.length) safeGoals.push(DEFAULT_GOALS[safeGoals.length]);

  const safeEntries = Array.isArray(parsed?.entries) ? parsed.entries.slice(0, DAYS_IN_MONTH_GRID) : fallback.entries;
  while (safeEntries.length < DAYS_IN_MONTH_GRID) {
    safeEntries.push({
      day: safeEntries.length + 1,
      habits: Array.from({ length: DEFAULT_HABITS.length }, () => false),
      rating: null,
      assessments: Array.from({ length: ASSESSMENT_LABELS.length }, () => ""),
    });
  }

  safeEntries.forEach((entry, idx) => {
    entry.day = idx + 1;
    if (!Array.isArray(entry.habits)) entry.habits = Array.from({ length: DEFAULT_HABITS.length }, () => false);
    entry.habits = entry.habits.slice(0, DEFAULT_HABITS.length).map(Boolean);
    while (entry.habits.length < DEFAULT_HABITS.length) entry.habits.push(false);

    if (!Array.isArray(entry.assessments)) entry.assessments = Array.from({ length: ASSESSMENT_LABELS.length }, () => "");
    entry.assessments = entry.assessments.slice(0, ASSESSMENT_LABELS.length).map((v) => (v == null ? "" : String(v)));
    while (entry.assessments.length < ASSESSMENT_LABELS.length) entry.assessments.push("");

    entry.rating = toStoredRating(getCompletionRating(entry.habits));
  });

  const safeJournalEntries = Array.isArray(parsed?.journalEntries)
    ? parsed.journalEntries.filter((item) => item && typeof item === "object")
    : [];

  const safeFinanceEntries = Array.isArray(parsed?.financeEntries)
    ? parsed.financeEntries
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          id: String(item.id || ""),
          date: String(item.date || ""),
          type: item.type === "income" ? "income" : "expense",
          category: String(item.category || "General"),
          amount: Number(item.amount) || 0,
          note: String(item.note || ""),
          createdAt: String(item.createdAt || ""),
        }))
    : [];

  const safeWorkouts = Array.isArray(parsed?.workouts)
    ? parsed.workouts
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          const legacyName = String(item.workout || "").trim();

          const normalizedRoutine = Array.isArray(item.routine)
            ? item.routine
                .filter((entry) => entry && typeof entry === "object")
                .map((entry, index) => ({
                  order: index + 1,
                  name: String(entry.name || "").trim(),
                  sets: Number(entry.sets) || 0,
                  reps: Number(entry.reps) || 0,
                  minutes: Number(entry.minutes) || 0,
                }))
                .filter((entry) => entry.name)
            : [];

          const safeRoutine = normalizedRoutine.length
            ? normalizedRoutine
            : legacyName
              ? [
                  {
                    order: 1,
                    name: legacyName,
                    sets: Number(item.sets) || 0,
                    reps: Number(item.reps) || 0,
                    minutes: Number(item.duration) || 0,
                  },
                ]
              : [];

          return {
            id: String(item.id || ""),
            date: String(item.date || ""),
            workout: legacyName || "Workout",
            location: item.location === "home" ? "home" : "gym",
            mode: item.mode === "start" ? "start" : "log",
            routine: safeRoutine,
            duration: Number(item.duration) || 0,
            intensity: ["light", "moderate", "high"].includes(item.intensity) ? item.intensity : "moderate",
            weightKg: Number(item.weightKg) || Number(item.weight) || 0,
            calories: Number(item.calories) || 0,
            startedAt: String(item.startedAt || ""),
            endedAt: String(item.endedAt || ""),
            createdAt: String(item.createdAt || ""),
          };
        })
    : [];

  const safeFoods = Array.isArray(parsed?.foods)
    ? parsed.foods
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          id: String(item.id || ""),
          date: String(item.date || ""),
          item: String(item.item || "Food"),
          grams: Number(item.grams) || 0,
          caloriesPer100: Number(item.caloriesPer100) || 0,
          totalCalories: Number(item.totalCalories) || 0,
          createdAt: String(item.createdAt || ""),
        }))
    : [];

  return {
    month: typeof parsed?.month === "string" ? parsed.month : "",
    habits: safeHabits,
    goals: safeGoals,
    entries: safeEntries,
    journalEntries: safeJournalEntries,
    financeEntries: safeFinanceEntries,
    workouts: safeWorkouts,
    foods: safeFoods,
    foodDailyTarget: Number.isFinite(Number(parsed?.foodDailyTarget)) ? Number(parsed.foodDailyTarget) : 2200,
    bodyWeightKg: Number.isFinite(Number(parsed?.bodyWeightKg)) ? Number(parsed.bodyWeightKg) : 70,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEYS.STORAGE);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch (error) {
    return createDefaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(KEYS.STORAGE, JSON.stringify(state));
}

export function loadAuthRecord() {
  try {
    const raw = localStorage.getItem(KEYS.AUTH);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const username = normalizeProfile(parsed.username || "");
    const pin = String(parsed.pin || "").trim();
    if (!username || !pin) return null;
    return { username, pin };
  } catch (error) {
    return null;
  }
}

export function saveAuthRecord(record) {
  localStorage.setItem(KEYS.AUTH, JSON.stringify(record));
}

export function loadSessionUser() {
  const raw = localStorage.getItem(KEYS.SESSION);
  return raw ? normalizeProfile(raw) : null;
}

export function saveSessionUser(user) {
  localStorage.setItem(KEYS.SESSION, user);
}

export function clearSessionUser() {
  localStorage.removeItem(KEYS.SESSION);
}

export function loadProfileName() {
  return normalizeProfile(localStorage.getItem(KEYS.PROFILE) || "default");
}

export function saveProfileName(profile) {
  localStorage.setItem(KEYS.PROFILE, profile);
}
