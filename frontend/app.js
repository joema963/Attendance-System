// Show message feedback
const showMessage = (text, isError = false) => {
  const msg = document.getElementById('message');
  if (msg) {
    msg.textContent = text;
    msg.style.color = isError ? '#ff4d4d' : '#28a745';
    msg.style.opacity = '1';
    setTimeout(() => { msg.style.opacity = '0'; }, 3000);
  }
};

// Button loading effect
const setButtonLoading = (btn, loading = true) => {
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'Please wait...' : btn.dataset.originalText;
};

// Register handler
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  const btn = registerForm.querySelector('button');
  btn.dataset.originalText = btn.textContent;

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setButtonLoading(btn, true);
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;

    try {
      const res = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        showMessage('✅ Registration successful! Redirecting...');
        setTimeout(() => window.location.href = 'index.html', 1500);
      } else {
        showMessage(data.message || 'Registration failed', true);
      }
    } catch (err) {
      showMessage('⚠️ Server error. Try again.', true);
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

// Login handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  const btn = loginForm.querySelector('button');
  btn.dataset.originalText = btn.textContent;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setButtonLoading(btn, true);

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', username); // save username locally
        window.location.href = 'dashboard.html';
      } else {
        showMessage(data.message || 'Login failed', true);
      }
    } catch (err) {
      showMessage('⚠️ Could not reach server.', true);
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

// Mark attendance
async function markAttendance(status) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('http://localhost:3000/attendance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    showMessage(data.message, !res.ok);
    fetchAttendance();
  } catch (err) {
    showMessage('⚠️ Failed to mark attendance.', true);
  }
}

// Fetch attendance history
async function fetchAttendance() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('http://localhost:3000/attendance', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    // Display stored username or backend-sent one
    const userInfo = document.getElementById('userInfo');
    const username = localStorage.getItem('username') || data.username || 'User';
    if (userInfo) userInfo.innerHTML = `Logged in as <strong>${username}</strong>`;

    const list = document.getElementById('attendanceList');
    list.innerHTML = '';

    const records = data.records || data; // support both array or {records}
    if (!records.length) {
      list.innerHTML = '<li>No attendance records found.</li>';
      return;
    }

    records.forEach(row => {
      const li = document.createElement('li');
      const color = row.status === 'Present' ? 'green' : 'red';
      const emoji = row.status === 'Present' ? '✅' : '❌';
      const date = new Date(row.date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      li.innerHTML = `<strong>${date}</strong> - <span style="color: ${color}">${emoji} ${row.status}</span>`;
      list.appendChild(li);
    });
  } catch (err) {
    showMessage('⚠️ Unable to fetch attendance.', true);
  }
}

// Load dashboard if attendanceList exists
if (document.getElementById('attendanceList')) {
  fetchAttendance();
}

// Logout button
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
  });
}

// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(icon => {
  icon.addEventListener('click', () => {
    const input = document.querySelector(icon.getAttribute('toggle'));
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    icon.textContent = isHidden ? '🙈' : '👁️';
  });
});
