// -------------------
// API URLs & Auth Helpers
// -------------------
const API_URL = "/api/assets";
const AUTH_URL = "/api/auth";
const MAINT_URL = "/api/maintenance";
const REPORTS_URL = "/api/reports/summary";
const AUDIT_URL = "/api/assets"; // base for per-asset audit endpoint
const USERS_URL = "/api/users";
const token = localStorage.getItem("token"); // Get JWT from localStorage
const userRole = localStorage.getItem("role") || "user";
const authHeaders = token
  ? { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
  : { "Content-Type": "application/json" };

// Protect dashboard: if on dashboard page with no token, redirect to login
const dashboardContainer = document.querySelector(".dashboard-container");
if (dashboardContainer && !token) {
  window.location.href = "login.html";
}

// Admin-only user management section
const adminSection = document.getElementById("adminSection");

async function loadUsersForAdmin() {
  if (!adminSection || userRole !== 'admin') return;

  adminSection.classList.remove('hidden');
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;

  try {
    const res = await fetch(USERS_URL, { headers: authHeaders });
    if (!res.ok) {
      tbody.innerHTML = '<tr><td colspan="4">Unable to load users.</td></tr>';
      return;
    }
    const users = await res.json();
    tbody.innerHTML = '';

    users.forEach((user) => {
      const isAdmin = user.role === 'admin';
      const actionLabel = isAdmin ? 'Make User' : 'Make Admin';
      const targetRole = isAdmin ? 'user' : 'admin';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td><button class="action-btn" data-user-id="${user._id}" data-target-role="${targetRole}">${actionLabel}</button></td>
      `;
      tbody.appendChild(row);
    });

    // Attach click handlers
    tbody.querySelectorAll('button[data-user-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userId = btn.getAttribute('data-user-id');
        const targetRole = btn.getAttribute('data-target-role');

        if (!confirm(`Change this user's role to ${targetRole}?`)) return;

        await fetch(`${USERS_URL}/${userId}/role`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({ role: targetRole })
        });

        loadUsersForAdmin();
      });
    });
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

// Toggle "Register Asset" form visibility
const assetFormSection = document.getElementById("assetFormSection");
const toggleAssetFormBtn = document.getElementById("toggleAssetFormBtn");
if (assetFormSection && toggleAssetFormBtn) {
  toggleAssetFormBtn.addEventListener("click", () => {
    const isHidden = assetFormSection.classList.contains("hidden");
    if (isHidden) {
      assetFormSection.classList.remove("hidden");
      toggleAssetFormBtn.textContent = "Hide Asset Form";
    } else {
      assetFormSection.classList.add("hidden");
      toggleAssetFormBtn.textContent = "+ Register Asset";
    }
  });
}

