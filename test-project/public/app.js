// -----------------------------
// Frontend JS (final working code)
// -----------------------------
document.addEventListener('DOMContentLoaded', () => {
  const assetForm = document.getElementById('assetForm');
  const assetsTable = document.getElementById('assetsTable');

  async function fetchAssets() {
    const res = await fetch('/api/assets');
    const data = await res.json();
    const tbody = assetsTable.querySelector('tbody');
    tbody.innerHTML = '';
    data.forEach(asset => {
      const tr = document.createElement('tr');
      tr.innerHTML = \
        <td>\</td>
        <td>\</td>
        <td>\</td>
        <td>\</td>
        <td>\</td>
        <td>
          <button class='edit-btn action-btn' onclick='editAsset(\"\")'>Edit</button>
          <button class='delete-btn action-btn' onclick='deleteAsset(\"\")'>Delete</button>
        </td>
      \;
      tbody.appendChild(tr);
    });
  }

  assetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(assetForm);
    const data = Object.fromEntries(formData.entries());
    await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    fetchAssets();
    assetForm.reset();
  });

  window.deleteAsset = async (id) => {
    await fetch(\/api/assets/\\, { method: 'DELETE' });
    fetchAssets();
  };

  fetchAssets();
});
