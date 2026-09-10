(() => {
  "use strict";

  /* =========================================================
     MASUD JR OFFICIAL
     Complete Frontend Script
     Login + Registration + Dashboard + Tasks + Balance
     ========================================================= */

  const RENDER_API = "https://masud-jr-official-online.onrender.com";

  // Render frontend হলে same-origin API ব্যবহার করবে।
  // Netlify হলে Render backend ব্যবহার করবে।
  const API_BASE = location.hostname.endsWith(".onrender.com")
    ? ""
    : RENDER_API;

  const SESSION_KEY = "mjrUserSessionV2";
  const USER_KEY = "mjrUserV2";

  let session = localStorage.getItem(SESSION_KEY) || "";
  let me = null;

  let tasks = [];
  let notices = [];
  let history = [];

  let balance = 0;
  let todayIncome = 0;
  let totalIncome = 0;
  let completedCount = 0;

  let activeTaskId = null;
  let activeTask = null;
  let taskTimer = null;
  let heartbeatTimer = null;
  let taskStartedAt = null;

  const $ = (id) => document.getElementById(id);

  /* =========================================================
     HELPERS
     ========================================================= */

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

  function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function formatDateTime(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("bn-BD", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function showMessage(element, message, success = false) {
    if (!element) return;

    element.textContent = message || "";
    element.style.color = success ? "#16a34a" : "#dc2626";
  }

  function saveUser(user) {
    if (!user) return;

    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function loadSavedUser() {
    try {
      const saved = localStorage.getItem(USER_KEY);

      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  function clearSavedUser() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  /* =========================================================
     API
     ========================================================= */

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    // খুব গুরুত্বপূর্ণ:
    // authenticated API request-এ x-user-session পাঠানো হচ্ছে।
    if (session) {
      headers["x-user-session"] = session;
    }

    const config = {
      method: options.method || "GET",
      headers
    };

    if (options.body !== undefined) {
      config.body =
        typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body);
    }

    let response;

    try {
      response = await fetch(`${API_BASE}${path}`, config);
    } catch (error) {
      throw new Error(
        "Server-এর সাথে সংযোগ করা যাচ্ছে না। Internet connection অথবা Render server check করুন।"
      );
    }

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      const error = new Error(
        data.message ||
        data.error ||
        `Server error (${response.status})`
      );

      error.status = response.status;
      error.data = data;

      throw error;
    }

    return data;
  }

  /* =========================================================
     AUTH TABS
     ========================================================= */

  function forceAuthFormVisibility() {
    const loginForm = $("loginForm");
    const registerForm = $("registerForm");

    if (loginForm) {
      loginForm.style.setProperty("display", "block", "important");
    }

    if (registerForm) {
      registerForm.style.setProperty("display", "none", "important");
    }
  }

  function activateLoginTab() {
    const loginForm = $("loginForm");
    const registerForm = $("registerForm");

    if (loginForm) {
      loginForm.classList.remove("hidden");
      loginForm.style.setProperty("display", "block", "important");
    }

    if (registerForm) {
      registerForm.classList.add("hidden");
      registerForm.style.setProperty("display", "none", "important");
    }

    document.querySelectorAll(".tab-btn").forEach((button) => {
      const type = button.dataset.auth;

      button.classList.toggle(
        "active",
        type === "login"
      );
    });

    clearMessages();
  }

  function activateRegisterTab() {
    const loginForm = $("loginForm");
    const registerForm = $("registerForm");

    if (loginForm) {
      loginForm.classList.add("hidden");
      loginForm.style.setProperty("display", "none", "important");
    }

    if (registerForm) {
      registerForm.classList.remove("hidden");
      registerForm.style.setProperty("display", "block", "important");
    }

    document.querySelectorAll(".tab-btn").forEach((button) => {
      const type = button.dataset.auth;

      button.classList.toggle(
        "active",
        type === "register"
      );
    });

    clearMessages();
  }

  function clearMessages() {
    if ($("loginMessage")) {
      $("loginMessage").textContent = "";
    }

    if ($("registerMessage")) {
      $("registerMessage").textContent = "";
    }
  }

  function setupAuthTabs() {
    const buttons = document.querySelectorAll(
      '[data-auth], [data-auth-tab], .auth-tab, .tab-btn'
    );

    buttons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();

        const type =
          button.dataset.auth ||
          button.dataset.authTab ||
          button.dataset.tab ||
          button.textContent
            .trim()
            .toLowerCase();

        if (
          String(type).toLowerCase().includes("register") ||
          String(type).toLowerCase().includes("registration")
        ) {
          activateRegisterTab();
        } else {
          activateLoginTab();
        }
      });
    });

    forceAuthFormVisibility();
  }

  /* =========================================================
     LOGIN
     ========================================================= */

  async function handleLogin(event) {
    event.preventDefault();

    const name = $("loginName")?.value.trim() || "";
    const password = $("loginPassword")?.value || "";

    if (!name) {
      showMessage(
        $("loginMessage"),
        "নাম / User ID দিন।"
      );
      return;
    }

    if (!password) {
      showMessage(
        $("loginMessage"),
        "Password দিন।"
      );
      return;
    }

    const button = event.target.querySelector(
      'button[type="submit"]'
    );

    if (button) {
      button.disabled = true;
      button.textContent = "Login হচ্ছে...";
    }

    showMessage(
      $("loginMessage"),
      "Login হচ্ছে...",
      true
    );

    try {
      /*
       * সঠিক backend endpoint:
       * POST /api/login
       */
      const data = await api("/api/login", {
        method: "POST",
        body: {
          name,
          password
        }
      });

      if (!data.session || !data.user) {
        throw new Error(
          "Server থেকে login information পাওয়া যায়নি।"
        );
      }

      session = data.session;
      me = data.user;

      localStorage.setItem(
        SESSION_KEY,
        session
      );

      saveUser(me);

      showMessage(
        $("loginMessage"),
        "Login successful।",
        true
      );

      openDashboard();

    } catch (error) {
      showMessage(
        $("loginMessage"),
        error.message || "Login failed।"
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Login";
      }
    }
  }

  /* =========================================================
     REGISTRATION
     ========================================================= */

  async function handleRegister(event) {
    event.preventDefault();

    const name =
      $("registerName")?.value.trim() || "";

    const password =
      $("registerPassword")?.value || "";

    const confirm =
      $("registerConfirm")?.value || "";

    /*
     * Backend-এর requirement:
     * name >= 2
     * password >= 6
     */

    if (!name || name.length < 2) {
      showMessage(
        $("registerMessage"),
        "নাম কমপক্ষে ২ অক্ষরের হতে হবে।"
      );
      return;
    }

    if (!password || password.length < 6) {
      showMessage(
        $("registerMessage"),
        "Password কমপক্ষে ৬ অক্ষরের হতে হবে।"
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

    const button = event.target.querySelector(
      'button[type="submit"]'
    );

    if (button) {
      button.disabled = true;
      button.textContent = "Registration হচ্ছে...";
    }

    showMessage(
      $("registerMessage"),
      "Registration হচ্ছে...",
      true
    );

    try {
      /*
       * সবচেয়ে গুরুত্বপূর্ণ FIX:
       *
       * ভুল:
       * /api/auth/register
       *
       * সঠিক:
       * /api/register
       */
      const data = await api("/api/register", {
        method: "POST",
        body: {
          name,
          password
        }
      });

      if (!data.session || !data.user) {
        throw new Error(
          "Registration হয়েছে, কিন্তু server session দেয়নি।"
        );
      }

      // Session save
      session = data.session;

      localStorage.setItem(
        SESSION_KEY,
        session
      );

      // User save
      me = data.user;

      saveUser(me);

      showMessage(
        $("registerMessage"),
        "Registration successful! Dashboard খুলছে...",
        true
      );

      // ছোট delay যাতে success message দেখা যায়
      setTimeout(() => {
        openDashboard();
      }, 400);

    } catch (error) {
      console.error("Registration error:", error);

      showMessage(
        $("registerMessage"),
        error.message || "Registration failed।"
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Registration";
      }
    }
  }

  /* =========================================================
     DASHBOARD OPEN / CLOSE
     ========================================================= */

  function openDashboard() {
    $("authPage")?.classList.add("hidden");
    $("dashboard")?.classList.remove("hidden");

    updateProfileUI();

    showSection("home");

    refreshAll();
  }

  function openAuth() {
    stopTaskTimer();

    $("dashboard")?.classList.add("hidden");
    $("authPage")?.classList.remove("hidden");

    activateLoginTab();
  }

  /* =========================================================
     PROFILE UI
     ========================================================= */

  function updateProfileUI() {
    if (!me) return;

    const name =
      me.name ||
      me.username ||
      "User";

    const id =
      me.id ||
      me.userId ||
      "-";

    const joined =
      me.created_at ||
      me.createdAt ||
      null;

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
        formatDate(joined);
    }

    /*
     * যদি HTML-এ image থাকে তাহলে image রাখবে।
     * MJ text দিয়ে image replace করবে না।
     */
    document.querySelectorAll(
      "#authAvatar, #userAvatar, #profileAvatar"
    ).forEach((avatar) => {
      if (avatar.tagName === "IMG") {
        avatar.src = avatar.getAttribute("src") || "profile.jpg";
        avatar.alt = name;
      }
    });
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */

  function showSection(sectionName) {
    document.querySelectorAll(
      ".page-section"
    ).forEach((section) => {
      section.classList.remove(
        "active-section"
      );
    });

    const target =
      document.querySelector(
        `#section-${sectionName}`
      );

    if (target) {
      target.classList.add(
        "active-section"
      );
    }

    document.querySelectorAll(
      ".nav-btn"
    ).forEach((button) => {
      const section =
        button.dataset.section ||
        button.dataset.nav;

      button.classList.toggle(
        "active",
        section === sectionName
      );
    });

    if (sectionName === "balance") {
      renderBalance();
    }

    if (sectionName === "history") {
      renderHistory();
    }

    if (sectionName === "tasks") {
      renderTasks();
    }
  }

  function setupNavigation() {
    document.querySelectorAll(
      ".nav-btn"
    ).forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const section =
            button.dataset.section ||
            button.dataset.nav;

          if (section) {
            showSection(section);
          }
        }
      );
    });

    $("homeTaskBtn")?.addEventListener(
      "click",
      () => showSection("tasks")
    );
  }

  /* =========================================================
     DASHBOARD DATA
     ========================================================= */

  async function loadMe() {
    const data = await api("/api/me");

    if (data.user) {
      me = data.user;

      saveUser(me);

      updateProfileUI();
    }

    return data;
  }

  async function loadDashboard() {
    const data =
      await api("/api/dashboard");

    balance =
      Number(data.balance || 0);

    todayIncome =
      Number(data.todayEarnings || 0);

    totalIncome =
      Number(data.totalEarnings || 0);

    completedCount =
      Number(data.completedCount || 0);

    renderBalance();

    return data;
  }

  async function loadTasks() {
    const data =
      await api("/api/tasks");

    tasks =
      Array.isArray(data)
        ? data
        : Array.isArray(data.tasks)
          ? data.tasks
          : [];

    renderTasks();

    return tasks;
  }

  async function loadNotices() {
    try {
      const data =
        await api("/api/notices");

      notices =
        Array.isArray(data)
          ? data
          : Array.isArray(data.notices)
            ? data.notices
            : [];

      renderNotices();

    } catch (error) {
      console.warn(
        "Notice loading failed:",
        error.message
      );
    }
  }

  async function loadHistory() {
    try {
      /*
       * সঠিক endpoint:
       * /api/history
       *
       * /api/history/:id নয়
       */
      const data =
        await api("/api/history");

      history =
        Array.isArray(data)
          ? data
          : Array.isArray(data.history)
            ? data.history
            : [];

      renderHistory();

    } catch (error) {
      console.warn(
        "History loading failed:",
        error.message
      );
    }
  }

  async function refreshAll() {
    if (!session) return;

    try {
      await loadMe();
    } catch (error) {
      if (
        error.status === 401
      ) {
        forceLogout();
        return;
      }
    }

    await Promise.allSettled([
      loadDashboard(),
      loadTasks(),
      loadNotices(),
      loadHistory()
    ]);

    renderBalance();
    renderTasks();
    renderNotices();
    renderHistory();
  }

  /* =========================================================
     BALANCE
     ========================================================= */

  function renderBalance() {
    const balanceValue =
      money(balance);

    if ($("homeBalance")) {
      $("homeBalance").textContent =
        balanceValue;
    }

    if ($("balanceToday")) {
      $("balanceToday").textContent =
        money(todayIncome);
    }

    if ($("balanceTotal")) {
      $("balanceTotal").textContent =
        money(totalIncome);
    }

    if ($("todayIncome")) {
      $("todayIncome").textContent =
        money(todayIncome);
    }

    if ($("totalIncome")) {
      $("totalIncome").textContent =
        money(totalIncome);
    }

    if ($("completedCount")) {
      $("completedCount").textContent =
        completedCount;
    }
  }

  /* =========================================================
     TASKS
     ========================================================= */

  function getTaskAvailability(task) {
    if (!task) return null;

    return (
      task.available_at ||
      task.availableAt ||
      null
    );
  }

  function isTaskCooldown(task) {
    const available =
      getTaskAvailability(task);

    if (!available) return false;

    const time =
      new Date(available).getTime();

    return (
      !Number.isNaN(time) &&
      time > Date.now()
    );
  }

  function renderTasks() {
    const container =
      $("taskList");

    if (!container) return;

    if (!tasks.length) {
      container.innerHTML = `
        <div class="empty-state">
          এখন কোনো Task পাওয়া যায়নি।
        </div>
      `;

      return;
    }

    container.innerHTML =
      tasks.map((task) => {
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

        const cooldown =
          isTaskCooldown(task);

        return `
          <article class="task-card">

            <div class="task-top">

              <div>
                <h3>
                  ${escapeHTML(title)}
                </h3>

                <p>
                  ${escapeHTML(description)}
                </p>
              </div>

              <div class="task-reward">
                ${money(reward)}
              </div>

            </div>

            <div class="task-actions">

              ${
                cooldown
                  ? `
                    <button
                      class="task-disabled"
                      type="button"
                      disabled
                    >
                      5 ঘণ্টা Cooldown
                    </button>
                  `
                  : `
                    <button
                      class="task-start"
                      type="button"
                      data-task-id="${escapeHTML(id)}"
                    >
                      Start Task
                    </button>
                  `
              }

            </div>

            <div class="task-status">

              ${
                cooldown
                  ? `
                    আবার করা যাবে:
                    ${formatDateTime(
                      getTaskAvailability(task)
                    )}
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
      .querySelectorAll(
        ".task-start"
      )
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

  /* =========================================================
     START TASK
     ========================================================= */

  async function startTask(taskId) {
    const task =
      tasks.find(
        (item) =>
          String(item.id) ===
          String(taskId)
      );

    if (!task) {
      alert("Task পাওয়া যায়নি।");
      return;
    }

    if (activeTaskId) {
      alert(
        "আগে চলমান Task শেষ করুন।"
      );
      return;
    }

    if (isTaskCooldown(task)) {
      alert(
        "এই Task এখনো cooldown-এ আছে।"
      );
      return;
    }

    try {
      await api(
        `/api/tasks/${encodeURIComponent(taskId)}/start`,
        {
          method: "POST"
        }
      );

      activeTaskId = taskId;
      activeTask = task;
      taskStartedAt = Date.now();

      openTaskModal(task);

      startTaskTimer();

    } catch (error) {
      alert(
        error.message ||
        "Task শুরু করা যায়নি।"
      );
    }
  }

  /* =========================================================
     TASK MODAL
     ========================================================= */

  function openTaskModal(task) {
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
        "Task সম্পন্ন করুন।";
    }

    if ($("modalStatus")) {
      $("modalStatus").textContent =
        "Task চলছে...";
    }

    if ($("countdown")) {
      $("countdown").textContent =
        "10";
    }

    if ($("progressBar")) {
      $("progressBar").style.width =
        "0%";
    }

    if ($("verifyTaskBtn")) {
      $("verifyTaskBtn").disabled =
        true;
    }
  }

  function closeTaskModal() {
    if (activeTaskId) {
      cancelActiveTask();
      return;
    }

    $("taskModal")?.classList.add(
      "hidden"
    );
  }

  /* =========================================================
     TASK TIMER
     ========================================================= */

  function startTaskTimer() {
    stopTaskTimer();

    let seconds = 10;

    if ($("countdown")) {
      $("countdown").textContent =
        seconds;
    }

    taskTimer =
      setInterval(async () => {
        seconds--;

        if ($("countdown")) {
          $("countdown").textContent =
            Math.max(seconds, 0);
        }

        const progress =
          ((10 - seconds) / 10) * 100;

        if ($("progressBar")) {
          $("progressBar").style.width =
            `${Math.min(
              Math.max(progress, 0),
              100
            )}%`;
        }

        if (seconds <= 0) {
          stopTaskTimer();

          if ($("modalStatus")) {
            $("modalStatus").textContent =
              "Task complete হচ্ছে...";
          }

          if ($("verifyTaskBtn")) {
            $("verifyTaskBtn").disabled =
              false;
          }

          await completeTask();
        }

      }, 1000);

    /*
     * Backend heartbeat 8 sec-এর মধ্যে চায়।
     * তাই প্রতি 4 sec-এ heartbeat।
     */
    heartbeatTimer =
      setInterval(async () => {
        if (!activeTaskId) return;

        try {
          await api(
            `/api/tasks/${encodeURIComponent(activeTaskId)}/heartbeat`,
            {
              method: "POST"
            }
          );
        } catch (error) {
          console.warn(
            "Heartbeat failed:",
            error.message
          );
        }
      }, 4000);
  }

  function stopTaskTimer() {
    if (taskTimer) {
      clearInterval(taskTimer);
      taskTimer = null;
    }

    if (heartbeatTimer) {
      clearInterval(
        heartbeatTimer
      );

      heartbeatTimer = null;
    }
  }

  /* =========================================================
     COMPLETE TASK
     ========================================================= */

  async function completeTask() {
    if (!activeTaskId) return;

    const taskId =
      activeTaskId;

    try {
      if ($("verifyTaskBtn")) {
        $("verifyTaskBtn").disabled =
          true;
      }

      /*
       * Backend completion endpoint:
       * POST /api/tasks/:id/complete
       */
      await api(
        `/api/tasks/${encodeURIComponent(taskId)}/complete`,
        {
          method: "POST"
        }
      );

      stopTaskTimer();

      activeTaskId = null;
      activeTask = null;
      taskStartedAt = null;

      if ($("modalStatus")) {
        $("modalStatus").textContent =
          "Task সফলভাবে সম্পন্ন হয়েছে! Balance update হচ্ছে...";
      }

      /*
       * Complete হওয়ার সাথে সাথে
       * Dashboard + Task + History refresh।
       */
      await Promise.allSettled([
        loadDashboard(),
        loadTasks(),
        loadHistory()
      ]);

      renderBalance();
      renderTasks();
      renderHistory();

      setTimeout(() => {
        $("taskModal")?.classList.add(
          "hidden"
        );
      }, 700);

    } catch (error) {
      if ($("verifyTaskBtn")) {
        $("verifyTaskBtn").disabled =
          false;
      }

      if ($("modalStatus")) {
        $("modalStatus").textContent =
          error.message ||
          "Task complete করা যায়নি।";
      }

      /*
       * যদি 401 হয় তাহলে session শেষ।
       */
      if (error.status === 401) {
        forceLogout();
      }
    }
  }

  /* =========================================================
     CANCEL TASK
     ========================================================= */

  async function cancelActiveTask() {
    const taskId =
      activeTaskId;

    stopTaskTimer();

    activeTaskId = null;
    activeTask = null;
    taskStartedAt = null;

    if (taskId) {
      try {
        await api(
          `/api/tasks/${encodeURIComponent(taskId)}/cancel`,
          {
            method: "POST"
          }
        );
      } catch (error) {
        console.warn(
          "Task cancel:",
          error.message
        );
      }
    }

    $("taskModal")?.classList.add(
      "hidden"
    );
  }

  /* =========================================================
     NOTICES
     ========================================================= */

  function renderNotices() {
    const list =
      $("noticeList");

    const homeNotice =
      $("homeNotice");

    if (homeNotice) {
      if (notices.length) {
        const latest =
          notices[0];

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

    if (!notices.length) {
      list.innerHTML = `
        <div class="empty-state">
          বর্তমানে কোনো Notice নেই।
        </div>
      `;

      return;
    }

    list.innerHTML =
      notices.map((notice) => {
        return `
          <article class="notice-item">

            <strong>
              ${escapeHTML(
                notice.title ||
                "Notice"
              )}
            </strong>

            <p>
              ${escapeHTML(
                notice.message ||
                notice.text ||
                notice.description ||
                ""
              )}
            </p>

          </article>
        `;
      }).join("");
  }

  /* =========================================================
     HISTORY
     ========================================================= */

  function renderHistory() {
    const container =
      $("historyList");

    if (!container) return;

    if (!history.length) {
      container.innerHTML = `
        <div class="empty-state">
          এখনো কোনো earning history নেই।
        </div>
      `;

      return;
    }

    container.innerHTML =
      history.map((item) => {
        const amount =
          Number(
            item.amount || 0
          );

        return `
          <article class="history-item">

            <div>
              <strong>
                ${escapeHTML(
                  item.title ||
                  item.task_title ||
                  item.taskTitle ||
                  "Task"
                )}
              </strong>

              <small>
                ${formatDateTime(
                  item.created_at ||
                  item.createdAt ||
                  item.completed_at
                )}
              </small>
            </div>

            <div class="history-amount">
              ${money(amount)}
            </div>

            <div class="history-status">
              ${escapeHTML(
                item.status ||
                "Completed"
              )}
            </div>

          </article>
        `;
      }).join("");
  }

  /* =========================================================
     LOGOUT
     ========================================================= */

  async function logout() {
    try {
      if (session) {
        await api(
          "/api/logout",
          {
            method: "POST"
          }
        );
      }
    } catch (error) {
      console.warn(
        "Logout request:",
        error.message
      );
    }

    forceLogout();
  }

  function forceLogout() {
    stopTaskTimer();

    session = "";
    me = null;

    tasks = [];
    notices = [];
    history = [];

    balance = 0;
    todayIncome = 0;
    totalIncome = 0;
    completedCount = 0;

    activeTaskId = null;
    activeTask = null;

    clearSavedUser();

    $("dashboard")?.classList.add(
      "hidden"
    );

    $("authPage")?.classList.remove(
      "hidden"
    );

    $("taskModal")?.classList.add(
      "hidden"
    );

    activateLoginTab();
  }

  /* =========================================================
     BUTTONS
     ========================================================= */

  function setupButtons() {
    $("headerLogout")?.addEventListener(
      "click",
      logout
    );

    $("profileLogout")?.addEventListener(
      "click",
      logout
    );

    $("closeTaskModal")?.addEventListener(
      "click",
      closeTaskModal
    );

    $("cancelTaskBtn")?.addEventListener(
      "click",
      cancelActiveTask
    );

    /*
     * Manual verify button.
     * Timer শেষ হওয়ার আগে backend complete করবে না,
     * তাই button disabled থাকবে।
     */
    $("verifyTaskBtn")?.addEventListener(
      "click",
      completeTask
    );

    $("taskModal")?.addEventListener(
      "click",
      (event) => {
        if (
          event.target ===
          $("taskModal")
        ) {
          cancelActiveTask();
        }
      }
    );
  }

  /* =========================================================
     AUTH FORMS
     ========================================================= */

  function setupForms() {
    $("loginForm")?.addEventListener(
      "submit",
      handleLogin
    );

    $("registerForm")?.addEventListener(
      "submit",
      handleRegister
    );
  }

  /* =========================================================
     OPTIONAL SUPPORT BUTTON
     ========================================================= */

  function setupSupport() {
    const supportButtons =
      document.querySelectorAll(
        "[data-support]"
      );

    supportButtons.forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const type =
              button.dataset.support;

            if (type === "whatsapp") {
              window.open(
                "https://wa.me/8801961504587",
                "_blank",
                "noopener"
              );
            }

            if (type === "messenger") {
              window.open(
                "https://m.me/masud.11.jr",
                "_blank",
                "noopener"
              );
            }
          }
        );
      }
    );
  }

  /* =========================================================
     INITIAL SESSION
     ========================================================= */

  async function restoreSession() {
    if (!session) {
      openAuth();
      return;
    }

    const savedUser =
      loadSavedUser();

    if (savedUser) {
      me = savedUser;
    }

    try {
      /*
       * Session সত্যিই valid কিনা check।
       */
      await loadMe();

      openDashboard();

    } catch (error) {
      console.warn(
        "Session restore failed:",
        error.message
      );

      forceLogout();
    }
  }

  /* =========================================================
     INITIALIZE
     ========================================================= */

  function init() {
    setupAuthTabs();
    setupForms();
    setupNavigation();
    setupButtons();
    setupSupport();

    /*
     * Registration form যেন CSS-এর কারণে hidden না থাকে
     * এবং Login default হিসেবে দেখা যায়।
     */
    activateLoginTab();

    restoreSession();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
