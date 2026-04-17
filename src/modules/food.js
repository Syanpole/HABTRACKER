import { escapeHtml, makeId, roundToOne, todayISO } from "../core/utils.js";

export function setupFood({
  getState,
  setState,
  persist,
  setStatus,
  foodDateInput,
  foodDailyTargetInput,
  foodItemInput,
  foodGramsInput,
  foodCaloriesPer100Input,
  foodCaloriesPreview,
  foodAddBtn,
  foodIntakeStat,
  foodRemainingStat,
  foodTableBody,
}) {
  function calculateFoodCalories(grams, caloriesPer100) {
    if (!Number.isFinite(grams) || grams <= 0) return 0;
    if (!Number.isFinite(caloriesPer100) || caloriesPer100 < 0) return 0;
    return (grams * caloriesPer100) / 100;
  }

  function getFoodCaloriesPreview() {
    const grams = Number(foodGramsInput.value);
    const caloriesPer100 = Number(foodCaloriesPer100Input.value);
    return calculateFoodCalories(grams, caloriesPer100);
  }

  function renderFoodStats() {
    const state = getState();
    const selectedDate = foodDateInput.value || todayISO();
    const intake = state.foods
      .filter((entry) => entry.date === selectedDate)
      .reduce((sum, entry) => sum + (Number(entry.totalCalories) || 0), 0);

    const remaining = state.foodDailyTarget - intake;

    foodIntakeStat.textContent = `${Math.round(intake)} kcal`;
    foodRemainingStat.textContent = `${Math.round(remaining)} kcal`;
  }

  function renderFood() {
    const state = getState();
    foodTableBody.innerHTML = "";

    state.foods.forEach((entry) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(entry.date)}</td>
        <td>${escapeHtml(entry.item)}</td>
        <td>${Math.round(entry.grams)} g</td>
        <td>${roundToOne(entry.caloriesPer100)}</td>
        <td>${Math.round(entry.totalCalories)} kcal</td>
        <td></td>
      `;

      const actionCell = row.lastElementChild;
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-ghost";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        const fresh = getState();
        fresh.foods = fresh.foods.filter((item) => item.id !== entry.id);
        setState(fresh);
        persist();
        renderFood();
      });
      actionCell.appendChild(deleteBtn);

      foodTableBody.appendChild(row);
    });

    renderFoodStats();
    foodCaloriesPreview.textContent = `${Math.round(getFoodCaloriesPreview())} kcal`;
  }

  const previewHandler = () => {
    foodCaloriesPreview.textContent = `${Math.round(getFoodCaloriesPreview())} kcal`;
    renderFoodStats();
  };

  foodGramsInput.addEventListener("input", previewHandler);
  foodCaloriesPer100Input.addEventListener("input", previewHandler);
  foodDateInput.addEventListener("change", renderFoodStats);

  foodDailyTargetInput.addEventListener("input", (event) => {
    const fresh = getState();
    const target = Number(event.target.value);
    fresh.foodDailyTarget = Number.isFinite(target) && target >= 0 ? Math.round(target) : fresh.foodDailyTarget;
    setState(fresh);
    persist();
    renderFoodStats();
  });

  foodAddBtn.addEventListener("click", () => {
    const state = getState();
    const date = foodDateInput.value || todayISO();
    const item = foodItemInput.value.trim();
    const grams = Number(foodGramsInput.value);
    const caloriesPer100 = Number(foodCaloriesPer100Input.value);
    const totalCalories = calculateFoodCalories(grams, caloriesPer100);

    if (!item) {
      setStatus("Food item is required.", "error");
      return;
    }

    if (!Number.isFinite(grams) || grams <= 0 || !Number.isFinite(caloriesPer100) || caloriesPer100 < 0) {
      setStatus("Food values must be valid numbers.", "error");
      return;
    }

    state.foods.unshift({
      id: makeId(),
      date,
      item,
      grams,
      caloriesPer100,
      totalCalories,
      createdAt: new Date().toISOString(),
    });

    foodItemInput.value = "";
    foodGramsInput.value = "";
    foodCaloriesPer100Input.value = "";
    foodCaloriesPreview.textContent = "0 kcal";

    setState(state);
    persist();
    renderFood();
    setStatus("Food entry added.", "ok");
  });

  return {
    renderFood,
  };
}
