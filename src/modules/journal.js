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
  journalSearchInput,
  journalWordCount,
  journalCharCount,
  journalPromptButtons,
}) {
  const PROMPT_TEMPLATES = {
    gratitude: "Today I am grateful for:\n1. \n2. \n3. ",
    reflection: "What went well today?\n\nWhat can I improve tomorrow?\n",
    plan: "Top 3 priorities for tomorrow:\n1. \n2. \n3. ",
  };

  function updateEditorStats() {
    const text = String(journalContentInput.value || "").trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = String(journalContentInput.value || "").length;

    journalWordCount.textContent = `${words} word${words === 1 ? "" : "s"}`;
    journalCharCount.textContent = `${chars} character${chars === 1 ? "" : "s"}`;
  }

  function applyPrompt(type) {
    const template = PROMPT_TEMPLATES[type];
    if (!template) return;

    const current = String(journalContentInput.value || "").trim();
    journalContentInput.value = current ? `${current}\n\n${template}` : template;
    journalContentInput.focus();
    updateEditorStats();
  }

  function renderJournal() {
    const state = getState();
    const query = String(journalSearchInput.value || "").trim().toLowerCase();
    journalList.innerHTML = "";

    const filteredEntries = state.journalEntries.filter((entry) => {
      if (!query) return true;
      const haystack = `${entry.date || ""} ${entry.title || ""} ${entry.content || ""}`.toLowerCase();
      return haystack.includes(query);
    });

    if (!filteredEntries.length) {
      const empty = document.createElement("p");
      empty.className = "meta-row";
      empty.textContent = query ? "No entries matched your search." : "No journal entries yet.";
      journalList.appendChild(empty);
      return;
    }

    filteredEntries.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "list-card";

      const badge = document.createElement("p");
      badge.className = "entry-meta-badge";
      badge.textContent = entry.date || "No date";

      const title = document.createElement("h3");
      title.textContent = entry.title || "Untitled";

      const meta = document.createElement("p");
      meta.className = "meta-row";
      const words = String(entry.content || "").trim() ? String(entry.content || "").trim().split(/\s+/).length : 0;
      meta.textContent = `${words} word${words === 1 ? "" : "s"}`;

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
      card.append(badge, title, meta, content, actions);
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
    updateEditorStats();
    setStatus("Journal entry saved.", "ok");
  });

  journalContentInput.addEventListener("input", updateEditorStats);
  journalSearchInput.addEventListener("input", renderJournal);

  journalPromptButtons.forEach((button) => {
    button.addEventListener("click", () => applyPrompt(button.dataset.journalPrompt));
  });

  updateEditorStats();

  return {
    renderJournal,
  };
}
