import {
  auth, db, ADMIN_EMAIL,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
  collection, addDoc, getDocs, getDoc, setDoc,
  doc, updateDoc, deleteDoc,
  query, where, orderBy, limit,
  serverTimestamp, writeBatch,
  arrayUnion, arrayRemove,
} from "./firebase-config.js";

// ============================================================
// SHARED HELPERS
// ============================================================
const $ = (id) => document.getElementById(id);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_BADGE = {
  "On Time":   "bg-success",
  "Delayed":   "bg-warning text-dark",
  "Boarding":  "bg-primary",
  "Cancelled": "bg-danger",
};

function isAdmin(user) {
  return !!(user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
}

function toast(msg, kind = "") {
  const el = document.createElement("div");
  el.className = `toast-mini ${kind}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function genPNR() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

function formatDate(timestamp, format = "date") {
  if (!timestamp) return "";
  
  let date;
  
  // Handle Firestore Timestamp with toDate() method
  if (timestamp && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  }
  // Handle plain object with seconds/nanoseconds (raw Timestamp format)
  else if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
    date = new Date(timestamp.seconds * 1000);
  }
  // Handle JavaScript Date object
  else if (timestamp instanceof Date) {
    date = timestamp;
  }
  // Handle timestamp as number (milliseconds or seconds)
  else if (typeof timestamp === 'number') {
    date = new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000);
  }
  
  if (!date || !(date instanceof Date) || isNaN(date)) return "";
  
  return format === "full" ? date.toLocaleString() : date.toLocaleDateString();
}

// ============================================================
// SHARED NAVBAR + LOGIN MODAL  (injected into every page)
// ============================================================
const NAV_LINKS = [
  { href: "index.html",          label: "Home",         page: "home" },
  { href: "flight-schedule.html", label: "Schedule",    page: "schedule" },
  { href: "flight-status.html",  label: "Status",       page: "status" },
  { href: "booking.html",        label: "Book",         page: "booking" },
  { href: "manage-booking.html", label: "Manage",       page: "manage" },
  { href: "offers.html",         label: "Offers",       page: "offers" },
  { href: "user-dashboard.html", label: "My Account",   page: "user" },
  { href: "admin-dashboard.html",label: "Admin",        page: "admin", adminOnly: true },
  { href: "about.html",          label: "About",        page: "about" },
  { href: "contact.html",        label: "Contact",      page: "contact" },
];

function injectNavbar() {
  const slot = $("siteNav");
  if (!slot) return;
  const current = document.body.dataset.page || "";
  const items = NAV_LINKS.map((l) => `
    <li class="nav-item" ${l.adminOnly ? `data-auth="admin"` : ""}>
      <a class="nav-link ${current === l.page ? "active fw-semibold" : ""}" href="./${l.href}">${l.label}</a>
    </li>
  `).join("");

  slot.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-sw-primary sticky-top shadow-sm">
      <div class="container-fluid px-3">
        <a class="navbar-brand fw-bold d-flex align-items-center" href="./index.html">
          <span class="navbar-brand-mark">SW</span>SkyWay Airlines
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navMenu">
          <ul class="navbar-nav me-auto align-items-lg-center">${items}</ul>
          <ul class="navbar-nav align-items-lg-center">
            <li class="nav-item text-white-50 small me-lg-2" id="authStatus"></li>
            <li class="nav-item">
              <button id="openLoginBtn" class="btn btn-accent btn-sm" data-auth="guest"
                      data-bs-toggle="modal" data-bs-target="#loginModal">
                <i class="bi bi-shield-lock"></i> Sign In
              </button>
              <button id="logoutBtn" class="btn btn-outline-light btn-sm d-none" data-auth="user">
                <i class="bi bi-box-arrow-right"></i> Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `;
}

function injectLoginModal() {
  const slot = $("siteModals");
  if (!slot) return;
  slot.insertAdjacentHTML("beforeend", `
    <div class="modal fade" id="loginModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-shield-lock"></i> Sign In</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <form id="loginForm">
            <div class="modal-body">
              <div class="alert alert-info small mb-3">
                Admins use their admin credentials. Travellers can register on the
                <a href="./user-dashboard.html">My Account</a> page.
              </div>
              <div class="mb-3">
                <label for="loginEmail" class="form-label">Email</label>
                <input type="email" id="loginEmail" class="form-control" required autocomplete="username">
              </div>
              <div class="mb-3">
                <label for="loginPassword" class="form-label">Password</label>
                <input type="password" id="loginPassword" class="form-control" required autocomplete="current-password">
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary w-100">Sign In</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `);
}

function setupLoginModal() {
  const modalEl = $("loginModal");
  const form = $("loginForm");
  const logoutBtn = $("logoutBtn");
  if (!modalEl) return;

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("loginEmail").value.trim();
    const pass = $("loginPassword").value;
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      window.bootstrap?.Modal.getInstance(modalEl)?.hide();
      form.reset();
      toast("Signed in", "success");
    } catch (err) {
      toast(err.message || "Login failed", "error");
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
    toast("Logged out", "success");
  });
}