// -------------------
// Fetch and display assets
// -------------------
async function fetchAssets() {
  const tbody = document.getElementById("assetsTableBody");
  if (!tbody) return;

  try {
    const res = await fetch(API_URL, { headers: authHeaders });
    if (res.status === 401) {
      // Token missing/invalid – send user to login
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      window.location.href = "login.html";
      return;
    }
    const assets = await res.json();
    // Only show non-disposed assets in the main list
    const activeAssets = assets.filter(asset => asset.status !== "Disposed");
    tbody.innerHTML = "";

    activeAssets.forEach(asset => {
      const safeName = asset.name ? asset.name.replace(/"/g, '&quot;') : '';
      const safeCategory = asset.category ? asset.category.replace(/"/g, '&quot;') : '';
      const safeDepartment = asset.department ? asset.department.replace(/"/g, '&quot;') : '';
      const safeLocation = asset.location ? asset.location.replace(/"/g, '&quot;') : '';
      const safeAssignedTo = asset.assignedTo ? asset.assignedTo.replace(/"/g, '&quot;') : '';

      const row = `
        <tr>
          <td>${asset.name}</td>
          <td>${asset.category}</td>
          <td>${asset.status}</td>
          <td>${asset.value}</td>
          <td>${new Date(asset.dateAcquired).toLocaleDateString()}</td>
          <td>${asset.location || "-"}</td>
          <td>${asset.assignedTo || "-"}</td>
          <td>${asset.department || "-"}</td>
          <td>
            <button class="action-btn edit-btn" onclick="editAsset('${asset._id}', '${safeName}', '${asset.status}', '${safeCategory}', '${safeDepartment}', '${safeLocation}', '${safeAssignedTo}', '${asset.value}')">Edit</button>
            ${userRole === 'admin' ? `<button class="action-btn delete-btn" onclick="deleteAsset('${asset._id}')">Delete</button>` : ''}
          </td>
        </tr>
      `;
      tbody.innerHTML += row;
    });
  } catch (err) {
    console.error("Error fetching assets:", err);
  }
}

// -------------------
// Add new asset
// -------------------
const assetForm = document.getElementById("assetForm");
if (assetForm) {
  assetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newAsset = {
      name: document.getElementById("name").value,
      category: document.getElementById("category").value,
      status: document.getElementById("status").value,
      value: document.getElementById("value").value || 0,
      assignedTo: document.getElementById("assignedTo").value || "",
      department: document.getElementById("department").value || "",
      dateAcquired: document.getElementById("dateAcquired").value
    };

    await fetch(API_URL, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(newAsset)
    });

    e.target.reset();
    fetchAssets();
    populateAssetOptions();
  });
}

// -------------------
// Delete asset
// -------------------
async function deleteAsset(id) {
  if (!confirm("Are you sure you want to delete this asset?")) return;

  await fetch(`${API_URL}/${id}`, { method: "DELETE", headers: authHeaders });
  fetchAssets();
  populateAssetOptions();
}

// -------------------
// Edit asset (inline form)
// -------------------
const editAssetPanel = document.getElementById("editAssetPanel");
const editAssetForm = document.getElementById("editAssetForm");
const editAssetIdInput = document.getElementById("editAssetId");
const editNameInput = document.getElementById("editName");
const editCategoryInput = document.getElementById("editCategory");
const editDepartmentInput = document.getElementById("editDepartment");
const editLocationInput = document.getElementById("editLocation");
const editAssignedToInput = document.getElementById("editAssignedTo");
const editValueInput = document.getElementById("editValue");
const editStatusSelect = document.getElementById("editStatus");
const cancelEditBtn = document.getElementById("cancelEditBtn");

function editAsset(id, currentName, currentStatus, currentCategory, currentDepartment, currentLocation, currentAssignedTo, currentValue) {
  if (!editAssetPanel || !editAssetForm) return;
  editAssetIdInput.value = id;
  editNameInput.value = currentName || "";
  if (editCategoryInput) editCategoryInput.value = currentCategory || "";
  if (editDepartmentInput) editDepartmentInput.value = currentDepartment || "";
  if (editLocationInput) editLocationInput.value = currentLocation || "";
  if (editAssignedToInput) editAssignedToInput.value = currentAssignedTo || "";
  if (editValueInput) editValueInput.value = currentValue != null ? currentValue : "";
  if (editStatusSelect) {
    editStatusSelect.value = currentStatus || "Available";
  }
  editAssetPanel.classList.remove("hidden");
  window.scrollTo({ top: editAssetPanel.offsetTop - 20, behavior: "smooth" });
}

if (editAssetForm) {
  editAssetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = editAssetIdInput.value;
    const newName = editNameInput.value;
    const newCategory = editCategoryInput ? editCategoryInput.value : undefined;
    const newDepartment = editDepartmentInput ? editDepartmentInput.value : undefined;
    const newLocation = editLocationInput ? editLocationInput.value : undefined;
    const newAssignedTo = editAssignedToInput ? editAssignedToInput.value : undefined;
    const newValueRaw = editValueInput ? editValueInput.value : undefined;
    const newValue = newValueRaw !== undefined && newValueRaw !== "" ? Number(newValueRaw) : undefined;
    const newStatus = editStatusSelect ? editStatusSelect.value : undefined;

    if (!id || !newName || !newStatus) return;

    // Disallow setting status to Disposed here; use Dispose flow instead
    if (newStatus === "Disposed") {
      alert("To mark an asset as disposed, use the Dispose section under Transfers & Disposal.");
      return;
    }

    const payload = {
      name: newName,
      status: newStatus
    };

    if (newCategory !== undefined) payload.category = newCategory;
    if (newDepartment !== undefined) payload.department = newDepartment;
    if (newLocation !== undefined) payload.location = newLocation;
    if (newAssignedTo !== undefined) payload.assignedTo = newAssignedTo;
    if (newValue !== undefined && !Number.isNaN(newValue)) payload.value = newValue;

    await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify(payload)
    });

    editAssetPanel.classList.add("hidden");
    fetchAssets();
    populateAssetOptions();
  });
}

if (cancelEditBtn && editAssetPanel) {
  cancelEditBtn.addEventListener("click", () => {
    editAssetPanel.classList.add("hidden");
  });
}

