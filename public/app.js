document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const username = localStorage.getItem('username');
  const staffID = localStorage.getItem('staffID');
  const department = localStorage.getItem('department');

  if (!token && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
    window.location.href = 'login.html';
    return;
  }

  // Helper for status badges
  const getStatusBadge = (status) => {
    const s = status.toLowerCase().replace(' ', '-');
    return `<span class="badge badge-${s}">${status}</span>`;
  };

  // Helper for empty states
  const checkEmpty = (data, tbody, colSpan) => {
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-state">No records found.</td></tr>`;
      return true;
    }
    return false;
  };

  // Display User Info
  const usernameDisplay = document.getElementById('usernameDisplay');
  const roleDisplay = document.getElementById('roleDisplay');
  const userInfoDisplay = document.getElementById('userInfoDisplay');

  if (usernameDisplay) usernameDisplay.innerText = username;
  if (roleDisplay) roleDisplay.innerText = `Role: ${role.toUpperCase()}`;
  if (userInfoDisplay) userInfoDisplay.innerText = `Staff ID: ${staffID} | Dept: ${department}`;

  // Role based view toggle
  const adminView = document.getElementById('adminView');
  const userView = document.getElementById('userView');

  if (role === 'admin') {
    if (adminView) adminView.classList.remove('hidden');
  } else {
    if (userView) userView.classList.remove('hidden');
    // Pre-fill user specific fields
    const fields = ['reqStaffID', 'reqDept', 'retStaffID', 'retDept', 'maintStaffID'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id.includes('StaffID')) el.value = staffID;
        if (id.includes('Dept')) el.value = department;
      }
    });
  }

  // Common: Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'login.html';
    });
  }

  // Fetch Assets for Inventory
  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let assets = await res.json();
      
      // If user is not admin, only show available assets in the general inventory
      if (role !== 'admin') {
        assets = assets.filter(a => a.status === 'Available');
      }

      const tbody = document.getElementById('assetsTableBody');
      if (tbody) {
        if (!checkEmpty(assets, tbody, 7)) {
          tbody.innerHTML = assets.map(asset => `
            <tr>
              <td>${asset.itemID}</td>
              <td>${asset.description}</td>
              <td>${asset.serialNumber}</td>
              <td>${asset.category}</td>
              <td>${getStatusBadge(asset.status)}</td>
              <td>${asset.assignedTo ? asset.assignedTo.username : 'N/A'}</td>
              <td>
                ${asset.department || 'N/A'}
                ${role === 'admin' ? `
                  <button class="edit-btn" onclick="openEditAsset('${asset._id}', '${asset.description}', '${asset.itemID}', '${asset.serialNumber}', '${asset.category}', ${asset.value}, '${asset.location || ''}', '${asset.status}')">Edit</button>
                  <button class="delete-btn" onclick="deleteAsset('${asset._id}')">Delete</button>
                ` : ''}
              </td>
            </tr>
          `).join('');
        }
      }

      // Populate selects for allocation/disposal/transfer
      const allocSelect = document.getElementById('allocAssetId');
      const dispSelect = document.getElementById('dispAssetId');
      const transSelect = document.getElementById('transAssetId');
      if (allocSelect) {
        allocSelect.innerHTML = '<option value="">Select Asset</option>' + 
          assets.filter(a => a.status === 'Available').map(a => `<option value="${a._id}">${a.description} (${a.serialNumber})</option>`).join('');
      }
      if (dispSelect) {
        dispSelect.innerHTML = '<option value="">Select Asset</option>' + 
          assets.filter(a => a.status !== 'Disposed').map(a => `<option value="${a._id}">${a.description} (${a.serialNumber})</option>`).join('');
      }
      if (transSelect) {
        transSelect.innerHTML = '<option value="">Select Asset to Transfer</option>' + 
          assets.filter(a => a.status === 'Allocated').map(a => `<option value="${a._id}">${a.description} (${a.serialNumber})</option>`).join('');
      }

    } catch (err) {
      console.error(err);
    }
  };

  // Asset Tracking Logic
  const trackBtn = document.getElementById('trackBtn');
  if (trackBtn) {
    trackBtn.addEventListener('click', async () => {
      const query = document.getElementById('trackAssetID').value;
      if (!query) return;

      const sRes = await fetch(`/api/assets/search?query=${query}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const sData = await sRes.json();
      if (sData.assets.length === 0) {
        alert('Asset not found');
        return;
      }
      const assetId = sData.assets[0]._id;

      const res = await fetch(`/api/assets/${assetId}/track`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      
      const trackingDetails = document.getElementById('trackingDetails');
      if (trackingDetails) trackingDetails.classList.remove('hidden');

      const a = data.asset;
      const trackSummary = document.getElementById('trackSummary');
      if (trackSummary) {
        trackSummary.innerHTML = `
          <p><strong>Description:</strong> ${a.description}</p>
          <p><strong>Item ID:</strong> ${a.itemID}</p>
          <p><strong>Serial Number:</strong> ${a.serialNumber}</p>
          <p><strong>Current Status:</strong> ${getStatusBadge(a.status)}</p>
          <p><strong>Current Location:</strong> ${a.location || 'Head Office'}</p>
          <p><strong>Current User:</strong> ${a.assignedTo ? `${a.assignedTo.username} (${a.assignedTo.staffID})` : 'None'}</p>
          <p><strong>Department:</strong> ${a.department || 'N/A'}</p>
        `;
      }

      const transBody = document.getElementById('trackTransferTable').querySelector('tbody');
      if (transBody && !checkEmpty(data.transferHistory, transBody, 5)) {
        transBody.innerHTML = data.transferHistory.map(t => `
          <tr>
            <td>${new Date(t.date).toLocaleDateString()}</td>
            <td>${t.fromUserName || 'N/A'}</td>
            <td>${t.toUserName}</td>
            <td>${t.toDepartment}</td>
            <td>${t.reason}</td>
          </tr>
        `).join('');
      }

      const maintBody = document.getElementById('trackMaintenanceTable').querySelector('tbody');
      if (maintBody && !checkEmpty(data.maintenanceHistory, maintBody, 4)) {
        maintBody.innerHTML = data.maintenanceHistory.map(m => `
          <tr>
            <td>${new Date(m.date).toLocaleDateString()}</td>
            <td>${m.reason}</td>
            <td>${m.cost}</td>
            <td>${getStatusBadge(m.status)}</td>
          </tr>
        `).join('');
      }
    });
  }

  if (window.location.pathname.includes('dashboard.html')) {
    fetchAssets();
  }

  // --- UI MANAGEMENT ---
  const allSections = [
    'registerSection', 'allocationSection', 'disposalSection', 'transferSection', 'trackingSection',
    'usersSection', 'adminReportsSection', 'searchResults',
    'requestSection', 'returnSection', 'maintenanceSection', 'userReportsSection',
    'editAssetSection', 'editUserSection'
  ];

  const showSection = (sectionId) => {
    allSections.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');
  };

  // --- ADMIN ACTIONS ---

  const adminBtnMap = {
    'btnShowRegister': 'registerSection',
    'btnShowAllocate': 'allocationSection',
    'btnShowTransfer': 'transferSection',
    'btnShowDisposal': 'disposalSection',
    'btnShowTracking': 'trackingSection',
    'btnShowUsers': 'usersSection',
    'btnShowAdminReports': 'adminReportsSection'
  };

  Object.entries(adminBtnMap).forEach(([btnId, sectionId]) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', () => {
        showSection(sectionId);
        if (sectionId === 'usersSection') fetchUserTable();
        if (sectionId === 'adminReportsSection') fetchAdminReports();
      });
    }
  });

  // Register Item
  const registerItemForm = document.getElementById('registerItemForm');
  if (registerItemForm) {
    registerItemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        itemID: document.getElementById('regItemID').value,
        description: document.getElementById('regDescription').value,
        serialNumber: document.getElementById('regSerialNumber').value,
        category: document.getElementById('regCategory').value,
        value: document.getElementById('regValue').value
      };

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('Item Registered');
        registerItemForm.reset();
        document.getElementById('registerSection').classList.add('hidden');
        fetchAssets();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    });
  }

  // Allocate Item
  const allocationForm = document.getElementById('allocationForm');
  if (allocationForm && role === 'admin') {
    // Fetch users for selection
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
        const users = await res.json();
        const userSelect = document.getElementById('allocUserId');
        if (userSelect && Array.isArray(users)) {
          userSelect.innerHTML = '<option value="">Select Staff</option>' + 
            users.map(u => `<option value="${u._id}" data-dept="${u.department}">${u.username} (${u.staffID})</option>`).join('');
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();

    allocationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const assetID = document.getElementById('allocAssetId').value;
      const userID = document.getElementById('allocUserId').value;
      const userOption = document.getElementById('allocUserId').selectedOptions[0];
      const department = userOption.getAttribute('data-dept');

      const res = await fetch(`/api/assets/${assetID}/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userID, department })
      });
      if (res.ok) {
        alert('Item Allocated');
        allocationForm.reset();
        document.getElementById('allocationSection').classList.add('hidden');
        fetchAssets();
      }
    });
  }

  // Disposal
  const disposalForm = document.getElementById('disposalForm');
  if (disposalForm) {
    disposalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!confirm('Are you sure you want to mark this item as disposed? This action cannot be undone.')) return;
      const assetID = document.getElementById('dispAssetId').value;
      const reason = document.getElementById('dispReason').value;

      const res = await fetch(`/api/assets/${assetID}/dispose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        alert('Item Disposed');
        disposalForm.reset();
        document.getElementById('disposalSection').classList.add('hidden');
        fetchAssets();
      }
    });
  }

  // Transfer Item
  const transferForm = document.getElementById('transferForm');
  if (transferForm && role === 'admin') {
    const transAssetSelect = document.getElementById('transAssetId');
    const transUserSelect = document.getElementById('transToUserId');
    const transCurrentHolder = document.getElementById('transCurrentHolder');

    // Fetch users for transfer selection
    const fetchUsersForTransfer = async () => {
      const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
      const users = await res.json();
      if (!res.ok) return;
      if (transUserSelect && Array.isArray(users)) {
        transUserSelect.innerHTML = '<option value="">Select New Owner</option>' + 
          users.map(u => `<option value="${u._id}">${u.username} (${u.staffID})</option>`).join('');
      }
    };
    fetchUsersForTransfer();

    transAssetSelect.addEventListener('change', async (e) => {
      const assetId = e.target.value;
      if (!assetId) {
        transCurrentHolder.innerText = 'N/A';
        return;
      }
      const res = await fetch('/api/assets', { headers: { 'Authorization': `Bearer ${token}` } });
      const assets = await res.json();
      const selected = assets.find(a => a._id === assetId);
      if (selected && selected.assignedTo) {
        transCurrentHolder.innerText = `${selected.assignedTo.username} (${selected.assignedTo.staffID}) in ${selected.department}`;
      } else {
        transCurrentHolder.innerText = 'None (Available)';
      }
    });

    transferForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const assetID = transAssetSelect.value;
      const toUserID = transUserSelect.value;
      const toDepartment = document.getElementById('transToDept').value;
      const reason = document.getElementById('transReason').value;

      const res = await fetch(`/api/assets/${assetID}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ toUserID, toDepartment, reason })
      });
      if (res.ok) {
        alert('Asset Transferred Successfully');
        transferForm.reset();
        transCurrentHolder.innerText = 'N/A';
        document.getElementById('transferSection').classList.add('hidden');
        fetchAssets();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    });
  }

  // Manage Roles
  const fetchUserTable = async () => {
    try {
      const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
      const users = await res.json();
      const tbody = document.getElementById('userTableBody');
      if (tbody && Array.isArray(users)) {
        if (!checkEmpty(users, tbody, 5)) {
          tbody.innerHTML = users.map(u => `
            <tr>
              <td>${u.username}</td>
              <td>${u.staffID}</td>
              <td>${u.department}</td>
              <td>${getStatusBadge(u.role)}</td>
              <td>
                <button onclick="openEditUser('${u._id}', '${u.username}', '${u.email}', '${u.staffID}', '${u.department}', '${u.role}')">Edit</button>
                ${u.role === 'user' ? `<button onclick="updateRole('${u._id}', 'admin')">Make Admin</button>` : `<button onclick="updateRole('${u._id}', 'user')">Make User</button>`}
                <button class="delete-btn" onclick="deleteUser('${u._id}')">Delete</button>
              </td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Error fetching user table:', err);
    }
  };

  window.deleteAsset = async (id) => {
    if (!confirm('Are you sure you want to delete this asset PERMANENTLY? This will be logged in the audit trail.')) return;
    const res = await fetch(`/api/assets/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      alert('Asset deleted');
      fetchAssets();
      if (document.getElementById('adminReportsSection').classList.contains('hidden') === false) fetchAdminReports();
    } else {
      const err = await res.json();
      alert(err.error);
    }
  };

  window.deleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user PERMANENTLY? This will be logged in the audit trail.')) return;
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      alert('User deleted');
      fetchUserTable();
      if (document.getElementById('adminReportsSection').classList.contains('hidden') === false) fetchAdminReports();
    } else {
      const err = await res.json();
      alert(err.error);
    }
  };

  window.openEditAsset = (id, desc, itemID, sn, cat, val, loc, status) => {
    showSection('editAssetSection');
    document.getElementById('editAssetId').value = id;
    document.getElementById('editAssetDescription').value = desc;
    document.getElementById('editAssetItemID').value = itemID;
    document.getElementById('editAssetSerialNumber').value = sn;
    document.getElementById('editAssetCategory').value = cat;
    document.getElementById('editAssetValue').value = val;
    document.getElementById('editAssetLocation').value = loc;
    document.getElementById('editAssetStatus').value = status;
  };

  const editAssetForm = document.getElementById('editAssetForm');
  if (editAssetForm) {
    editAssetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editAssetId').value;
      const data = {
        description: document.getElementById('editAssetDescription').value,
        itemID: document.getElementById('editAssetItemID').value,
        serialNumber: document.getElementById('editAssetSerialNumber').value,
        category: document.getElementById('editAssetCategory').value,
        value: document.getElementById('editAssetValue').value,
        location: document.getElementById('editAssetLocation').value,
        status: document.getElementById('editAssetStatus').value
      };

      const res = await fetch(`/api/assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('Asset Updated');
        showSection(''); // Hide all
        fetchAssets();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    });
  }

  window.openEditUser = (id, username, email, staffID, dept, role) => {
    showSection('editUserSection');
    document.getElementById('editUserId').value = id;
    document.getElementById('editUsername').value = username;
    document.getElementById('editUserEmail').value = email;
    document.getElementById('editUserStaffID').value = staffID;
    document.getElementById('editUserDepartment').value = dept;
    document.getElementById('editUserRole').value = role;
  };

  const editUserForm = document.getElementById('editUserForm');
  if (editUserForm) {
    editUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editUserId').value;
      const data = {
        username: document.getElementById('editUsername').value,
        email: document.getElementById('editUserEmail').value,
        staffID: document.getElementById('editUserStaffID').value,
        department: document.getElementById('editUserDepartment').value,
        role: document.getElementById('editUserRole').value
      };

      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('User Updated');
        showSection('usersSection'); // Go back to users list
        fetchUserTable();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    });
  }

  window.updateRole = async (userId, role) => {
    if (!confirm(`Are you sure you want to change this user's role to ${role}?`)) return;
    const res = await fetch(`/api/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ role })
    });
    if (res.ok) {
      alert('Role Updated');
      fetchUserTable();
    }
  };

  // Admin Reports
  const fetchAdminReports = async () => {
    const res = await fetch('/api/reports/admin', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    
    document.querySelectorAll('.reportDate').forEach(el => el.innerText = new Date().toLocaleString());

    document.getElementById('adminStats').innerHTML = `
      <div class="stat-box clickable" onclick="filterInventory('All')"><strong>${data.stats.totalAssets}</strong><span>Total Assets</span></div>
      <div class="stat-box clickable" onclick="scrollToSection('pendingRequestsTable')"><strong>${data.stats.totalRequests}</strong><span>Requests</span></div>
      <div class="stat-box clickable" onclick="scrollToSection('pendingReturnsTable')"><strong>${data.stats.totalReturns}</strong><span>Returns</span></div>
      <div class="stat-box clickable" onclick="scrollToSection('pendingMaintenanceTable')"><strong>${data.stats.totalMaintenance}</strong><span>Maintenance</span></div>
      <div class="stat-box clickable" onclick="filterInventory('Allocated')"><strong>${data.stats.totalAllocated}</strong><span>Allocated</span></div>
      <div class="stat-box clickable" onclick="filterInventory('Disposed')"><strong>${data.stats.totalDisposed}</strong><span>Disposed</span></div>
    `;

    window.scrollToSection = (id) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.backgroundColor = '#fff9c4'; // Brief highlight
        setTimeout(() => { el.style.backgroundColor = ''; }, 2000);
      }
    };

    window.filterInventory = (status) => {
      const inventoryBody = document.getElementById('fullInventoryTable').querySelector('tbody');
      let filtered = data.fullInventory;
      if (status !== 'All') {
        filtered = data.fullInventory.filter(a => a.status === status);
      }
      
      if (!checkEmpty(filtered, inventoryBody, 7)) {
        inventoryBody.innerHTML = filtered.map(a => `
          <tr>
            <td>${a.itemID}</td>
            <td>${a.description}</td>
            <td>${a.serialNumber}</td>
            <td>${getStatusBadge(a.status)}</td>
            <td>${a.assignedTo ? a.assignedTo.username : 'N/A'}</td>
            <td>${a.department || 'N/A'}</td>
            <td>${a.value}</td>
          </tr>
        `).join('');
      }
    };

    const inventoryBody = document.getElementById('fullInventoryTable').querySelector('tbody');
    if (inventoryBody && Array.isArray(data.fullInventory) && !checkEmpty(data.fullInventory, inventoryBody, 7)) {
      inventoryBody.innerHTML = data.fullInventory.map(a => `
        <tr>
          <td>${a.itemID}</td>
          <td>${a.description}</td>
          <td>${a.serialNumber}</td>
          <td>${getStatusBadge(a.status)}</td>
          <td>${a.assignedTo ? a.assignedTo.username : 'N/A'}</td>
          <td>${a.department || 'N/A'}</td>
          <td>${a.value}</td>
        </tr>
      `).join('');
    }

    const requestsBody = document.getElementById('pendingRequestsTable').querySelector('tbody');
    if (requestsBody && Array.isArray(data.requestedItems) && !checkEmpty(data.requestedItems, requestsBody, 7)) {
      requestsBody.innerHTML = data.requestedItems.map(r => `
        <tr>
          <td>${r.description}</td>
          <td>${r.specifications || 'N/A'}</td>
          <td>${r.reason}</td>
          <td>${r.duration || 'Permanent'}</td>
          <td>${r.timeline || 'N/A'}</td>
          <td>${r.requestedBy.username} (${r.requestedBy.staffID})</td>
          <td>
            <button onclick="updateRequest('${r._id}', 'Approved')">Approve</button>
            <button onclick="updateRequest('${r._id}', 'Rejected')">Reject</button>
          </td>
        </tr>
      `).join('');
    }

    const returnsBody = document.getElementById('pendingReturnsTable').querySelector('tbody');
    if (returnsBody && Array.isArray(data.returnMarkedItems) && !checkEmpty(data.returnMarkedItems, returnsBody, 5)) {
      returnsBody.innerHTML = data.returnMarkedItems.map(r => `
        <tr>
          <td>${r.asset ? r.asset.description : 'N/A'}</td>
          <td>${r.serialNumber}</td>
          <td>${r.reason}</td>
          <td>${r.staffID}</td>
          <td>
            <button onclick="updateReturn('${r._id}', 'Received')">Mark Received</button>
          </td>
        </tr>
      `).join('');
    }

    const maintBody = document.getElementById('pendingMaintenanceTable').querySelector('tbody');
    if (maintBody && Array.isArray(data.pendingMaintenance) && !checkEmpty(data.pendingMaintenance, maintBody, 7)) {
      maintBody.innerHTML = data.pendingMaintenance.map(m => `
        <tr>
          <td>${m.asset ? m.asset.description : 'N/A'}</td>
          <td>${m.serialNumber}</td>
          <td>${m.reason}</td>
          <td>${m.staffID}</td>
          <td>
            ${getStatusBadge(m.status)}
          </td>
          <td>
            <input type="number" id="cost-${m._id}" value="${m.cost}" style="width: 80px;">
          </td>
          <td>
            ${m.status === 'Pending' ? `<button onclick="updateMaintenance('${m._id}', 'In Progress')">Start</button>` : ''}
            <button onclick="updateMaintenance('${m._id}', 'Completed')">Complete & Save Cost</button>
          </td>
        </tr>
      `).join('');
    }

    const auditBody = document.getElementById('deletionAuditTable').querySelector('tbody');
    if (auditBody && Array.isArray(data.deletionLogs) && !checkEmpty(data.deletionLogs, auditBody, 5)) {
      auditBody.innerHTML = data.deletionLogs.map(log => `
        <tr>
          <td>${log.action}</td>
          <td>${log.targetName}</td>
          <td>${log.details}</td>
          <td>${log.performedByName}</td>
          <td>${new Date(log.createdAt).toLocaleString()}</td>
        </tr>
      `).join('');
    }
  };

  window.updateRequest = async (id, status) => {
    if (!confirm(`Are you sure you want to ${status.toLowerCase()} this request?`)) return;
    await fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
    if (status === 'Approved') {
      alert('Request Approved. You can now allocate an item to this user.');
      // Fetch users to populate dropdown before showing allocation
      const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
      const users = await res.json();
      const userSelect = document.getElementById('allocUserId');
      if (userSelect) {
        userSelect.innerHTML = '<option value="">Select Staff</option>' + 
          users.map(u => `<option value="${u._id}" data-dept="${u.department}">${u.username} (${u.staffID})</option>`).join('');
      }
      
      // Fetch available assets
      const resAssets = await fetch('/api/assets', { headers: { 'Authorization': `Bearer ${token}` } });
      const assets = await resAssets.json();
      const assetSelect = document.getElementById('allocAssetId');
      if (assetSelect) {
        assetSelect.innerHTML = '<option value="">Select Asset</option>' + 
          assets.filter(a => a.status === 'Available').map(a => `<option value="${a._id}">${a.description} (${a.serialNumber})</option>`).join('');
      }

      showSection('allocationSection');
    }
    fetchAdminReports();
  };

  window.updateReturn = async (id, status) => {
    if (!confirm('Mark this item as received?')) return;
    await fetch(`/api/returns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
    fetchAdminReports();
    fetchAssets();
  };

  window.updateMaintenance = async (id, status) => {
    const costInput = document.getElementById(`cost-${id}`);
    const cost = costInput ? costInput.value : undefined;
    if (!confirm(`Change maintenance status to ${status}?`)) return;
    await fetch(`/api/maintenance/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status, cost: cost ? parseFloat(cost) : undefined })
    });
    fetchAdminReports();
    fetchAssets();
  };

  // Search
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', async () => {
      const q = document.getElementById('searchInput').value;
      if (!q) return;
      const res = await fetch(`/api/assets/search?query=${q}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      
      showSection('searchResults');
      
      document.getElementById('resultsContent').innerHTML = `
        <h4>Assets Found: ${data.assets.length}</h4>
        <ul>${data.assets.map(a => `<li>${a.description} (${a.serialNumber}) - ${getStatusBadge(a.status)}</li>`).join('')}</ul>
        <h4>Requests Found: ${data.requests.length}</h4>
        <ul>${data.requests.map(r => `<li>${r.description} by ${r.staffID} - ${getStatusBadge(r.status)}</li>`).join('')}</ul>
        <h4>Returns Found: ${data.returns.length}</h4>
        <ul>${data.returns.map(r => `<li>${r.serialNumber} by ${r.staffID} - ${getStatusBadge(r.status)}</li>`).join('')}</ul>
        <h4>Users Found: ${data.users.length}</h4>
        <ul>${data.users.map(u => `<li>${u.username} (${u.staffID}) - ${getStatusBadge(u.role)}</li>`).join('')}</ul>
      `;
    });
  }

  // --- USER ACTIONS ---

  const userBtnMap = {
    'btnShowRequest': 'requestSection',
    'btnShowReturn': 'returnSection',
    'btnShowMaintenance': 'maintenanceSection',
    'btnShowUserReports': 'userReportsSection'
  };

  Object.entries(userBtnMap).forEach(([btnId, sectionId]) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', () => {
        showSection(sectionId);
        if (sectionId === 'userReportsSection') fetchUserReports();
      });
    }
  });

  // Request Duration Toggle
  const reqDuration = document.getElementById('reqDuration');
  const timelineDiv = document.getElementById('timelineDiv');
  const timelineInput = document.getElementById('reqTimeline');
  if (timelineInput) {
    timelineInput.min = new Date().toISOString().split('T')[0];
  }
  if (reqDuration && timelineDiv) {
    reqDuration.addEventListener('change', (e) => {
      if (e.target.value === 'Temporary') {
        timelineDiv.classList.remove('hidden');
      } else {
        timelineDiv.classList.add('hidden');
      }
    });
  }

  // Submit Request
  const requestItemForm = document.getElementById('requestItemForm');
  if (requestItemForm) {
    requestItemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        description: document.getElementById('reqDescription').value,
        specifications: document.getElementById('reqSpecifications').value,
        reason: document.getElementById('reqReason').value,
        duration: document.getElementById('reqDuration').value,
        timeline: document.getElementById('reqTimeline').value,
        staffID: document.getElementById('reqStaffID').value,
        department: document.getElementById('reqDept').value
      };
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('Request Submitted');
        requestItemForm.reset();
        if (timelineDiv) timelineDiv.classList.add('hidden');
        document.getElementById('requestSection').classList.add('hidden');
      }
    });
  }

  // Submit Return
  const returnItemForm = document.getElementById('returnItemForm');
  if (returnItemForm) {
    returnItemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        serialNumber: document.getElementById('retSerialNumber').value,
        reason: document.getElementById('retReason').value,
        staffID: document.getElementById('retStaffID').value,
        department: document.getElementById('retDept').value
      };
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('Return Submitted');
        returnItemForm.reset();
        document.getElementById('returnSection').classList.add('hidden');
      } else {
        const err = await res.json();
        alert(err.error);
      }
    });
  }

  // Maintenance Request
  const maintenanceReqForm = document.getElementById('maintenanceReqForm');
  if (maintenanceReqForm) {
    maintenanceReqForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        serialNumber: document.getElementById('maintSerialNumber').value,
        reason: document.getElementById('maintReason').value,
        staffID: document.getElementById('maintStaffID').value
      };
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('Maintenance Request Submitted');
        maintenanceReqForm.reset();
        document.getElementById('maintenanceSection').classList.add('hidden');
      } else {
        const err = await res.json();
        alert(err.error);
      }
    });
  }

  // User Reports
  const fetchUserReports = async () => {
    const res = await fetch('/api/reports/user', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    
    document.querySelectorAll('.reportDate').forEach(el => el.innerText = new Date().toLocaleString());
    const printUserInfo = document.getElementById('printUserInfo');
    if (printUserInfo) printUserInfo.innerText = `Staff ID: ${staffID} | Name: ${username} | Department: ${department}`;

    const allocBody = document.getElementById('userAllocatedTable').querySelector('tbody');
    if (!checkEmpty(data.allocatedAssets, allocBody, 4)) {
      allocBody.innerHTML = data.allocatedAssets.map(a => `
        <tr>
          <td>${a.description}</td>
          <td>${a.serialNumber}</td>
          <td>${a.category}</td>
          <td>${a.value}</td>
        </tr>
      `).join('');
    }

    const reqBody = document.getElementById('userRequestsTable').querySelector('tbody');
    if (!checkEmpty(data.requests, reqBody, 3)) {
      reqBody.innerHTML = data.requests.map(r => `
        <tr>
          <td>${r.description}</td>
          <td>${r.reason}</td>
          <td>${getStatusBadge(r.status)}</td>
        </tr>
      `).join('');
    }

    const retBody = document.getElementById('userReturnsTable').querySelector('tbody');
    if (!checkEmpty(data.returns, retBody, 4)) {
      retBody.innerHTML = data.returns.map(r => `
        <tr>
          <td>${r.asset ? r.asset.description : 'N/A'}</td>
          <td>${r.serialNumber}</td>
          <td>${r.reason}</td>
          <td>${getStatusBadge(r.status)}</td>
        </tr>
      `).join('');
    }

    const maintBodyUser = document.getElementById('userMaintenanceTable').querySelector('tbody');
    if (!checkEmpty(data.maintenance, maintBodyUser, 4)) {
      maintBodyUser.innerHTML = data.maintenance.map(m => `
        <tr>
          <td>${m.asset ? m.asset.description : 'N/A'}</td>
          <td>${m.serialNumber}</td>
          <td>${m.reason}</td>
          <td>${getStatusBadge(m.status)}</td>
        </tr>
      `).join('');
    }
  };

  // Global Cancel buttons
  document.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('section').classList.add('hidden');
    });
  });

  // Auth Forms
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('role', data.role);
          localStorage.setItem('username', data.username);
          localStorage.setItem('staffID', data.staffID);
          localStorage.setItem('department', data.department);
          window.location.href = 'dashboard.html';
        } else {
          alert(data.error);
        }
      } catch (err) {
        alert('Login failed');
      }
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        staffID: document.getElementById('staffID').value,
        department: document.getElementById('department').value,
        password: document.getElementById('password').value
      };

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (res.ok) {
          alert('Registration successful. Please login.');
          window.location.href = 'login.html';
        } else {
          alert(result.error);
        }
      } catch (err) {
        alert('Registration failed');
      }
    });
  }

});
