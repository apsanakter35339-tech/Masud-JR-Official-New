(() => {
  "use strict";

  /* =========================================================
     MASUD JR OFFICIAL
     Complete Frontend Script
     Login + Registration + Dashboard + Tasks + Balance
     ========================================================= */

  const RENDER_API =
    "https://masud-jr-official-online.onrender.com";

  // Netlify হলে Render API ব্যবহার করবে।
  // Render-এর নিজের domain হলে same-origin ব্যবহার করবে।
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

  let activeTaskId = null;
  let activeTask = null;

  let taskTimer = null;
  let heartbeatTimer = null;

  let taskStartedAt = 0;

  const $ = (id) => document.getElementById(id);

  /* =========================================================
     BASIC HELPERS
     ========================================================= */

  function safeText(value) {
    return value == null ? "" : String(value);
  }

  function money(value) {
    const n = Number(value || 0);

    return "৳" + n.toLocaleString("en-US", {
      maximumFractionDigits: 2
    });
  }

  function saveUser() {
    if (me) {
      localStorage.setItem(
        USER_KEY,
        JSON.stringify(me)
      );
    }
  }

  function clearUser() {
    me = null;
    session = "";

    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_SESSION_KEY);
  }

  function loadSavedUser() {
    try {
      const raw =
        localStorage.getItem(USER_KEY);

      if (raw) {
        me = JSON.parse(raw);
      }
    } catch (error) {
      me = null;
    }

    if (!session) {
      me = null;
      localStorage.removeItem(USER_KEY);
    }
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
     MESSAGE
     ========================================================= */

  function showMessage(elementId, message, type = "error") {
    const el = $(elementId);

    if (!el) return;

    el.textContent = message || "";

    el.style.display =
      message ? "block" : "none";

    if (type === "success") {
      el.style.color = "#16a34a";
    } else {
      el.style.color = "#dc2626";
    }
  }

  /* =========================================================
     AUTH PAGE
     ========================================================= */

  function showAuthPage() {
    const auth = $("authPage");
    const dashboard = $("dashboard");

    if (auth) {
      auth.style.display = "";
    }

    if (dashboard) {
      dashboard.style.display = "none";
    }
  }

  function showDashboardPage() {
    const auth = $("authPage");
    const dashboard = $("dashboard");

    if (auth) {
      auth.style.display = "none";
    }

    if (dashboard) {
      dashboard.style.display = "";
    }
  }

  /* =========================================================
     LOGIN / REGISTRATION TABS
     ========================================================= */

  function activateLoginTab() {
    const loginForm = $("loginForm");
    const registerForm = $("registerForm");

    if (loginForm) {
      loginForm.style.display = "";
    }

    if (registerForm) {
      registerForm.style.display = "none";
    }

    styleAuthTabs("login");
  }

  function activateRegisterTab() {
    const loginForm = $("loginForm");
    const registerForm = $("registerForm");

    if (loginForm) {
      loginForm.style.display = "none";
    }

    if (registerForm) {
      registerForm.style.display = "";
    }

    styleAuthTabs("register");
  }

  function styleAuthTabs(active) {
    const buttons =
      document.querySelectorAll(
        "[data-auth-tab]"
      );

    buttons.forEach((button) => {
      const tab =
        button.dataset.authTab;

      if (tab === active) {
        button.style.background =
          "linear-gradient(135deg,#2563eb,#4f46e5)";

        button.style.color = "#fff";
        button.style.border = "2px solid #2563eb";
        button.style.boxShadow =
          "0 8px 20px rgba(37,99,235,.25)";
      } else {
        button.style.background =
          "#eef2f7";

        button.style.color =
          "#64748b";

        button.style.border =
          "2px solid transparent";

        button.style.boxShadow =
          "none";
      }
    });
  }

  function setupAuthTabs() {
    // যদি HTML-এ data-auth-tab থাকে
    document
      .querySelectorAll("[data-auth-tab]")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const tab =
              button.dataset.authTab;

            if (tab === "login") {
              activateLoginTab();
            }

            if (tab === "register") {
              activateRegisterTab();
            }
          }
        );
      });

    // Existing buttons-এর text থেকেও tab detect করবে
    const authPage = $("authPage");

    if (authPage) {
      authPage
        .querySelectorAll("button, .tab, .auth-tab, [role='button']")
        .forEach((element) => {
          const text =
            safeText(element.textContent)
              .trim()
              .toLowerCase();

          if (
            text === "login" ||
            text === "লগইন"
          ) {
            element.addEventListener(
              "click",
              activateLoginTab
            );
          }

          if (
            text === "registration" ||
            text === "register" ||
            text === "রেজিস্ট্রেশন"
          ) {
            element.addEventListener(
              "click",
              activateRegisterTab
            );
          }
        });
    }

    activateLoginTab();
  }

  /* =========================================================
     LOGIN
     ========================================================= */

  async function handleLogin(event) {
    if (event) {
      event.preventDefault();
    }

    const name =
      $("loginName")?.value.trim() || "";

    const password =
      $("loginPassword")?.value || "";

    if (!name || !password) {
      showMessage(
        "loginMessage",
        "নাম/User ID এবং Password দিন।"
      );
      return;
    }

    showMessage(
      "loginMessage",
      "Login হচ্ছে...",
      "success"
    );

    try {
      const data = await api(
        "/api/login",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            password
          })
        }
      );

      session = data.session || "";

      me = data.user || null;

      if (!session) {
        throw new Error(
          "Server session দেয়নি। আবার চেষ্টা করুন।"
        );
      }

      localStorage.setItem(
        USER_SESSION_KEY,
        session
      );

      saveUser();

      showMessage(
        "loginMessage",
        "Login সফল হয়েছে।",
        "success"
      );

      await openDashboard();

    } catch (error) {
      console.error("LOGIN ERROR:", error);

      showMessage(
        "loginMessage",
        error.message ||
          "Login করা যায়নি।"
      );
    }
  }

  /* =========================================================
     REGISTRATION
     ========================================================= */

  async function handleRegistration(event) {
    if (event) {
      event.preventDefault();
    }

    const name =
      $("registerName")?.value.trim() || "";

    const password =
      $("registerPassword")?.value || "";

    const confirm =
      $("registerConfirm")?.value || "";

    if (!name) {
      showMessage(
        "registerMessage",
        "আপনার নাম/User ID দিন।"
      );
      return;
    }

    if (!password) {
      showMessage(
        "registerMessage",
        "Password দিন।"
      );
      return;
    }

    if (password.length < 4) {
      showMessage(
        "registerMessage",
        "Password কমপক্ষে ৪ অক্ষরের দিন।"
      );
      return;
    }

    if (password !== confirm) {
      showMessage(
        "registerMessage",
        "Password এবং Confirm Password মিলছে না।"
      );
      return;
    }

    showMessage(
      "registerMessage",
      "Registration হচ্ছে...",
      "success"
    );

    try {
      const data = await api(
        "/api/register",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            password
          })
        }
      );

      session = data.session || "";

      me = data.user || null;

      if (!session) {
        throw new Error(
          "Registration হয়েছে কিন্তু session পাওয়া যায়নি।"
        );
      }

      localStorage.setItem(
        USER_SESSION_KEY,
        session
      );

      saveUser();

      showMessage(
        "registerMessage",
        "Registration সফল হয়েছে।",
        "success"
      );

      // Registration-এর পর সরাসরি dashboard
      await openDashboard();

    } catch (error) {
      console.error(
        "REGISTRATION ERROR:",
        error
      );

      showMessage(
        "registerMessage",
        error.message ||
          "Registration করা যায়নি।"
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
        ).catch(() => {});
      }
    } finally {
      stopTaskTimers();

      clearUser();

      closeTaskModal();
      closeProfileModal();
      closeSupportModal();

      showAuthPage();

      activateLoginTab();

      if ($("loginMessage")) {
        $("loginMessage").textContent = "";
      }

      if ($("registerMessage")) {
        $("registerMessage").textContent = "";
      }
    }
  }

  /* =========================================================
     CURRENT USER
     ========================================================= */

  async function loadMe() {
    if (!session) {
      return null;
    }

    try {
      const data =
        await api("/api/me");

      me =
        data.user ||
        data.me ||
        data ||
        me;

      saveUser();

      return me;

    } catch (error) {
      if (
        error.status === 401 ||
        error.status === 403
      ) {
        clearUser();
        showAuthPage();
      }

      return null;
    }
  }

  /* =========================================================
     DASHBOARD
     ========================================================= */

  async function loadDashboard() {
    const data =
      await api("/api/dashboard");

    if (data.user) {
      me = data.user;
    }

    // Backend-এর dashboard data
    if (data.balance != null) {
      me = {
        ...(me || {}),
        balance: data.balance
      };
    }

    if (data.todayEarnings != null) {
      me = {
        ...(me || {}),
        todayEarnings:
          data.todayEarnings
      };
    }

    if (data.totalEarnings != null) {
      me = {
        ...(me || {}),
        totalEarnings:
          data.totalEarnings
      };
    }

    if (data.completedCount != null) {
      me = {
        ...(me || {}),
        completedCount:
          data.completedCount
      };
    }

    saveUser();

    updateDashboardUI(data);

    return data;
  }

  function updateDashboardUI(data = {}) {
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

    // Home balance
    setText(
      "homeBalance",
      money(balance)
    );

    // Today income
    setText(
      "todayIncome",
      money(today)
    );

    setText(
      "balanceToday",
      money(today)
    );

    // Total income
    setText(
      "totalIncome",
      money(total)
    );

    setText(
      "balanceTotal",
      money(total)
    );

    // Completed
    setText(
      "completedCount",
      completed
    );

    // Header / profile
    updateUserUI();
  }

  function setText(id, value) {
    const el = $(id);

    if (el) {
      el.textContent = safeText(value);
    }
  }

  /* =========================================================
     USER UI
     ========================================================= */

  function updateUserUI() {
    if (!me) return;

    const name =
      me.name ||
      me.username ||
      me.userId ||
      "User";

    const userId =
      me.id ||
      me.user_id ||
      me.username ||
      name;

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
      userId
    );

    const joined =
      me.created_at ||
      me.createdAt ||
      me.joined ||
      "";

    if (joined) {
      setText(
        "profileJoined",
        formatDate(joined)
      );
    }

    // Avatar যদি image হয়, src নষ্ট করবে না।
    document
      .querySelectorAll(
        "#authAvatar,#userAvatar,#profileAvatar"
      )
      .forEach((avatar) => {
        if (avatar.tagName === "IMG") {
          if (
            !avatar.getAttribute("src")
          ) {
            avatar.src = "profile.jpg";
          }

          avatar.alt = name;
        } else {
          avatar.textContent =
            getInitials(name);
        }
      });
  }

  function getInitials(name) {
    const parts =
      safeText(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!parts.length) {
      return "MJ";
    }

    return parts
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }

  function formatDate(value) {
    const date =
      new Date(value);

    if (Number.isNaN(date.getTime())) {
      return safeText(value);
    }

    return date.toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    );
  }

  /* =========================================================
     TASKS
     ========================================================= */

  async function loadTasks() {
    const data =
      await api("/api/tasks");

    tasks =
      Array.isArray(data)
        ? data
        : (
            data.tasks ||
            data.data ||
            []
          );

    renderTasks();

    return tasks;
  }

  function renderTasks() {
    const list =
      $("taskList");

    if (!list) return;

    if (!tasks.length) {
      list.innerHTML = `
        <div style="
          padding:20px;
          text-align:center;
          color:#64748b;
        ">
          এখন কোনো নতুন Task নেই।
        </div>
      `;

      return;
    }

    list.innerHTML = "";

    tasks.forEach((task) => {
      const id =
        task.id ??
        task.task_id;

      const title =
        task.title ||
        task.name ||
        "Task";

      const reward =
        task.reward ??
        task.amount ??
        0;

      const available =
        task.available_at ||
        "";

      const item =
        document.createElement("div");

      item.className =
        "task-card";

      item.style.cssText = `
        background:#fff;
        border-radius:18px;
        padding:18px;
        margin:12px 0;
        box-shadow:0 5px 18px rgba(15,23,42,.08);
        border:1px solid #e5e7eb;
      `;

      item.innerHTML = `
        <div style="
          display:flex;
          justify-content:space-between;
          gap:12px;
          align-items:center;
        ">
          <div>
            <div style="
              font-size:18px;
              font-weight:700;
              color:#12345b;
            ">
              ${escapeHTML(title)}
            </div>

            <div style="
              margin-top:6px;
              color:#64748b;
            ">
              Reward: <b>${money(reward)}</b>
            </div>

            ${
              available
                ? `
                  <div style="
                    margin-top:5px;
                    color:#64748b;
                    font-size:13px;
                  ">
                    Available: ${escapeHTML(
                      formatDateTime(available)
                    )}
                  </div>
                `
                : ""
            }
          </div>

          <button
            type="button"
            class="task-start-button"
            data-task-id="${escapeHTML(id)}"
            style="
              border:0;
              border-radius:12px;
              padding:11px 18px;
              background:linear-gradient(135deg,#2563eb,#4f46e5);
              color:#fff;
              font-weight:700;
              cursor:pointer;
            "
          >
            Start
          </button>
        </div>
      `;

      list.appendChild(item);
    });

    list
      .querySelectorAll(
        ".task-start-button"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const id =
              button.dataset.taskId;

            startTask(id);
          }
        );
      });
  }

  async function startTask(taskId) {
    const task =
      tasks.find(
        (t) =>
          String(t.id ?? t.task_id) ===
          String(taskId)
      );

    if (!task) {
      alert("Task পাওয়া যায়নি।");
      return;
    }

    if (activeTaskId) {
      alert(
        "একটি Task ইতিমধ্যে চলছে।"
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

      startTaskTimers(taskId);

    } catch (error) {
      console.error(
        "TASK START ERROR:",
        error
      );

      alert(
        error.message ||
          "Task শুরু করা যায়নি।"
      );
    }
  }

  /* =========================================================
     TASK TIMER + HEARTBEAT
     ========================================================= */

  function startTaskTimers(taskId) {
    stopTaskTimers();

    taskStartedAt = Date.now();

    updateCountdown();

    taskTimer = setInterval(
      updateCountdown,
      1000
    );

    // Backend heartbeat প্রতি ৪ সেকেন্ডে
    heartbeatTimer = setInterval(
      async () => {
        if (!activeTaskId) return;

        try {
          await api(
            `/api/tasks/${encodeURIComponent(taskId)}/heartbeat`,
            {
              method: "POST"
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
  }

  function updateCountdown() {
    if (!activeTaskId) return;

    const elapsed =
      Date.now() - taskStartedAt;

    const total = 10000;

    const remaining =
      Math.max(
        0,
        total - elapsed
      );

    const seconds =
      Math.ceil(
        remaining / 1000
      );

    setText(
      "countdown",
      remaining > 0
        ? `${seconds}s`
        : "Ready"
    );

    const progress =
      Math.min(
        100,
        (elapsed / total) * 100
      );

    const bar =
      $("progressBar");

    if (bar) {
      bar.style.width =
        `${progress}%`;
    };

    const verify =
      $("verifyTaskBtn");

    if (verify) {
      verify.disabled =
        remaining > 0;

      verify.style.opacity =
        remaining > 0
          ? "0.5"
          : "1";

      verify.style.cursor =
        remaining > 0
          ? "not-allowed"
          : "pointer";
    }
  }

  function stopTaskTimers() {
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
     TASK COMPLETE
     ========================================================= */

  async function completeTask() {
    if (!activeTaskId) {
      return;
    }

    const elapsed =
      Date.now() - taskStartedAt;

    if (elapsed < 10000) {
      alert(
        "Task সম্পূর্ণ করতে ১০ সেকেন্ড অপেক্ষা করুন।"
      );

      return;
    }

    const id =
      activeTaskId;

    const button =
      $("verifyTaskBtn");

    if (button) {
      button.disabled = true;
      button.textContent =
        "Processing...";
    }

    try {
      // সঠিক backend endpoint
      await api(
        `/api/tasks/${encodeURIComponent(id)}/complete`,
        {
          method: "POST"
        }
      );

      stopTaskTimers();

      activeTaskId = null;
      activeTask = null;

      closeTaskModal();

      /*
       * সবচেয়ে গুরুত্বপূর্ণ:
       * Complete হওয়ার পর Dashboard reload।
       * তাই Balance সাথে সাথে update হবে।
       */
      await refreshAll();

      alert(
        "Task সফলভাবে Complete হয়েছে। Balance আপডেট হয়েছে।"
      );

    } catch (error) {
      console.error(
        "TASK COMPLETE ERROR:",
        error
      );

      if (button) {
        button.disabled = false;
        button.textContent =
          "Verify Task";
      }

      alert(
        error.message ||
          "Task Complete করা যায়নি।"
      );
    }
  }

  /* =========================================================
     TASK CANCEL
     ========================================================= */

  async function cancelTask() {
    if (!activeTaskId) {
      closeTaskModal();
      return;
    }

    const id =
      activeTaskId;

    stopTaskTimers();

    try {
      await api(
        `/api/tasks/${encodeURIComponent(id)}/cancel`,
        {
          method: "POST"
        }
      );
    } catch (error) {
      console.warn(
        "Task cancel error:",
        error
      );
    }

    activeTaskId = null;
    activeTask = null;

    closeTaskModal();

    await loadTasks().catch(() => {});
  }

  /* =========================================================
     TASK MODAL
     ========================================================= */

  function openTaskModal(task) {
    const modal =
      $("taskModal");

    if (!modal) return;

    setText(
      "modalTaskTitle",
      task.title ||
        task.name ||
        "Task"
    );

    setText(
      "modalTaskInfo",
      `Reward: ${money(
        task.reward ??
        task.amount ??
        0
      )}`
    );

    setText(
      "modalStatus",
      "Task চলছে..."
    );

    modal.style.display = "";
  }

  function closeTaskModal() {
    const modal =
      $("taskModal");

    if (modal) {
      modal.style.display =
        "none";
    }
  }

  /* =========================================================
     HISTORY
     ========================================================= */

  async function loadHistory() {
    const data =
      await api("/api/history");

    const history =
      Array.isArray(data)
        ? data
        : (
            data.history ||
            data.data ||
            []
          );

    renderHistory(history);

    return history;
  }

  function renderHistory(history) {
    const list =
      $("historyList");

    if (!list) return;

    if (!history.length) {
      list.innerHTML = `
        <div style="
          padding:20px;
          text-align:center;
          color:#64748b;
        ">
          এখনো কোনো History নেই।
        </div>
      `;

      return;
    }

    list.innerHTML =
      history
        .map((item) => {
          const title =
            item.title ||
            item.task_title ||
            "Task";

          const amount =
            item.amount ??
            item.reward ??
            0;

          const date =
            item.created_at ||
            item.createdAt ||
            "";

          return `
            <div style="
              background:#fff;
              border:1px solid #e5e7eb;
              border-radius:14px;
              padding:14px;
              margin:10px 0;
            ">
              <div style="
                display:flex;
                justify-content:space-between;
                gap:10px;
              ">
                <b>${escapeHTML(title)}</b>

                <strong style="
                  color:#16a34a;
                ">
                  +${money(amount)}
                </strong>
              </div>

              ${
                date
                  ? `
                    <div style="
                      color:#64748b;
                      margin-top:5px;
                      font-size:13px;
                    ">
                      ${escapeHTML(
                        formatDateTime(date)
                      )}
                    </div>
                  `
                  : ""
              }
            </div>
          `;
        })
        .join("");
  }

  /* =========================================================
     NOTICE
     ========================================================= */

  async function loadNotices() {
    const data =
      await api("/api/notices");

    const notices =
      Array.isArray(data)
        ? data
        : (
            data.notices ||
            data.data ||
            []
          );

    renderNotices(notices);

    return notices;
  }

  function renderNotices(notices) {
    const list =
      $("noticeList");

    if (list) {
      if (!notices.length) {
        list.innerHTML =
          `<div style="color:#64748b;">
             এখন কোনো Notice নেই।
           </div>`;
      } else {
        list.innerHTML =
          notices
            .map(
              (notice) => `
                <div style="
                  padding:12px 0;
                ">
                  <b>
                    ${escapeHTML(
                      notice.title ||
                      "Notice"
                    )}
                  </b>

                  <div style="
                    margin-top:5px;
                  ">
                    ${escapeHTML(
                      notice.message ||
                      notice.text ||
                      ""
                    )}
                  </div>
                </div>
              `
            )
            .join("");
      }
    }

    const home =
      $("homeNotice");

    if (home && notices.length) {
      const latest =
        notices[0];

      home.textContent =
        latest.message ||
        latest.text ||
        latest.title ||
        "";
    }
  }

  /* =========================================================
     REFRESH EVERYTHING
     ========================================================= */

  async function refreshAll() {
    await Promise.all([
      loadDashboard().catch(
        console.error
      ),

      loadTasks().catch(
        console.error
      ),

      loadHistory().catch(
        console.error
      ),

      loadNotices().catch(
        console.error
      )
    ]);

    updateUserUI();
  }

  /* =========================================================
     OPEN DASHBOARD
     ========================================================= */

  async function openDashboard() {
    showDashboardPage();

    await loadMe().catch(() => {});

    if (!me && !session) {
      showAuthPage();
      return;
    }

    await refreshAll();

    updateUserUI();
  }

  /* =========================================================
     PROFILE MODAL
     ========================================================= */

  function createProfileModal() {
    if ($("mjrProfileOverlay")) {
      return;
    }

    const overlay =
      document.createElement("div");

    overlay.id =
      "mjrProfileOverlay";

    overlay.style.cssText = `
      position:fixed;
      inset:0;
      z-index:9998;
      display:none;
      align-items:center;
      justify-content:center;
      padding:20px;
      background:rgba(15,23,42,.55);
      backdrop-filter:blur(5px);
    `;

    overlay.innerHTML = `
      <div style="
        width:min(430px,100%);
        background:#fff;
        border-radius:24px;
        overflow:hidden;
        box-shadow:0 25px 60px rgba(0,0,0,.25);
      ">

        <div style="
          padding:28px 22px;
          text-align:center;
          color:#fff;
          background:linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
          );
          position:relative;
        ">

          <button
            id="mjrProfileClose"
            type="button"
            style="
              position:absolute;
              right:15px;
              top:12px;
              width:38px;
              height:38px;
              border:0;
              border-radius:50%;
              background:rgba(255,255,255,.18);
              color:#fff;
              font-size:24px;
              cursor:pointer;
            "
          >
            ×
          </button>

          <img
            src="profile.jpg"
            alt="Masud JR"
            style="
              width:105px;
              height:105px;
              object-fit:cover;
              object-position:center;
              border-radius:50%;
              border:4px solid #fff;
              box-shadow:0 8px 25px rgba(0,0,0,.2);
            "
          >

          <h2
            id="mjrProfileName"
            style="
              margin:14px 0 5px;
              font-size:25px;
            "
          >
            Masud JR Official
          </h2>

          <div
            id="mjrProfileId"
            style="
              opacity:.9;
            "
          >
            User
          </div>
        </div>

        <div style="
          padding:20px;
        ">

          <div style="
            display:grid;
            grid-template-columns:repeat(3,1fr);
            gap:8px;
            margin-bottom:18px;
          ">

            <div style="
              text-align:center;
              padding:12px 5px;
              background:#eff6ff;
              border-radius:14px;
            ">
              <div style="
                font-size:12px;
                color:#64748b;
              ">
                Balance
              </div>

              <b id="mjrProfileBalance">
                ৳0
              </b>
            </div>

            <div style="
              text-align:center;
              padding:12px 5px;
              background:#f0fdf4;
              border-radius:14px;
            ">
              <div style="
                font-size:12px;
                color:#64748b;
              ">
                Today
              </div>

              <b id="mjrProfileToday">
                ৳0
              </b>
            </div>

            <div style="
              text-align:center;
              padding:12px 5px;
              background:#eef2ff;
              border-radius:14px;
            ">
              <div style="
                font-size:12px;
                color:#64748b;
              ">
                Completed
              </div>

              <b id="mjrProfileCompleted">
                0
              </b>
            </div>

          </div>

          <div style="
            border-top:1px solid #e5e7eb;
            padding-top:14px;
          ">

            <div style="
              display:flex;
              justify-content:space-between;
              padding:10px 0;
            ">
              <span>User ID</span>
              <b id="mjrProfileUserId">
                -
              </b>
            </div>

            <div style="
              display:flex;
              justify-content:space-between;
              padding:10px 0;
            ">
              <span>Joined</span>
              <b id="mjrProfileJoined">
                -
              </b>
            </div>

          </div>

          <button
            id="mjrProfileSupport"
            type="button"
            style="
              width:100%;
              margin-top:14px;
              padding:14px;
              border:0;
              border-radius:14px;
              background:#eff6ff;
              color:#2563eb;
              font-weight:700;
              font-size:16px;
              cursor:pointer;
            "
          >
            🎧 Support Team
          </button>

          <button
            id="mjrProfileLogout"
            type="button"
            style="
              width:100%;
              margin-top:10px;
              padding:14px;
              border:0;
              border-radius:14px;
              background:#fef2f2;
              color:#dc2626;
              font-weight:700;
              font-size:16px;
              cursor:pointer;
            "
          >
            🚪 Logout
          </button>

        </div>
      </div>
    `;

    document.body.appendChild(
      overlay
    );

    $("mjrProfileClose")
      ?.addEventListener(
        "click",
        closeProfileModal
      );

    overlay.addEventListener(
      "click",
      (event) => {
        if (event.target === overlay) {
          closeProfileModal();
        }
      }
    );

    $("mjrProfileSupport")
      ?.addEventListener(
        "click",
        () => {
          closeProfileModal();
          openSupportModal();
        }
      );

    $("mjrProfileLogout")
      ?.addEventListener(
        "click",
        logout
      );
  }

  function openProfileModal() {
    createProfileModal();

    setText(
      "mjrProfileName",
      me?.name ||
        me?.username ||
        "Masud JR Official"
    );

    setText(
      "mjrProfileId",
      me?.id ||
        me?.user_id ||
        me?.username ||
        "-"
    );

    setText(
      "mjrProfileUserId",
      me?.id ||
        me?.user_id ||
        me?.username ||
        "-"
    );

    setText(
      "mjrProfileBalance",
      money(me?.balance || 0)
    );

    setText(
      "mjrProfileToday",
      money(
        me?.todayEarnings || 0
      )
    );

    setText(
      "mjrProfileCompleted",
      me?.completedCount || 0
    );

    setText(
      "mjrProfileJoined",
      me?.created_at
        ? formatDate(me.created_at)
        : "-"
    );

    $("mjrProfileOverlay").style.display =
      "flex";
  }

  function closeProfileModal() {
    const overlay =
      $("mjrProfileOverlay");

    if (overlay) {
      overlay.style.display =
        "none";
    }
  }

  /* =========================================================
     SUPPORT MODAL
     ========================================================= */

  function createSupportModal() {
    if ($("mjrSupportOverlay")) {
      return;
    }

    const overlay =
      document.createElement("div");

    overlay.id =
      "mjrSupportOverlay";

    overlay.style.cssText = `
      position:fixed;
      inset:0;
      z-index:9999;
      display:none;
      align-items:center;
      justify-content:center;
      padding:20px;
      background:rgba(15,23,42,.55);
      backdrop-filter:blur(5px);
    `;

    overlay.innerHTML = `
      <div style="
        width:min(400px,100%);
        background:#fff;
        border-radius:24px;
        overflow:hidden;
        box-shadow:0 25px 60px rgba(0,0,0,.25);
      ">

        <div style="
          padding:20px;
          background:linear-gradient(
            135deg,
            #2563eb,
            #1d4ed8
          );
          color:#fff;
          display:flex;
          align-items:center;
          justify-content:space-between;
        ">

          <div style="
            font-size:22px;
            font-weight:800;
          ">
            🎧 Support Team
          </div>

          <button
            id="mjrSupportClose"
            type="button"
            style="
              border:0;
              background:transparent;
              color:#fff;
              font-size:28px;
              cursor:pointer;
            "
          >
            ×
          </button>

        </div>

        <div style="
          padding:20px;
        ">

          <p style="
            margin-top:0;
            color:#64748b;
            font-size:15px;
          ">
            যেকোনো সমস্যায় আমাদের সাথে যোগাযোগ করুন।
          </p>

          <a
            href="https://wa.me/8801961504587"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display:block;
              text-decoration:none;
              background:#16a34a;
              color:#fff;
              padding:17px;
              border-radius:15px;
              margin-top:15px;
              font-size:17px;
              font-weight:800;
            "
          >
            🟢 WhatsApp
            <span style="
              display:block;
              font-size:14px;
              margin-top:4px;
              font-weight:500;
            ">
              01961504587
            </span>
          </a>

          <a
            href="https://m.me/masud.11.jr"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display:block;
              text-decoration:none;
              background:#2563eb;
              color:#fff;
              padding:17px;
              border-radius:15px;
              margin-top:12px;
              font-size:17px;
              font-weight:800;
            "
          >
            🔵 Facebook Messenger
            <span style="
              display:block;
              font-size:14px;
              margin-top:4px;
              font-weight:500;
            ">
              Messenger-এ যোগাযোগ করুন
            </span>
          </a>

        </div>
      </div>
    `;

    document.body.appendChild(
      overlay
    );

    $("mjrSupportClose")
      ?.addEventListener(
        "click",
        closeSupportModal
      );

    overlay.addEventListener(
      "click",
      (event) => {
        if (event.target === overlay) {
          closeSupportModal();
        }
      }
    );
  }

  function openSupportModal() {
    createSupportModal();

    $("mjrSupportOverlay").style.display =
      "flex";
  }

  function closeSupportModal() {
    const overlay =
      $("mjrSupportOverlay");

    if (overlay) {
      overlay.style.display =
        "none";
    }
  }

  /* =========================================================
     PROFILE / SUPPORT BUTTON DETECTION
     ========================================================= */

  function setupNavigation() {
    // Existing nav buttons
    document
      .querySelectorAll(
        "button, .nav-item, .bottom-nav button, [role='button']"
      )
      .forEach((element) => {
        const text =
          safeText(element.textContent)
            .trim()
            .toLowerCase();

        if (
          text === "profile" ||
          text === "প্রোফাইল"
        ) {
          element.addEventListener(
            "click",
            openProfileModal
          );
        }

        if (
          text.includes("support team") ||
          text.includes("support")
        ) {
          element.addEventListener(
            "click",
            openSupportModal
          );
        }
      });

    $("closeTaskModal")
      ?.addEventListener(
        "click",
        closeTaskModal
      );

    $("verifyTaskBtn")
      ?.addEventListener(
        "click",
        completeTask
      );

    $("cancelTaskBtn")
      ?.addEventListener(
        "click",
        cancelTask
      );

    $("withdrawBtn")
      ?.addEventListener(
        "click",
        () => {
          const form =
            $("withdrawForm");

          if (form) {
            form.style.display =
              form.style.display === "none"
                ? ""
                : "none";
          }
        }
      );
  }

  /* =========================================================
     FORMS
     ========================================================= */

  function setupForms() {
    $("loginForm")
      ?.addEventListener(
        "submit",
        handleLogin
      );

    $("registerForm")
      ?.addEventListener(
        "submit",
        handleRegistration
      );
  }

  /* =========================================================
     FORMAT HELPERS
     ========================================================= */

  function formatDateTime(value) {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return safeText(value);
    }

    return date.toLocaleString(
      "en-GB"
    );
  }

  function escapeHTML(value) {
    return safeText(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* =========================================================
     INITIALIZE
     ========================================================= */

  async function init() {
    loadSavedUser();

    setupAuthTabs();
    setupForms();
    setupNavigation();

    createProfileModal();
    createSupportModal();

    /*
     * Saved session থাকলে সরাসরি dashboard।
     */
    if (session) {
      try {
        await openDashboard();
      } catch (error) {
        console.error(
          "INIT ERROR:",
          error
        );

        clearUser();
        showAuthPage();
        activateLoginTab();
      }
    } else {
      showAuthPage();
      activateLoginTab();
    }
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
