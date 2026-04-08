// ==========================================
// GLOBAL VARIABLES
// ==========================================
const STORAGE_KEY = 'ipt_demo_v1';
let currentUser = null;
window.db = {
    accounts: [],
    departments: [],
    employees: [],
    requests: []
};

// Bootstrap Modals
let employeeModal, accountModal, requestModal;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    
    // Initialize modals
    employeeModal = new bootstrap.Modal(document.getElementById('employeeModal'));
    accountModal = new bootstrap.Modal(document.getElementById('accountModal'));
    requestModal = new bootstrap.Modal(document.getElementById('requestModal'));
    
    // Check auth state
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
        const user = window.db.accounts.find(a => a.email === authToken);
        if (user && user.verified) {
            setAuthState(true, user);
        } else {
            localStorage.removeItem('auth_token');
        }
    }
    
    // Set up routing
    window.addEventListener('hashchange', handleRouting);
    if (!window.location.hash) {
        window.location.hash = '#/';
    }
    handleRouting();
    
    // Form handlers
    setupFormHandlers();
});

// ==========================================
// DATA PERSISTENCE
// ==========================================
function loadFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            window.db = JSON.parse(data);
        } else {
            seedData();
        }
    } catch (e) {
        console.error('Error loading data:', e);
        seedData();
    }
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

function seedData() {
    window.db = {
        accounts: [
            {
                id: 'acc_1',
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@example.com',
                password: 'Password123!',
                role: 'Admin',
                verified: true
            }
        ],
        departments: [
            { id: 'dept_1', name: 'Engineering', description: 'Software Development' },
            { id: 'dept_2', name: 'HR', description: 'Human Resources' }
        ],
        employees: [],
        requests: []
    };
    saveToStorage();
}

// ==========================================
// ROUTING
// ==========================================
function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    const hash = window.location.hash || '#/';
    const route = hash.substring(2); // Remove '#/'
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Protected routes
    const protectedRoutes = ['profile', 'my-requests', 'employees', 'accounts', 'departments'];
    const adminRoutes = ['employees', 'accounts', 'departments'];
    
    if (protectedRoutes.includes(route) && !currentUser) {
        navigateTo('#/login');
        return;
    }
    
    if (adminRoutes.includes(route) && currentUser?.role !== 'Admin') {
        showToast('Access denied. Admin only.', 'danger');
        navigateTo('#/profile');
        return;
    }
    
    // Show appropriate page
    let pageId = route ? route + '-page' : 'home-page';
    const page = document.getElementById(pageId);
    
    if (page) {
        page.classList.add('active');
        
        // Render dynamic content
        if (route === 'profile') renderProfile();
        else if (route === 'employees') renderEmployees();
        else if (route === 'departments') renderDepartments();
        else if (route === 'accounts') renderAccounts();
        else if (route === 'my-requests') renderMyRequests();
    } else {
        document.getElementById('home-page').classList.add('active');
    }
}

// ==========================================
// AUTHENTICATION SYSTEM
// ==========================================
function setAuthState(isAuth, user = null) {
    currentUser = user;
    
    if (isAuth && user) {
        document.body.classList.remove('not-authenticated');
        document.body.classList.add('authenticated');
        document.getElementById('user-display').textContent = user.firstName + ' ' + user.lastName;
        
        if (user.role === 'Admin') {
            document.body.classList.add('is-admin');
        } else {
            document.body.classList.remove('is-admin');
        }
    } else {
        document.body.classList.remove('authenticated', 'is-admin');
        document.body.classList.add('not-authenticated');
        currentUser = null;
    }
}

function logout() {
    localStorage.removeItem('auth_token');
    setAuthState(false);
    navigateTo('#/');
    showToast('Logged out successfully', 'info');
}

