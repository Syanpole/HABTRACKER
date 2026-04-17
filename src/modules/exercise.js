import { capitalize, escapeHtml, makeId, todayISO } from "../core/utils.js";
import { INTENSITY_MET } from "../core/constants.js";

export function setupExercise({
  getState,
  setState,
  persist,
  setStatus,
  workoutDateInput,
  workoutNameInput,
  workoutDurationInput,
  workoutIntensityInput,
  workoutWeightInput,
  workoutSaveBtn,
  workoutCaloriesPreview,
  workoutMinutesStat,
  workoutCaloriesStat,
  workoutTableBody,
}) {
  function calculateWorkoutCalories(durationMinutes, intensity, weightKg) {
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return 0;
    if (!Number.isFinite(weightKg) || weightKg <= 0) return 0;
    const met = INTENSITY_MET[intensity] || INTENSITY_MET.moderate;
    return (met * 3.5 * weightKg * durationMinutes) / 200;
  }

  function getWorkoutCaloriesPreview() {
    const duration = Number(workoutDurationInput.value);
    const intensity = workoutIntensityInput.value;
    const weight = Number(workoutWeightInput.value);
    return calculateWorkoutCalories(duration, intensity, weight);
  }

  function renderWorkout() {
    const state = getState();
    workoutTableBody.innerHTML = "";

    let totalMinutes = 0;
    let totalCalories = 0;

    state.workouts.forEach((entry) => {
      totalMinutes += entry.duration;
      totalCalories += entry.calories;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(entry.date)}</td>
        <td>${escapeHtml(entry.workout)}</td>
        <td>${Math.round(entry.duration)} min</td>
        <td>${escapeHtml(capitalize(entry.intensity))}</td>
        <td>${Math.round(entry.calories)} kcal</td>
        <td></td>
      `;

      const actionCell = row.lastElementChild;
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-ghost";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        const fresh = getState();
        fresh.workouts = fresh.workouts.filter((item) => item.id !== entry.id);
        setState(fresh);
        persist();
        renderWorkout();
      });
      actionCell.appendChild(deleteBtn);

      workoutTableBody.appendChild(row);
    });

    workoutMinutesStat.textContent = `${Math.round(totalMinutes)}`;
    workoutCaloriesStat.textContent = `${Math.round(totalCalories)}`;
    workoutCaloriesPreview.textContent = `${Math.round(getWorkoutCaloriesPreview())} kcal`;
  }

  const previewHandler = () => {
    workoutCaloriesPreview.textContent = `${Math.round(getWorkoutCaloriesPreview())} kcal`;
  };

  workoutDurationInput.addEventListener("input", previewHandler);
  workoutIntensityInput.addEventListener("change", previewHandler);
  workoutWeightInput.addEventListener("input", previewHandler);

  workoutSaveBtn.addEventListener("click", () => {
    const state = getState();
    const date = workoutDateInput.value || todayISO();
    const workout = workoutNameInput.value.trim();
    const duration = Number(workoutDurationInput.value);
    const intensity = workoutIntensityInput.value;
    const weight = Number(workoutWeightInput.value);
    const calories = calculateWorkoutCalories(duration, intensity, weight);

    if (!workout) {
      setStatus("Workout name is required.", "error");
      return;
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      setStatus("Workout duration must be greater than zero.", "error");
      return;
    }

    state.bodyWeightKg = Number.isFinite(weight) && weight > 0 ? weight : state.bodyWeightKg;

    state.workouts.unshift({
      id: makeId(),
      date,
      workout,
      duration,
      intensity,
      calories,
      createdAt: new Date().toISOString(),
    });

    workoutNameInput.value = "";
    workoutDurationInput.value = "";
    workoutCaloriesPreview.textContent = "0 kcal";

    setState(state);
    persist();
    renderWorkout();
    setStatus("Workout added.", "ok");
  });

  return {
    renderWorkout,
  };
}
