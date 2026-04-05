// GLOBAL STATE
let currentUser = null;
const STORAGE_KEY = "ipt_demo_v1";

// NAVIGATION HELPER
function navigateTo(hash) {
    window.location.hash = hash;
}

// ROUTING LOGIC
function handleRouting() {
    let hash = window.location.hash;

    if (!hash || hash === "#") {
        hash = "#/";
        navigateTo(hash);
        return;
    }

    const routes = {
        "#/": "home-page",
        "#/login": "login-page",
        "#/register": "register-page",
        "#/verify-email": "verify-page",
        "#/profile": "profile-page",
        "#/accounts": "accounts-page",
        "#/departments": "departments-page",
        "#/employees": "employees-page",
        "#/requests": "requests-page"
    };

    const protectedRoutes = ["#/profile", "#/requests"];
    const adminRoutes = ["#/accounts", "#/departments", "#/employees"];

    if (protectedRoutes.includes(hash) && !currentUser) {
        showToast("Please login first", "warning");
        navigateTo("#/login");
        return;
    }

    if (adminRoutes.includes(hash)) {
        if (!currentUser || currentUser.role !== "admin") {
            showToast("Access denied", "danger");
            navigateTo("#/");
            return;
        }
    }

    // FIX: handle logout here instead of a separate hashchange listener
    if (hash === "#/logout") {
    localStorage.removeItem("auth_token");
    currentUser = null;
    setAuthState(false);
    showToast("Logged out successfully", "info");
    navigateTo("#/");
    return;
    }

    // FIX: handle verify-email message here
    if (hash === "#/verify-email") {
        const email = localStorage.getItem("unverified_email");
        const msg = document.getElementById("verifyMessage");
        if (msg) msg.textContent = `Verification email sent to ${email}. Click below to simulate.`;
    }

    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

    const pageId = routes[hash] || "home-page";
    const page = document.getElementById(pageId);
    if (page) page.classList.add("active");

    if (hash === "#/profile") renderProfile();
    if (hash === "#/accounts") renderAccountsList();
    if (hash === "#/departments") renderDepartmentsTable();
    if (hash === "#/employees") renderEmployeesTable();
    if (hash === "#/requests") renderMyRequests();
}

// EVENT LISTENERS
window.addEventListener("hashchange", handleRouting);
window.addEventListener("load", () => {
    loadFromStorage();

    const token = localStorage.getItem("auth_token");
    if (token) {
        const user = db.accounts.find(a => a.email === token);
        if (user) setAuthState(true, user);
    }

    handleRouting();
});

// FAKE DATABASE
window.db = {
    accounts: [],
    departments: [],
    employees: [],
    requests: []
};

// STORAGE
function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) throw "No data";
        window.db = JSON.parse(raw);
    } catch {
        window.db = {
            accounts: [
                {
                    firstName: "Admin",
                    lastName: "User",
                    email: "admin@example.com",
                    password: "Password123!",
                    role: "admin",
                    verified: true
                }
            ],
            departments: [
                { id: 1, name: "Engineering", description: "Software team" },
                { id: 2, name: "HR", description: "Human Resources" }
            ],
            employees: [],
            requests: []
        };
        saveToStorage();
    }
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

// AUTH STATE
function setAuthState(isAuth, user = null) {
    if (isAuth) {
        currentUser = user;
        document.body.classList.remove("not-authenticated");
        document.body.classList.add("authenticated");
        if (user.role === "admin") document.body.classList.add("is-admin");
        else document.body.classList.remove("is-admin");

        // Update navbar dropdown label
        const dropdown = document.getElementById("userDropdown");
        if (dropdown) dropdown.textContent = `${user.firstName} ${user.lastName}`;
    } else {
        currentUser = null;
        document.body.classList.remove("authenticated", "is-admin");
        document.body.classList.add("not-authenticated");
    }
}

// REGISTER
document.getElementById("registerForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const [firstName, lastName, email, password] =
        Array.from(e.target.querySelectorAll("input")).map(i => i.value.trim());

    if (password.length < 6) return showToast("Password too short (min 6 chars)", "danger");
    if (db.accounts.find(a => a.email === email)) return showToast("Email already registered", "danger");

    db.accounts.push({ firstName, lastName, email, password, role: "user", verified: false });
    saveToStorage();
    localStorage.setItem("unverified_email", email);
    navigateTo("#/verify-email");
});

// VERIFY — FIX: was using addEventListener on verifyBtn which crashed if element not yet rendered
function handleVerify() {
    const email = localStorage.getItem("unverified_email");
    const account = db.accounts.find(acc => acc.email === email);
    if (account) {
        account.verified = true;
        saveToStorage();
        localStorage.removeItem("unverified_email");
        showToast("Email verified successfully!", "success");
        navigateTo("#/login");
    } else {
        showToast("No pending verification found", "warning");
    }
}

// LOGIN
document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const [email, password] =
        Array.from(e.target.querySelectorAll("input")).map(i => i.value.trim());

    const user = db.accounts.find(a =>
        a.email === email && a.password === password && a.verified === true
    );

    if (!user) return showToast("Invalid credentials or unverified email", "danger");

    localStorage.setItem("auth_token", email);
    setAuthState(true, user);
    navigateTo("#/profile");
});

