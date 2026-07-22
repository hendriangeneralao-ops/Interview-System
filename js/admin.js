const ADMIN_CREDENTIALS = {
  email: 'admin@bisu.edu.ph',
  password: 'admin123'
};

let currentUser = null;
let results = [];

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('bisu-admin-session');
  if (saved) {
    currentUser = JSON.parse(saved);
    showAdminView();
    loadResults();
  }
});

function loginAdmin() {
  const email = $('admin-email').value.trim();
  const password = $('admin-password').value.trim();
  if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
    currentUser = { email, role: 'admin' };
    localStorage.setItem('bisu-admin-session', JSON.stringify(currentUser));
    $('auth-message').textContent = '';
    showAdminView();
    loadResults();
  } else {
    $('auth-message').textContent = 'Invalid admin credentials.';
  }
}

function logoutAdmin() {
  currentUser = null;
  localStorage.removeItem('bisu-admin-session');
  $('auth-view').style.display = 'block';
  $('admin-view').style.display = 'none';
}

function showAdminView() {
  $('auth-view').style.display = 'none';
  $('admin-view').style.display = 'block';
}

function loadResults() {
  const stored = localStorage.getItem('bisu-interview-results');
  results = stored ? JSON.parse(stored) : [];
  renderResults();
  if (results.length) {
    renderDetail(results[0]);
  } else {
    $('detail-content').innerHTML = '<p style="color:rgba(255,255,255,0.6);">No student results have been saved yet.</p>';
  }
}

function renderResults() {
  const list = $('results-list');
  if (!results.length) {
    list.innerHTML = '<div style="padding:20px;color:rgba(255,255,255,0.6);">No results available.</div>';
    return;
  }
  list.innerHTML = results.map((item, index) => `
    <div class="result-item ${index === 0 ? 'active' : ''}" onclick="selectResult(${index})">
      <div style="font-weight:700;">${item.studentName || 'Student ' + (index + 1)}</div>
      <div class="score-pill">${item.overallScore || 0}%</div>
      <div class="result-meta">
        <span>${item.program || 'Program not specified'}</span>
        <span>${new Date(item.createdAt || Date.now()).toLocaleDateString()}</span>
      </div>
    </div>
  `).join('');
}

function selectResult(index) {
  const items = document.querySelectorAll('.result-item');
  items.forEach((item, idx) => item.classList.toggle('active', idx === index));
  renderDetail(results[index]);
}

function renderDetail(item) {
  const detail = $('detail-content');
  const responseSummary = (item.answers || []).map((entry, idx) => `
    <div class="detail-item">
      <strong>Q${idx + 1}:</strong> ${entry.question}
      <div class="answer-block">${entry.answer || 'No answer recorded.'}</div>
    </div>
  `).join('');

  detail.innerHTML = `
    <h4 style="margin:0 0 8px;">${item.studentName || 'Student'}</h4>
    <p style="margin:0 0 16px;color:rgba(255,255,255,0.65);">${item.program || 'Program not specified'}</p>
    <div class="detail-list">
      <div class="detail-item"><strong>Overall Result:</strong> ${item.overallScore || 0}%</div>
      <div class="detail-item"><strong>Recommended Job:</strong> ${item.recommendedJob || 'Not available'}</div>
      <div class="detail-item"><strong>Key Strengths:</strong> ${(item.strengths || []).join(', ') || 'None listed'}</div>
      <div class="detail-item"><strong>Areas to Improve:</strong> ${(item.improvements || []).join(', ') || 'None listed'}</div>
      <div class="detail-item"><strong>Interview Summary:</strong><div class="answer-block">${item.summary || 'No summary available.'}</div></div>
    </div>
    <div style="margin-top:16px;">
      <h5 style="margin-bottom:8px;">Student Answers</h5>
      ${responseSummary}
    </div>
  `;
}
