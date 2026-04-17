import { makeId, todayISO } from "../core/utils.js";

export function setupJournal({
  getState,
  setState,
  persist,
  setStatus,
  journalDateInput,
  journalTitleInput,
  journalContentInput,
  journalSaveBtn,
  journalList,
}) {
  function renderJournal() {
    const state = getState();
    journalList.innerHTML = "";

    if (!state.journalEntries.length) {
      const empty = document.createElement("p");
      empty.className = "meta-row";
      empty.textContent = "No journal entries yet.";
      journalList.appendChild(empty);
      return;
    }

    state.journalEntries.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "list-card";

      const title = document.createElement("h3");
      title.textContent = entry.title || "Untitled";

      const meta = document.createElement("p");
      meta.className = "meta-row";
      meta.textContent = `${entry.date || "No date"}`;

      const content = document.createElement("p");
      content.textContent = entry.content || "";

      const actions = document.createElement("div");
      actions.className = "actions";
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-ghost";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        const fresh = getState();
        fresh.journalEntries = fresh.journalEntries.filter((item) => item.id !== entry.id);
        setState(fresh);
        persist();
        renderJournal();
      });

      actions.appendChild(deleteBtn);
      card.append(title, meta, content, actions);
      journalList.appendChild(card);
    });
  }

  journalSaveBtn.addEventListener("click", () => {
    const state = getState();
    const date = journalDateInput.value || todayISO();
    const title = journalTitleInput.value.trim() || "Untitled";
    const content = journalContentInput.value.trim();

    if (!content) {
      setStatus("Journal entry cannot be empty.", "error");
      return;
    }

    state.journalEntries.unshift({
      id: makeId(),
      date,
      title,
      content,
      createdAt: new Date().toISOString(),
    });

    journalTitleInput.value = "";
    journalContentInput.value = "";
    setState(state);
    persist();
    renderJournal();
    setStatus("Journal entry saved.", "ok");
  });

  return {
    renderJournal,
  };
}
