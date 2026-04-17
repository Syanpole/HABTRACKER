import { capitalize, escapeHtml, formatCurrency, makeId, todayISO } from "../core/utils.js";

export function setupFinances({
  getState,
  setState,
  persist,
  setStatus,
  financeDateInput,
  financeTypeInput,
  financeCategoryInput,
  financeAmountInput,
  financeNoteInput,
  financeAddBtn,
  financeIncomeStat,
  financeExpenseStat,
  financeBalanceStat,
  financeTableBody,
}) {
  function renderFinance() {
    const state = getState();
    financeTableBody.innerHTML = "";

    let income = 0;
    let expense = 0;

    state.financeEntries.forEach((entry) => {
      if (entry.type === "income") income += entry.amount;
      else expense += entry.amount;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(entry.date)}</td>
        <td>${escapeHtml(capitalize(entry.type))}</td>
        <td>${escapeHtml(entry.category)}</td>
        <td>${formatCurrency(entry.amount)}</td>
        <td>${escapeHtml(entry.note || "-")}</td>
        <td></td>
      `;

      const actionCell = row.lastElementChild;
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-ghost";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        const fresh = getState();
        fresh.financeEntries = fresh.financeEntries.filter((item) => item.id !== entry.id);
        setState(fresh);
        persist();
        renderFinance();
      });
      actionCell.appendChild(deleteBtn);

      financeTableBody.appendChild(row);
    });

    financeIncomeStat.textContent = formatCurrency(income);
    financeExpenseStat.textContent = formatCurrency(expense);
    financeBalanceStat.textContent = formatCurrency(income - expense);
  }

  financeAddBtn.addEventListener("click", () => {
    const state = getState();
    const date = financeDateInput.value || todayISO();
    const type = financeTypeInput.value === "income" ? "income" : "expense";
    const category = financeCategoryInput.value.trim() || "General";
    const amount = Number(financeAmountInput.value);
    const note = financeNoteInput.value.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus("Finance amount must be greater than zero.", "error");
      return;
    }

    state.financeEntries.unshift({
      id: makeId(),
      date,
      type,
      category,
      amount,
      note,
      createdAt: new Date().toISOString(),
    });

    financeCategoryInput.value = "";
    financeAmountInput.value = "";
    financeNoteInput.value = "";

    setState(state);
    persist();
    renderFinance();
    setStatus("Transaction added.", "ok");
  });

  return {
    renderFinance,
  };
}