function reflectAuthState(user) {
  const admin = isAdmin(user);
  const loggedIn = !!user;
  document.querySelectorAll("[data-auth='admin']").forEach((el) => {
    el.classList.toggle("d-none", !admin);
  });
  document.querySelectorAll("[data-auth='user']").forEach((el) => {
    el.classList.toggle("d-none", !loggedIn);
  });
  document.querySelectorAll("[data-auth='guest']").forEach((el) => {
    el.classList.toggle("d-none", loggedIn);
  });
  const status = $("authStatus");
  if (status) {
    status.textContent = admin
      ? `Admin: ${user.email}`
      : loggedIn ? `Hi, ${user.displayName || user.email}` : "";
  }
}

// ============================================================
// FLIGHTS — shared helpers
// ============================================================
async function fetchFlights() {
  const q = query(collection(db, "flights"), orderBy("departureTime"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function renderFlightsTable(flights, tbodyId, opts = {}) {
  const tbody = $(tbodyId);
  if (!tbody) return;
  if (!flights.length) {
    tbody.innerHTML = `<tr><td colspan="${opts.adminActions ? 9 : 8}" class="text-center text-muted py-4">No flights match your filters.</td></tr>`;
    return;
  }
  tbody.innerHTML = flights.map((f) => `
    <tr>
      <td><strong>${escapeHtml(f.flightNumber)}</strong></td>
      <td>${escapeHtml(f.planeName)}</td>
      <td>${escapeHtml(f.source)}</td>
      <td>${escapeHtml(f.destination)}</td>
      <td>${escapeHtml(f.departureTime)}</td>
      <td>${escapeHtml(f.arrivalTime)}</td>
      <td>${escapeHtml((f.days || []).join(", "))}</td>
      <td><span class="badge ${STATUS_BADGE[f.status] || "bg-secondary"}">${escapeHtml(f.status || "-")}</span></td>
      ${opts.adminActions ? `
      <td class="text-nowrap">
        <button class="btn btn-sm btn-outline-secondary me-1" data-edit="${f.id}">Edit</button>
        <button class="btn btn-sm btn-outline-danger" data-delete="${f.id}">Delete</button>
      </td>` : ""}
    </tr>
  `).join("");
}

// ============================================================
// HOME PAGE  (search + simple admin shortcut card)
// ============================================================
async function initHome() {
  let allFlights = [];

  async function reload() {
    try {
      allFlights = await fetchFlights();
      applyFilters();
    } catch (err) {
      toast("Could not load flights. Check Firebase config.", "error");
      console.error(err);
    }
  }

  function applyFilters() {
    const src = $("filterSource").value.trim().toLowerCase();
    const dst = $("filterDestination").value.trim().toLowerCase();
    const day = $("filterDay").value;
    const filtered = allFlights.filter((f) => {
      if (src && !(f.source || "").toLowerCase().includes(src)) return false;
      if (dst && !(f.destination || "").toLowerCase().includes(dst)) return false;
      if (day && !(f.days || []).includes(day)) return false;
      return true;
    });
    renderFlightsTable(filtered, "userFlightsBody");
  }

  $("filterForm").addEventListener("submit", (e) => { e.preventDefault(); applyFilters(); });
  $("clearFiltersBtn").addEventListener("click", () => {
    $("filterForm").reset();
    applyFilters();
  });

  reload();
}

// ============================================================
// ABOUT PAGE
// ============================================================
async function initAbout() {
  try {
    const flights = await fetchFlights();
    const destinations = new Set(flights.map((f) => f.destination).filter(Boolean));
    const sources = new Set(flights.map((f) => f.source).filter(Boolean));
    const onTime = flights.filter((f) => f.status === "On Time").length;
    $("statTotal").textContent = flights.length;
    $("statDestinations").textContent = destinations.size;
    $("statSources").textContent = sources.size;
    $("statOnTime").textContent = onTime;
  } catch (err) { console.error(err); }
}

// ============================================================
// CONTACT PAGE
// ============================================================
async function initContact() {
  $("contactForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      name: $("cName").value.trim(),
      email: $("cEmail").value.trim(),
      message: $("cMessage").value.trim(),
      createdAt: serverTimestamp(),
    };
    try {
      await addDoc(collection(db, "messages"), data);
      toast("Message sent! We'll be in touch.", "success");
      $("contactForm").reset();
      if (isAdmin(auth.currentUser)) loadMessages();
    } catch (err) { toast(err.message, "error"); }
  });

  async function loadMessages() {
    try {
      const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list = $("messagesList");
      if (!snap.size) {
        list.innerHTML = `<p class="text-muted">No messages yet.</p>`;
        return;
      }
      list.innerHTML = snap.docs.map((d) => {
        const m = d.data();
        const date = formatDate(m.createdAt, "full");
        return `
          <div class="message-item">
            <div class="meta"><span class="name">${escapeHtml(m.name || "Anonymous")}</span> · ${escapeHtml(m.email || "")} · ${date}</div>
            <div>${escapeHtml(m.message || "")}</div>
            <button class="btn btn-sm btn-danger mt-2" data-msg-del="${d.id}">Delete</button>
          </div>`;
      }).join("");
      list.querySelectorAll("[data-msg-del]").forEach((b) => {
        b.addEventListener("click", async () => {
          if (!confirm("Delete this message?")) return;
          await deleteDoc(doc(db, "messages", b.dataset.msgDel));
          toast("Message deleted", "success");
          loadMessages();
        });
      });
    } catch (err) { console.error(err); }
  }

  onAuthStateChanged(auth, (user) => {
    if (isAdmin(user)) loadMessages();
  });
}

// ============================================================
// FLIGHT SCHEDULE PAGE
// ============================================================
async function initSchedule() {
  let flights = [];
  try { flights = await fetchFlights(); }
  catch (err) { toast("Could not load schedule.", "error"); }

  function render() {
    const src = $("schedSource").value.trim().toLowerCase();
    const dst = $("schedDest").value.trim().toLowerCase();
    const day = $("schedDay").value;

    const filtered = flights.filter((f) => {
      if (src && !(f.source || "").toLowerCase().includes(src)) return false;
      if (dst && !(f.destination || "").toLowerCase().includes(dst)) return false;
      if (day && !(f.days || []).includes(day)) return false;
      return true;
    });

    const wrap = $("scheduleCards");
    if (!filtered.length) {
      wrap.innerHTML = `<div class="col-12"><div class="alert alert-light text-center">No flights match these filters.</div></div>`;
      return;
    }
    wrap.innerHTML = filtered.map((f) => `
      <div class="col-md-6 col-lg-4">
        <div class="card section-card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <h5 class="card-title text-primary mb-1">${escapeHtml(f.flightNumber)}</h5>
              <span class="badge ${STATUS_BADGE[f.status] || "bg-secondary"}">${escapeHtml(f.status || "-")}</span>
            </div>
            <p class="text-muted small mb-2">${escapeHtml(f.planeName || "")}</p>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div><div class="fw-bold">${escapeHtml(f.source)}</div><div class="small text-muted">${escapeHtml(f.departureTime)}</div></div>
              <i class="bi bi-arrow-right text-primary fs-4"></i>
              <div class="text-end"><div class="fw-bold">${escapeHtml(f.destination)}</div><div class="small text-muted">${escapeHtml(f.arrivalTime)}</div></div>
            </div>
            <div class="small text-muted">
              <i class="bi bi-calendar3"></i> ${escapeHtml((f.days || []).join(", ") || "—")}
            </div>
          </div>
        </div>
      </div>
    `).join("");
  }

  $("schedFilterForm").addEventListener("submit", (e) => { e.preventDefault(); render(); });
  $("schedClearBtn").addEventListener("click", () => { $("schedFilterForm").reset(); render(); });
  render();
}

// ============================================================
// FLIGHT STATUS PAGE
// ============================================================
async function initStatus() {
  let flights = [];
  try { flights = await fetchFlights(); }
  catch (err) { toast("Could not load flights.", "error"); }

  function render(list) {
    const wrap = $("statusResults");
    if (!list.length) {
      wrap.innerHTML = `<div class="alert alert-light text-center">No matches. Try a different search.</div>`;
      return;
    }
    wrap.innerHTML = list.map((f) => `
      <div class="card section-card mb-3">
        <div class="card-body d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h5 class="text-primary mb-1">${escapeHtml(f.flightNumber)} <span class="text-muted small">${escapeHtml(f.planeName || "")}</span></h5>
            <div>${escapeHtml(f.source)} → ${escapeHtml(f.destination)}</div>
            <div class="small text-muted">${escapeHtml(f.departureTime)} → ${escapeHtml(f.arrivalTime)} · ${escapeHtml((f.days || []).join(", "))}</div>
          </div>
          <span class="badge fs-6 ${STATUS_BADGE[f.status] || "bg-secondary"}">${escapeHtml(f.status || "Unknown")}</span>
        </div>
      </div>
    `).join("");
  }

  $("statusByNumberForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("statusFlightNum").value.trim().toLowerCase();
    render(flights.filter((f) => (f.flightNumber || "").toLowerCase().includes(v)));
  });

  $("statusByRouteForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const s = $("statusSource").value.trim().toLowerCase();
    const d = $("statusDest").value.trim().toLowerCase();
    render(flights.filter((f) => {
      if (s && !(f.source || "").toLowerCase().includes(s)) return false;
      if (d && !(f.destination || "").toLowerCase().includes(d)) return false;
      return s || d;
    }));
  });

  render(flights);
}

