import {
  clearSessionUser,
  createDefaultState,
  loadAuthRecord,
  loadProfileName,
  loadSessionUser,
  loadState,
  saveAuthRecord,
  saveProfileName,
  saveSessionUser,
  saveState,
} from "./core/store.js";
import { normalizeProfile, todayISO } from "./core/utils.js";
import { setupAuth } from "./modules/auth.js";
import { setupExercise } from "./modules/exercise.js";
import { setupFinances } from "./modules/finances.js";
import { setupFood } from "./modules/food.js";
import { setupHabitTracker } from "./modules/habitTracker.js";
import { setupJournal } from "./modules/journal.js";
import { setupTabs } from "./modules/tabs.js";
import financesTabTemplate from "./tabs/finances/template.html?raw";
import foodTabTemplate from "./tabs/food/template.html?raw";
import habitTabTemplate from "./tabs/habit/template.html?raw";
import journalTabTemplate from "./tabs/journal/template.html?raw";
import exerciseTabTemplate from "./tabs/exercise/template.html?raw";

mountTabTemplates();

function mountTabTemplates() {
  const panelTemplates = {
    habit: habitTabTemplate,
    journal: journalTabTemplate,
    finances: financesTabTemplate,
    exercise: exerciseTabTemplate,
    food: foodTabTemplate,
  };

  Object.entries(panelTemplates).forEach(([tabName, template]) => {
    const panel = document.querySelector(`[data-tab-panel="${tabName}"]`);
    if (panel) {
      panel.innerHTML = template;
    }
  });
}

const dom = {
  loginGate: document.getElementById("loginGate"),
  appShell: document.getElementById("appShell"),
  loginUsername: document.getElementById("loginUsername"),
  loginPin: document.getElementById("loginPin"),
  loginBtn: document.getElementById("loginBtn"),
  loginStatus: document.getElementById("loginStatus"),
  logoutBtn: document.getElementById("logoutBtn"),
  tabButtons: Array.from(document.querySelectorAll("[data-tab]")),
  tabPanels: Array.from(document.querySelectorAll("[data-tab-panel]")),

  profileInput: document.getElementById("profileInput"),
  monthInput: document.getElementById("monthInput"),
  goalsContainer: document.getElementById("goalsContainer"),
  habitLabelsWrap: document.getElementById("habitLabels"),
  entryTable: document.getElementById("entryTable"),
  exportPdfBtn: document.getElementById("exportPdfBtn"),
  exportExcelBtn: document.getElementById("exportExcelBtn"),
  resetBtn: document.getElementById("resetBtn"),
  loadDbBtn: document.getElementById("loadDbBtn"),
  saveDbBtn: document.getElementById("saveDbBtn"),
  dbStatus: document.getElementById("dbStatus"),

  journalDateInput: document.getElementById("journalDateInput"),
  journalTitleInput: document.getElementById("journalTitleInput"),
  journalContentInput: document.getElementById("journalContentInput"),
  journalSaveBtn: document.getElementById("journalSaveBtn"),
  journalList: document.getElementById("journalList"),
  journalSearchInput: document.getElementById("journalSearchInput"),
  journalWordCount: document.getElementById("journalWordCount"),
  journalCharCount: document.getElementById("journalCharCount"),
  journalPromptButtons: Array.from(document.querySelectorAll("[data-journal-prompt]")),

  financeDateInput: document.getElementById("financeDateInput"),
  financeTypeInput: document.getElementById("financeTypeInput"),
  financeCategoryInput: document.getElementById("financeCategoryInput"),
  financeAmountInput: document.getElementById("financeAmountInput"),
  financeNoteInput: document.getElementById("financeNoteInput"),
  financeAddBtn: document.getElementById("financeAddBtn"),
  financeIncomeStat: document.getElementById("financeIncomeStat"),
  financeExpenseStat: document.getElementById("financeExpenseStat"),
  financeBalanceStat: document.getElementById("financeBalanceStat"),
  financeTableBody: document.getElementById("financeTableBody"),

  workoutDateInput: document.getElementById("workoutDateInput"),
  workoutNameInput: document.getElementById("workoutNameInput"),
  workoutDurationInput: document.getElementById("workoutDurationInput"),
  workoutIntensityInput: document.getElementById("workoutIntensityInput"),
  workoutWeightInput: document.getElementById("workoutWeightInput"),
  workoutSaveBtn: document.getElementById("workoutSaveBtn"),
  workoutCaloriesPreview: document.getElementById("workoutCaloriesPreview"),
  workoutMinutesStat: document.getElementById("workoutMinutesStat"),
  workoutCaloriesStat: document.getElementById("workoutCaloriesStat"),
  workoutTableBody: document.getElementById("workoutTableBody"),

  foodDateInput: document.getElementById("foodDateInput"),
  foodDailyTargetInput: document.getElementById("foodDailyTargetInput"),
  foodItemInput: document.getElementById("foodItemInput"),
  foodGramsInput: document.getElementById("foodGramsInput"),
  foodCaloriesPer100Input: document.getElementById("foodCaloriesPer100Input"),
  foodCaloriesPreview: document.getElementById("foodCaloriesPreview"),
  foodAddBtn: document.getElementById("foodAddBtn"),
  foodIntakeStat: document.getElementById("foodIntakeStat"),
  foodRemainingStat: document.getElementById("foodRemainingStat"),
  foodTableBody: document.getElementById("foodTableBody"),
};

let state = loadState();
let profileName = loadProfileName() || "default";

function getState() {
  return state;
}

function setState(next) {
  state = next;
}

function persist() {
  saveState(state);
}

