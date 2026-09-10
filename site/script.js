(() => {
  "use strict";

  /* =========================================================
     MASUD JR OFFICIAL - COMPLETE SCRIPT
     ========================================================= */

  const RENDER_API =
    "https://masud-jr-official-online.onrender.com";

  const API_BASE =
    location.hostname.endsWith(".onrender.com")
      ? ""
      : RENDER_API;

  const USER_SESSION_KEY = "mjrUserSessionV2";
  const USER_KEY = "mjrUserV2";

  let session =
    localStorage.getItem(USER_SESSION_KEY) || "";

  let me = null;
  let tasks = [];
  let notices = [];

  let activeTaskId = null;
  let activeTask = null;

  let taskTimer = null;
  let heartbeatTimer = null;
  let taskStartedAt = 0;

  const TASK_DURATION = 10;

  /* =========================================================
     HELPER
     ========================================================= */

  const $ = (id) => document.getElementById(id);

  function setText(id, value) {
    const el = $(id);

    if (el) {
      el.textContent = value ?? "";
    }
  }

  function money(value) {
    const n = Number(value || 0);
    return `৳${n.toFixed(2)}`;
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function dateText(value) {
    if (!value) return "-";

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
      return String(value);
    }

    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function timeText(value) {
    if (!value) return "";

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
      return "";
    }

    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function showMessage(element, message, type = "") {
    if (!element) return;

    element.textContent = message || "";

    element.classList.remove(
      "success",
      "error",
      "warning"
    );

    if (type) {
      element.classList.add(type);
    }
  }

  /* =========================================================
     AUTH STORAGE
     ========================================================= */

  function saveUser() {
    if (!me) return;

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(me)
    );
  }

  function saveAuth(data) {
    if (!data) return;

    if (data.session) {
      session = data.session;

      localStorage.setItem(
        USER_SESSION_KEY,
        session
      );
    }

    if (data.user) {
      me = data.user;
      saveUser();
    }
  }

  function getSavedUser() {
    try {
      const raw =
        localStorage.getItem(USER_KEY);

      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearAuth() {
    session = "";
    me = null;

    localStorage.removeItem(
      USER_SESSION_KEY
    );

    localStorage.removeItem(
      USER_KEY
    );
  }

  /* =========================================================
     API
     ========================================================= */

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (session) {
      headers["x-user-session"] = session;
    }

    const response = await fetch(
      `${API_BASE}${path}`,
      {
        ...options,
        headers
      }
    );

    const data =
      await response.json().catch(() => ({}));

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
     AUTH TAB DESIGN
     ========================================================= */

  function installAuthStyles() {
    if ($("mjr-auth-style")) return;

    const style =
      document.createElement("style");

    style.id = "mjr-auth-style";

    style.textContent = `
      /* Login / Registration tabs */

      #authPage .auth-tabs,
      #authPage .tabs,
      #authPage .auth-tab-wrap,
      #authPage .tab-container {
        display: flex !important;
        gap: 0 !important;
        padding: 5px !important;
        border-radius: 16px !important;
        background: #eef2f7 !important;
      }

      #authPage .auth-tabs button,
      #authPage .tabs button,
      #authPage .auth-tab,
      #authPage .tab,
      #authPage .tab-btn {
        cursor: pointer !important;
        transition:
          all .2s ease !important;
      }

      #authPage .auth-tabs button:hover,
      #authPage .tabs button:hover,
      #authPage .auth-tab:hover,
      #authPage .tab:hover,
      #authPage .tab-btn:hover {
        transform: translateY(-1px) !important;
      }

      #authPage .mjr-login-active {
        background: #ffffff !important;
        color: #2563eb !important;
        border: 2px solid #111827 !important;
        box-shadow:
          0 4px 12px rgba(0,0,0,.08) !important;
        font-weight: 700 !important;
      }

      #authPage .mjr-register-active {
        background: #2563eb !important;
        color: #ffffff !important;
        border: 2px solid #2563eb !important;
        box-shadow:
          0 5px 15px rgba(37,99,235,.25) !important;
        font-weight: 700 !important;
      }

      #authPage .mjr-login-inactive,
      #authPage .mjr-register-inactive {
        background: transparent !important;
        color: #64748b !important;
        border: 2px solid transparent !important;
      }

      /* Forms must remain visible when selected */

      #authPage #loginForm.mjr-visible {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      #authPage #registerForm.mjr-visible {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      #authPage #loginForm.mjr-hidden,
      #authPage #registerForm.mjr-hidden {
        display: none !important;
      }

      /* Register button */

      #authPage #registerForm button[type="submit"] {
        background:
          linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
          ) !important;

        color: #ffffff !important;
        border: none !important;
        border-radius: 12px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        box-shadow:
          0 6px 18px rgba(37,99,235,.25) !important;
      }

      /* Login button */

      #authPage #loginForm button[type="submit"] {
        background:
          linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
          ) !important;

        color: #ffffff !important;
        border: none !important;
        border-radius: 12px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        box-shadow:
          0 6px 18px rgba(37,99,235,.25) !important;
      }

      #authPage button[type="submit"]:hover {
        filter: brightness(1.06) !important;
        transform: translateY(-1px) !important;
      }
    `;

    document.head.appendChild(style);
  }

  /* =========================================================
     FIND LOGIN / REGISTRATION TABS
     ========================================================= */

  function getAuthTabs() {
    const elements =
      Array.from(
        document.querySelectorAll(
          "#authPage button, #authPage a, #authPage [role='tab'], #authPage .tab, #authPage .tab-btn, #authPage .auth-tab"
        )
      );

    return elements.filter((el) => {
      const text =
        el.textContent
          .trim()
          .toLowerCase();

      return (
        text === "login" ||
        text === "registration" ||
        text.includes("registration")
      );
    });
  }

  function styleAuthTabs(active) {
    getAuthTabs().forEach((el) => {
      const text =
        el.textContent
          .trim()
          .toLowerCase();

      const isLogin =
        text === "login" ||
        (
          text.includes("login") &&
          !text.includes("registration")
        );

      const isRegistration =
        text.includes("registration");

      el.classList.remove(
        "mjr-login-active",
        "mjr-register-active",
        "mjr-login-inactive",
        "mjr-register-inactive"
      );

      if (
        active === "login" &&
        isLogin
      ) {
        el.classList.add(
          "mjr-login-active"
        );
      } else if (
        active === "registration" &&
        isRegistration
      ) {
        el.classList.add(
          "mjr-register-active"
        );
      } else if (isLogin) {
        el.classList.add(
          "mjr-login-inactive"
        );
      } else if (isRegistration) {
        el.classList.add(
          "mjr-register-inactive"
        );
      }
    });
  }

  /* =========================================================
     LOGIN TAB
     ========================================================= */

  function activateLoginTab() {
    installAuthStyles();

    const loginForm =
      $("loginForm");

    const registerForm =
      $("registerForm");

    if (loginForm) {
      loginForm.classList.remove(
        "mjr-hidden"
      );

      loginForm.classList.add(
        "mjr-visible"
      );

      loginForm.style.setProperty(
        "display",
        "block",
        "important"
      );

      loginForm.style.setProperty(
        "visibility",
        "visible",
        "important"
      );

      loginForm.style.setProperty(
        "opacity",
        "1",
        "important"
      );
    }

    if (registerForm) {
      registerForm.classList.remove(
        "mjr-visible"
      );

      registerForm.classList.add(
        "mjr-hidden"
      );

      registerForm.style.setProperty(
        "display",
        "none",
        "important"
      );
    }

    styleAuthTabs("login");
  }

  /* =========================================================
     REGISTRATION TAB
     ========================================================= */

  function activateRegistrationTab() {
    installAuthStyles();

    const loginForm =
      $("loginForm");

    const registerForm =
      $("registerForm");

    if (loginForm) {
      loginForm.classList.remove(
        "mjr-visible"
      );

      loginForm.classList.add(
        "mjr-hidden"
      );

      loginForm.style.setProperty(
        "display",
        "none",
        "important"
      );
    }

    if (registerForm) {
      registerForm.classList.remove(
        "mjr-hidden"
      );

      registerForm.classList.add(
        "mjr-visible"
      );

      registerForm.style.setProperty(
        "display",
        "block",
        "important"
      );

      registerForm.style.setProperty(
        "visibility",
        "visible",
        "important"
      );

      registerForm.style.setProperty(
        "opacity",
        "1",
        "important"
      );
    }

    styleAuthTabs(
      "registration"
    );
  }

  /* =========================================================
     BIND AUTH TABS
     ========================================================= */

  function bindAuthTabs() {
    installAuthStyles();

    const tabs =
      getAuthTabs();

    tabs.forEach((tab) => {
      if (
        tab.dataset.mjrAuthBound ===
        "1"
      ) {
        return;
      }

      tab.dataset.mjrAuthBound =
        "1";

      tab.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          const text =
            tab.textContent
              .trim()
              .toLowerCase();

          if (
            text.includes(
              "registration"
            )
          ) {
            activateRegistrationTab();
          } else {
            activateLoginTab();
          }
        }
      );
    });

    /*
     * Default screen:
     * Login
     */
    activateLoginTab();
  }

  /* =========================================================
     AUTH PAGE
     ========================================================= */

  function showAuthPage() {
    const auth =
      $("authPage");

    const dashboard =
      $("dashboard");

    if (auth) {
      auth.style.display = "";
    }

    if (dashboard) {
      dashboard.style.display =
        "none";
    }

    bindAuthTabs();
  }

  function showDashboard() {
    const auth =
      $("authPage");

    const dashboard =
      $("dashboard");

    if (auth) {
      auth.style.display =
        "none";
    }

    if (dashboard) {
      dashboard.style.display =
        "";
    }
  }

  /* =========================================================
     REGISTER
     ========================================================= */

  async function register(event) {
    if (event) {
      event.preventDefault();
    }

    const name =
      $("registerName")
        ?.value
        .trim() || "";

    const password =
      $("registerPassword")
        ?.value || "";

    const confirm =
      $("registerConfirm")
        ?.value || "";

    const message =
      $("registerMessage");

    if (!name) {
      showMessage(
        message,
        "নাম লিখুন।",
        "error"
      );
      return;
    }

    if (password.length < 4) {
      showMessage(
        message,
        "পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের দিন।",
        "error"
      );
      return;
    }

    if (password !== confirm) {
      showMessage(
        message,
        "দুইটি পাসওয়ার্ড মিলছে না।",
        "error"
      );
      return;
    }

    try {
      showMessage(
        message,
        "Registration হচ্ছে...",
        "warning"
      );

      const data =
        await api(
          "/api/register",
          {
            method: "POST",
            body: JSON.stringify({
              name,
              password
            })
          }
        );

      saveAuth(data);

      showMessage(
        message,
        "Registration সফল হয়েছে!",
        "success"
      );

      await openDashboard();

    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      showMessage(
        message,
        error.message ||
          "Registration failed.",
        "error"
      );
    }
  }

  /* =========================================================
     LOGIN
     ========================================================= */

  async function login(event) {
    if (event) {
      event.preventDefault();
    }

    const name =
      $("loginName")
        ?.value
        .trim() || "";

    const password =
      $("loginPassword")
        ?.value || "";

    const message =
      $("loginMessage");

    if (!name || !password) {
      showMessage(
        message,
        "নাম এবং পাসওয়ার্ড দিন।",
        "error"
      );
      return;
    }

    try {
      showMessage(
        message,
        "Login হচ্ছে...",
        "warning"
      );

      const data =
        await api(
          "/api/login",
          {
            method: "POST",
            body: JSON.stringify({
              name,
              password
            })
          }
        );

      saveAuth(data);

      showMessage(
        message,
        "Login সফল হয়েছে!",
        "success"
      );

      await openDashboard();

    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      showMessage(
        message,
        error.message ||
          "Login failed.",
        "error"
      );
    }
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
        "Logout error:",
        error
      );
    }

    stopTaskTimers();

    clearAuth();

    showAuthPage();
  }

  /* =========================================================
     ME
     ========================================================= */

  async function loadMe() {
    if (!session) {
      return null;
    }

    try {
      const data =
        await api(
          "/api/me"
        );

      me =
        data.user ||
        data.me ||
        data;

      saveUser();

      return me;

    } catch (error) {
      console.warn(
        "ME error:",
        error
      );

      if (
        error.status === 401 ||
        error.status === 403
      ) {
        clearAuth();
        showAuthPage();
      }

      return null;
    }
  }

  /* =========================================================
     USER UI
     ========================================================= */

  function renderUser() {
    if (!me) return;

    const name =
      me.name ||
      me.username ||
      "Masud JR";

    const id =
      me.id ??
      me.user_id ??
      me.userId ??
      "-";

    const joined =
      me.created_at ||
      me.createdAt ||
      me.joined_at ||
      me.joinedAt;

    setText(
      "headerUserName",
      name
    );

    setText(
      "profileName",
      name
    );

    setText(
      "profileId",
      String(id)
    );

    setText(
      "profileJoined",
      dateText(joined)
    );

    setText(
      "profileBalance",
      money(me.balance)
    );

    setText(
      "profileToday",
      money(me.todayEarnings)
    );

    setText(
      "profileTotal",
      money(me.totalEarnings)
    );

    setText(
      "profileCompleted",
      String(
        me.completedCount || 0
      )
    );

    const avatarIds = [
      "authAvatar",
      "userAvatar",
      "profileAvatar"
    ];

    avatarIds.forEach((id) => {
      const avatar = $(id);

      if (!avatar) return;

      if (
        avatar.tagName === "IMG"
      ) {
        if (
          !avatar.getAttribute("src")
        ) {
          avatar.src =
            "profile.jpg";
        }

        avatar.alt = name;
      } else {
        avatar.textContent =
          name
            .charAt(0)
            .toUpperCase();
      }
    });
  }

  /* =========================================================
     DASHBOARD
     ========================================================= */

  async function refreshDashboard() {
    if (!session) return;

    try {
      const data =
        await api(
          "/api/dashboard"
        );

      if (data.user) {
        me = {
          ...me,
          ...data.user
        };
      }

      if (data.me) {
        me = {
          ...me,
          ...data.me
        };
      }

      if (
        data.balance !==
        undefined
      ) {
        me = {
          ...me,
          balance:
            data.balance
        };
      }

      if (
        data.todayEarnings !==
        undefined
      ) {
        me = {
          ...me,
          todayEarnings:
            data.todayEarnings
        };
      }

      if (
        data.totalEarnings !==
        undefined
      ) {
        me = {
          ...me,
          totalEarnings:
            data.totalEarnings
        };
      }

      if (
        data.completedCount !==
        undefined
      ) {
        me = {
          ...me,
          completedCount:
            data.completedCount
        };
      }

      saveUser();

      renderUser();

      renderDashboardStats(
        data
      );

    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );

      if (
        error.status === 401 ||
        error.status === 403
      ) {
        clearAuth();
        showAuthPage();
      }
    }
  }

  function renderDashboardStats(
    data = {}
  ) {
    const balance =
      data.balance ??
      me?.balance ??
      0;

    const today =
      data.todayEarnings ??
      me?.todayEarnings ??
      0;

    const total =
      data.totalEarnings ??
      me?.totalEarnings ??
      0;

    const completed =
      data.completedCount ??
      me?.completedCount ??
      0;

    setText(
      "homeBalance",
      money(balance)
    );

    setText(
      "todayIncome",
      money(today)
    );

    setText(
      "balanceToday",
      money(today)
    );

    setText(
      "totalIncome",
      money(total)
    );

    setText(
      "balanceTotal",
      money(total)
    );

    setText(
      "completedCount",
      String(completed)
    );
  }

  /* =========================================================
     TASKS
     ========================================================= */

  async function loadTasks() {
    if (!session) return;

    try {
      const data =
        await api(
          "/api/tasks"
        );

      tasks =
        Array.isArray(data)
          ? data
          : data.tasks || [];

      renderTasks();

    } catch (error) {
      console.error(
        "Tasks error:",
        error
      );

      const list =
        $("taskList");

      if (list) {
        list.innerHTML = `
          <div class="empty-state error">
            ${esc(
              error.message ||
              "Task load করা যায়নি।"
            )}
          </div>
        `;
      }
    }
  }

  function renderTasks() {
    const list =
      $("taskList");

    if (!list) return;

    if (!tasks.length) {
      list.innerHTML = `
        <div class="empty-state">
          এখন কোনো task available নেই।
        </div>
      `;

      return;
    }

    list.innerHTML =
      tasks
        .map((task) => {
          const id =
            task.id;

          const title =
            task.title ||
            task.name ||
            "Task";

          const reward =
            task.reward ??
            task.amount ??
            0;

          const description =
            task.description ||
            task.details ||
            "";

          return `
            <div
              class="task-card"
              data-task-id="${esc(id)}"
            >

              <div class="task-card-content">

                <h3>
                  ${esc(title)}
                </h3>

                ${
                  description
                    ? `
                      <p>
                        ${esc(
                          description
                        )}
                      </p>
                    `
                    : ""
                }

                <div class="task-meta">
                  <span>
                    Reward:
                    ${money(reward)}
                  </span>
                </div>

              </div>

              <button
                type="button"
                class="task-start-btn"
                data-start-task="${esc(id)}"
              >
                Start Task
              </button>

            </div>
          `;
        })
        .join("");

    list
      .querySelectorAll(
        "[data-start-task]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            startTask(
              Number(
                button.dataset
                  .startTask
              )
            );
          }
        );
      });
  }

  function findTask(id) {
    return tasks.find(
      (task) =>
        Number(task.id) ===
        Number(id)
    );
  }

  /* =========================================================
     START TASK
     ========================================================= */

  async function startTask(id) {
    if (activeTaskId) {
      alert(
        "একটি task বর্তমানে চলছে।"
      );
      return;
    }

    const task =
      findTask(id);

    if (!task) {
      alert(
        "Task পাওয়া যায়নি।"
      );
      return;
    }

    try {
      await api(
        `/api/tasks/${id}/start`,
        {
          method: "POST"
        }
      );

      activeTaskId =
        id;

      activeTask =
        task;

      taskStartedAt =
        Date.now();

      openTaskModal(
        task
      );

      startTaskTimers();

    } catch (error) {
      console.error(
        "Start task error:",
        error
      );

      alert(
        error.message ||
        "Task start করা যায়নি।"
      );
    }
  }

  /* =========================================================
     TASK MODAL
     ========================================================= */

  function openTaskModal(
    task
  ) {
    const modal =
      $("taskModal");

    if (!modal) return;

    setText(
      "modalTaskTitle",
      task.title ||
      task.name ||
      "Task"
    );

    const reward =
      task.reward ??
      task.amount ??
      0;

    const description =
      task.description ||
      task.details ||
      "Task complete করুন।";

    const info =
      $("modalTaskInfo");

    if (info) {
      info.innerHTML = `
        <p>
          ${esc(
            description
          )}
        </p>

        <p>
          <strong>
            Reward:
          </strong>
          ${money(reward)}
        </p>
      `;
    }

    setText(
      "modalStatus",
      "Task চলছে..."
    );

    setText(
      "countdown",
      String(
        TASK_DURATION
      )
    );

    const progress =
      $("progressBar");

    if (progress) {
      progress.style.width =
        "0%";
    }

    const verify =
      $("verifyTaskBtn");

    if (verify) {
      verify.disabled =
        true;
    }

    const cancel =
      $("cancelTaskBtn");

    if (cancel) {
      cancel.disabled =
        false;
    }

    modal.style.display =
      "";

    modal.classList.add(
      "active"
    );
  }

  function closeTaskModal() {
    const modal =
      $("taskModal");

    if (!modal) return;

    modal.classList.remove(
      "active"
    );

    modal.style.display =
      "none";
  }

  /* =========================================================
     TASK TIMER
     ========================================================= */

  function startTaskTimers() {
    stopTaskTimers(false);

    heartbeatTimer =
      setInterval(
        async () => {
          if (!activeTaskId) {
            return;
          }

          try {
            await api(
              `/api/tasks/${activeTaskId}/heartbeat`,
              {
                method:
                  "POST"
              }
            );
          } catch (error) {
            console.warn(
              "Heartbeat failed:",
              error
            );
          }
        },
        4000
      );

    taskTimer =
      setInterval(
        async () => {
          if (!activeTaskId) {
            return;
          }

          const elapsed =
            Math.floor(
              (
                Date.now() -
                taskStartedAt
              ) / 1000
            );

          const remaining =
            Math.max(
              0,
              TASK_DURATION -
                elapsed
            );

          setText(
            "countdown",
            String(
              remaining
            )
          );

          const progress =
            $("progressBar");

          if (progress) {
            const percent =
              Math.min(
                100,
                (
                  elapsed /
                  TASK_DURATION
                ) * 100
              );

            progress.style.width =
              `${percent}%`;
          }

          if (
            elapsed >=
            TASK_DURATION
          ) {
            clearInterval(
              taskTimer
            );

            taskTimer =
              null;

            await finishTask();
          }
        },
        250
      );
  }

  /* =========================================================
     COMPLETE TASK
     ========================================================= */

  async function finishTask() {
    if (!activeTaskId) {
      return;
    }

    const id =
      activeTaskId;

    const status =
      $("modalStatus");

    const verify =
      $("verifyTaskBtn");

    if (verify) {
      verify.disabled =
        true;
    }

    if (status) {
      status.textContent =
        "Reward processing...";
    }

    try {
      await api(
        `/api/tasks/${id}/complete`,
        {
          method:
            "POST"
        }
      );

      stopTaskTimers();

      if (status) {
        status.textContent =
          "Task completed successfully!";
      }

      if (verify) {
        verify.style.display =
          "none";
      }

      /*
       * Balance immediately refresh
       */
      await refreshAll();

      setTimeout(
        () => {
          closeTaskModal();
        },
        1000
      );

    } catch (error) {
      console.error(
        "Complete task error:",
        error
      );

      stopTaskTimers();

      if (status) {
        status.textContent =
          error.message ||
          "Task complete হয়নি।";
      }

      if (verify) {
        verify.disabled =
          false;
      }
    }
  }

  /* =========================================================
     CANCEL TASK
     ========================================================= */

  async function cancelTask() {
    const id =
      activeTaskId;

    stopTaskTimers();

    if (id) {
      try {
        await api(
          `/api/tasks/${id}/cancel`,
          {
            method:
              "POST"
          }
        );
      } catch (error) {
        console.warn(
          "Cancel task error:",
          error
        );
      }
    }

    closeTaskModal();

    activeTaskId =
      null;

    activeTask =
      null;

    await loadTasks();
  }

  function stopTaskTimers(
    reset = true
  ) {
    if (taskTimer) {
      clearInterval(
        taskTimer
      );

      taskTimer =
        null;
    }

    if (heartbeatTimer) {
      clearInterval(
        heartbeatTimer
      );

      heartbeatTimer =
        null;
    }

    if (reset) {
      activeTaskId =
        null;

      activeTask =
        null;

      taskStartedAt =
        0;
    }
  }

  /* =========================================================
     HISTORY
     ========================================================= */

  async function loadHistory() {
    if (!session) return;

    try {
      const data =
        await api(
          "/api/history"
        );

      const history =
        Array.isArray(data)
          ? data
          : data.history || [];

      renderHistory(
        history
      );

    } catch (error) {
      console.error(
        "History error:",
        error
      );
    }
  }

  function renderHistory(
    history
  ) {
    const list =
      $("historyList");

    if (!list) return;

    if (!history.length) {
      list.innerHTML = `
        <div class="empty-state">
          এখনো কোনো earning history নেই।
        </div>
      `;

      return;
    }

    list.innerHTML =
      history
        .map((item) => {
          const amount =
            item.amount ??
            item.reward ??
            item.earning ??
            0;

          const title =
            item.title ||
            item.task_title ||
            item.taskName ||
            "Task";

          const created =
            item.created_at ||
            item.createdAt;

          return `
            <div class="history-item">

              <div>
                <strong>
                  ${esc(title)}
                </strong>

                <small>
                  ${dateText(
                    created
                  )}
                  ${timeText(
                    created
                  )}
                </small>
              </div>

              <strong>
                +${money(
                  amount
                )}
              </strong>

            </div>
          `;
        })
        .join("");
  }

  /* =========================================================
     NOTICES
     ========================================================= */

  async function loadNotices() {
    if (!session) return;

    try {
      const data =
        await api(
          "/api/notices"
        );

      notices =
        Array.isArray(data)
          ? data
          : data.notices || [];

      renderNotices();

    } catch (error) {
      console.error(
        "Notices error:",
        error
      );
    }
  }

  function renderNotices() {
    const list =
      $("noticeList");

    if (list) {
      if (!notices.length) {
        list.innerHTML = `
          <div class="empty-state">
            কোনো notice নেই।
          </div>
        `;
      } else {
        list.innerHTML =
          notices
            .map(
              (notice) => {
                const title =
                  notice.title ||
                  "Notice";

                const body =
                  notice.message ||
                  notice.body ||
                  notice.content ||
                  "";

                const created =
                  notice.created_at ||
                  notice.createdAt;

                return `
                  <div class="notice-item">

                    <h4>
                      ${esc(
                        title
                      )}
                    </h4>

                    <p>
                      ${esc(
                        body
                      )}
                    </p>

                    ${
                      created
                        ? `
                          <small>
                            ${dateText(
                              created
                            )}
                          </small>
                        `
                        : ""
                    }

                  </div>
                `;
              }
            )
            .join("");
      }
    }

    const homeNotice =
      $("homeNotice");

    if (homeNotice) {
      const latest =
        notices[0];

      if (!latest) {
        homeNotice.innerHTML =
          "কোনো নতুন notice নেই।";
      } else {
        homeNotice.innerHTML = `
          <strong>
            ${esc(
              latest.title ||
              "Notice"
            )}
          </strong>

          <div>
            ${esc(
              latest.message ||
              latest.body ||
              latest.content ||
              ""
            )}
          </div>
        `;
      }
    }
  }

  /* =========================================================
     WITHDRAW
     ========================================================= */

  async function submitWithdrawal(
    event
  ) {
    if (event) {
      event.preventDefault();
    }

    const method =
      $("withdrawMethod")
        ?.value || "";

    const number =
      $("withdrawNumber")
        ?.value
        .trim() || "";

    const amount =
      Number(
        $("withdrawAmount")
          ?.value || 0
      );

    const message =
      $("withdrawMessage");

    if (!method) {
      showMessage(
        message,
        "Withdraw method নির্বাচন করুন।",
        "error"
      );
      return;
    }

    if (!number) {
      showMessage(
        message,
        "Account number দিন।",
        "error"
      );
      return;
    }

    if (!amount || amount <= 0) {
      showMessage(
        message,
        "সঠিক amount দিন।",
        "error"
      );
      return;
    }

    try {
      showMessage(
        message,
        "Withdrawal request পাঠানো হচ্ছে...",
        "warning"
      );

      await api(
        "/api/withdrawals",
        {
          method:
            "POST",
          body:
            JSON.stringify({
              method,
              number,
              amount
            })
        }
      );

      showMessage(
        message,
        "Withdrawal request সফল হয়েছে।",
        "success"
      );

      if (
        $("withdrawAmount")
      ) {
        $("withdrawAmount")
          .value = "";
      }

      await refreshDashboard();

    } catch (error) {
      console.error(
        "Withdrawal error:",
        error
      );

      showMessage(
        message,
        error.message ||
          "Withdrawal failed.",
        "error"
      );
    }
  }

  /* =========================================================
     SUPPORT
     ========================================================= */

  function openWhatsApp() {
    window.open(
      "https://wa.me/8801961504587",
      "_blank",
      "noopener,noreferrer"
    );
  }

  function openMessenger() {
    window.open(
      "https://m.me/masud.11.jr",
      "_blank",
      "noopener,noreferrer"
    );
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */

  function openSection(name) {
    const sections =
      document.querySelectorAll(
        "[data-section]"
      );

    sections.forEach(
      (section) => {
        section.classList.toggle(
          "active",
          section.dataset.section ===
            name
        );
      }
    );

    document
      .querySelectorAll(
        "[data-nav]"
      )
      .forEach(
        (button) => {
          button.classList.toggle(
            "active",
            button.dataset.nav ===
              name
          );
        }
      );

    const sectionIds = {
      home:
        "homeSection",
      tasks:
        "tasksSection",
      history:
        "historySection",
      profile:
        "profileSection"
    };

    Object.entries(
      sectionIds
    ).forEach(
      ([sectionName, id]) => {
        const el = $(id);

        if (!el) return;

        el.style.display =
          sectionName === name
            ? ""
            : "none";
      }
    );

    if (name === "home") {
      refreshDashboard()
        .catch(console.error);
    }

    if (name === "tasks") {
      loadTasks()
        .catch(console.error);
    }

    if (name === "history") {
      loadHistory()
        .catch(console.error);
    }

    if (name === "profile") {
      renderUser();
    }
  }

  /* =========================================================
     EVENTS
     ========================================================= */

  function bindEvents() {

    /* Login */
    const loginForm =
      $("loginForm");

    if (loginForm) {
      loginForm.addEventListener(
        "submit",
        login
      );
    }

    /* Registration */
    const registerForm =
      $("registerForm");

    if (registerForm) {
      registerForm.addEventListener(
        "submit",
        register
      );
    }

    /* Auth tabs */
    bindAuthTabs();

    /* Logout */
    document
      .querySelectorAll(
        "[data-action='logout'], #logoutBtn, .logout-btn"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            logout
          );
        }
      );

    /* Navigation */
    document
      .querySelectorAll(
        "[data-nav]"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              openSection(
                button.dataset.nav
              );
            }
          );
        }
      );

    /* Common navigation IDs */
    const navMap = {
      homeBtn:
        "home",
      homeNav:
        "home",
      tasksBtn:
        "tasks",
      tasksNav:
        "tasks",
      historyBtn:
        "history",
      historyNav:
        "history",
      profileBtn:
        "profile",
      profileNav:
        "profile"
    };

    Object.entries(
      navMap
    ).forEach(
      ([id, section]) => {
        const button =
          $(id);

        if (!button) return;

        button.addEventListener(
          "click",
          () => {
            openSection(
              section
            );
          }
        );
      }
    );

    /* Close task */
    const close =
      $("closeTaskModal");

    if (close) {
      close.addEventListener(
        "click",
        closeTaskModal
      );
    }

    /* Cancel task */
    const cancel =
      $("cancelTaskBtn");

    if (cancel) {
      cancel.addEventListener(
        "click",
        cancelTask
      );
    }

    /* Verify task */
    const verify =
      $("verifyTaskBtn");

    if (verify) {
      verify.addEventListener(
        "click",
        finishTask
      );
    }

    /* Withdraw */
    const withdrawForm =
      $("withdrawForm");

    if (withdrawForm) {
      withdrawForm.addEventListener(
        "submit",
        submitWithdrawal
      );
    }

    /* WhatsApp */
    document
      .querySelectorAll(
        "[data-support='whatsapp'], #whatsappSupport"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            openWhatsApp
          );
        }
      );

    /* Messenger */
    document
      .querySelectorAll(
        "[data-support='messenger'], #messengerSupport"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            openMessenger
          );
        }
      );
  }

  /* =========================================================
     REFRESH EVERYTHING
     ========================================================= */

  async function refreshAll() {
    if (!session) return;

    await Promise.allSettled([
      refreshDashboard(),
      loadTasks(),
      loadHistory(),
      loadNotices()
    ]);

    renderUser();
  }

  /* =========================================================
     OPEN DASHBOARD
     ========================================================= */

  async function openDashboard() {
    showDashboard();

    await loadMe();

    if (!session) {
      showAuthPage();
      return;
    }

    renderUser();

    await refreshAll();

    openSection("home");
  }

  /* =========================================================
     INIT
     ========================================================= */

  async function init() {
    installAuthStyles();

    const savedUser =
      getSavedUser();

    if (savedUser) {
      me = savedUser;
    }

    bindEvents();

    if (!session) {
      showAuthPage();
      return;
    }

    const currentUser =
      await loadMe();

    if (!currentUser) {
      clearAuth();
      showAuthPage();
      return;
    }

    await openDashboard();
  }

  /* =========================================================
     START
     ========================================================= */

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