// ============================================================
// USER DASHBOARD PAGE
// ============================================================
async function initUserDashboard() {
  // Login
  $("udLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, $("udLoginEmail").value, $("udLoginPass").value);
      toast("Welcome back!", "success");
    } catch (err) { toast(err.message, "error"); }
  });

  // Register
  $("udRegisterForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("udRegEmail").value.trim();
    const pass = $("udRegPass").value;
    const name = $("udRegName").value.trim();
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name) await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, "users", cred.user.uid), {
        email, displayName: name, phone: "",
        favorites: [], loyaltyPoints: 0,
        createdAt: serverTimestamp(),
      });
      toast("Account created!", "success");
    } catch (err) { toast(err.message, "error"); }
  });

  async function renderForUser(user) {
    if (!user) {
      $("udGuest").classList.remove("d-none");
      $("udAuthed").classList.add("d-none");
      return;
    }
    $("udGuest").classList.add("d-none");
    $("udAuthed").classList.remove("d-none");
    $("udGreeting").textContent = user.displayName || user.email;

    // Profile
    let profile = {};
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      profile = snap.exists() ? snap.data() : {};
    } catch (err) { console.error(err); }
    $("udName").value = profile.displayName || user.displayName || "";
    $("udEmail").value = user.email;
    $("udPhone").value = profile.phone || "";
    $("udPoints").textContent = profile.loyaltyPoints || 0;

    // Bookings
    try {
      const q = query(collection(db, "bookings"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const wrap = $("udBookings");
      if (!list.length) {
        wrap.innerHTML = `<div class="alert alert-light">No bookings yet. <a href="./booking.html">Book a flight</a>.</div>`;
      } else {
        wrap.innerHTML = `
          <div class="table-responsive"><table class="table table-sm align-middle">
            <thead class="table-light"><tr><th>PNR</th><th>Flight</th><th>Route</th><th>Passenger</th><th>Status</th></tr></thead>
            <tbody>${list.map((b) => `
              <tr>
                <td><code>${escapeHtml(b.pnr)}</code></td>
                <td>${escapeHtml(b.flightNumber)}</td>
                <td>${escapeHtml(b.source)} → ${escapeHtml(b.destination)}</td>
                <td>${escapeHtml(b.passengerName)}</td>
                <td><span class="badge ${b.status === "Cancelled" ? "bg-danger" : "bg-success"}">${escapeHtml(b.status)}</span></td>
              </tr>`).join("")}
            </tbody></table></div>`;
      }
    } catch (err) { console.error(err); }

    // Favorites
    try {
      const allFlights = await fetchFlights();
      const favs = (profile.favorites || []).map((id) => allFlights.find((f) => f.id === id)).filter(Boolean);
      const wrap = $("udFavorites");
      if (!favs.length) {
        wrap.innerHTML = `<div class="alert alert-light">No favorite flights yet. Mark some on the schedule page.</div>`;
      } else {
        wrap.innerHTML = favs.map((f) => `
          <div class="d-flex justify-content-between align-items-center border rounded p-2 mb-2">
            <div><strong>${escapeHtml(f.flightNumber)}</strong> · ${escapeHtml(f.source)} → ${escapeHtml(f.destination)}</div>
            <button class="btn btn-sm btn-outline-danger" data-unfav="${f.id}"><i class="bi bi-star-fill"></i> Remove</button>
          </div>
        `).join("");
        wrap.querySelectorAll("[data-unfav]").forEach((b) => {
          b.addEventListener("click", async () => {
            await updateDoc(doc(db, "users", user.uid), { favorites: arrayRemove(b.dataset.unfav) });
            toast("Removed from favorites", "success");
            renderForUser(auth.currentUser);
          });
        });
      }
    } catch (err) { console.error(err); }
  }

  // Profile save
  $("udProfileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    try {
      const name = $("udName").value.trim();
      await updateDoc(doc(db, "users", user.uid), {
        displayName: name,
        phone: $("udPhone").value.trim(),
      });
      if (name) await updateProfile(user, { displayName: name });
      toast("Profile saved", "success");
      reflectAuthState(user);
    } catch (err) { toast(err.message, "error"); }
  });

  onAuthStateChanged(auth, renderForUser);
}

