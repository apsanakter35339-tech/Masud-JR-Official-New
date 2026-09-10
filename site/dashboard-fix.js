(function () {
  "use strict";

  const API_BASE =
    window.API_BASE || "https://masud-jr-official-online.onrender.com";

  const SESSION_KEY = "mjrUserSessionV2";

  function getSession() {
    return localStorage.getItem(SESSION_KEY) || "";
  }

  async function api(path, options = {}) {
    const headers = {
      ...(options.headers || {}),
      "Content-Type": "application/json",
      "x-user-session": getSession()
    };

    const response = await fetch(API_BASE + path, {
      ...options,
      headers
    });

    let data = {};
    try {
      data = await response.json();
    } catch (_) {}

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  function money(value) {
    const n = Number(value || 0);
    return "৳" + n.toLocaleString("en-US");
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // =========================
  // DASHBOARD DATA
  // =========================

  async function refreshDashboard() {
    try {
      const data = await api("/api/dashboard");

      const user = data.user || data;
      const balance = Number(
        user.balance ??
        data.balance ??
        0
      );

      const todayIncome = Number(
        data.todayIncome ??
        user.todayIncome ??
        0
      );

      const totalIncome = Number(
        data.totalIncome ??
        user.totalIncome ??
        0
      );

      const completed = Number(
        data.completed ??
        data.completedCount ??
        user.completed ??
        user.completedCount ??
        0
      );

      // Home
      setText("homeBalance", money(balance));
      setText("balanceAmount", money(balance));

      setText("todayIncome", money(todayIncome));
      setText("balanceToday", money(todayIncome));

      setText("totalIncome", money(totalIncome));
      setText("balanceTotal", money(totalIncome));

      setText("completedCount", completed);

      // Profile
      setText("profileBalance", money(balance));
      setText("profileCompleted", completed);
      setText("profileIncome", money(totalIncome));

      // Profile user information
      if (user.name) {
        setText("profileName", user.name);
      }

      if (user.id !== undefined && user.id !== null) {
        setText("profileId", "MJR-" + user.id);
        setText("profileIdCopy", "MJR-" + user.id);
      }

      if (user.joinedAt) {
        const date = new Date(user.joinedAt);

        if (!Number.isNaN(date.getTime())) {
          setText(
            "profileJoined",
            date.toLocaleDateString("en-GB")
          );
        }
      }

    } catch (error) {
      console.warn("Dashboard refresh:", error.message);
    }
  }

  // =========================
  // HISTORY
  // =========================

  async function refreshHistory() {
    try {
      const data = await api("/api/history");

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.history)
          ? data.history
          : [];

      const container =
        document.getElementById("historyList") ||
        document.querySelector(".history-list");

      if (!container) return;

      if (!items.length) {
        container.innerHTML =
          '<div class="empty-state">কোনো History নেই</div>';
        return;
      }

      container.innerHTML = items.map(function (item) {
        const amount = Number(item.amount || 0);

        return `
          <div class="history-item">
            <div>
              <strong>${escapeHtml(item.title || "Transaction")}</strong>
              <small>${escapeHtml(item.status || "")}</small>
            </div>
            <strong>${amount >= 0 ? "+" : ""}${money(amount)}</strong>
          </div>
        `;
      }).join("");

    } catch (error) {
      console.warn("History refresh:", error.message);
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // =========================
  // WITHDRAW
  // =========================

  function setupWithdraw() {
    const form = document.getElementById("withdrawForm");
    const withdrawBtn = document.getElementById("withdrawBtn");
    const message = document.getElementById("withdrawMessage");

    if (withdrawBtn) {
      withdrawBtn.addEventListener("click", function () {
        const section = document.getElementById("section-withdraw");

        if (section) {
          document.querySelectorAll(".page-section").forEach(function (s) {
            s.classList.remove("active-section");
          });

          section.classList.add("active-section");

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });
        }
      });
    }

    if (!form) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const method =
        document.getElementById("withdrawMethod")?.value || "";

      const accountNumber =
        document.getElementById("withdrawNumber")?.value.trim() || "";

      const amount =
        Number(document.getElementById("withdrawAmount")?.value || 0);

      if (!["bKash", "Nagad", "Rocket"].includes(method)) {
        showMessage(message, "Payment method সঠিক নয়।", true);
        return;
      }

      if (!/^01\d{9}$/.test(accountNumber)) {
        showMessage(
          message,
          "সঠিক ১১ সংখ্যার account number দিন।",
          true
        );
        return;
      }

      if (!Number.isInteger(amount) || amount < 200) {
        showMessage(
          message,
          "Minimum withdrawal ৳200।",
          true
        );
        return;
      }

      try {
        showMessage(message, "Withdrawal request পাঠানো হচ্ছে...", false);

        const result = await api("/api/withdrawals", {
          method: "POST",
          body: JSON.stringify({
            method: method,
            accountNumber: accountNumber,
            amount: amount
          })
        });

        showMessage(
          message,
          result.message ||
            "Withdrawal request সফলভাবে পাঠানো হয়েছে। Admin review করবে।",
          false
        );

        form.reset();

        await refreshDashboard();
        await refreshHistory();

      } catch (error) {
        showMessage(
          message,
          error.message || "Withdrawal request ব্যর্থ হয়েছে।",
          true
        );
      }
    });
  }

  function showMessage(element, text, error) {
    if (!element) return;

    element.textContent = text;
    element.style.display = "block";

    if (error) {
      element.classList.add("error");
    } else {
      element.classList.remove("error");
    }
  }

  // =========================
  // SUPPORT
  // =========================

  function setupSupport() {
    const overlay = document.getElementById("supportOverlay");
    const trigger = document.getElementById("supportTrigger");
    const close = document.getElementById("supportClose");
    const profileSupport =
      document.getElementById("profileSupportBtn");

    function openSupport(event) {
      if (event) event.preventDefault();

      if (!overlay) return;

      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
    }

    function closeSupport(event) {
      if (event) event.preventDefault();

      if (!overlay) return;

      overlay.classList.remove("active");
      overlay.setAttribute("aria-hidden", "true");
    }

    if (trigger) {
      trigger.addEventListener("click", openSupport);
    }

    if (profileSupport) {
      profileSupport.addEventListener("click", openSupport);
    }

    if (close) {
      close.addEventListener("click", closeSupport);
    }

    if (overlay) {
      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) {
          closeSupport(event);
        }
      });
    }

    // IMPORTANT:
    // Existing script.js already handles [data-support] buttons.
    // So we DO NOT add another listener here.
  }

  // =========================
  // PROFILE
  // =========================

  function setupProfile() {
    const close = document.getElementById("profileClose");

    if (close) {
      close.addEventListener("click", function () {
        const home =
          document.getElementById("section-home");

        document.querySelectorAll(".page-section").forEach(function (s) {
          s.classList.remove("active-section");
        });

        if (home) {
          home.classList.add("active-section");
        }
      });
    }

    const avatar =
      document.getElementById("profileAvatar");

    if (avatar) {
      avatar.src = "profile.jpg";
    }

    const heroAvatar =
      document.querySelector(".mj-hero-avatar");

    if (heroAvatar) {
      heroAvatar.src = "profile.jpg";
    }
  }

  // =========================
  // FEE BOX
  // =========================

  function hideFeeBox() {
    const feeBox = document.getElementById("feeBox");

    if (feeBox) {
      feeBox.classList.add("hidden");
    }
  }

  // =========================
  // INITIALIZE
  // =========================

  async function init() {
    setupWithdraw();
    setupSupport();
    setupProfile();
    hideFeeBox();

    await refreshDashboard();
    await refreshHistory();

    // Keep dashboard balance updated.
    setInterval(function () {
      refreshDashboard();
    }, 15000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
