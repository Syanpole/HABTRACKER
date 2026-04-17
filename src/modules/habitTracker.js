import { ASSESSMENT_LABELS, DAYS_IN_MONTH_GRID, KEYS, RATING_LABELS, RATING_PALETTE } from "../core/constants.js";
import {
  formatCompletionRating,
  getCompletionRating,
  hexToRgb,
  makeExportFilename,
  rgbToExcelArgb,
  toStoredRating,
} from "../core/utils.js";

export function setupHabitTracker({
  getState,
  setState,
  persist,
  setStatus,
  profileInput,
  monthInput,
  goalsContainer,
  habitLabelsWrap,
  entryTable,
  exportPdfBtn,
  exportExcelBtn,
  resetBtn,
  loadDbBtn,
  saveDbBtn,
  dbStatus,
  onAfterReset,
}) {
  let busy = false;

  function setDbBusy(isBusy) {
    busy = isBusy;
    loadDbBtn.disabled = isBusy;
    saveDbBtn.disabled = isBusy;
  }

  function setDbStatus(message, tone) {
    dbStatus.textContent = message;
    dbStatus.dataset.tone = tone || "neutral";
  }

  function getCurrentMonthForDb() {
    return String(getState().month || "").trim();
  }

  async function tryAutoLoadFromDatabase() {
    if (!getCurrentMonthForDb()) return;
    await loadFromDatabase(true);
  }

  async function loadFromDatabase(silentNotFound) {
    const month = getCurrentMonthForDb();
    if (!month) {
      setDbStatus("Enter a month first before loading cloud data.", "error");
      return;
    }

    const profile = String(profileInput.value || "").trim();
    if (!profile) {
      setDbStatus("Login required before loading cloud data.", "error");
      return;
    }

    setDbStatus("Loading from database...", "busy");
    setDbBusy(true);

    try {
      const query = `?profile=${encodeURIComponent(profile)}&month=${encodeURIComponent(month)}`;
      const response = await fetch(`${KEYS.TRACKER_API_PATH}${query}`);

      if (response.status === 404) {
        if (!silentNotFound) {
          setDbStatus(`No cloud record found for ${month} in profile ${profile}.`, "error");
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`Load failed with status ${response.status}`);
      }

      const payload = await response.json();
      const incoming = payload.tracker?.state;
      if (incoming && typeof incoming === "object") {
        const state = getState();
        Object.assign(state, incoming);
        state.month = month;
        setState(state);
        renderAll();
        persist();
      }

      setDbStatus(`Loaded cloud data for ${month} in profile ${profile}.`, "ok");
    } catch (error) {
      setDbStatus("Unable to load from database. Check database setup.", "error");
    } finally {
      setDbBusy(false);
    }
  }

  async function saveToDatabase() {
    const month = getCurrentMonthForDb();
    if (!month) {
      setDbStatus("Enter a month first before saving cloud data.", "error");
      return;
    }

    const profile = String(profileInput.value || "").trim();
    if (!profile) {
      setDbStatus("Login required before saving cloud data.", "error");
      return;
    }

    setDbStatus("Saving to database...", "busy");
    setDbBusy(true);

    try {
      const response = await fetch(KEYS.TRACKER_API_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile,
          month,
          state: getState(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}`);
      }

      setDbStatus(`Saved cloud data for ${month} in profile ${profile}.`, "ok");
    } catch (error) {
      setDbStatus("Unable to save to database. Check database setup.", "error");
    } finally {
      setDbBusy(false);
    }
  }

  function renderGoals() {
    const state = getState();
    goalsContainer.innerHTML = "";

    state.goals.forEach((goalValue, idx) => {
      const wrapper = document.createElement("label");
      wrapper.className = "goal-item";

      const text = document.createElement("span");
      text.id = `goal-label-${idx + 1}`;
      text.textContent = `${ASSESSMENT_LABELS[idx]} Goal`;

      const input = document.createElement("input");
      input.id = `goal-input-${idx + 1}`;
      input.type = "text";
      input.maxLength = 30;
      input.value = goalValue;
      input.setAttribute("aria-labelledby", text.id);
      input.addEventListener("input", (event) => {
        const fresh = getState();
        fresh.goals[idx] = event.target.value.toUpperCase();
        event.target.value = fresh.goals[idx];
        setState(fresh);
        persist();
      });

      wrapper.append(text, input);
      goalsContainer.appendChild(wrapper);
    });
  }

  function renderHabits() {
    const state = getState();
    habitLabelsWrap.innerHTML = "";

    state.habits.forEach((habit, idx) => {
      const wrapper = document.createElement("div");
      wrapper.className = "habit-field";

      const label = document.createElement("label");
      const inputId = `habit-input-${idx + 1}`;
      label.htmlFor = inputId;
      label.textContent = `Habit ${idx + 1}`;

      const input = document.createElement("input");
      input.id = inputId;
      input.type = "text";
      input.maxLength = 24;
      input.value = habit;
      input.addEventListener("input", (event) => {
        const fresh = getState();
        fresh.habits[idx] = event.target.value.toUpperCase();
        event.target.value = fresh.habits[idx];
        setState(fresh);
        renderTable();
        persist();
      });

      wrapper.append(label, input);
      habitLabelsWrap.appendChild(wrapper);
    });
  }

  function renderTable() {
    const state = getState();
    const head = document.createElement("thead");
    const body = document.createElement("tbody");
    const headRow = document.createElement("tr");

    const dayHeader = document.createElement("th");
    dayHeader.textContent = "Day";
    headRow.appendChild(dayHeader);

    state.habits.forEach((habit) => {
      const th = document.createElement("th");
      th.textContent = habit;
      headRow.appendChild(th);
    });

    const ratingHeader = document.createElement("th");
    ratingHeader.textContent = "Completion Rating (Auto)";
    headRow.appendChild(ratingHeader);

    ASSESSMENT_LABELS.forEach((name) => {
      const th = document.createElement("th");
      th.textContent = name;
      headRow.appendChild(th);
    });

    head.appendChild(headRow);

    state.entries.forEach((entry, dayIndex) => {
      const row = document.createElement("tr");

      const dayCell = document.createElement("td");
      dayCell.textContent = String(dayIndex + 1);
      row.appendChild(dayCell);

      entry.habits.forEach((isDone, habitIndex) => {
        const cell = document.createElement("td");
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = Boolean(isDone);
        box.setAttribute("aria-label", `Day ${dayIndex + 1}, ${state.habits[habitIndex]}`);
        box.addEventListener("change", () => {
          const fresh = getState();
          fresh.entries[dayIndex].habits[habitIndex] = box.checked;
          const completionRating = getCompletionRating(fresh.entries[dayIndex].habits);
          fresh.entries[dayIndex].rating = toStoredRating(completionRating);
          setState(fresh);
          ratingPill.textContent = formatCompletionRating(completionRating);
          ratingPill.setAttribute("aria-label", `Day ${dayIndex + 1}, completion rating ${completionRating} out of 12`);
          persist();
        });
        cell.appendChild(box);
        row.appendChild(cell);
      });

      const ratingCell = document.createElement("td");
      const completionRating = getCompletionRating(entry.habits);
      const ratingPill = document.createElement("span");
      ratingPill.className = "rating-pill";
      ratingPill.textContent = formatCompletionRating(completionRating);
      ratingPill.setAttribute("aria-label", `Day ${dayIndex + 1}, completion rating ${completionRating} out of 12`);
      ratingCell.appendChild(ratingPill);
      row.appendChild(ratingCell);

      entry.assessments.forEach((metric, metricIndex) => {
        const cell = document.createElement("td");
        const input = document.createElement("input");
        input.type = "number";
        input.step = "any";
        input.placeholder = ASSESSMENT_LABELS[metricIndex];
        input.value = metric;
        input.setAttribute("aria-label", `Day ${dayIndex + 1}, ${ASSESSMENT_LABELS[metricIndex]}`);
        input.addEventListener("input", (event) => {
          const fresh = getState();
          fresh.entries[dayIndex].assessments[metricIndex] = event.target.value;
          setState(fresh);
          persist();
        });
        cell.appendChild(input);
        row.appendChild(cell);
      });

      body.appendChild(row);
    });

    entryTable.innerHTML = "";
    entryTable.append(head, body);
  }

  function getExportColumnConfig() {
    const state = getState();
    const columns = [
      { key: "day", width: 42 },
      { key: "month", width: 94 },
      { key: "sep1", width: 18 },
      ...state.habits.map((_, idx) => ({ key: `habit${idx + 1}`, width: 34 })),
      { key: "sep2", width: 18 },
      ...RATING_LABELS.map((_, idx) => ({ key: `rating${idx + 1}`, width: 34 })),
      { key: "sep3", width: 18 },
      ...ASSESSMENT_LABELS.map((_, idx) => ({ key: `assessment${idx + 1}`, width: idx === 0 ? 78 : 68 })),
      { key: "sep4", width: 18 },
      { key: "goal", width: 92 },
    ];

    let xCursor = 0;
    columns.forEach((col) => {
      col.x = xCursor;
      xCursor += col.width;
    });

    return {
      columns,
      totalWidth: xCursor,
    };
  }

  function getCellText(dayIndex, colKey) {
    const state = getState();
    const entry = state.entries[dayIndex];

    if (colKey === "day") return String(dayIndex + 1);
    if (colKey.startsWith("habit")) {
      const index = Number(colKey.replace("habit", "")) - 1;
      return entry.habits[index] ? "X" : "";
    }
    if (colKey.startsWith("rating")) {
      const rating = Number(colKey.replace("rating", ""));
      return toStoredRating(getCompletionRating(entry.habits)) === rating ? "X" : "";
    }
    if (colKey.startsWith("assessment")) {
      const metricIdx = Number(colKey.replace("assessment", "")) - 1;
      return entry.assessments[metricIdx] || "";
    }
    if (colKey === "goal") {
      return dayIndex < state.goals.length ? state.goals[dayIndex] : "";
    }
    return "";
  }

  async function exportExcel() {
    const state = getState();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Habit Tracker", {
      views: [{ state: "frozen", ySplit: 2, xSplit: 1 }],
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        paperSize: 8,
        margins: { left: 0.2, right: 0.2, top: 0.25, bottom: 0.25, header: 0.1, footer: 0.1 },
      },
    });

    const { columns } = getExportColumnConfig();
    sheet.columns = columns.map((col) => ({ key: col.key, width: Math.max(3, Math.floor(col.width / 7)) }));

    const lastRow = DAYS_IN_MONTH_GRID + 2;
    for (let row = 1; row <= lastRow; row += 1) {
      const excelRow = sheet.getRow(row);
      excelRow.height = row === 1 ? 70 : row === 2 ? 20 : 19;
      excelRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE9E9E9" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FF404040" } },
          left: { style: "thin", color: { argb: "FF404040" } },
          bottom: { style: "thin", color: { argb: "FF404040" } },
          right: { style: "thin", color: { argb: "FF404040" } },
        };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.font = { name: "Arial", size: 8 };
      });
    }

    const keyToIndex = Object.fromEntries(columns.map((col, idx) => [col.key, idx + 1]));
    const separatorKeys = ["sep1", "sep2", "sep3", "sep4"];
    separatorKeys.forEach((sepKey) => {
      for (let row = 1; row <= lastRow; row += 1) {
        const cell = sheet.getCell(row, keyToIndex[sepKey]);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
      }
    });

    const sectionBlue = "FF9FC3E0";

    for (let col = keyToIndex.day; col <= keyToIndex.month; col += 1) {
      sheet.getCell(2, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: sectionBlue } };
    }

    for (let col = keyToIndex.habit1; col <= keyToIndex.habit12; col += 1) {
      sheet.getCell(2, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: sectionBlue } };
    }

    for (let i = 1; i <= 12; i += 1) {
      const col = keyToIndex[`rating${i}`];
      sheet.getCell(2, col).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rgbToExcelArgb(RATING_PALETTE[i - 1]) },
      };
      sheet.getCell(2, col).value = i;
      sheet.getCell(2, col).font = { name: "Arial", size: 8, bold: true };
    }

    for (let i = 1; i <= ASSESSMENT_LABELS.length; i += 1) {
      sheet.getCell(2, keyToIndex[`assessment${i}`]).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: sectionBlue },
      };
    }

    sheet.getCell(2, keyToIndex.goal).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" },
    };
    sheet.getCell(2, keyToIndex.goal).font = { name: "Arial", size: 8, bold: true, color: { argb: "FFFFFFFF" } };

    sheet.mergeCells(2, keyToIndex.habit1, 2, keyToIndex.habit12);
    sheet.getCell(2, keyToIndex.habit1).value = "HABITS";

    sheet.mergeCells(2, keyToIndex.assessment1, 2, keyToIndex.assessment5);
    sheet.getCell(2, keyToIndex.assessment1).value = "ASSESSMENT";

    sheet.getCell(2, keyToIndex.goal).value = "GOAL";
    sheet.getCell(1, keyToIndex.day).value = "DAY";
    sheet.getCell(1, keyToIndex.month).value = `MONTH OF ${state.month || "________"}`;

    const verticalKeys = ["day", ...state.habits.map((_, i) => `habit${i + 1}`), ...RATING_LABELS.map((_, i) => `rating${i + 1}`), ...ASSESSMENT_LABELS.map((_, i) => `assessment${i + 1}`), "goal"];

    verticalKeys.forEach((key) => {
      const colIdx = keyToIndex[key];
      const cell = sheet.getCell(1, colIdx);
      if (key.startsWith("habit")) {
        const idx = Number(key.replace("habit", "")) - 1;
        cell.value = state.habits[idx];
      }
      if (key.startsWith("rating")) {
        const idx = Number(key.replace("rating", "")) - 1;
        cell.value = RATING_LABELS[idx];
      }
      if (key.startsWith("assessment")) {
        const idx = Number(key.replace("assessment", "")) - 1;
        cell.value = ASSESSMENT_LABELS[idx];
      }

      cell.alignment = { textRotation: 90, horizontal: "center", vertical: "middle", wrapText: true };
      cell.font = { name: "Arial", size: 8 };
    });

    for (let dayIndex = 0; dayIndex < DAYS_IN_MONTH_GRID; dayIndex += 1) {
      const row = dayIndex + 3;
      columns.forEach((col) => {
        if (col.key.startsWith("sep")) return;
        const cell = sheet.getCell(row, keyToIndex[col.key]);
        cell.value = getCellText(dayIndex, col.key);
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const exportName = makeExportFilename(state.month, "xlsx");
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), exportName);
  }

  function exportPdf() {
    const state = getState();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a2" });

    const margin = 24;
    const headerHeight = 90;
    const sectionHeight = 24;
    const rowHeight = 22;
    const totalHeight = headerHeight + sectionHeight + DAYS_IN_MONTH_GRID * rowHeight;

    const { columns, totalWidth } = getExportColumnConfig();
    const originX = margin;
    const originY = margin;

    doc.setFillColor(233, 233, 233);
    doc.rect(originX, originY, totalWidth, totalHeight, "F");

    const keyPos = {};
    columns.forEach((col) => {
      keyPos[col.key] = { x: originX + col.x, width: col.width };
    });

    ["sep1", "sep2", "sep3", "sep4"].forEach((sep) => {
      const pos = keyPos[sep];
      doc.setFillColor(0, 0, 0);
      doc.rect(pos.x, originY, pos.width, totalHeight, "F");
    });

    for (let i = 1; i <= 12; i += 1) {
      const ratingPos = keyPos[`rating${i}`];
      fillRect(doc, ratingPos.x, originY + headerHeight, ratingPos.width, sectionHeight, hexToRgb(RATING_PALETTE[i - 1]));
      setText(doc, String(i), ratingPos.x + ratingPos.width / 2, originY + headerHeight + sectionHeight * 0.68, 8, "bold");
    }

    writeVerticalHeader(doc, "DAY", keyPos.day.x + keyPos.day.width / 2, originY, headerHeight);
    writeMonthHeader(doc, `MONTH OF ${state.month || "________"}`, keyPos.month.x + 5, originY + 11, keyPos.month.width - 10);

    for (let i = 1; i <= 12; i += 1) {
      writeVerticalHeader(doc, state.habits[i - 1], keyPos[`habit${i}`].x + keyPos[`habit${i}`].width / 2, originY, headerHeight);
      writeVerticalHeader(doc, RATING_LABELS[i - 1], keyPos[`rating${i}`].x + keyPos[`rating${i}`].width / 2, originY, headerHeight);
    }

    for (let i = 1; i <= ASSESSMENT_LABELS.length; i += 1) {
      writeVerticalHeader(doc, ASSESSMENT_LABELS[i - 1], keyPos[`assessment${i}`].x + keyPos[`assessment${i}`].width / 2, originY, headerHeight);
    }

    for (let dayIndex = 0; dayIndex < DAYS_IN_MONTH_GRID; dayIndex += 1) {
      const y = originY + headerHeight + sectionHeight + dayIndex * rowHeight;
      const yCenter = y + rowHeight * 0.66;

      columns.forEach((col) => {
        if (col.key.startsWith("sep")) return;
        const value = getCellText(dayIndex, col.key);
        if (!value) return;
        const pos = keyPos[col.key];
        const fontWeight = col.key === "day" ? "bold" : "normal";
        setText(doc, value, pos.x + pos.width / 2, yCenter, 8, fontWeight);
      });
    }

    doc.save(makeExportFilename(state.month, "pdf"));
  }

  function fillRect(doc, x, y, w, h, rgb) {
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(x, y, w, h, "F");
  }

  function setText(doc, text, x, y, size, weight) {
    doc.setFont("helvetica", weight === "bold" ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(text, x, y, { align: "center" });
  }

  function writeVerticalHeader(doc, text, xCenter, headerTop, headerHeight) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(text, xCenter, headerTop + headerHeight - 7, {
      align: "center",
      angle: 90,
      maxWidth: headerHeight - 12,
    });
  }

  function writeMonthHeader(doc, text, xLeft, yTop, maxWidth) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(text, xLeft, yTop, { align: "left", maxWidth });
  }

  function renderAll() {
    const state = getState();
    monthInput.value = state.month;
    renderGoals();
    renderHabits();
    renderTable();
  }

  monthInput.addEventListener("input", (event) => {
    const state = getState();
    state.month = event.target.value;
    setState(state);
    persist();
  });

  exportPdfBtn.addEventListener("click", exportPdf);
  exportExcelBtn.addEventListener("click", exportExcel);

  loadDbBtn.addEventListener("click", () => {
    void loadFromDatabase(false);
  });

  saveDbBtn.addEventListener("click", () => {
    void saveToDatabase();
  });

  resetBtn.addEventListener("click", () => {
    onAfterReset();
    renderAll();
    persist();
  });

  setDbStatus("Local storage is active.", "neutral");

  return {
    renderHabitTracker: renderAll,
    setDbStatus,
    tryAutoLoadFromDatabase,
  };
}
