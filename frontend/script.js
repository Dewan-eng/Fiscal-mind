const API_URL = 'https://fiscal-mind.onrender.com/api';
let transactions = [];
let chartInstance = null;

// --- AUTH STATE ---
const token = localStorage.getItem('token');
if(token) {
    showDashboard();
}

// --- TOGGLE LOGIN / REGISTER ---
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

// --- AUTHENTICATION HANDLERS ---

// 1. REGISTER
document.getElementById('registerForm').addEventListener('submit', async (e) => {
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
            toggleAuth(); // Switch back to login
        } else {
            const data = await res.json();
            alert(data.error);
        }
    } catch (err) { alert("Server Error"); }
});

// 2. LOGIN
document.getElementById('loginForm').addEventListener('submit', async (e) => {
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
            localStorage.setItem('token', data.token); // SAVE THE TOKEN
            showDashboard();
        } else {
            alert(data.error);
        }
    } catch (err) { alert("Server Error"); }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    location.reload(); // Refresh page to clear state
});

// --- DASHBOARD LOGIC (Protected) ---

function showDashboard() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    fetchTransactions();
}

// Helper: Get Token for headers
function getAuthHeader() {
    return { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
    };
}

async function fetchTransactions() {
    try {
        const res = await fetch(`${API_URL}/transactions`, { headers: getAuthHeader() });
        if(res.status === 403 || res.status === 401) {
            localStorage.removeItem('token');
            location.reload();
            return;
        }
        
        const data = await res.json();
        transactions = data;
        updateUI();
    } catch (err) { console.error(err); }
}

document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const desc = document.getElementById('descInput').value;
    const amount = Number(document.getElementById('amountInput').value);
    const type = document.getElementById('typeInput').value;

    try {
        const res = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ description: desc, amount, type })
        });
        const savedTx = await res.json();
        transactions.unshift(savedTx);
        document.getElementById('addForm').reset();
        updateUI();
    } catch (err) { alert("Error saving"); }
});