function simulateEmailVerification() {
    const email = localStorage.getItem('unverified_email');
    const account = window.db.accounts.find(a => a.email === email);
    
    if (account) {
        account.verified = true;
        saveToStorage();
        localStorage.removeItem('unverified_email');
        showToast('Email verified! You can now log in.', 'success');
        navigateTo('#/login');
    }
}

// ==========================================
// FORM HANDLERS
// ==========================================
function setupFormHandlers() {
    // Register Form
    document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        // Check if email exists
        if (window.db.accounts.find(a => a.email === data.email)) {
            showToast('Email already registered', 'danger');
            return;
        }
        
        // Create account
        const account = {
            id: 'acc_' + Date.now(),
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            password: data.password,
            role: 'User',
            verified: false
        };
        
        window.db.accounts.push(account);
        saveToStorage();
        
        localStorage.setItem('unverified_email', data.email);
        document.getElementById('verify-email-display').textContent = data.email;
        
        showToast('Account created! Please verify your email.', 'success');
        navigateTo('#/verify-email');
    });
    
    // Login Form
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        const account = window.db.accounts.find(a => 
            a.email === data.email && 
            a.password === data.password && 
            a.verified === true
        );
        
        if (account) {
            localStorage.setItem('auth_token', account.email);
            setAuthState(true, account);
            showToast('Login successful!', 'success');
            navigateTo('#/profile');
        } else {
            showToast('Invalid credentials or email not verified', 'danger');
        }
    });
    
    // Employee Form
    document.getElementById('employee-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        // Validate user exists
        const user = window.db.accounts.find(a => a.email === data.userEmail);
        if (!user) {
            showToast('User email does not match any account', 'danger');
            return;
        }
        
        if (data.id) {
            // Edit
            const emp = window.db.employees.find(e => e.id === data.id);
            Object.assign(emp, {
                employeeId: data.employeeId,
                userEmail: data.userEmail,
                userId: user.id,
                position: data.position,
                departmentId: data.departmentId,
                hireDate: data.hireDate
            });
        } else {
            // Create
            const employee = {
                id: 'emp_' + Date.now(),
                employeeId: data.employeeId,
                userEmail: data.userEmail,
                userId: user.id,
                position: data.position,
                departmentId: data.departmentId,
                hireDate: data.hireDate
            };
            window.db.employees.push(employee);
        }
        
        saveToStorage();
        employeeModal.hide();
        showToast('Employee saved successfully', 'success');
        renderEmployees();
        e.target.reset();
    });
    
    // Account Form
    document.getElementById('account-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        if (data.id) {
            // Edit
            const acc = window.db.accounts.find(a => a.id === data.id);
            acc.firstName = data.firstName;
            acc.lastName = data.lastName;
            acc.email = data.email;
            acc.role = data.role;
            acc.verified = formData.get('verified') === 'on';
            if (data.password) {
                acc.password = data.password;
            }
        } else {
            // Create
            if (window.db.accounts.find(a => a.email === data.email)) {
                showToast('Email already exists', 'danger');
                return;
            }
            
            const account = {
                id: 'acc_' + Date.now(),
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                password: data.password || 'Password123!',
                role: data.role,
                verified: formData.get('verified') === 'on'
            };
            window.db.accounts.push(account);
        }
        
        saveToStorage();
        accountModal.hide();
        showToast('Account saved successfully', 'success');
        renderAccounts();
        e.target.reset();
    });
    
    // Request Form
    document.getElementById('request-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Collect items
        const items = [];
        document.querySelectorAll('#items-container .item-row').forEach(row => {
            const name = row.querySelector('input[type="text"]').value;
            const qty = row.querySelector('input[type="number"]').value;
            if (name && qty) {
                items.push({ name, quantity: parseInt(qty) });
            }
        });
        
        if (items.length === 0) {
            showToast('Please add at least one item', 'danger');
            return;
        }
        
        const formData = new FormData(e.target);
        const request = {
            id: 'req_' + Date.now(),
            type: formData.get('type'),
            items: items,
            status: 'Pending',
            date: new Date().toISOString().split('T')[0],
            employeeEmail: currentUser.email
        };
        
        window.db.requests.push(request);
        saveToStorage();
        requestModal.hide();
        showToast('Request submitted successfully', 'success');
        renderMyRequests();
        e.target.reset();
        
        // Reset items
        document.getElementById('items-container').innerHTML = `
            <div class="item-row row">
                <div class="col-8">
                    <input type="text" class="form-control" placeholder="Item name" required>
                </div>
                <div class="col-3">
                    <input type="number" class="form-control" placeholder="Qty" value="1" min="1" required>
                </div>
                <div class="col-1">
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeItem(this)" disabled>×</button>
                </div>
            </div>
        `;
    });
}