// PROFILE
function renderProfile() {
    if (!currentUser) return;
    document.getElementById("profileFullName").textContent =
        `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById("profileEmail").textContent = currentUser.email;
    document.getElementById("profileRole").textContent = currentUser.role;
}

// FIX: editProfileBtn now exists in HTML, so this won't crash
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("editProfileBtn");
    if (btn) btn.addEventListener("click", () => showToast("Edit Profile coming soon!", "info"));
});

// ACCOUNTS
function renderAccountsList() {
    const tbody = document.getElementById("accountsTable");
    tbody.innerHTML = "";

    db.accounts.forEach(user => {
        tbody.innerHTML += `
            <tr>
                <td>${user.firstName} ${user.lastName}</td>
                <td>${user.email}</td>
                <td><span class="badge bg-${user.role === 'admin' ? 'danger' : 'secondary'}">${user.role}</span></td>
                <td>${user.verified ? "Yes" : "No"}</td>
                <td>
                    <button class="btn btn-outline-primary btn-sm me-1" onclick="editAccount('${user.email}')">Edit Role</button>
                    <button class="btn btn-outline-warning btn-sm me-1" onclick="resetPassword('${user.email}')">Reset PW</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteAccount('${user.email}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

// FIX: toggleAccountForm was called in HTML but never defined
function toggleAccountForm(show) {
    const card = document.getElementById("accountFormCard");
    if (show) {
        card.classList.remove("d-none");
        document.getElementById("accFirstName").value = "";
        document.getElementById("accLastName").value = "";
        document.getElementById("accEmail").value = "";
        document.getElementById("accPassword").value = "";
        document.getElementById("accRole").value = "user";
        document.getElementById("accVerified").checked = false;
    } else {
        card.classList.add("d-none");
    }
}

// FIX: saveAccount was called in HTML but never defined
function saveAccount() {
    const firstName = document.getElementById("accFirstName").value.trim();
    const lastName  = document.getElementById("accLastName").value.trim();
    const email     = document.getElementById("accEmail").value.trim();
    const password  = document.getElementById("accPassword").value.trim();
    const role      = document.getElementById("accRole").value;
    const verified = true;

    if (!firstName || !lastName || !email || !password)
        return showToast("All fields are required", "danger");
    if (password.length < 6)
        return showToast("Password must be at least 6 chars", "danger");
    if (db.accounts.find(a => a.email === email))
        return showToast("Email already exists", "danger");

    db.accounts.push({ firstName, lastName, email, password, role, verified });
    saveToStorage();
    toggleAccountForm(false);
    renderAccountsList();
    showToast("Account created", "success");
}

function editAccount(email) {
    const acc = db.accounts.find(a => a.email === email);
    if (!acc) return;
    const role = prompt("Role (admin/user):", acc.role);
    if (role === null) return;
    acc.role = role === "admin" ? "admin" : "user";
    saveToStorage();
    renderAccountsList();
    showToast("Role updated", "success");
}

function resetPassword(email) {
    const acc = db.accounts.find(a => a.email === email);
    if (!acc) return;
    const pw = prompt("New password (min 6 chars):");
    if (!pw || pw.length < 6) return showToast("Invalid password", "danger");
    acc.password = pw;
    saveToStorage();
    showToast("Password reset", "success");
}

function deleteAccount(email) {
    if (currentUser && email === currentUser.email)
        return showToast("You cannot delete your own account", "danger");
    if (!confirm("Delete this account?")) return;
    db.accounts = db.accounts.filter(a => a.email !== email);
    saveToStorage();
    renderAccountsList();
    showToast("Account deleted", "success");
}

// DEPARTMENTS
function renderDepartmentsTable() {
    const tbody = document.getElementById("departmentsTable");
    tbody.innerHTML = "";

    if (db.departments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center">No departments.</td></tr>`;
        return;
    }

    db.departments.forEach(dep => {
        tbody.innerHTML += `
            <tr>
                <td>${dep.name}</td>
                <td>${dep.description}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteDepartment(${dep.id})">Delete</button>
                </td>
            </tr>
        `;
    });
}

// FIX: toggleDepartmentForm was called in HTML but never defined
function toggleDepartmentForm(show) {
    const card = document.getElementById("departmentFormCard");
    if (show) {
        card.classList.remove("d-none");
        document.getElementById("deptName").value = "";
        document.getElementById("deptDesc").value = "";
    } else {
        card.classList.add("d-none");
    }
}

// FIX: saveDepartment was called in HTML but never defined
function saveDepartment() {
    const name = document.getElementById("deptName").value.trim();
    const desc = document.getElementById("deptDesc").value.trim();
    if (!name) return showToast("Department name is required", "danger");

    const id = db.departments.length
        ? Math.max(...db.departments.map(d => d.id)) + 1
        : 1;

    db.departments.push({ id, name, description: desc });
    saveToStorage();
    toggleDepartmentForm(false);
    renderDepartmentsTable();
    showToast("Department added", "success");
}

// FIX: deleteDepartment was called in HTML but never defined
function deleteDepartment(id) {
    if (!confirm("Delete this department?")) return;
    db.departments = db.departments.filter(d => d.id !== id);
    saveToStorage();
    renderDepartmentsTable();
    showToast("Department deleted", "success");
}

// EMPLOYEES
function renderEmployeesTable() {
    const tbody = document.getElementById("employeesTable");

    if (db.employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center bg-light">No employees.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    db.employees.forEach(emp => {
        const user = db.accounts.find(a => a.email === emp.userEmail);
        const dept = db.departments.find(d => d.id === emp.deptId);
        tbody.innerHTML += `
            <tr>
                <td>${emp.id}</td>
                <td>${user ? user.firstName + " " + user.lastName : emp.userEmail}</td>
                <td>${emp.position}</td>
                <td>${dept ? dept.name : "-"}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteEmployee('${emp.id}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

// FIX: toggleEmployeeForm was called in HTML but never defined
function toggleEmployeeForm(show) {
    const card = document.getElementById("employeeFormCard");
    if (show) {
        card.classList.remove("d-none");
        document.getElementById("empId").value = "";
        document.getElementById("empEmail").value = "";
        document.getElementById("empPosition").value = "";
        document.getElementById("empHireDate").value = "";

        // populate dept dropdown
        const sel = document.getElementById("empDept");
        sel.innerHTML = db.departments.map(d =>
            `<option value="${d.id}">${d.name}</option>`
        ).join("");
    } else {
        card.classList.add("d-none");
    }
}

// FIX: saveEmployee was called in HTML but never defined
function saveEmployee() {
    const id       = document.getElementById("empId").value.trim();
    const email    = document.getElementById("empEmail").value.trim();
    const position = document.getElementById("empPosition").value.trim();
    const deptId   = Number(document.getElementById("empDept").value);
    const hireDate = document.getElementById("empHireDate").value;

    if (!id || !email || !position) return showToast("ID, email and position are required", "danger");
    if (!db.accounts.find(a => a.email === email)) return showToast("No account found with that email", "danger");
    if (db.employees.find(e => e.id === id)) return showToast("Employee ID already exists", "danger");

    db.employees.push({ id, userEmail: email, position, deptId, hireDate });
    saveToStorage();
    toggleEmployeeForm(false);
    renderEmployeesTable();
    showToast("Employee added", "success");
}

// FIX: deleteEmployee was called in HTML but never defined
function deleteEmployee(id) {
    if (!confirm("Delete this employee?")) return;
    db.employees = db.employees.filter(e => e.id !== id);
    saveToStorage();
    renderEmployeesTable();
    showToast("Employee deleted", "success");
}

// REQUESTS
function addRequestRow() {
    const tbody = document.getElementById("requestItems");
    tbody.innerHTML += `
        <tr>
            <td><input type="text" class="form-control" placeholder="Item name"></td>
            <td><input type="number" class="form-control" min="1" value="1"></td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()">X</button>
            </td>
        </tr>
    `;
}

function submitRequest() {
    const rows = document.querySelectorAll("#requestItems tr");
    const type = document.getElementById("requestType").value;
    const items = [];

    rows.forEach(row => {
        const inputs = row.querySelectorAll("input");
        const name = inputs[0]?.value.trim();
        const qty  = Number(inputs[1]?.value);
        if (name && qty > 0) items.push({ item: name, qty });
    });

    if (items.length === 0) return showToast("Add at least one item", "warning");

    db.requests.push({
        id: Date.now(),
        type,
        employeeEmail: currentUser.email,
        status: "Pending",
        items,
        date: new Date().toLocaleDateString()
    });

    saveToStorage();

    // clear modal rows
    document.getElementById("requestItems").innerHTML = "";

    bootstrap.Modal.getInstance(document.getElementById("requestModal")).hide();
    renderMyRequests();
    showToast("Request submitted", "success");
}

// FIX: was writing plain <p> into requestsTable tbody — now properly renders table rows
function renderMyRequests() {
    const tbody = document.getElementById("requestsTable");
    if (!currentUser) return;

    const myRequests = db.requests.filter(r => r.employeeEmail === currentUser.email);

    if (myRequests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center">No requests yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = myRequests.map(r => {
        const badge = r.status === "Approved" ? "success"
                    : r.status === "Rejected" ? "danger"
                    : "warning";
        const itemList = r.items.map(i => `${i.item} (x${i.qty})`).join(", ");
        return `
            <tr>
                <td>${r.id}</td>
                <td>${r.type || "-"} — ${itemList}</td>
                <td><span class="badge bg-${badge}">${r.status}</span></td>
                <td>${r.date}</td>
            </tr>
        `;
    }).join("");
}

// TOAST
function showToast(message, type = "info") {
    const toastEl = document.getElementById("appToast");
    const body = toastEl.querySelector(".toast-body");
    toastEl.className = `toast align-items-center text-bg-${type} border-0`;
    body.textContent = message;
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
}