import { normalizeProfile } from "../core/utils.js";

export function setupAuth({
  loginGate,
  appShell,
  loginUsername,
  loginPin,
  loginBtn,
  loginStatus,
  logoutBtn,
  initialAuthRecord,
  initialSessionUser,
  saveAuthRecord,
  saveSessionUser,
  clearSessionUser,
  onAuthenticated,
  onLoggedOut,
}) {
  let authRecord = initialAuthRecord;

  function setLoginStatus(message, tone) {
    loginStatus.textContent = message;
    loginStatus.dataset.tone = tone || "neutral";
  }

  function openWorkspace() {
    loginGate.classList.add("hidden");
    appShell.classList.remove("hidden");
  }

  function closeWorkspace() {
    appShell.classList.add("hidden");
    loginGate.classList.remove("hidden");
    setLoginStatus("Sign in to continue.", "neutral");
  }

  function loginUser() {
    const username = normalizeProfile(loginUsername.value);
    const pin = String(loginPin.value || "").trim();

    if (!username || !pin) {
      setLoginStatus("Username and password are required.", "error");
      return;
    }

    if (!authRecord) {
      authRecord = { username, pin };
      saveAuthRecord(authRecord);
      saveSessionUser(username);
      onAuthenticated(username);
      openWorkspace();
      setLoginStatus("Account created and logged in.", "ok");
      return;
    }

    if (normalizeProfile(authRecord.username) === username && authRecord.pin === pin) {
      saveSessionUser(username);
      onAuthenticated(username);
      openWorkspace();
      setLoginStatus("Login successful.", "ok");
      return;
    }

    setLoginStatus("Invalid credentials.", "error");
  }

  function logoutUser() {
    clearSessionUser();
    loginPin.value = "";
    closeWorkspace();
    onLoggedOut();
  }

  loginBtn.addEventListener("click", loginUser);
  logoutBtn.addEventListener("click", logoutUser);
  loginPin.addEventListener("keydown", (event) => {
    if (event.key === "Enter") loginUser();
  });

  if (authRecord && initialSessionUser && normalizeProfile(initialSessionUser) === normalizeProfile(authRecord.username)) {
    onAuthenticated(authRecord.username);
    openWorkspace();
  } else {
    closeWorkspace();
  }

  return {
    setLoginStatus,
    closeWorkspace,
    openWorkspace,
  };
}