// ==========================================
// RENDER FUNCTIONS
// ==========================================
function renderProfile() {
    if (!currentUser) return;
    
    document.getElementById('profile-content').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>Name:</strong> ${currentUser.firstName} ${currentUser.lastName}</p>
                <p><strong>Email:</strong> ${currentUser.email}</p>
                <p><strong>Role:</strong> ${currentUser.role}</p>
            </div>
        </div>
        <button class="btn btn-primary" onclick="alert('Edit profile feature coming soon!')">Edit Profile</button>
    `;
}

function renderMyRequests() {
    const myRequests = window.db.requests.filter(r => r.employeeEmail === currentUser.email);
    
    if (myRequests.length === 0) {
        document.getElementById('requests-table').innerHTML = `
            <p class="text-muted">You have no requests yet.</p>
            <button class="btn btn-success" onclick="openRequestModal()">Create One</button>
        `;
        return;
    }
    
    let html = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Items</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    myRequests.forEach(req => {
        const itemsList = req.items.map(i => `${i.name} (${i.quantity})`).join(', ');
        const statusClass = req.status.toLowerCase();
        html += `
            <tr>
                <td>${req.date}</td>
                <td>${req.type}</td>
                <td>${itemsList}</td>
                <td><span class="badge status-badge ${statusClass}">${req.status}</span></td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    document.getElementById('requests-table').innerHTML = html;
}

// ==========================================
// MODAL OPENERS
// ==========================================
function openRequestModal() {
    document.getElementById('request-form').reset();
    document.getElementById('items-container').innerHTML = `
        <div class="item-row row">
            <div class="col-8">
                <input type="text" class="form-control" placeholder="Item name" required>
            </div>
            <div class="col-3">
                <input type="number" class="form-control" placeholder="Qty" value="1" min="1" required>
            </div>
            <div class="col-1">
                <button type="button" class="btn btn-sm btn-danger" onclick="removeItem(this)" disabled>×</button>
            </div>
        </div>
    `;
    requestModal.show();
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function addItem() {
    const container = document.getElementById('items-container');
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row row';
    itemRow.innerHTML = `
        <div class="col-8">
            <input type="text" class="form-control" placeholder="Item name" required>
        </div>
        <div class="col-3">
            <input type="number" class="form-control" placeholder="Qty" value="1" min="1" required>
        </div>
        <div class="col-1">
            <button type="button" class="btn btn-sm btn-danger" onclick="removeItem(this)">×</button>
        </div>
    `;
    container.appendChild(itemRow);
    updateRemoveButtons();
}

function removeItem(btn) {
    btn.closest('.item-row').remove();
    updateRemoveButtons();
}

function updateRemoveButtons() {
    const items = document.querySelectorAll('#items-container .item-row');
    items.forEach((item, idx) => {
        const btn = item.querySelector('.btn-danger');
        btn.disabled = items.length === 1;
    });
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    const toastId = 'toast-' + Date.now();
    
    const bgClass = {
        'success': 'bg-success',
        'danger': 'bg-danger',
        'warning': 'bg-warning',
        'info': 'bg-info'
    }[type] || 'bg-info';
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white ${bgClass} border-0`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}