// -------------------
// Populate asset options for disposal & transfer
// -------------------
async function populateAssetOptions() {
  const res = await fetch(API_URL, { headers: authHeaders });
  const assets = await res.json();

  const disposeSelect = document.getElementById("disposeAssetId");
  const transferSelect = document.getElementById("transferAssetId");
  const maintenanceSelect = document.getElementById("maintenanceAssetId");
  const historySelect = document.getElementById("historyAssetId");
  if (!disposeSelect && !transferSelect && !maintenanceSelect && !historySelect) return;

  if (disposeSelect) disposeSelect.innerHTML = "";
  if (transferSelect) transferSelect.innerHTML = "";
  if (maintenanceSelect) maintenanceSelect.innerHTML = "";
  if (historySelect) historySelect.innerHTML = "";

  assets.forEach(asset => {
    // Only allow disposing and transferring non-disposed assets
    const isDisposed = asset.status === "Disposed";

    if (disposeSelect && !isDisposed) {
      const option1 = document.createElement("option");
      option1.value = asset._id;
      option1.text = `${asset.name} (${asset.status})`;
      disposeSelect.appendChild(option1);
    }

    if (transferSelect && !isDisposed) {
      const option2 = document.createElement("option");
      option2.value = asset._id;
      option2.text = `${asset.name} (${asset.status})`;
      transferSelect.appendChild(option2);
    }

    if (maintenanceSelect) {
      const option3 = document.createElement("option");
      option3.value = asset._id;
      option3.text = `${asset.name} (${asset.status})`;
      maintenanceSelect.appendChild(option3);
    }

    if (historySelect) {
      const option4 = document.createElement("option");
      option4.value = asset._id;
      option4.text = `${asset.name} (${asset.status})`;
      historySelect.appendChild(option4);
    }
  });

  // If there is at least one asset, auto-load history for the first one
  if (historySelect && historySelect.options.length > 0) {
    const firstId = historySelect.options[0].value;
    historySelect.value = firstId;
    loadMaintenanceHistory(firstId);
    loadAuditTrail(firstId);
  }
}

// -------------------
// Load audit trail for a single asset
// -------------------
async function loadAuditTrail(assetId) {
  const tbody = document.getElementById("auditTableBody");
  if (!tbody || !assetId) return;

  try {
    const res = await fetch(`${AUDIT_URL}/${assetId}/audit`, { headers: authHeaders });
    if (!res.ok) {
      tbody.innerHTML = "";
      return;
    }
    const events = await res.json();
    tbody.innerHTML = "";

    if (!events.length) {
      tbody.innerHTML = `<tr><td colspan="3">No history recorded for this asset yet.</td></tr>`;
      return;
    }

    events.forEach((evt) => {
      const dt = new Date(evt.date);
      const dateStr = `${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`;
      const row = `
        <tr>
          <td>${dateStr}</td>
          <td>${evt.type}</td>
          <td>${evt.description || ''}</td>
        </tr>
      `;
      tbody.innerHTML += row;
    });
  } catch (err) {
    console.error("Error loading audit trail:", err);
  }
}

// -------------------
// Maintenance: log and fetch history
// -------------------
const maintenanceForm = document.getElementById("maintenanceForm");
if (maintenanceForm) {
  maintenanceForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const assetId = document.getElementById("maintenanceAssetId").value;
    const description = document.getElementById("maintenanceDescription").value;
    const date = document.getElementById("maintenanceDate").value;
    const costValue = document.getElementById("maintenanceCost").value;

    const payload = {
      assetId,
      description,
      date: date || undefined,
      cost: costValue ? Number(costValue) : undefined
    };

    await fetch(MAINT_URL, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload)
    });

    maintenanceForm.reset();
    loadMaintenanceHistory(assetId);
  });
}

