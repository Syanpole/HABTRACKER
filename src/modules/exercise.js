import { capitalize, escapeHtml, makeId, todayISO } from "../core/utils.js";
import { INTENSITY_MET } from "../core/constants.js";

export function setupExercise({
  getState,
  setState,
  persist,
  setStatus,
  workoutDateInput,
  workoutLocationInput,
  workoutModeInput,
  workoutDurationInput,
  workoutIntensityInput,
  workoutWeightInput,
  workoutAddItemBtn,
  workoutItemsContainer,
  workoutSessionActions,
  workoutStartBtn,
  workoutFinishBtn,
  workoutSessionStatus,
  workoutSaveBtn,
  workoutCaloriesPreview,
  workoutMinutesStat,
  workoutCaloriesStat,
  workoutTableBody,
}) {
  let activeSessionStartedAt = null;

  function setSessionStatus(message, tone = "neutral") {
    workoutSessionStatus.textContent = message;
    workoutSessionStatus.dataset.tone = tone;
  }

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

  function toOrdinal(position) {
    const mod100 = position % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${position}th`;
    const mod10 = position % 10;
    if (mod10 === 1) return `${position}st`;
    if (mod10 === 2) return `${position}nd`;
    if (mod10 === 3) return `${position}rd`;
    return `${position}th`;
  }

  function formatRoutineSummary(routine) {
    if (!Array.isArray(routine) || !routine.length) return "No routine";
    const text = routine
      .map((item) => {
        const name = String(item.name || "Exercise").trim();
        const sets = Number(item.sets) || 0;
        const reps = Number(item.reps) || 0;
        return `${name} (${sets}x${reps})`;
      })
      .join(", ");

    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  }

  function createWorkoutItemRow(data = {}) {
    const row = document.createElement("article");
    row.className = "workout-item-row";
    row.innerHTML = `
      <div class="workout-item-head">
        <span class="order-pill">1st exercise</span>
        <button class="btn btn-ghost workout-remove-item" type="button">Remove</button>
      </div>
      <div class="workout-item-grid">
        <div class="field-group">
          <label>Exercise</label>
          <input class="workout-item-name" type="text" maxlength="80" placeholder="Squat, Push-up, Row..." value="${escapeHtml(data.name || "")}" />
        </div>
        <div class="field-group">
          <label>Sets</label>
          <input class="workout-item-sets" type="number" min="1" step="1" value="${Number.isFinite(Number(data.sets)) && Number(data.sets) > 0 ? Number(data.sets) : 3}" />
        </div>
        <div class="field-group">
          <label>Reps</label>
          <input class="workout-item-reps" type="number" min="1" step="1" value="${Number.isFinite(Number(data.reps)) && Number(data.reps) > 0 ? Number(data.reps) : 10}" />
        </div>
        <div class="field-group">
          <label>Minutes</label>
          <input class="workout-item-minutes" type="number" min="0" step="1" value="${Number.isFinite(Number(data.minutes)) && Number(data.minutes) >= 0 ? Number(data.minutes) : 10}" />
        </div>
      </div>
    `;

    return row;
  }

  function updateItemOrderPills() {
    const rows = Array.from(workoutItemsContainer.querySelectorAll(".workout-item-row"));
    rows.forEach((row, idx) => {
      const pill = row.querySelector(".order-pill");
      if (pill) pill.textContent = `${toOrdinal(idx + 1)} exercise`;
    });
  }

  function collectRoutineFromBuilder() {
    return Array.from(workoutItemsContainer.querySelectorAll(".workout-item-row"))
      .map((row, idx) => {
        const name = row.querySelector(".workout-item-name")?.value?.trim() || "";
        const sets = Number(row.querySelector(".workout-item-sets")?.value || 0);
        const reps = Number(row.querySelector(".workout-item-reps")?.value || 0);
        const minutes = Number(row.querySelector(".workout-item-minutes")?.value || 0);

        return {
          order: idx + 1,
          name,
          sets: Number.isFinite(sets) && sets > 0 ? sets : 0,
          reps: Number.isFinite(reps) && reps > 0 ? reps : 0,
          minutes: Number.isFinite(minutes) && minutes >= 0 ? minutes : 0,
        };
      })
      .filter((item) => item.name);
  }

  function ensureAtLeastOneItem() {
    if (!workoutItemsContainer.querySelector(".workout-item-row")) {
      workoutItemsContainer.appendChild(createWorkoutItemRow());
    }
    updateItemOrderPills();
  }

  function syncDurationWithBuilder() {
    const totalMinutes = collectRoutineFromBuilder().reduce((sum, item) => sum + item.minutes, 0);
    if (workoutModeInput.value === "log" && totalMinutes > 0) {
      workoutDurationInput.value = String(Math.round(totalMinutes));
    }
    workoutCaloriesPreview.textContent = `${Math.round(getWorkoutCaloriesPreview())} kcal`;
  }

  function resetBuilder() {
    workoutItemsContainer.innerHTML = "";
    workoutItemsContainer.appendChild(createWorkoutItemRow());
    updateItemOrderPills();
    workoutDurationInput.value = "";
    workoutCaloriesPreview.textContent = "0 kcal";
  }

  function setModeUi() {
    const isStartMode = workoutModeInput.value === "start";
    workoutSessionActions.classList.toggle("hidden", !isStartMode);
    workoutDurationInput.readOnly = isStartMode;

    if (!isStartMode) {
      activeSessionStartedAt = null;
      workoutStartBtn.disabled = false;
      workoutFinishBtn.disabled = true;
      setSessionStatus("Session timer is ready.", "neutral");
    }

    workoutCaloriesPreview.textContent = `${Math.round(getWorkoutCaloriesPreview())} kcal`;
  }

  function renderWorkout() {
    const state = getState();
    workoutTableBody.innerHTML = "";

    let totalMinutes = 0;
    let totalCalories = 0;

    state.workouts.forEach((entry) => {
      totalMinutes += entry.duration;
      totalCalories += entry.calories;

      const routine = Array.isArray(entry.routine) && entry.routine.length
        ? entry.routine
        : [{ order: 1, name: entry.workout || "Workout", sets: 0, reps: 0, minutes: entry.duration }];

      const summary = formatRoutineSummary(routine);

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(entry.date)}</td>
        <td>${escapeHtml(capitalize(entry.location || "gym"))}</td>
        <td>${escapeHtml(capitalize(entry.mode || "log"))}</td>
        <td><p class="workout-summary">${escapeHtml(summary)}</p></td>
        <td>${Math.round(entry.duration)} min</td>
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
  workoutModeInput.addEventListener("change", setModeUi);

  workoutItemsContainer.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.classList.contains("workout-remove-item")) {
      const row = target.closest(".workout-item-row");
      if (row) row.remove();
      ensureAtLeastOneItem();
      syncDurationWithBuilder();
    }
  });

  workoutItemsContainer.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (
      target.classList.contains("workout-item-name") ||
      target.classList.contains("workout-item-sets") ||
      target.classList.contains("workout-item-reps") ||
      target.classList.contains("workout-item-minutes")
    ) {
      syncDurationWithBuilder();
    }
  });

  workoutAddItemBtn.addEventListener("click", () => {
    workoutItemsContainer.appendChild(createWorkoutItemRow());
    updateItemOrderPills();
  });

  workoutStartBtn.addEventListener("click", () => {
    activeSessionStartedAt = Date.now();
    workoutStartBtn.disabled = true;
    workoutFinishBtn.disabled = false;
    setSessionStatus("Workout started. Finish when done to auto-log duration.", "busy");
    setStatus("Workout session started.", "busy");
  });

  workoutFinishBtn.addEventListener("click", () => {
    if (!activeSessionStartedAt) {
      setSessionStatus("Start a workout before finishing.", "error");
      return;
    }

    const elapsedMinutes = Math.max(1, Math.round((Date.now() - activeSessionStartedAt) / 60000));
    workoutDurationInput.value = String(elapsedMinutes);
    activeSessionStartedAt = null;
    workoutStartBtn.disabled = false;
    workoutFinishBtn.disabled = true;
    setSessionStatus(`Workout finished in ${elapsedMinutes} minutes.`, "ok");
    previewHandler();
  });

  workoutSaveBtn.addEventListener("click", () => {
    const state = getState();
    const date = workoutDateInput.value || todayISO();
    const routine = collectRoutineFromBuilder();
    const location = workoutLocationInput.value === "home" ? "home" : "gym";
    const mode = workoutModeInput.value === "start" ? "start" : "log";
    const duration = Number(workoutDurationInput.value);
    const intensity = workoutIntensityInput.value;
    const weight = Number(workoutWeightInput.value);
    const calories = calculateWorkoutCalories(duration, intensity, weight);

    if (!routine.length) {
      setStatus("Add at least one exercise with a name.", "error");
      return;
    }

    if (mode === "start" && activeSessionStartedAt) {
      setStatus("Finish the active workout session first.", "error");
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
      location,
      mode,
      routine,
      duration,
      intensity,
      weightKg: Number.isFinite(weight) && weight > 0 ? weight : state.bodyWeightKg,
      calories,
      createdAt: new Date().toISOString(),
    });

    resetBuilder();
    setSessionStatus("Session timer is ready.", "neutral");
    workoutStartBtn.disabled = false;
    workoutFinishBtn.disabled = true;
    activeSessionStartedAt = null;

    setState(state);
    persist();
    renderWorkout();
    setStatus("Workout logged.", "ok");
  });

  ensureAtLeastOneItem();
  syncDurationWithBuilder();
  setModeUi();

  return {
    renderWorkout,
  };
}
