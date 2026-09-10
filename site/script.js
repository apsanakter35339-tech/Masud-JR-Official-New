(() => {
  "use strict";

  const API_BASE = (window.API_BASE || "").replace(/\/$/, "");

  const state = {
    user: null,
    session: "",
    tasks: [],
    notices: [],
    history: [],
    balance: 0,
    todayIncome: 0,
    totalIncome: 0,
    completedCount: 0,
    activeTask: null,
    taskTimer: null,
    heartbeatTimer: null,
    taskStartedAt: null
  };

  const $ = (id) => document.getElementById(id);

  function money(value) {
    const number = Number(value || 0);
    return `৳${number.toLocaleString("en-BD")}`;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function initials(name) {
    const text = String(name || "MJ").trim();

    if (!text) return "MJ";

    const parts = text.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
      ).toUpperCase();
    }

    return text.substring(0, 2).toUpperCase();
  }

  function showMessage(element, message, success = false) {
    if (!element) return;

    element.textContent = message || "";
    element.style.color = success ? "#16a34a" : "#dc2626";
  }

  function saveSession(session) {
    if (session) {
      localStorage.setItem("masud_jr_session", session);
    }
  }

  function loadSession() {
    return localStorage.getItem("masud_jr_session") || "";
  }

  function clearSession() {
    localStorage.removeItem("masud_jr_session");
  }

  function saveUser(user) {
    localStorage.setItem(
      "masud_jr_user",
      JSON.stringify(user)
    );
  }

  function loadSavedUser() {
    try {
      const saved =
        localStorage.getItem("masud_jr_user");

      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  function clearSavedUser() {
    localStorage.removeItem("masud_jr_user");
  }

  async function api(path, options = {}) {
    if (!API_BASE) {
      throw new Error(
        "API server address পাওয়া যায়নি।"
      );
    }

    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (state.session) {
      headers["x-user-session"] = state.session;
    }

    const response = await fetch(
      `${API_BASE}${path}`,
      {
        method: options.method || "GET",
        headers,
        body:
          options.body !== undefined
            ? JSON.stringify(options.body)
            : undefined
      }
    );

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error ||
        `Server error (${response.status})`
      );
    }

    return data;
  }

  function setLoggedIn(user, session) {
    state.user = user;
    state.session = session || state.session;

    if (state.session) {
      saveSession(state.session);
    }

    saveUser(user);

    $("authPage")?.classList.add("hidden");
    $("dashboard")?.classList.remove("hidden");

    updateProfileUI();
    loadDashboard();
  }

  async function logout() {
    try {
      if (state.session) {
        await api("/api/logout", {
          method: "POST"
        });
      }
    } catch (error) {
      console.warn("Logout:", error.message);
    }

    clearSession();
    clearSavedUser();

    state.user = null;
    state.session = "";
    state.tasks = [];
    state.notices = [];
    state.history = [];
    state.balance = 0;
    state.todayIncome = 0;
    state.totalIncome = 0;
    state.completedCount = 0;

    stopTaskTimer();
    stopHeartbeat();

    $("dashboard")?.classList.add("hidden");
    $("authPage")?.classList.remove("hidden");

    showSection("home");
  }

  function updateProfileUI() {
    if (!state.user) return;

    const name =
      state.user.name ||
      state.user.username ||
      "User";

    const id =
      state.user.id ||
      state.user.userId ||
      "-";

    const avatarText = initials(name);

    if ($("authAvatar")) {
      $("authAvatar").textContent = avatarText;
    }

    if ($("userAvatar")) {
      $("userAvatar").textContent = avatarText;
    }

    if ($("profileAvatar")) {
      $("profileAvatar").textContent = avatarText;
    }

    if ($("headerUserName")) {
      $("headerUserName").textContent = name;
    }

    if ($("profileName")) {
      $("profileName").textContent = name;
    }

    if ($("profileId")) {
      $("profileId").textContent = id;
    }

    if ($("profileJoined")) {
      $("profileJoined").textContent =
        state.user.created_at
          ? formatDate(state.user.created_at)
          : state.user.createdAt
            ? formatDate(state.user.createdAt)
            : "-";
    }
  }

  function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString(
      "bn-BD",
      {
        year: "numeric",
        month: "long",
        day: "numeric"
      }
    );
  }

  function formatDateTime(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString(
      "bn-BD",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );
  }

  function showSection(sectionName) {
    document
      .querySelectorAll(".page-section")
      .forEach((section) => {
        section.classList.remove(
          "active-section"
        );
      });

    document
      .querySelector(
        `#section-${sectionName}`
      )
      ?.classList.add("active-section");

    document
      .querySelectorAll(".nav-btn")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.section === sectionName
        );
      });

    if (sectionName === "withdraw") {
      renderBalance();
    }
  }

  function renderBalance() {
    if ($("homeBalance")) {
      $("homeBalance").textContent =
        money(state.balance);
    }

    if ($("balanceAmount")) {
      $("balanceAmount").textContent =
        money(state.balance);
    }

    if ($("todayIncome")) {
      $("todayIncome").textContent =
        money(state.todayIncome);
    }

    if ($("balanceToday")) {
      $("balanceToday").textContent =
        money(state.todayIncome);
    }

    if ($("totalIncome")) {
      $("totalIncome").textContent =
        money(state.totalIncome);
    }

    if ($("balanceTotal")) {
      $("balanceTotal").textContent =
        money(state.totalIncome);
    }

    if ($("completedCount")) {
      $("completedCount").textContent =
        Number(state.completedCount || 0);
    }
  }

  async function loadDashboard() {
    if (!state.user || !state.session) {
      return;
    }

    try {
      const data =
        await api("/api/me");

      if (data.user) {
        state.user = {
          ...state.user,
          ...data.user
        };

        saveUser(state.user);
        updateProfileUI();
      }
    } catch (error) {
      console.warn(
        "ME API:",
        error.message
      );

      if (
        error.message === "Session expired"
      ) {
        await logout();
        return;
      }
    }

    try {
      const data =
        await api("/api/dashboard");

      if (data.balance !== undefined) {
        state.balance =
          Number(data.balance || 0);
      }

      if (
        data.todayEarnings !== undefined
      ) {
        state.todayIncome =
          Number(data.todayEarnings || 0);
      }

      if (
        data.totalEarnings !== undefined
      ) {
        state.totalIncome =
          Number(data.totalEarnings || 0);
      }

      if (
        data.completedCount !== undefined
      ) {
        state.completedCount =
          Number(data.completedCount || 0);
      }
    } catch (error) {
      console.warn(
        "Dashboard API:",
        error.message
      );
    }

    await Promise.allSettled([
      loadTasks(),
      loadNotices(),
      loadHistory()
    ]);

    renderAll();
  }

  async function loadTasks() {
    try {
      const data =
        await api("/api/tasks");

      if (Array.isArray(data)) {
        state.tasks = data;
      } else if (
        Array.isArray(data.tasks)
      ) {
        state.tasks = data.tasks;
      }

      renderTasks();
    } catch (error) {
      console.warn(
        "Tasks:",
        error.message
      );
    }
  }

  async function loadNotices() {
    try {
      const data =
        await api("/api/notices");

      if (Array.isArray(data)) {
        state.notices = data;
      } else if (
        Array.isArray(data.notices)
      ) {
        state.notices = data.notices;
      }

      renderNotices();
    } catch (error) {
      console.warn(
        "Notices:",
        error.message
      );
    }
  }

  async function loadHistory() {
    try {
      const data =
        await api("/api/history");

      if (Array.isArray(data)) {
        state.history = data;
      } else if (
        Array.isArray(data.history)
      ) {
        state.history = data.history;
      }

      renderHistory();
    } catch (error) {
      console.warn(
        "History:",
        error.message
      );
    }
  }

  function renderAll() {
    renderBalance();
    renderTasks();
    renderNotices();
    renderHistory();
  }

  function renderTasks() {
    const container =
      $("taskList");

    if (!container) return;

    if (!state.tasks.length) {
      container.innerHTML = `
        <div class="empty-state">
          এখন কোনো Task পাওয়া যায়নি।
        </div>
      `;
      return;
    }

    container.innerHTML =
      state.tasks.map((task) => {
        const id =
          task.id ||
          task._id ||
          "";

        const title =
          task.title ||
          task.name ||
          "Task";

        const description =
          task.description ||
          task.details ||
          "এই Task সম্পন্ন করুন।";

        const reward =
          Number(
            task.reward ??
            task.amount ??
            0
          );

        const completed =
          task.completed === true ||
          task.status === "completed";

        const waiting =
          task.available_at &&
          new Date(task.available_at) >
            new Date();

        return `
          <article class="task-card">

            <div class="task-top">
              <div>
                <h3>
                  ${escapeHTML(title)}
                </h3>

                <p>
                  ${escapeHTML(
                    description
                  )}
                </p>
              </div>

              <div class="task-reward">
                ${money(reward)}
              </div>
            </div>

            <div class="task-actions">

              ${
                completed
                  ? `
                    <button
                      class="task-disabled"
                      type="button"
                      disabled
                    >
                      Completed
                    </button>
                  `
                  : waiting
                    ? `
                      <button
                        class="task-disabled"
                        type="button"
                        disabled
                      >
                        পরে আবার করুন
                      </button>
                    `
                    : `
                      <button
                        class="task-start"
                        type="button"
                        data-task-id="${escapeHTML(
                          id
                        )}"
                      >
                        Start Task
                      </button>
                    `
              }

            </div>

            <div class="task-status">

              ${
                completed
                  ? `
                    <span class="status-completed">
                      ✓ Completed
                    </span>
                  `
                  : waiting
                    ? `
                      এই Task এখনো available নয়।
                    `
                    : `
                      Task শুরু করতে
                      Start Task চাপুন।
                    `
              }

            </div>

          </article>
        `;
      }).join("");

    container
      .querySelectorAll(".task-start")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            startTask(
              button.dataset.taskId
            );
          }
        );
      });
  }

  function renderNotices() {
    const list =
      $("noticeList");

    const homeNotice =
      $("homeNotice");

    if (homeNotice) {
      if (state.notices.length) {
        const latest =
          state.notices[0];

        homeNotice.textContent =
          latest.message ||
          latest.text ||
          latest.title ||
          "নতুন ঘোষণা দেখুন।";
      } else {
        homeNotice.textContent =
          "নতুন task ও গুরুত্বপূর্ণ ঘোষণা এখানে দেখা যাবে।";
      }
    }

    if (!list) return;

    if (!state.notices.length) {
      list.innerHTML = `
        <div class="empty-state">
          বর্তমানে কোনো Notice নেই।
        </div>
      `;
      return;
    }

    list.innerHTML =
      state.notices.map(
        (notice) => {
          const title =
            notice.title ||
            "Notice";

          const text =
            notice.message ||
            notice.text ||
            notice.description ||
            "";

          const date =
            notice.created_at ||
            notice.createdAt;

          return `
            <article class="notice-item">

              <h3>
                ${escapeHTML(title)}
              </h3>

              <p>
                ${escapeHTML(text)}
              </p>

              ${
                date
                  ? `
                    <p>
                      ${escapeHTML(
                        formatDateTime(date)
                      )}
                    </p>
                  `
                  : ""
              }

            </article>
          `;
        }
      ).join("");
  }

  function renderHistory() {
    const list =
      $("historyList");

    if (!list) return;

    if (!state.history.length) {
      list.innerHTML = `
        <div class="empty-state">
          এখনো কোনো History নেই।
        </div>
      `;
      return;
    }

    list.innerHTML =
      state.history.map(
        (item) => {
          const type =
            item.title ||
            item.type ||
            "Transaction";

          const amount =
            Number(
              item.amount || 0
            );

          const status =
            item.status ||
            "Pending";

          const date =
            item.created_at ||
            item.createdAt ||
            item.date ||
            item.updatedAt;

          const statusLower =
            String(status)
              .toLowerCase();

          const statusClass =
            statusLower === "completed"
              ? "status-completed"
              : statusLower === "rejected"
                ? "status-rejected"
                : "status-pending";

          return `
            <article class="history-item">

              <div>
                <h4>
                  ${escapeHTML(type)}
                </h4>

                <p>
                  ${escapeHTML(
                    date
                      ? formatDateTime(date)
                      : ""
                  )}
                </p>
              </div>

              <div>

                <div class="history-amount">
                  ${money(amount)}
                </div>

                <div
                  class="history-status ${statusClass}"
                >
                  ${escapeHTML(status)}
                </div>

              </div>

            </article>
          `;
        }
      ).join("");
  }

  async function startTask(taskId) {
    if (!state.user || !state.session) {
      alert("আগে Login করুন।");
      return;
    }

    const task =
      state.tasks.find(
        (item) =>
          String(
            item.id ||
            item._id
          ) === String(taskId)
      );

    if (!task) {
      alert("Task পাওয়া যায়নি।");
      return;
    }

    if (
      task.completed === true ||
      task.status === "completed"
    ) {
      return;
    }

    const id =
      task.id ||
      task._id;

    try {
      await api(
        `/api/tasks/${encodeURIComponent(id)}/start`,
        {
          method: "POST"
        }
      );
    } catch (error) {
      alert(
        error.message ||
        "Task শুরু করা যায়নি।"
      );
      return;
    }

    state.activeTask = task;
    state.taskStartedAt = Date.now();

    $("taskModal")?.classList.remove(
      "hidden"
    );

    if ($("modalTaskTitle")) {
      $("modalTaskTitle").textContent =
        task.title ||
        task.name ||
        "Task";
    }

    if ($("modalTaskInfo")) {
      $("modalTaskInfo").textContent =
        task.description ||
        task.details ||
        "Task processing হচ্ছে...";
    }

    if ($("modalStatus")) {
      $("modalStatus").textContent =
        "১০ সেকেন্ড অপেক্ষা করুন।";
    }

    $("verifyTaskBtn")?.classList.add(
      "hidden"
    );

    $("cancelTaskBtn")?.classList.remove(
      "hidden"
    );

    startHeartbeat();
    startCountdown();
  }

  function startHeartbeat() {
    stopHeartbeat();

    state.heartbeatTimer =
      setInterval(
        async () => {
          if (
            !state.activeTask ||
            !state.session
          ) {
            return;
          }

          const id =
            state.activeTask.id ||
            state.activeTask._id;

          try {
            await api(
              `/api/tasks/${encodeURIComponent(
                id
              )}/heartbeat`,
              {
                method: "POST"
              }
            );
          } catch (error) {
            console.warn(
              "Heartbeat:",
              error.message
            );
          }
        },
        4000
      );
  }

  function stopHeartbeat() {
    if (state.heartbeatTimer) {
      clearInterval(
        state.heartbeatTimer
      );

      state.heartbeatTimer = null;
    }
  }

  function startCountdown() {
    stopTaskTimer();

    const totalSeconds = 10;
    let remaining = totalSeconds;

    const countdown =
      $("countdown");

    const progress =
      $("progressBar");

    if (countdown) {
      countdown.textContent =
        remaining;
    }

    if (progress) {
      progress.style.width =
        "0%";
    }

    state.taskTimer =
      setInterval(() => {
        remaining -= 1;

        if (countdown) {
          countdown.textContent =
            Math.max(
              remaining,
              0
            );
        }

        if (progress) {
          const completed =
            (
              (totalSeconds -
                remaining) /
              totalSeconds
            ) * 100;

          progress.style.width =
            `${Math.min(
              completed,
              100
            )}%`;
        }

        if (remaining <= 0) {
          stopTaskTimer();

          if ($("modalStatus")) {
            $("modalStatus").textContent =
              "Task Complete চাপলে Task submit হবে।";
          }

          $("verifyTaskBtn")?.classList.remove(
            "hidden"
          );

          $("cancelTaskBtn")?.classList.add(
            "hidden"
          );
        }
      }, 1000);
  }

  function stopTaskTimer() {
    if (state.taskTimer) {
      clearInterval(
        state.taskTimer
      );

      state.taskTimer = null;
    }
  }

  async function closeTaskModal() {
    stopTaskTimer();
    stopHeartbeat();

    if (
      state.activeTask &&
      state.session
    ) {
      const id =
        state.activeTask.id ||
        state.activeTask._id;

      try {
        await api(
          `/api/tasks/${encodeURIComponent(
            id
          )}/cancel`,
          {
            method: "POST"
          }
        );
      } catch (error) {
        console.warn(
          "Cancel:",
          error.message
        );
      }
    }

    state.activeTask = null;
    state.taskStartedAt = null;

    $("taskModal")?.classList.add(
      "hidden"
    );
  }

  async function completeTask() {
    if (
      !state.activeTask ||
      !state.user ||
      !state.session
    ) {
      return;
    }

    const task =
      state.activeTask;

    const id =
      task.id ||
      task._id;

    const button =
      $("verifyTaskBtn");

    if (button) {
      button.disabled = true;
    }

    try {
      const data =
        await api(
          `/api/tasks/${encodeURIComponent(
            id
          )}/complete`,
          {
            method: "POST"
          }
        );

      if (data.user) {
        state.user = {
          ...state.user,
          ...data.user
        };

        saveUser(state.user);
        updateProfileUI();
      }

      if (
        data.balance !== undefined
      ) {
        state.balance =
          Number(
            data.balance || 0
          );
      }

      alert(
        data.message ||
        `Task সফলভাবে complete হয়েছে। Reward: ${money(
          data.reward || task.reward
        )}`
      );

      stopHeartbeat();

      state.activeTask = null;
      state.taskStartedAt = null;

      $("taskModal")?.classList.add(
        "hidden"
      );

      await loadDashboard();

    } catch (error) {
      alert(
        error.message ||
        "Task complete করা যায়নি।"
      );
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }

  async function submitWithdrawal(event) {
    event.preventDefault();

    if (!state.user || !state.session) {
      showMessage(
        $("withdrawMessage"),
        "আগে Login করুন।"
      );
      return;
    }

    const method =
      $("withdrawMethod")?.value;

    const number =
      $("withdrawNumber")
        ?.value
        .trim();

    const amount =
      Number(
        $("withdrawAmount")
          ?.value || 0
      );

    if (!number) {
      showMessage(
        $("withdrawMessage"),
        "Account Number দিন।"
      );
      return;
    }

    if (!/^01\d{9}$/.test(number)) {
      showMessage(
        $("withdrawMessage"),
        "সঠিক ১১ সংখ্যার account number দিন।"
      );
      return;
    }

    if (amount < 200) {
      showMessage(
        $("withdrawMessage"),
        "Minimum withdrawal ৳200।"
      );
      return;
    }

    if (amount > state.balance) {
      showMessage(
        $("withdrawMessage"),
        "আপনার balance যথেষ্ট নয়।"
      );
      return;
    }

    const button =
      event.target.querySelector(
        'button[type="submit"]'
      );

    if (button) {
      button.disabled = true;
    }

    showMessage(
      $("withdrawMessage"),
      "Withdrawal submit হচ্ছে...",
      true
    );

    try {
      const data =
        await api(
          "/api/withdrawals",
          {
            method: "POST",
            body: {
              method,
              accountNumber: number,
              amount
            }
          }
        );

      if (
        data.balance !== undefined
      ) {
        state.balance =
          Number(
            data.balance || 0
          );
      }

      if (
        Array.isArray(data.history)
      ) {
        state.history =
          data.history;
      }

      showMessage(
        $("withdrawMessage"),
        data.message ||
        "Withdrawal request সফলভাবে submit হয়েছে।",
        true
      );

      event.target.reset();

      await loadDashboard();

    } catch (error) {
      showMessage(
        $("withdrawMessage"),
        error.message ||
        "Withdrawal submit করা যায়নি।"
      );
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }

  function setupAuthTabs() {
    document
      .querySelectorAll(".tab-btn")
      .forEach((button) => {

        button.addEventListener(
          "click",
          () => {

            const type =
              button.dataset.auth;

            document
              .querySelectorAll(
                ".tab-btn"
              )
              .forEach((btn) => {
                btn.classList.toggle(
                  "active",
                  btn === button
                );
              });

            if (type === "login") {

              $("loginForm")
                ?.classList.remove(
                  "hidden"
                );

              $("registerForm")
                ?.classList.add(
                  "hidden"
                );

            } else {

              $("loginForm")
                ?.classList.add(
                  "hidden"
                );

              $("registerForm")
                ?.classList.remove(
                  "hidden"
                );
            }
          }
        );
      });
  }

  async function handleLogin(event) {
    event.preventDefault();

    const name =
      $("loginName")
        ?.value
        .trim();

    const password =
      $("loginPassword")
        ?.value;

    if (!name || !password) {
      showMessage(
        $("loginMessage"),
        "Name/User ID এবং Password দিন।"
      );
      return;
    }

    const button =
      event.target.querySelector(
        'button[type="submit"]'
      );

    if (button) {
      button.disabled = true;
    }

    showMessage(
      $("loginMessage"),
      "Login হচ্ছে...",
      true
    );

    try {
      const data =
        await api(
          "/api/login",
          {
            method: "POST",
            body: {
              name,
              password
            }
          }
        );

      if (!data.user) {
        throw new Error(
          "Server থেকে user information পাওয়া যায়নি।"
        );
      }

      if (!data.session) {
        throw new Error(
          "Server থেকে login session পাওয়া যায়নি।"
        );
      }

      setLoggedIn(
        data.user,
        data.session
      );

      showMessage(
        $("loginMessage"),
        "Login successful।",
        true
      );

    } catch (error) {
      showMessage(
        $("loginMessage"),
        error.message ||
        "Login failed।"
      );
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    const name =
      $("registerName")
        ?.value
        .trim();

    const password =
      $("registerPassword")
        ?.value;

    const confirm =
      $("registerConfirm")
        ?.value;

    if (!name || name.length < 2) {
      showMessage(
        $("registerMessage"),
        "সঠিক নাম দিন।"
      );
      return;
    }

    if (
      !password ||
      password.length < 6
    ) {
      showMessage(
        $("registerMessage"),
        "Password কমপক্ষে 6 অক্ষরের হতে হবে।"
      );
      return;
    }

    if (password !== confirm) {
      showMessage(
        $("registerMessage"),
        "দুইটি Password একই নয়।"
      );
      return;
    }

    const button =
      event.target.querySelector(
        'button[type="submit"]'
      );

    if (button) {
      button.disabled = true;
    }

    showMessage(
      $("registerMessage"),
      "Registration হচ্ছে...",
      true
    );

    try {
      const data =
        await api(
          "/api/register",
          {
            method: "POST",
            body: {
              name,
              password
            }
          }
        );

      if (!data.user) {
        throw new Error(
          "Server থেকে user information পাওয়া যায়নি।"
        );
      }

      if (!data.session) {
        throw new Error(
          "Server থেকে registration session পাওয়া যায়নি।"
        );
      }

      setLoggedIn(
        data.user,
        data.session
      );

      showMessage(
        $("registerMessage"),
        "Registration successful।",
        true
      );

    } catch (error) {
      showMessage(
        $("registerMessage"),
        error.message ||
        "Registration failed।"
      );
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }

  function setupNavigation() {
    document
      .querySelectorAll(".nav-btn")
      .forEach((button) => {

        button.addEventListener(
          "click",
          () => {
            showSection(
              button.dataset.section
            );
          }
        );
      });

    $("homeTaskBtn")?.addEventListener(
      "click",
      () => showSection("tasks")
    );
  }

  function setupButtons() {
    $("headerLogout")
      ?.addEventListener(
        "click",
        logout
      );

    $("profileLogout")
      ?.addEventListener(
        "click",
        logout
      );

    $("withdrawBtn")
      ?.addEventListener(
        "click",
        () => showSection("withdraw")
      );

    $("withdrawForm")
      ?.addEventListener(
        "submit",
        submitWithdrawal
      );

    $("closeTaskModal")
      ?.addEventListener(
        "click",
        closeTaskModal
      );

    $("cancelTaskBtn")
      ?.addEventListener(
        "click",
        closeTaskModal
      );

    $("verifyTaskBtn")
      ?.addEventListener(
        "click",
        completeTask
      );

    $("taskModal")
      ?.addEventListener(
        "click",
        (event) => {
          if (
            event.target ===
            $("taskModal")
          ) {
            closeTaskModal();
          }
        }
      );
  }

  async function init() {
    setupAuthTabs();
    setupNavigation();
    setupButtons();

    $("loginForm")
      ?.addEventListener(
        "submit",
        handleLogin
      );

    $("registerForm")
      ?.addEventListener(
        "submit",
        handleRegister
      );

    state.session =
      loadSession();

    const savedUser =
      loadSavedUser();

    if (
      state.session &&
      savedUser
    ) {
      state.user =
        savedUser;

      $("authPage")
        ?.classList.add(
          "hidden"
        );

      $("dashboard")
        ?.classList.remove(
          "hidden"
        );

      updateProfileUI();

      await loadDashboard();

    } else {
      clearSession();
      clearSavedUser();

      $("dashboard")
        ?.classList.add(
          "hidden"
        );

      $("authPage")
        ?.classList.remove(
          "hidden"
        );
    }
  }

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

})();
