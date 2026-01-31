// --- CONFIGURATION ---
// IMPORTANT: Keep your Live URL here!
const API_URL = 'https://fiscal-mind.onrender.com/api'; 
let transactions = [];
let chartInstance = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if(token) {
        showDashboard();
    }
    
    // Attach Listeners Safely
    const regForm = document.getElementById('registerForm');
    if(regForm) regForm.addEventListener('submit', handleRegister);

    const logForm = document.getElementById('loginForm');
    if(logForm) logForm.addEventListener('submit', handleLogin);

    const addTxForm = document.getElementById('addForm');
    if(addTxForm) addTxForm.addEventListener('submit', handleAddTransaction);

    // Close Modal on Outside Click
    const modal = document.getElementById('editModal');
    if(modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'editModal') closeEditModal();
        });
    }
});

// --- AUTH LOGIC ---
let isLoginView = true;
window.toggleAuth = function() {
    isLoginView = !isLoginView;
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const text = document.getElementById('authToggleText');

    if(isLoginView) {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        text.innerText = "Need an account? Register";
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        text.innerText = "Have an account? Login";
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPass').value;
    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if(res.ok) {
            alert("Account created! Please login.");
            toggleAuth();
        } else {
            const data = await res.json();
            alert(data.error);
        }
    } catch (err) { alert("Server Error"); }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPass').value;
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if(res.ok) {
            localStorage.setItem('token', data.token);
            showDashboard();
        } else {
            alert(data.error);
        }
    } catch (err) { alert("Server Error"); }
}

window.logout = function() {
    localStorage.removeItem('token');
    location.reload();
}

function showDashboard() {
    const loginView = document.getElementById('login-view');
    const dashView = document.getElementById('dashboard-view');
    if(loginView) loginView.classList.add('hidden');
    if(dashView) dashView.classList.remove('hidden');
    fetchTransactions();
}

function getAuthHeader() {
    return { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
    };
}

// --- DATA LOGIC ---
async function fetchTransactions() {
    try {
        const res = await fetch(`${API_URL}/transactions`, { headers: getAuthHeader() });
        if(res.status === 403 || res.status === 401) return logout();
        const data = await res.json();
        transactions = data;
        updateUI();
    } catch (err) { console.error(err); }
}

async function handleAddTransaction(e) {
    e.preventDefault();
    const desc = document.getElementById('descInput').value;
    const amount = Number(document.getElementById('amountInput').value);
    const type = document.getElementById('typeInput').value;
    const category = document.getElementById('categoryInput').value; // Get Category

    try {
        const res = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: getAuthHeader(),
            // Send category in the body
            body: JSON.stringify({ description: desc, amount, type, category })
        });
        const savedTx = await res.json();
        transactions.unshift(savedTx);
        document.getElementById('addForm').reset();
        updateUI();
    } catch (err) { alert("Error saving"); }
}