async function loadMaintenanceHistory(assetId) {
  const tbody = document.getElementById("maintenanceTableBody");
  if (!tbody) return;

  const res = await fetch(`${MAINT_URL}?assetId=${assetId}`, { headers: authHeaders });
  const records = await res.json();

  tbody.innerHTML = "";
  records.forEach((record) => {
    const dateStr = new Date(record.date).toLocaleDateString();
    const assetName = record.asset && record.asset.name ? record.asset.name : "-";
    const row = `
      <tr>
        <td>${dateStr}</td>
        <td>${assetName}</td>
        <td>${record.description}</td>
        <td>${record.status || '-'}</td>
        <td>${record.cost || 0}</td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

const maintenanceAssetSelect = document.getElementById("maintenanceAssetId");
if (maintenanceAssetSelect) {
  maintenanceAssetSelect.addEventListener("change", () => {
    const id = maintenanceAssetSelect.value;
    if (id) {
      // When logging for an asset, also sync the history selector for convenience
      const historySelect = document.getElementById("historyAssetId");
      if (historySelect) {
        historySelect.value = id;
      }
      loadMaintenanceHistory(id);
      loadAuditTrail(id);
    }
  });
}

// Separate selector just for viewing history
const historyAssetSelect = document.getElementById("historyAssetId");
if (historyAssetSelect) {
  historyAssetSelect.addEventListener("change", () => {
    const id = historyAssetSelect.value;
    if (id) {
      loadMaintenanceHistory(id);
      loadAuditTrail(id);
    }
  });
}

// -------------------
// Handle asset disposal
// -------------------
const disposeForm = document.getElementById("disposeForm");
if (disposeForm) {
  // Hide disposal controls for non-admin users on the client side
  if (userRole !== 'admin') {
    const disposeAssetId = document.getElementById("disposeAssetId");
  const disposeReason = document.getElementById("disposeReason");
  const disposeSubmitBtn = document.getElementById("disposeSubmitBtn");
    if (disposeAssetId) disposeAssetId.disabled = true;
    if (disposeReason) disposeReason.disabled = true;
    if (disposeSubmitBtn) disposeSubmitBtn.disabled = true;
    const disposeHelper = document.querySelector('#disposeForm')?.previousElementSibling;
    if (disposeHelper) {
      disposeHelper.textContent = 'Only admins can dispose assets. Ask an admin to mark items as disposed when needed.';
    }
  }

  disposeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("disposeAssetId").value;
    const reason = document.getElementById("disposeReason").value;

    if (!confirm(`Dispose asset? Reason: ${reason}`)) return;

    await fetch(`${API_URL}/${id}/dispose`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ status: "Disposed", disposalReason: reason })
    });

    fetchAssets();
    populateAssetOptions();
    e.target.reset();
  });
}

// -------------------
// Handle asset transfer
// -------------------
const transferForm = document.getElementById("transferForm");
if (transferForm) {
  transferForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("transferAssetId").value;
    const newLocation = document.getElementById("newLocation").value;

    await fetch(`${API_URL}/${id}/transfer`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ location: newLocation })
    });

    fetchAssets();
    populateAssetOptions();
    e.target.reset();
  });
}

// -------------------
// Logout
// -------------------
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    window.location.href = "login.html";
  });
}

// -------------------
// Auth: Login & Register Forms
// -------------------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const messageEl = document.getElementById("message");

    try {
      const res = await fetch(`${AUTH_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        if (messageEl) messageEl.textContent = data.error || "Login failed";
        return;
      }

      localStorage.setItem("token", data.token);
      if (data.username) {
        localStorage.setItem("username", data.username);
      }
      if (data.role) {
        localStorage.setItem("role", data.role);
      }

      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Login error:", err);
      if (messageEl) messageEl.textContent = "An error occurred. Please try again.";
    }
  });
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const messageEl = document.getElementById("message");

    try {
      const res = await fetch(`${AUTH_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        if (messageEl) messageEl.textContent = data.error || "Registration failed";
        return;
      }

      if (messageEl) messageEl.textContent = "Registration successful. You can now log in.";
      // Optionally redirect to login after short delay
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1000);
    } catch (err) {
      console.error("Registration error:", err);
      if (messageEl) messageEl.textContent = "An error occurred. Please try again.";
    }
  });
}

// -------------------
// Initialize asset data only on pages that need it
// -------------------
if (document.getElementById("assetsTableBody")) {
  fetchAssets();
  populateAssetOptions();
  loadSummary();
  loadUsersForAdmin();
}

// -------------------
// Load summary (reports)
// -------------------
async function loadSummary() {
  const totalAssetsEl = document.getElementById("summaryTotalAssets");
  const totalAcqEl = document.getElementById("summaryTotalAcquisitions");
  const totalDispEl = document.getElementById("summaryTotalDisposals");
  const totalMaintEl = document.getElementById("summaryTotalMaintenance");
  const statusBody = document.getElementById("summaryStatusBody");
  const categoryBody = document.getElementById("summaryCategoryBody");
  const deptBody = document.getElementById("summaryDepartmentBody");

  if (!totalAssetsEl || !totalAcqEl || !totalDispEl || !totalMaintEl) return;

  try {
    const res = await fetch(REPORTS_URL, { headers: authHeaders });
    if (!res.ok) return;
    const data = await res.json();

    totalAssetsEl.textContent = data.totalAssets ?? 0;
    totalAcqEl.textContent = data.totalAcquisitions ?? 0;
    totalDispEl.textContent = data.totalDisposals ?? 0;
    totalMaintEl.textContent = data.totalMaintenance ?? 0;

    if (statusBody && data.byStatus) {
      statusBody.innerHTML = "";
      Object.entries(data.byStatus).forEach(([key, value]) => {
        const row = `<tr><td>${key}</td><td>${value}</td></tr>`;
        statusBody.innerHTML += row;
      });
    }

    if (categoryBody && data.byCategory) {
      categoryBody.innerHTML = "";
      Object.entries(data.byCategory).forEach(([key, value]) => {
        const row = `<tr><td>${key}</td><td>${value}</td></tr>`;
        categoryBody.innerHTML += row;
      });
    }

    if (deptBody && data.byDepartment) {
      deptBody.innerHTML = "";
      Object.entries(data.byDepartment).forEach(([key, value]) => {
        const row = `<tr><td>${key}</td><td>${value}</td></tr>`;
        deptBody.innerHTML += row;
      });
    }
  } catch (err) {
    console.error("Error loading summary:", err);
  }
}