// ============================================================
// ADMIN DASHBOARD PAGE
// ============================================================
async function initAdminDashboard() {
  function showDenied(show) {
    $("adminDenied").classList.toggle("d-none", !show);
    $("adminContent").classList.toggle("d-none", show);
  }

  let allFlights = [];

  async function reloadFlights() {
    allFlights = await fetchFlights();
    renderFlightsTable(allFlights, "adFlightsBody", { adminActions: true });
    document.querySelectorAll("#adFlightsBody [data-edit]").forEach((b) => {
      b.addEventListener("click", () => populateEdit(b.dataset.edit));
    });
    document.querySelectorAll("#adFlightsBody [data-delete]").forEach((b) => {
      b.addEventListener("click", async () => {
        if (!confirm("Delete this flight?")) return;
        await deleteDoc(doc(db, "flights", b.dataset.delete));
        toast("Flight deleted", "success");
        reloadFlights();
        renderAnalytics();
      });
    });
  }

  function populateEdit(id) {
    const f = allFlights.find((x) => x.id === id);
    if (!f) return;
    $("adEditingId").value = id;
    $("adFlightNumber").value = f.flightNumber || "";
    $("adPlaneName").value = f.planeName || "";
    $("adSource").value = f.source || "";
    $("adDestination").value = f.destination || "";
    $("adDepartureTime").value = f.departureTime || "";
    $("adArrivalTime").value = f.arrivalTime || "";
    $("adStatus").value = f.status || "On Time";
    DAYS.forEach((d) => { $(`adDay-${d}`).checked = (f.days || []).includes(d); });
    $("adSubmitFlightBtn").textContent = "Update Flight";
    $("adCancelEditBtn").classList.remove("d-none");
    document.querySelector("#flights-tab-pane").scrollIntoView({ behavior: "smooth" });
  }

  $("adFlightForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = $("adEditingId").value;
    const data = {
      flightNumber: $("adFlightNumber").value.trim(),
      planeName: $("adPlaneName").value.trim(),
      source: $("adSource").value.trim(),
      destination: $("adDestination").value.trim(),
      departureTime: $("adDepartureTime").value,
      arrivalTime: $("adArrivalTime").value,
      status: $("adStatus").value,
      days: DAYS.filter((d) => $(`adDay-${d}`).checked),
    };
    try {
      if (id) {
        await updateDoc(doc(db, "flights", id), data);
        toast("Flight updated", "success");
      } else {
        await addDoc(collection(db, "flights"), { ...data, createdAt: serverTimestamp() });
        toast("Flight added", "success");
      }
      resetFlightForm();
      reloadFlights();
      renderAnalytics();
    } catch (err) { toast(err.message, "error"); }
  });

  $("adCancelEditBtn").addEventListener("click", resetFlightForm);
  function resetFlightForm() {
    $("adFlightForm").reset();
    $("adEditingId").value = "";
    $("adSubmitFlightBtn").textContent = "Add Flight";
    $("adCancelEditBtn").classList.add("d-none");
  }

  async function loadUsers() {
    try {
      const snap = await getDocs(collection(db, "users"));
      const wrap = $("adUsersBody");
      if (!snap.size) { wrap.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No registered users yet.</td></tr>`; return; }
      wrap.innerHTML = snap.docs.map((d) => {
        const u = d.data();
        const date = formatDate(u.createdAt);
     
        return `<tr>
          <td>${escapeHtml(u.displayName || "—")}</td>
          <td>${escapeHtml(u.email)}</td>
          <td>${escapeHtml(u.phone || "—")}</td>
          <td>${u.loyaltyPoints || 0}</td>
          <td>${date}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" data-user-edit="${d.id}"><i class="bi bi-pencil"></i> Edit</button>
          </td>
        </tr>`;
      }).join("");
      wrap.querySelectorAll("[data-user-edit]").forEach((b) => {
        b.addEventListener("click", async () => {
          const userId = b.dataset.userEdit;
          const newPoints = prompt("Enter new loyalty points:");
          if (newPoints !== null) {
            try {
              await updateDoc(doc(db, "users", userId), {
                loyaltyPoints: Number(newPoints) || 0
              });
              toast("Loyalty points updated", "success");
              loadUsers();
              renderAnalytics();
            } catch (err) { toast(err.message, "error"); }
          }
        });
      });
    } catch (err) { console.error(err); }
  }

  async function loadBookings() {
    try {
      const snap = await getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc")));
      const wrap = $("adBookingsBody");
      if (!snap.size) { wrap.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No bookings yet.</td></tr>`; return; }
      wrap.innerHTML = snap.docs.map((d) => {
        const b = d.data();
        return `<tr>
          <td><code>${escapeHtml(b.pnr)}</code></td>
          <td>${escapeHtml(b.flightNumber)}</td>
          <td>${escapeHtml(b.passengerName)}</td>
          <td>${escapeHtml(b.passengerEmail)}</td>
          <td>${escapeHtml(b.source)} → ${escapeHtml(b.destination)}</td>
          <td><span class="badge ${b.status === "Cancelled" ? "bg-danger" : "bg-success"}">${escapeHtml(b.status)}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-warning" data-booking-status="${d.id}" title="Change status"><i class="bi bi-arrow-repeat"></i> Change</button>
          </td>
        </tr>`;
      }).join("");
      wrap.querySelectorAll("[data-booking-status]").forEach((b) => {
        b.addEventListener("click", async () => {
          const bookingId = b.dataset.bookingStatus;
          const statusChoice = prompt("Enter new status (Confirmed/Cancelled):");
          if (statusChoice && ["Confirmed", "Cancelled"].includes(statusChoice)) {
            try {
              await updateDoc(doc(db, "bookings", bookingId), { status: statusChoice });
              toast("Booking status updated", "success");
              loadBookings();
              renderAnalytics();
            } catch (err) { toast(err.message, "error"); }
          } else if (statusChoice) {
            toast("Invalid status. Use 'Confirmed' or 'Cancelled'", "error");
          }
        });
      });
    } catch (err) { console.error(err); }
  }

  async function loadOffers() {
    try {
      const snap = await getDocs(collection(db, "offers"));
      const wrap = $("adOffersList");
      if (!snap.size) { wrap.innerHTML = `<div class="alert alert-light">No offers configured.</div>`; return; }
      wrap.innerHTML = snap.docs.map((d) => {
        const o = d.data();
        return `<div class="d-flex justify-content-between align-items-center border rounded p-2 mb-2">
          <div>
            <strong>${escapeHtml(o.code)}</strong> — ${escapeHtml(o.title)}
            <span class="badge bg-success ms-2">${o.discountPercent || 0}% off</span>
            <div class="small text-muted">${escapeHtml(o.description || "")}</div>
          </div>
          <button class="btn btn-sm btn-outline-danger" data-offer-del="${d.id}"><i class="bi bi-trash"></i></button>
        </div>`;
      }).join("");
      wrap.querySelectorAll("[data-offer-del]").forEach((b) => {
        b.addEventListener("click", async () => {
          if (!confirm("Delete this offer?")) return;
          await deleteDoc(doc(db, "offers", b.dataset.offerDel));
          toast("Offer deleted", "success");
          loadOffers();
          renderAnalytics();
        });
      });
    } catch (err) { console.error(err); }
  }

  $("adOfferForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "offers"), {
        code: $("adOfferCode").value.trim().toUpperCase(),
        title: $("adOfferTitle").value.trim(),
        description: $("adOfferDesc").value.trim(),
        discountPercent: Number($("adOfferDiscount").value) || 0,
        validUntil: $("adOfferValid").value || "",
        createdAt: serverTimestamp(),
      });
      toast("Offer added", "success");
      $("adOfferForm").reset();
      loadOffers();
    } catch (err) { toast(err.message, "error"); }
  });

  async function loadContactMessages() {
    try {
      const snap = await getDocs(query(collection(db, "messages"), orderBy("createdAt", "desc")));
      const wrap = $("msgContactsList");
      if (!snap.size) { 
        wrap.innerHTML = `<div class="alert alert-light text-center">No messages yet.</div>`; 
        return; 
      }
      wrap.innerHTML = snap.docs.map((d) => {
        const m = d.data();
        const date = formatDate(m.createdAt, "full");
        return `<div class="card mb-3 border-start border-info border-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <h6 class="card-title mb-1"><strong>${escapeHtml(m.name || "Anonymous")}</strong></h6>
                <div class="small text-muted">${escapeHtml(m.email || "")}</div>
              </div>
              <small class="text-muted">${date}</small>
            </div>
            <p class="card-text mb-2">${escapeHtml(m.message || "")}</p>
            <button class="btn btn-sm btn-outline-danger" data-msg-del-admin="${d.id}"><i class="bi bi-trash"></i> Delete</button>
          </div>
        </div>`;
      }).join("");
      wrap.querySelectorAll("[data-msg-del-admin]").forEach((b) => {
        b.addEventListener("click", async () => {
          if (!confirm("Delete this message?")) return;
          await deleteDoc(doc(db, "messages", b.dataset.msgDelAdmin));
          toast("Message deleted", "success");
          loadContactMessages();
        });
      });
    } catch (err) { console.error(err); }
  }

  async function renderReports() {
    try {
      const [flightsSnap, bookingsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, "flights")),
        getDocs(collection(db, "bookings")),
        getDocs(collection(db, "users")),
      ]);

      const bookings = bookingsSnap.docs.map(d => d.data());
      const confirmed = bookings.filter(b => b.status === "Confirmed").length;
      const cancelled = bookings.filter(b => b.status === "Cancelled").length;

      // Route popularity
      const routeMap = {};
      bookings.forEach(b => {
        const route = `${b.source} → ${b.destination}`;
        routeMap[route] = (routeMap[route] || 0) + 1;
      });
      const topRoutes = Object.entries(routeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // Most booked flight
      const flightMap = {};
      bookings.forEach(b => {
        flightMap[b.flightNumber] = (flightMap[b.flightNumber] || 0) + 1;
      });
      const mostBooked = Object.entries(flightMap).sort((a, b) => b[1] - a[1])[0];

      // Update report elements
      $("rpTotalBookings").textContent = bookingsSnap.size;
      $("rpConfirmed").textContent = confirmed;
      $("rpCancelled").textContent = cancelled;
      $("rpTotalFlights").textContent = flightsSnap.size;
      $("rpMostBooked").textContent = mostBooked ? `${mostBooked[0]} (${mostBooked[1]} bookings)` : "—";
      $("rpAvgBookings").textContent = flightsSnap.size > 0 ? Math.round(bookingsSnap.size / flightsSnap.size) : "0";

      // Render routes
      const routesWrap = $("rpRoutesList");
      if (topRoutes.length) {
        routesWrap.innerHTML = topRoutes.map(([route, count]) => `
          <div class="d-flex justify-content-between align-items-center p-2 border rounded mb-2">
            <span><strong>${escapeHtml(route)}</strong></span>
            <span class="badge bg-primary">${count} bookings</span>
          </div>
        `).join("");
      } else {
        routesWrap.innerHTML = `<div class="alert alert-light">No booking data yet.</div>`;
      }

      // Recent bookings
      const recentWrap = $("rpRecentBookings");
      const recent = bookings.slice(0, 10);
      if (recent.length) {
        recentWrap.innerHTML = recent.map(b => `
          <tr>
            <td><code>${escapeHtml(b.pnr)}</code></td>
            <td>${escapeHtml(b.flightNumber)}</td>
            <td>${escapeHtml(b.source)} → ${escapeHtml(b.destination)}</td>
            <td><span class="badge ${b.status === "Cancelled" ? "bg-danger" : "bg-success"}">${escapeHtml(b.status)}</span></td>
            <td>${formatDate(b.createdAt)}</td>
          </tr>
        `).join("");
      } else {
        recentWrap.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No bookings yet.</td></tr>`;
      }
    } catch (err) { console.error(err); }
  }

  async function renderAnalytics() {
    try {
      const [flightsSnap, bookingsSnap, usersSnap, offersSnap] = await Promise.all([
        getDocs(collection(db, "flights")),
        getDocs(collection(db, "bookings")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "offers")),
      ]);
      $("anFlights").textContent = flightsSnap.size;
      $("anBookings").textContent = bookingsSnap.size;
      $("anUsers").textContent = usersSnap.size;
      $("anOffers").textContent = offersSnap.size;
    } catch (err) { console.error(err); }
  }

  onAuthStateChanged(auth, async (user) => {
    if (!isAdmin(user)) { showDenied(true); return; }
    showDenied(false);
    await Promise.all([reloadFlights(), loadUsers(), loadBookings(), loadOffers(), loadContactMessages(), renderAnalytics(), renderReports()]);
  });
}

// ============================================================
// BOOKING PAGE
// ============================================================
async function initBooking() {
  let flights = [];
  let lastBooking = null;

  function showLoginRequired(show) {
    $("bkLoginRequired").classList.toggle("d-none", !show);
    $("bkContent").classList.toggle("d-none", show);
  }

  async function loadFlightOptions() {
    try {
      flights = (await fetchFlights()).filter((f) => f.status !== "Cancelled");
      $("bkFlight").innerHTML = `<option value="">— Select a flight —</option>` + flights.map((f) =>
        `<option value="${f.id}">${escapeHtml(f.flightNumber)} · ${escapeHtml(f.source)} → ${escapeHtml(f.destination)} · ${escapeHtml(f.departureTime)}</option>`
      ).join("");
    } catch (err) { toast("Could not load flights.", "error"); }
  }

  $("bookingForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) { showLoginRequired(true); return; }

    const f = flights.find((x) => x.id === $("bkFlight").value);
    if (!f) { toast("Please select a flight.", "error"); return; }

    const pnr = genPNR();
    const data = {
      pnr,
      flightId: f.id,
      flightNumber: f.flightNumber,
      source: f.source,
      destination: f.destination,
      departureTime: f.departureTime,
      passengerName: $("bkName").value.trim(),
      passengerEmail: $("bkEmail").value.trim(),
      seat: $("bkSeat").value.trim() || "—",
      userId: user.uid,
      status: "Confirmed",
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "bookings"), data);
      // Award 100 loyalty points
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        const current = snap.exists() ? (snap.data().loyaltyPoints || 0) : 0;
        await setDoc(userRef, { loyaltyPoints: current + 100, email: user.email }, { merge: true });
      } catch (err) { console.warn(err); }

      lastBooking = data;
      $("bkSuccessPnr").textContent = pnr;
      $("bkSuccessFlight").textContent = `${f.flightNumber} · ${f.source} → ${f.destination}`;
      $("bookingForm").reset();
      const modal = new window.bootstrap.Modal($("bookingSuccessModal"));
      modal.show();
    } catch (err) { toast(err.message, "error"); }
  });

  onAuthStateChanged(auth, (user) => {
    showLoginRequired(!user);
    if (user) loadFlightOptions();
  });
}

// ============================================================
// MANAGE BOOKING PAGE
// ============================================================
async function initManageBooking() {
  let currentBooking = null;

  $("mbLookupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pnr = $("mbPnr").value.trim().toUpperCase();
    try {
      const snap = await getDocs(query(collection(db, "bookings"), where("pnr", "==", pnr), limit(1)));
      if (snap.empty) {
        $("mbResult").innerHTML = `<div class="alert alert-warning">No booking found for PNR <code>${escapeHtml(pnr)}</code>.</div>`;
        return;
      }
      const d = snap.docs[0];
      currentBooking = { id: d.id, ...d.data() };
      renderBooking();
    } catch (err) { toast(err.message, "error"); }
  });

  function renderBooking() {
    const b = currentBooking;
    $("mbResult").innerHTML = `
      <div class="card section-card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <h4 class="text-primary mb-0">PNR <code>${escapeHtml(b.pnr)}</code></h4>
            <span class="badge fs-6 ${b.status === "Cancelled" ? "bg-danger" : "bg-success"}">${escapeHtml(b.status)}</span>
          </div>
          <table class="table table-sm">
            <tbody>
              <tr><th>Flight</th><td>${escapeHtml(b.flightNumber)}</td></tr>
              <tr><th>Route</th><td>${escapeHtml(b.source)} → ${escapeHtml(b.destination)}</td></tr>
              <tr><th>Departure</th><td>${escapeHtml(b.departureTime)}</td></tr>
              <tr><th>Passenger</th><td><input type="text" id="mbEditName" class="form-control form-control-sm" value="${escapeHtml(b.passengerName)}"></td></tr>
              <tr><th>Email</th><td><input type="email" id="mbEditEmail" class="form-control form-control-sm" value="${escapeHtml(b.passengerEmail)}"></td></tr>
              <tr><th>Seat</th><td><input type="text" id="mbEditSeat" class="form-control form-control-sm" value="${escapeHtml(b.seat || "")}"></td></tr>
            </tbody>
          </table>
          <div class="d-flex gap-2">
            <button class="btn btn-primary" id="mbSaveBtn" ${b.status === "Cancelled" ? "disabled" : ""}>
              <i class="bi bi-save"></i> Save Changes
            </button>
            <button class="btn btn-danger" id="mbCancelBtn" ${b.status === "Cancelled" ? "disabled" : ""}>
              <i class="bi bi-x-circle"></i> Cancel Booking
            </button>
          </div>
        </div>
      </div>`;

    $("mbSaveBtn")?.addEventListener("click", async () => {
      try {
        await updateDoc(doc(db, "bookings", currentBooking.id), {
          passengerName: $("mbEditName").value.trim(),
          passengerEmail: $("mbEditEmail").value.trim(),
          seat: $("mbEditSeat").value.trim(),
        });
        toast("Booking updated", "success");
        currentBooking.passengerName = $("mbEditName").value.trim();
        currentBooking.passengerEmail = $("mbEditEmail").value.trim();
        currentBooking.seat = $("mbEditSeat").value.trim();
      } catch (err) { toast(err.message, "error"); }
    });

    $("mbCancelBtn")?.addEventListener("click", async () => {
      if (!confirm("Cancel this booking? This cannot be undone.")) return;
      try {
        await updateDoc(doc(db, "bookings", currentBooking.id), { status: "Cancelled" });
        toast("Booking cancelled", "success");
        currentBooking.status = "Cancelled";
        renderBooking();
      } catch (err) { toast(err.message, "error"); }
    });
  }
}

// ============================================================
// OFFERS PAGE
// ============================================================
async function initOffers() {
  try {
    const snap = await getDocs(collection(db, "offers"));
    const wrap = $("offersGrid");
    if (!snap.size) {
      wrap.innerHTML = `<div class="col-12"><div class="alert alert-light text-center">No active offers right now. Check back soon.</div></div>`;
    } else {
      wrap.innerHTML = snap.docs.map((d) => {
        const o = d.data();
        return `
          <div class="col-md-6 col-lg-4">
            <div class="card section-card h-100">
              <div class="card-body">
                <span class="badge bg-warning text-dark mb-2">${o.discountPercent || 0}% OFF</span>
                <h5 class="card-title text-primary">${escapeHtml(o.title)}</h5>
                <p class="text-muted small">${escapeHtml(o.description || "")}</p>
                <div class="d-flex justify-content-between align-items-center mt-3">
                  <code class="fs-6 bg-light px-2 py-1 rounded">${escapeHtml(o.code)}</code>
                  ${o.validUntil ? `<small class="text-muted">until ${escapeHtml(o.validUntil)}</small>` : ""}
                </div>
              </div>
            </div>
          </div>`;
      }).join("");
    }
  } catch (err) { toast("Could not load offers.", "error"); }

  // Loyalty
  onAuthStateChanged(auth, async (user) => {
    const block = $("loyaltyBlock");
    if (!user) { block.classList.add("d-none"); return; }
    block.classList.remove("d-none");
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      const points = snap.exists() ? (snap.data().loyaltyPoints || 0) : 0;
      const tier = points >= 1000 ? "Gold" : points >= 500 ? "Silver" : "Bronze";
      const next = points >= 1000 ? 1000 : points >= 500 ? 1000 : 500;
      const pct = Math.min(100, Math.round((points / next) * 100));
      $("loyaltyPoints").textContent = points;
      $("loyaltyTier").textContent = tier;
      $("loyaltyBar").style.width = pct + "%";
      $("loyaltyBar").textContent = `${points} / ${next}`;
    } catch (err) { console.error(err); }
  });
}

// ============================================================
// BOOT
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  injectNavbar();
  injectLoginModal();
  setupLoginModal();
  onAuthStateChanged(auth, reflectAuthState);

  const page = document.body.dataset.page;
  const initFns = {
    home: initHome,
    about: initAbout,
    contact: initContact,
    schedule: initSchedule,
    status: initStatus,
    user: initUserDashboard,
    admin: initAdminDashboard,
    booking: initBooking,
    manage: initManageBooking,
    offers: initOffers,
  };
  initFns[page]?.();
});