function setStatus(message, tone) {
  habitTrackerApi.setDbStatus(message, tone);
}

const tabsApi = setupTabs(dom.tabButtons, dom.tabPanels);

const habitTrackerApi = setupHabitTracker({
  getState,
  setState,
  persist,
  setStatus: (message, tone) => {
    dom.dbStatus.textContent = message;
    dom.dbStatus.dataset.tone = tone || "neutral";
  },
  profileInput: dom.profileInput,
  monthInput: dom.monthInput,
  goalsContainer: dom.goalsContainer,
  habitLabelsWrap: dom.habitLabelsWrap,
  entryTable: dom.entryTable,
  exportPdfBtn: dom.exportPdfBtn,
  exportExcelBtn: dom.exportExcelBtn,
  resetBtn: dom.resetBtn,
  loadDbBtn: dom.loadDbBtn,
  saveDbBtn: dom.saveDbBtn,
  dbStatus: dom.dbStatus,
  onAfterReset: () => {
    const preserved = {
      journalEntries: state.journalEntries,
      financeEntries: state.financeEntries,
      workouts: state.workouts,
      foods: state.foods,
      foodDailyTarget: state.foodDailyTarget,
      bodyWeightKg: state.bodyWeightKg,
    };

    state = {
      ...createDefaultState(),
      ...preserved,
    };
  },
});

const journalApi = setupJournal({
  getState,
  setState,
  persist,
  setStatus,
  journalDateInput: dom.journalDateInput,
  journalTitleInput: dom.journalTitleInput,
  journalContentInput: dom.journalContentInput,
  journalSaveBtn: dom.journalSaveBtn,
  journalList: dom.journalList,
  journalSearchInput: dom.journalSearchInput,
  journalWordCount: dom.journalWordCount,
  journalCharCount: dom.journalCharCount,
  journalPromptButtons: dom.journalPromptButtons,
});

const financeApi = setupFinances({
  getState,
  setState,
  persist,
  setStatus,
  financeDateInput: dom.financeDateInput,
  financeTypeInput: dom.financeTypeInput,
  financeCategoryInput: dom.financeCategoryInput,
  financeAmountInput: dom.financeAmountInput,
  financeNoteInput: dom.financeNoteInput,
  financeAddBtn: dom.financeAddBtn,
  financeIncomeStat: dom.financeIncomeStat,
  financeExpenseStat: dom.financeExpenseStat,
  financeBalanceStat: dom.financeBalanceStat,
  financeTableBody: dom.financeTableBody,
});

const exerciseApi = setupExercise({
  getState,
  setState,
  persist,
  setStatus,
  workoutDateInput: dom.workoutDateInput,
  workoutNameInput: dom.workoutNameInput,
  workoutDurationInput: dom.workoutDurationInput,
  workoutIntensityInput: dom.workoutIntensityInput,
  workoutWeightInput: dom.workoutWeightInput,
  workoutSaveBtn: dom.workoutSaveBtn,
  workoutCaloriesPreview: dom.workoutCaloriesPreview,
  workoutMinutesStat: dom.workoutMinutesStat,
  workoutCaloriesStat: dom.workoutCaloriesStat,
  workoutTableBody: dom.workoutTableBody,
});

const foodApi = setupFood({
  getState,
  setState,
  persist,
  setStatus,
  foodDateInput: dom.foodDateInput,
  foodDailyTargetInput: dom.foodDailyTargetInput,
  foodItemInput: dom.foodItemInput,
  foodGramsInput: dom.foodGramsInput,
  foodCaloriesPer100Input: dom.foodCaloriesPer100Input,
  foodCaloriesPreview: dom.foodCaloriesPreview,
  foodAddBtn: dom.foodAddBtn,
  foodIntakeStat: dom.foodIntakeStat,
  foodRemainingStat: dom.foodRemainingStat,
  foodTableBody: dom.foodTableBody,
});

const authApi = setupAuth({
  loginGate: dom.loginGate,
  appShell: dom.appShell,
  loginUsername: dom.loginUsername,
  loginPin: dom.loginPin,
  loginBtn: dom.loginBtn,
  loginStatus: dom.loginStatus,
  logoutBtn: dom.logoutBtn,
  initialAuthRecord: loadAuthRecord(),
  initialSessionUser: loadSessionUser(),
  saveAuthRecord,
  saveSessionUser,
  clearSessionUser,
  onAuthenticated: (username) => {
    profileName = normalizeProfile(username) || "default";
    saveProfileName(profileName);
    dom.profileInput.value = profileName;
    dom.loginUsername.value = profileName;
    tabsApi.switchTab("habit");
    void habitTrackerApi.tryAutoLoadFromDatabase();
  },
  onLoggedOut: () => {
    profileName = "";
  },
});

seedDateInputs();
renderAll();

function seedDateInputs() {
  const today = todayISO();
  if (!dom.journalDateInput.value) dom.journalDateInput.value = today;
  if (!dom.financeDateInput.value) dom.financeDateInput.value = today;
  if (!dom.workoutDateInput.value) dom.workoutDateInput.value = today;
  if (!dom.foodDateInput.value) dom.foodDateInput.value = today;
}

function renderAll() {
  dom.profileInput.value = profileName || "default";
  dom.workoutWeightInput.value = state.bodyWeightKg;
  dom.foodDailyTargetInput.value = Math.round(state.foodDailyTarget);

  habitTrackerApi.renderHabitTracker();
  journalApi.renderJournal();
  financeApi.renderFinance();
  exerciseApi.renderWorkout();
  foodApi.renderFood();
}

void authApi;