window.deleteTx = async function(id) {
    if(!confirm("Delete this?")) return;
    await fetch(`${API_URL}/transactions/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeader()
    });
    transactions = transactions.filter(t => t.id !== id);
    updateUI();
}

// --- V2.0 FEATURES (Tabs, History, Budgets) ---

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    const target = document.getElementById(`tab-${tabName}`);
    if(target) target.classList.remove('hidden');
    
    // Simple active button logic
    const buttons = document.querySelectorAll('.tab-btn');
    if(buttons.length > 0) {
        if(tabName === 'dashboard') buttons[0].classList.add('active');
        if(tabName === 'history') {
            buttons[1].classList.add('active');
            renderHistory();
        }
        if(tabName === 'budget') {
            buttons[2].classList.add('active');
            updateBudgets();
        }
    }
}

window.renderHistory = function() {
    const list = document.getElementById('historyList');
    const month = document.getElementById('historyMonth').value;
    const year = document.getElementById('historyYear').value;
    if(!list) return;
    
    list.innerHTML = '';
    const filtered = transactions.filter(tx => {
        const d = new Date(tx.date || tx.created_at);
        return (month === 'all' || d.getMonth() == month) && d.getFullYear() == year;
    });

    if (filtered.length === 0) {
        list.innerHTML = '<p style="padding:20px; color:#94a3b8;">No records found.</p>';
        document.getElementById('historyStats').innerText = '';
        return;
    }

    let total = 0;
    filtered.forEach(tx => {
        if(tx.type === 'expense') total += Number(tx.amount);
        const li = document.createElement('li');
        li.className = 'tx-item';
        const color = tx.type === 'income' ? 'text-success' : 'text-danger';
        const sign = tx.type === 'income' ? '+' : '-';
        li.innerHTML = `<div><div class="tx-desc">${tx.description}</div><span class="tx-date">${new Date(tx.date||tx.created_at).toLocaleDateString()}</span></div><span class="${color}" style="font-weight:bold;">${sign}₹${Number(tx.amount).toLocaleString('en-IN')}</span>`;
        list.appendChild(li);
    });
    document.getElementById('historyStats').innerText = `Total Expenses: ₹${total.toLocaleString('en-IN')}`;
}

// --- NEW MODAL LOGIC (Replaces prompt) ---
let currentEditingCategory = null;

// 1. Open the Modal
window.editBudget = function(category) {
    currentEditingCategory = category;
    
    // Update text
    document.getElementById('modal-category-text').innerText = `Set new limit for ${category.toUpperCase()}`;
    // Clear input
    document.getElementById('newLimitInput').value = '';
    
    // Show modal
    document.getElementById('editModal').classList.remove('hidden');
    document.getElementById('newLimitInput').focus();
}

// 2. Save the New Limit (Called by "Save" button)
window.saveLimit = function() {
    const amount = document.getElementById('newLimitInput').value;
    
    if (amount && !isNaN(amount) && Number(amount) > 0) {
        // Save to browser memory
        localStorage.setItem(`budget_limit_${currentEditingCategory}`, amount);
        
        // Refresh UI
        updateBudgets();
        
        // Close Modal
        closeEditModal();
    } else {
        alert("Please enter a valid amount.");
    }
}

// 3. Close Modal
window.closeEditModal = function() {
    document.getElementById('editModal').classList.add('hidden');
    currentEditingCategory = null;
}

// --- BUDGET UPDATE LOGIC ---
window.updateBudgets = function() {
    const budgets = [
        { 
            id: 'food', 
            limit: Number(localStorage.getItem('budget_limit_food')) || 5000 
        },
        { 
            id: 'transport', 
            limit: Number(localStorage.getItem('budget_limit_transport')) || 3000 
        },
        { 
            id: 'fun', 
            limit: Number(localStorage.getItem('budget_limit_fun')) || 2000 
        }
    ];

    budgets.forEach(bucket => {
        const spent = transactions
            .filter(t => t.type === 'expense')
            .filter(t => t.category === bucket.id) 
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const bar = document.getElementById(`bar-${bucket.id}`);
        const status = document.getElementById(`status-${bucket.id}`);
        const card = document.getElementById(`bucket-${bucket.id}`);
        const limitText = document.getElementById(`limit-${bucket.id}`); 
        
        if(!bar) return;

        const pct = Math.min((spent / bucket.limit) * 100, 100);
        bar.style.width = `${pct}%`;
        status.innerText = `₹${spent.toLocaleString()} / ₹${bucket.limit.toLocaleString()}`;
        if(limitText) limitText.innerText = `₹${bucket.limit.toLocaleString()}`; // Update displayed limit
        
        card.classList.remove('shake-alert');
        bar.style.backgroundColor = pct < 50 ? '#10b981' : pct < 90 ? '#facc15' : '#ef4444';
        
        if (spent > bucket.limit) {
            card.classList.add('shake-alert');
            status.innerHTML += " <b style='color:red'>(OVER LIMIT!)</b>";
        }
    });
}

// --- VISUALS ---
function renderList() {
    const list = document.getElementById('txList');
    if(!list) return;
    list.innerHTML = '';
    transactions.forEach(tx => {
        const li = document.createElement('li');
        li.className = 'tx-item';
        const c = tx.type === 'income' ? 'text-success' : 'text-danger';
        const s = tx.type === 'income' ? '+' : '-';
        li.innerHTML = `<div><div class="tx-desc">${tx.description}</div><span class="tx-date">${new Date(tx.date||tx.created_at).toLocaleDateString()}</span></div><div><span class="${c}" style="font-weight:bold;margin-right:15px;">${s}₹${Number(tx.amount).toLocaleString('en-IN')}</span><button onclick="deleteTx(${tx.id})" style="color:#cbd5e1;background:none;border:none;cursor:pointer;">&times;</button></div>`;
        list.appendChild(li);
    });
}

function updateChart() {
    const ctx = document.getElementById('myChart');
    if(!ctx) return;
    const inc = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
    const exp = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
    if(chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Expenses','Savings'], datasets: [{ data: [exp, (inc-exp)>0?inc-exp:0], backgroundColor: ['#ef4444','#10b981'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

function generateAI() {
    const exp = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
    const inc = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
    const bal = inc - exp;
    
    let title="", msg="";
    if(inc===0 && exp===0) { title="⏳ Awaiting Data"; msg="Start adding entries."; }
    else if(inc===0) { title="🚨 Critical Alert"; msg="Expenses with no income!"; }
    else if(exp > inc) { title="⚠️ Deficit"; msg=`You overspent by ₹${Math.abs(bal)}.`; }
    else { title="✅ Healthy"; msg="Finances are stable."; }

    const aiBox = document.getElementById('aiText');
    if(aiBox) aiBox.innerHTML = `<strong style="font-size:1.1rem;display:block;margin-bottom:8px;">${title}</strong><span style="opacity:0.9;">${msg}</span>`;
}

function updateUI() { renderList(); updateChart(); generateAI(); }

window.downloadPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("FiscalMind Report", 10, 20);
    let y = 40;
    transactions.forEach(tx => {
        doc.text(`${new Date(tx.date||tx.created_at).toLocaleDateString()} | ${tx.description} | ${tx.amount}`, 10, y);
        y += 10;
    });
    doc.save("Report.pdf");
}