async function deleteTx(id) {
    if(!confirm("Delete this?")) return;
    await fetch(`${API_URL}/transactions/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeader()
    });
    transactions = transactions.filter(t => t.id !== id);
    updateUI();
}

// --- CORE FUNCTIONS (Visuals & Logic) ---

function renderList() {
    const list = document.getElementById('txList');
    list.innerHTML = '';

    transactions.forEach(tx => {
        const li = document.createElement('li');
        li.className = 'tx-item';
        
        const amountClass = tx.type === 'income' ? 'text-success' : 'text-danger';
        const sign = tx.type === 'income' ? '+' : '-';
        const dateStr = new Date(tx.date || tx.created_at).toLocaleDateString();

        li.innerHTML = `
            <div>
                <div class="tx-desc">${tx.description}</div>
                <span class="tx-date">${dateStr}</span>
            </div>
            <div>
                <span class="${amountClass}" style="font-weight:bold; margin-right:15px;">
                    ${sign}₹${Number(tx.amount).toLocaleString('en-IN')}
                </span>
                <button onclick="deleteTx(${tx.id})" style="color:#cbd5e1; background:none; border:none; cursor:pointer;">&times;</button>
            </div>
        `;
        list.appendChild(li);
    });
}

function updateChart() {
    const ctx = document.getElementById('myChart');
    
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
        
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
        
    const savings = income - expense;

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Expenses', 'Savings'],
            datasets: [{
                data: [expense, savings > 0 ? savings : 0],
                backgroundColor: ['#ef4444', '#10b981'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ' ' + context.label + ': ₹' + context.raw.toLocaleString('en-IN');
                        }
                    }
                }
            }
        }
    });
}

// --- NEW "SMART" AI LOGIC ---
function generateAI() {
    // 1. Calculate Totals
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
        
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = income - expense;
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

    // 2. Identify "Bad Habits" (Simple Keyword Matching)
    const badHabits = transactions
        .filter(t => t.type === 'expense')
        .filter(t => {
            const desc = t.description.toLowerCase();
            return desc.includes('coffee') || desc.includes('netflix') || desc.includes('uber') || desc.includes('food');
        });
    
    const habitTotal = badHabits.reduce((sum, t) => sum + Number(t.amount), 0);

    // 3. Generate Insight & Suggestion
    let title = "";
    let message = "";

    if (income === 0 && expense === 0) {
        title = "⏳ Awaiting Data";
        message = "Start by adding your salary or an expense to unlock financial insights.";
    } 
    else if (income === 0 && expense > 0) {
        title = "🚨 Critical Alert";
        message = "You have expenses but **no recorded income**. Immediate attention required.";
    } 
    else if (expense > income) {
        title = "⚠️ Deficit Warning";
        message = `You are spending <strong>₹${Math.abs(balance).toLocaleString()}</strong> more than you earn. Suggestion: Cut discretionary spending immediately.`;
    } 
    else if (savingsRate < 20) {
        title = "📉 Low Savings Rate";
        message = `You are saving only <strong>${Math.round(savingsRate)}%</strong> of your income. Financial experts recommend at least 20%.`;
        if (habitTotal > 0) {
            message += ` <br><br>💡 <strong>Quick Fix:</strong> You spent ₹${habitTotal} on lifestyle (Coffee/Food) recently. Reducing this could boost savings.`;
        }
    } 
    else if (savingsRate >= 20 && savingsRate < 50) {
        title = "✅ Healthy Balance";
        message = "You are following the <strong>50/30/20 rule</strong> correctly. Your finances are stable. Suggestion: Build an emergency fund.";
    } 
    else {
        title = "🚀 Wealth Builder Mode";
        message = `Impressive! You are saving <strong>${Math.round(savingsRate)}%</strong> of your income. Suggestion: Consider high-yield investments (SIPs or Stocks).`;
    }

    // 4. Update the UI
    const aiBox = document.getElementById('aiText');
    aiBox.innerHTML = `
        <strong style="font-size: 1.1rem; display:block; margin-bottom:8px;">${title}</strong>
        <span style="opacity: 0.9;">${message}</span>
    `;
}

window.downloadPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("FiscalMind Report", 10, 20);
    
    doc.setFontSize(12);
    let y = 40;
    
    transactions.forEach(tx => {
        const dateStr = new Date(tx.date || tx.created_at).toLocaleDateString();
        // Used 'Rs.' for PDF safety
        const line = `${dateStr} | ${tx.description} | ${tx.type === 'income' ? '+' : '-'} Rs. ${tx.amount}`;
        doc.text(line, 10, y);
        y += 10;
    });
    
    doc.save("FiscalMind_Report.pdf");
}

function updateUI() {
    renderList();
    updateChart();
    generateAI();
}
// --- V2.0 FEATURES ---

// 1. TAB SWITCHING
window.switchTab = function(tabName) {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    // Remove active class from buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    // Highlight button (simple logic for now)
    const buttons = document.querySelectorAll('.tab-btn');
    if(tabName === 'dashboard') buttons[0].classList.add('active');
    if(tabName === 'history') {
        buttons[1].classList.add('active');
        renderHistory(); // Refresh history when opened
    }
    if(tabName === 'budget') {
        buttons[2].classList.add('active');
        updateBudgets(); // Refresh budgets when opened
    }
}

// 2. TIME TRAVEL (HISTORY)
window.renderHistory = function() {
    const list = document.getElementById('historyList');
    const month = document.getElementById('historyMonth').value;
    const year = document.getElementById('historyYear').value;
    
    list.innerHTML = '';

    // Filter Logic
    const filtered = transactions.filter(tx => {
        const d = new Date(tx.date || tx.created_at);
        const txMonth = d.getMonth(); // 0-11
        const txYear = d.getFullYear();
        
        if (month === 'all') return txYear == year;
        return txMonth == month && txYear == year;
    });

    if (filtered.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:20px; color:#94a3b8;">No records found for this period.</p>';
        document.getElementById('historyStats').innerText = '';
        return;
    }

    // Reuse the rendering logic (simplified)
    let totalSpent = 0;
    filtered.forEach(tx => {
        if(tx.type === 'expense') totalSpent += Number(tx.amount);
        
        const li = document.createElement('li');
        li.className = 'tx-item';
        const amountClass = tx.type === 'income' ? 'text-success' : 'text-danger';
        const sign = tx.type === 'income' ? '+' : '-';
        
        li.innerHTML = `
            <div>
                <div class="tx-desc">${tx.description}</div>
                <span class="tx-date">${new Date(tx.date || tx.created_at).toLocaleDateString()}</span>
            </div>
            <span class="${amountClass}" style="font-weight:bold;">${sign}₹${Number(tx.amount).toLocaleString('en-IN')}</span>
        `;
        list.appendChild(li);
    });

    document.getElementById('historyStats').innerText = `Total Expenses in Period: ₹${totalSpent.toLocaleString('en-IN')}`;
}

// 3. BUDGET BUCKETS (GAMIFICATION)
window.updateBudgets = function() {
    // We categorize by "Keywords" since we don't have a category dropdown yet
    const budgets = [
        { id: 'food', keywords: ['food', 'burger', 'coffee', 'pizza', 'dining'], limit: 5000 },
        { id: 'transport', keywords: ['uber', 'fuel', 'taxi', 'bus', 'train'], limit: 3000 },
        { id: 'fun', keywords: ['netflix', 'movie', 'game', 'spotify', 'party'], limit: 2000 }
    ];

    budgets.forEach(bucket => {
        // Calculate spend for this bucket
        const spent = transactions
            .filter(t => t.type === 'expense')
            .filter(t => {
                const desc = t.description.toLowerCase();
                return bucket.keywords.some(k => desc.includes(k));
            })
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // Update UI
        const percentage = Math.min((spent / bucket.limit) * 100, 100);
        const bar = document.getElementById(`bar-${bucket.id}`);
        const status = document.getElementById(`status-${bucket.id}`);
        const card = document.getElementById(`bucket-${bucket.id}`);

        // Set Width
        bar.style.width = `${percentage}%`;
        status.innerText = `₹${spent.toLocaleString()} / ₹${bucket.limit.toLocaleString()}`;

        // Gamification Colors & Shake
        card.classList.remove('shake-alert'); // Reset shake
        
        if (percentage < 50) {
            bar.style.backgroundColor = '#10b981'; // Green
        } else if (percentage < 90) {
            bar.style.backgroundColor = '#facc15'; // Yellow (Warning)
        } else {
            bar.style.backgroundColor = '#ef4444'; // Red (Danger)
        }

        if (spent > bucket.limit) {
            card.classList.add('shake-alert'); // Trigger Shake Animation
            status.innerHTML += " <b style='color:red'>(OVER LIMIT!)</b>";
        }
    });
}