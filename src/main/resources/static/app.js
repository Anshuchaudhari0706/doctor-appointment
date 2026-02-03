



const state = {
    user: null,
    route: 'login',
    activeTab: 'dashboard',
    selectedRole: 'patient',
    doctors: [],
    appointments: [],
    reports: []
};


const app = document.getElementById('app');


function navigate(route) {
    state.route = route;
    render();
}

function setTab(tab) {
    state.activeTab = tab;
    const role = state.user ? state.user.role : state.selectedRole;

    if (tab === 'dashboard') {
        if (role === 'doctor') {
            fetchDoctorAppointments();
        } else if (role === 'admin') {
        } else {
            fetchAppointments();
            fetchDoctors();
            fetchReports();
        }
    }

    if (tab === 'payment') {
        fetchAppointments();
        fetchDoctors();
    }
    if (tab === 'book-new') fetchDoctors();
    if (tab === 'bookings') fetchAppointments();
    if (tab === 'appointments') {
        if (role === 'doctor') fetchDoctorAppointments();
        else fetchAppointments();
    }
    if (tab === 'reports') fetchReports();
    if (tab === 'nearby') fetchDoctors();
    if (tab === 'profile') fetchPatientProfile();
    if (tab === 'my-schedule') fetchDoctorProfile();

    render();
}

function setRole(role) {
    state.selectedRole = role;
    render();
}

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8080/api'
    : '/api';
const API_URL = `${API_BASE}/auth`;


async function fetchDoctors() {
    try {
        const res = await fetch(`${API_BASE}/doctors`);
        const data = await res.json();
        state.doctors = data;
        render();
    } catch (e) { console.error("Failed to fetch doctors", e); }
}

async function fetchAppointments() {
    if (!state.user) return;
    try {
        const res = await fetch(`${API_BASE}/appointments/patient/${state.user.email}`);
        const data = await res.json();
        state.appointments = data;
        render();
    } catch (e) { console.error("Failed to fetch appointments", e); }
}

async function fetchDoctorAppointments() {
    if (!state.user) return;
    try {
        const res = await fetch(`${API_BASE}/appointments/doctor/${state.user.email}`);
        const data = await res.json();
        state.appointments = data;
        render();
    } catch (e) { console.error("Failed to fetch doctor appointments", e); }
}

async function updateAppointmentStatus(id, status) {
    if (!confirm(`Change status to ${status}?`)) return;
    try {
        const res = await fetch(`${API_BASE}/appointments/${id}/status?status=${status}`, { method: 'PUT' });
        if (res.ok) {
            alert('Status Updated');
            fetchDoctorAppointments();
        }
    } catch (e) { console.error(e); }
}

async function payForAppointment(id) {
    const appointment = state.appointments.find(a => a.id === id);
    if (!appointment) return alert("Appointment not found!");

    // Find doctor to get fee
    const doctor = state.doctors.find(d => d.id === appointment.doctorId);
    const amount = doctor && doctor.consultationFee ? doctor.consultationFee : 500;

    const paymentChoice = prompt(`Total Amount: Rs. ${amount}\n\nSelect Payment Method:\n1. Online (UPI / Card)\n2. Cash`, "1");
    if (!paymentChoice) return;

    if (paymentChoice === "2") {
        // Cash Payment
        try {
            const res = await fetch(`${API_BASE}/appointments/${id}/pay?paymentMode=Cash`, { method: 'PUT' });
            if (res.ok) {
                alert("Please pay cash at the clinic. Appointment confirmed.");
                fetchAppointments();
            }
        } catch (e) { console.error(e); }
        return;
    }

    // Online Payment - Razorpay
    try {
        // 1. Create Order on Server
        const orderRes = await fetch(`${API_BASE}/payments/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount })
        });

        if (!orderRes.ok) throw new Error("Failed to create payment order");

        const orderData = await orderRes.text(); // Returns raw string of JSON order
        const order = JSON.parse(orderData); // Parse it if it's a JSON string

        // 2. Open Razorpay Checkout
        const options = {
            "key": "rzp_test_SAPPgmQU8nb6sL", // User's Test Key ID
            "amount": order.amount,
            "currency": "INR",
            "name": "MediCare Hospital",
            "description": "Consultation Fee",
            "order_id": order.id,
            "handler": async function (response) {
                // 3. On Success, Update Database
                alert(`Payment Successful! Payment ID: ${response.razorpay_payment_id}`);

                await fetch(`${API_BASE}/appointments/${id}/pay?paymentMode=UPI`, { method: 'PUT' });
                fetchAppointments(); // Refresh UI
            },
            "prefill": {
                "name": state.user.name,
                "email": state.user.email,
                "contact": "9999999999"
            },
            "theme": {
                "color": "#6C63FF"
            }
        };

        const rzp1 = new Razorpay(options);
        rzp1.on('payment.failed', function (response) {
            alert(`Payment Failed: ${response.error.description}`);
        });
        rzp1.open();

    } catch (e) {
        console.error("Payment Error:", e);
        alert("Could not initiate payment. Please try again.");
    }
}

async function fetchReports() {
    if (!state.user) return;
    try {
        const res = await fetch(`${API_BASE}/reports/${state.user.email}`);
        const data = await res.json();
        state.reports = data;
        render();
    } catch (e) { console.error("Failed to fetch reports", e); }
}

async function fetchPatientProfile() {
    if (!state.user) return;
    try {
        const res = await fetch(`${API_BASE}/patients/${state.user.email}`);
        const data = await res.json();
        if (data) {
            // Merge extra details into user state or keep separate?
            // For now, let's just use it to populate form
            state.patientProfile = data;
            render();
        }
    } catch (e) { console.error("Failed to fetch profile", e); }
}

async function savePatientProfile(e) {
    e.preventDefault();
    const name = document.getElementById('p-name').value;
    const phone = document.getElementById('p-phone').value;
    const sex = document.getElementById('p-sex').value;
    const age = document.getElementById('p-age').value;
    const address = document.getElementById('p-address').value;
    const disease = document.getElementById('p-disease').value;

    try {
        const res = await fetch(`${API_BASE}/patients/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: state.user.email,
                name, phone, sex, age, address, disease
            })
        });
        const data = await res.json();
        state.user.name = data.name; // Update local user name
        state.patientProfile = data; // Update local profile
        state.isEditingProfile = false; // Switch to View Mode
        render(); // Re-render to show Profile Box
        alert('Profile saved successfully!');
    } catch (e) {
        console.error(e);
        alert('Failed to save profile');
    }
}

async function fetchDoctorProfile() {
    if (!state.user) return;
    try {
        const res = await fetch(`${API_BASE}/doctors/profile/${state.user.email}`);
        const data = await res.json();
        if (data) {
            state.doctorProfile = data;
            window.tempSchedule = data.schedule || [];
            render();
        }
    } catch (e) { console.error("Failed to fetch doctor profile", e); }
}

async function bookAppointmentBackend(docId, docName, docEmail) {
    if (!confirm(`Book appointment with ${docName}?`)) return;

    // 1. Get Date & Time
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    if (!date) return;
    const time = prompt("Enter Time (HH:MM):", "10:00 AM");
    if (!time) return;

    // 2. Booking - No Payment yet
    try {
        const res = await fetch(`${API_BASE}/appointments/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patientId: state.user.email,
                patientName: state.user.name,
                doctorId: docId,
                doctorName: docName,
                doctorEmail: docEmail,
                date: date,
                time: time,
                type: 'General',
                paymentMode: null,
                status: 'PENDING'
            })
        });

        if (!res.ok) {
            const error = await res.json();
            alert(`⚠️ Booking Failed: ${error.message || 'Slot busy!'}`);
            return;
        }

        const data = await res.json();
        alert('Appointment Requested! Waiting for Doctor Acceptance.');
        navigate('dashboard');
    } catch (e) {
        console.error(e);
        alert('Booking failed. Please try again.');
    }
}


async function login(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.success) {
            state.user = {
                name: data.name,
                email: data.email,
                role: data.role,
                avatar: data.name ? data.name.substring(0, 2).toUpperCase() : 'US'
            };
            state.route = 'dashboard';
            setTab('dashboard');
        } else {
            console.warn("Login failed response:", data);
            alert(data.message || 'Login failed. Please check your credentials.');
        }
    } catch (err) {
        console.error("Login Error:", err);
        alert(`Login failed. System says: ${err.message}. Check console for details.`);
    }
}

async function register(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Registering...';
    btn.disabled = true;

    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    let role = state.selectedRole || 'patient';

    if (role === 'doctor') {
        const codeElement = document.getElementById('reg-doc-code');
        const code = codeElement ? codeElement.value : '';
        const validCode = state.doctorAccessCode || 'DOC-2024';

        if (code !== validCode) {
            alert("Invalid Doctor Access Code! Please contact Admin.");
            btn.innerText = originalText;
            btn.disabled = false;
            return;
        }
    }

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role: role })
        });

        if (!res.ok) {
            throw new Error(`Server Error (${res.status})`);
        }

        const data = await res.json();

        if (data.success || data.message.toLowerCase().includes('success')) {
            alert('Registration successful! Please login.');
            navigate('login');
        } else {
            alert(data.message || 'Registration failed (Unknown reason).');
        }
    } catch (err) {
        console.error("Registration Error:", err);
        alert(`Registration failed: ${err.message}. Please try again.`);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function resetPassword(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    const password = document.getElementById('reset-password').value;

    try {
        const res = await fetch(`${API_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.success) {
            alert('Password successfully reset! Please login with your new password.');
            navigate('login');
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('Reset password failed.');
    }
}

function logout() {
    state.user = null;
    state.activeTab = 'dashboard';
    navigate('login');
}


const PatientNavbar = () => `
    <div class="sidebar">
        <div class="sidebar-header">
            <div style="width:32px;height:32px;background:var(--primary);border-radius:8px;display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-heartbeat" style="color:white;"></i>
            </div>
            <div class="logo-text">MediCare</div>
        </div>
        <div class="nav-links">
            ${navItem('dashboard', 'fas fa-th-large', 'Dashboard')}
            ${navItem('profile', 'fas fa-user', 'Profile')}
            ${navItem('reports', 'fas fa-file-medical', 'Medical Reports')}
            ${navItem('bookings', 'fas fa-calendar-check', 'My Bookings')}
            ${navItem('nearby', 'fas fa-map-marker-alt', 'Nearby Hospitals')}
            ${navItem('book-new', 'fas fa-plus-circle', 'Book Appointment')}
            ${navItem('calendar', 'fas fa-calendar-alt', 'Calendar')}
            ${navItem('payment', 'fas fa-credit-card', 'Payments')}
            ${navItem('support', 'fas fa-headset', 'Support')}
            ${navItem('settings', 'fas fa-cog', 'Settings')}
        </div>
        <div class="mt-auto">
            <div class="nav-item" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout</span>
            </div>
        </div>
    </div>
`;

const DoctorNavbar = () => `
    <div class="sidebar">
        <div class="sidebar-header">
            <div style="width:32px;height:32px;background:var(--accent);border-radius:8px;display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-user-md" style="color:white;"></i>
            </div>
            <div class="logo-text">Doctor Portal</div>
        </div>
        <div class="nav-links">
            ${navItem('dashboard', 'fas fa-th-large', 'Dashboard')}
            ${navItem('calendar', 'fas fa-calendar-alt', 'Calendar')}
            ${navItem('my-schedule', 'fas fa-clock', 'My Schedule')}
            ${navItem('appointments', 'fas fa-calendar-check', 'Appointments')}
            ${navItem('patients', 'fas fa-users', 'My Patients')}
            ${navItem('profile', 'fas fa-user-cog', 'Profile & Settings')}
        </div>
        <div class="mt-auto">
            <div class="nav-item" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout</span>
            </div>
        </div>
    </div>
`;

const AdminNavbar = () => `
    <div class="sidebar">
        <div class="sidebar-header">
            <div style="width:32px;height:32px;background:var(--danger);border-radius:8px;display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-shield-alt" style="color:white;"></i>
            </div>
            <div class="logo-text">Admin Panel</div>
        </div>
        <div class="nav-links">
            ${navItem('dashboard', 'fas fa-th-large', 'Dashboard')}
            ${navItem('doctors', 'fas fa-user-md', 'Manage Doctors')}
            ${navItem('patients', 'fas fa-users', 'Manage Patients')}
            ${navItem('appointments', 'fas fa-calendar-alt', 'All Appointments')}
            ${navItem('settings', 'fas fa-cog', 'System Settings')}
        </div>
        <div class="mt-auto">
            <div class="nav-item" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout</span>
            </div>
        </div>
    </div>
`;

const navItem = (id, icon, label) => `
    <div class="nav-item ${state.activeTab === id ? 'active' : ''}" onclick="setTab('${id}')">
        <i class="${icon}"></i>
        <span>${label}</span>
    </div>
`;


const LoginView = () => `
    <div class="auth-container fade-in">
        <div class="auth-card">
            <div class="auth-header">
                <div style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;">
                    <i class="fas fa-hospital-user"></i>
                </div>
                <h1 class="auth-title">Welcome Back</h1>
                <p class="auth-subtitle">Sign in to access your portal</p>
            </div>

            <div class="role-switcher">
                <div class="role-btn ${state.selectedRole === 'patient' ? 'active' : ''}" onclick="setRole('patient')">Patient</div>
                <div class="role-btn ${state.selectedRole === 'doctor' ? 'active' : ''}" onclick="setRole('doctor')">Doctor</div>
                <div class="role-btn ${state.selectedRole === 'admin' ? 'active' : ''}" onclick="setRole('admin')">Admin</div>
            </div>

            <form onsubmit="login(event)">
                <div class="form-group">
                    <label class="form-label">Email or ID</label>
                    <input type="text" id="email" class="form-input" placeholder="Enter your email" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" id="password" class="form-input" placeholder="••••••••" required>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%">Login</button>
            </form>

            <div class="mt-4 text-muted text-sm" style="display:flex; justify-content:space-between;">
                ${state.selectedRole !== 'admin' ? `
                    <span>Don't have an account? <a href="#" style="color: var(--primary)" onclick="navigate('register')">Register</a></span>
                ` : '<span></span>'}
                <a href="#" style="color: var(--text-secondary)" onclick="navigate('forgot-password')">Forgot Password?</a>
            </div>
        </div>
    </div>
`;

const ForgotPasswordView = () => `
    <div class="auth-container fade-in">
        <div class="auth-card">
            <div class="auth-header">
                <h1 class="auth-title">Reset Password</h1>
                <p class="auth-subtitle">Enter your email and new password</p>
            </div>

            <form onsubmit="resetPassword(event)">
                <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" id="reset-email" class="form-input" placeholder="john@example.com" required>
                </div>
                <div class="form-group">
                    <label class="form-label">New Password</label>
                    <input type="password" id="reset-password" class="form-input" placeholder="New strong password" required>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%">Reset Password</button>
            </form>

            <div class="mt-4 text-muted text-sm text-center">
                <a href="#" style="color: var(--primary)" onclick="navigate('login')">Back to Login</a>
            </div>
        </div>
    </div>
`;

const RegisterView = () => `
    <div class="auth-container fade-in">
        <div class="auth-card">
            <div class="auth-header">
                <h1 class="auth-title">Create Account</h1>
                <p class="auth-subtitle">Join as a ${state.selectedRole === 'doctor' ? 'Doctor' : 'Patient'}</p>
            </div>

            <form onsubmit="register(event)">
                <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" id="reg-name" class="form-input" placeholder="John Doe" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="reg-email" class="form-input" placeholder="john@example.com" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" id="reg-password" class="form-input" placeholder="Create a password" required>
                </div>

                ${state.selectedRole === 'doctor' ? `
                <div class="form-group fade-in" id="doc-code-group" style="background:rgba(114,9,183,0.05); padding:1rem; border-radius:8px; border:1px dashed var(--accent);">
                    <label class="form-label" style="color:var(--accent);">Doctor Access Code</label>
                    <input type="text" id="reg-doc-code" class="form-input" placeholder="Enter Registration Code" required>
                    <small class="text-muted" style="font-size:0.75rem;">Provided by Hospital Administrator</small>
                </div>
                ` : ''}

                <button type="submit" class="btn btn-primary" style="width: 100%">Register</button>
            </form>

            <div class="mt-4 text-muted text-sm">
                Already have an account? <a href="#" style="color: var(--primary)" onclick="navigate('login')">Login</a>
            </div>
        </div>
    </div>
`;


const PatientLayout = () => `
    <div class="dashboard-layout fade-in">
        ${PatientNavbar()}
        <main class="main-content">
            <header class="header-bar">
                <div class="greeting">
                    <h1>Hello, ${state.user.name} 👋</h1>
                    <p class="text-muted">Here's your health overview</p>
                </div>
                <div class="user-profile-widget">
                    <div class="avatar">${state.user.avatar}</div>
                    <div>
                        <div style="font-weight:600;font-size:0.9rem;">${state.user.name}</div>
                        <div style="font-size:0.75rem;color:var(--text-secondary);text-transform:capitalize;">Patient</div>
                    </div>
                </div>
            </header>
            <div id="content-area">${renderPatientTabs()}</div>
        </main>
    </div>
`;

const DoctorLayout = () => `
    <div class="dashboard-layout fade-in">
        ${DoctorNavbar()}
        <main class="main-content">
            <header class="header-bar">
                <div class="greeting">
                    <h1>Dr. ${state.user.name} 👋</h1>
                    <p class="text-muted">Have a great working day!</p>
                </div>
                <div class="user-profile-widget" style="border-color: var(--accent);">
                    <div class="avatar" style="background: var(--accent);">${state.user.avatar}</div>
                    <div>
                        <div style="font-weight:600;font-size:0.9rem;">Dr. ${state.user.name}</div>
                        <div style="font-size:0.75rem;color:var(--text-secondary);text-transform:capitalize;">Specialist</div>
                    </div>
                </div>
            </header>
            <div id="content-area">${renderDoctorTabs()}</div>
        </main>
    </div>
`;

const AdminLayout = () => `
    <div class="dashboard-layout fade-in">
        ${AdminNavbar()}
        <main class="main-content">
            <header class="header-bar">
                <div class="greeting">
                    <h1>Admin Dashboard</h1>
                    <p class="text-muted">System Overview</p>
                </div>
                <div class="user-profile-widget" style="border-color: var(--danger);">
                    <div class="avatar" style="background: var(--danger);">${state.user.avatar}</div>
                    <div>
                        <div style="font-weight:600;font-size:0.9rem;">${state.user.name}</div>
                        <div style="font-size:0.75rem;color:var(--text-secondary);text-transform:capitalize;">Administrator</div>
                    </div>
                </div>
            </header>
            <div id="content-area">${renderAdminTabs()}</div>
        </main>
    </div>
`;


const TabPatientProfile = () => `
    <div class="card">
        <h3>My Profile</h3>
        <p>Manage your personal information.</p>
        <!-- Form here -->
    </div>
`;

function renderPatientTabs() {
    switch (state.activeTab) {
        case 'dashboard': return TabDashboard();
        case 'profile': return TabProfile();
        case 'reports': return TabReports();
        case 'bookings': return TabBookings();
        case 'book-new': return TabBookNew();
        case 'calendar': return TabCalendar();
        case 'payment': return TabPayment();
        case 'support': return TabSupport();
        case 'settings': return TabSettings();
        case 'nearby': return TabNearbyHospitals();
        default: return TabDashboard();
    }
}

function renderDoctorTabs() {
    switch (state.activeTab) {
        case 'dashboard': return DoctorDashboardHome();
        case 'my-schedule': return DoctorSchedule(); // Specific to Doc
        case 'appointments': return DoctorAppointments();
        case 'calendar': return TabCalendar();
        case 'patients': return DoctorPatients();
        case 'profile': return TabDoctorProfile(); // Use your existing profile form
        default: return DoctorDashboardHome();
    }
}

function renderAdminTabs() {
    switch (state.activeTab) {
        case 'dashboard': return AdminDashboardHome();
        case 'doctors': return AdminManageDoctors();
        case 'patients': return AdminManagePatients();
        case 'settings': return AdminSystemSettings();
        default: return AdminDashboardHome();
    }
}


const DoctorDashboardHome = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const myApts = state.appointments || [];
    const todayApts = myApts.filter(a => a.date === todayStr);

    const patientsToday = todayApts.length;
    const completedToday = todayApts.filter(a => a.status === 'COMPLETED').length;
    const pendingToday = todayApts.filter(a => a.status === 'PENDING' || a.status === 'ACCEPTED' || a.status === 'CONFIRMED').length;

    return `
    <div class="grid-cols-3 mb-4">
        <div class="card stat-card">
            <div class="stat-icon" style="color:var(--accent);background:rgba(114,9,183,0.1);"><i class="fas fa-user-injured"></i></div>
            <div class="stat-info">
                <h3>${patientsToday}</h3>
                <p class="text-muted">Patients Today</p>
            </div>
        </div>
        <div class="card stat-card">
            <div class="stat-icon" style="color:var(--success);background:rgba(16,185,129,0.1);"><i class="fas fa-check-circle"></i></div>
            <div class="stat-info">
                <h3>${completedToday}</h3>
                <p class="text-muted">Completed Today</p>
            </div>
        </div>
        <div class="card stat-card">
            <div class="stat-icon" style="color:#f59e0b;background:rgba(245,158,11,0.1);"><i class="fas fa-clock"></i></div>
            <div class="stat-info">
                <h3>${pendingToday}</h3>
                <p class="text-muted">Pending Today</p>
            </div>
        </div>
    </div>

    <div class="card">
        <h3>Quick Actions</h3>
        <div style="display:flex; gap:1rem; margin-top:1rem;">
            <button class="btn btn-primary" onclick="setTab('my-schedule')">Update Availability</button>
            <button class="btn btn-secondary" onclick="setTab('appointments')">View Appointments</button>
        </div>
    </div>
    `;
};

const DoctorSchedule = () => `
    <div class="card" style="max-width:800px; margin:0 auto;">
         <div class="card-header"><div class="card-title">Manage Availability</div></div>
         <form onsubmit="updateAvailability(event)">
            <div class="form-group">
                <label class="form-label">Specialization</label>
                <input type="text" id="doc-spec" class="form-input" placeholder="e.g. Cardiologist" value="${state.doctorProfile?.specialization || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Consultation Fee ($)</label>
                <input type="number" id="doc-fee" class="form-input" placeholder="100" value="${state.doctorProfile?.consultationFee || ''}" required>
            </div>
            
            <div class="card bg-surface p-4 mb-4" style="border:1px solid var(--border);">
                <h4 class="mb-3">Hospital & Contact Details</h4>
                <div class="grid-cols-2">
                    <div>
                        <label class="form-label">Phone Number</label>
                        <input type="text" id="doc-phone" class="form-input" placeholder="+91 9999999999" value="${state.doctorProfile?.phone || ''}">
                    </div>
                    <div>
                        <label class="form-label">Hospital Name</label>
                        <input type="text" id="doc-hospital" class="form-input" placeholder="City General Hospital" value="${state.doctorProfile?.hospitalName || ''}">
                    </div>
                </div>
                <div class="form-group mt-2">
                    <label class="form-label">Hospital Address</label>
                    <input type="text" id="doc-address" class="form-input" placeholder="123 Street, City" value="${state.doctorProfile?.hospitalAddress || ''}">
                </div>
                <div class="mt-2">
                    <label class="form-label">Location Coordinates</label>
                    <div style="display:flex; gap:0.5rem;">
                        <input type="text" id="doc-lat" class="form-input" placeholder="Latitude" value="${state.doctorProfile?.latitude || ''}" readonly>
                        <input type="text" id="doc-long" class="form-input" placeholder="Longitude" value="${state.doctorProfile?.longitude || ''}" readonly>
                        <button type="button" class="btn btn-secondary" onclick="getLocation()"><i class="fas fa-map-marker-alt"></i> Get Current Location</button>
                    </div>
                    <p class="text-sm text-muted mt-1">Click to auto-detect your hospital location.</p>
                </div>
            </div>
            
            <div class="form-group">
                <h4 class="mb-2">Add Available Slot</h4>
                <div class="grid-cols-3" style="align-items:end; gap:1rem;">
                    <div>
                        <label class="form-label">Date</label>
                        <input type="date" id="slot-date" class="form-input">
                    </div>
                    <div>
                        <label class="form-label">Start Time</label>
                        <select id="slot-start" class="form-input">
                            <option>09:00</option><option>10:00</option><option>11:00</option>
                            <option>12:00</option><option>13:00</option><option>14:00</option>
                            <option>15:00</option><option>16:00</option><option>17:00</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label">End Time</label>
                        <select id="slot-end" class="form-input">
                            <option>10:00</option><option>11:00</option><option>12:00</option>
                            <option>13:00</option><option>14:00</option><option>15:00</option>
                            <option>16:00</option><option>17:00</option><option>18:00</option>
                        </select>
                    </div>
                </div>
                <button type="button" class="btn btn-secondary mt-2" onclick="addSlot()">+ Add Slot</button>
            </div>

            <div class="form-group">
                <label class="form-label">Planned Schedule</label>
                <div id="schedule-list" style="display:flex; flex-direction:column; gap:1rem; margin-top:1rem;">
                    ${window.tempSchedule.map((s, i) => `
                        <div style="display:flex; align-items:center; gap:1rem; padding:1rem; background:rgba(0,0,0,0.2); border-radius:12px; border:1px solid var(--border);">
                            <div style="flex:1;">
                                <h4 style="margin-bottom:0.25rem;">${s.date}</h4>
                                <div style="font-size:0.85rem; color:var(--text-secondary);">
                                    <i class="fas fa-clock"></i> ${s.startTime} - ${s.endTime}
                                </div>
                            </div>
                            <button type="button" class="btn btn-secondary btn-sm" onclick="removeSlot(${i})" style="color:var(--danger); border-color:var(--danger);">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>

            <button class="btn btn-primary" style="width:100%">Save Availability</button>
        </form>
    </div >
    `;


window.tempSchedule = [];

window.addSlot = function () {
    const date = document.getElementById('slot-date').value;
    const start = document.getElementById('slot-start').value;
    const end = document.getElementById('slot-end').value;

    if (!date) return alert("Please select a date");

    // Add to array
    window.tempSchedule.push({ date, startTime: start, endTime: end });
    renderSlots();
}

window.renderSlots = function () {
    const list = document.getElementById('schedule-list');
    list.innerHTML = window.tempSchedule.map((s, i) => `
    < div style = "display:flex; align-items:center; gap:1rem; padding:1rem; background:rgba(0,0,0,0.2); border-radius:12px; border:1px solid var(--border); animation: fadeIn 0.3s ease-in-out;" >
            <div style="flex:1;">
                <h4 style="margin-bottom:0.25rem;">${s.date}</h4>
                <div style="font-size:0.85rem; color:var(--text-secondary);">
                    <i class="fas fa-clock"></i> ${s.startTime} - ${s.endTime}
                </div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="removeSlot(${i})" style="color:var(--danger); border-color:var(--danger);">
                <i class="fas fa-trash"></i> Remove
            </button>
        </div >
    `).join('');
}

window.removeSlot = function (index) {
    window.tempSchedule.splice(index, 1);
    renderSlots();
}

window.updateAvailability = async function (e) {
    e.preventDefault();
    const specialization = document.getElementById('doc-spec').value;
    const fee = document.getElementById('doc-fee').value;

    const phone = document.getElementById('doc-phone').value;
    const hospitalName = document.getElementById('doc-hospital').value;
    const hospitalAddress = document.getElementById('doc-address').value;
    const latitude = document.getElementById('doc-lat').value;
    const longitude = document.getElementById('doc-long').value;

    try {
        const res = await fetch(`${API_BASE}/doctors/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: state.user.email,
                name: state.user.name,
                specialization: specialization,
                consultationFee: fee,
                phone, hospitalName, hospitalAddress, latitude, longitude,
                schedule: window.tempSchedule
            })
        });
        const data = await res.json();
        alert('Profile Updated Successfully!');
        // Update local state
        state.doctorProfile = data;
    } catch (err) {
        console.error(err);
        alert('Failed to update profile');
    }
};

window.getLocation = function () {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('doc-lat').value = position.coords.latitude;
                document.getElementById('doc-long').value = position.coords.longitude;
                alert("Location Detected: " + position.coords.latitude + ", " + position.coords.longitude);
            },
            (error) => {
                alert("Error getting location: " + error.message);
            }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

const TabNearbyHospitals = () => `
    <div class="card">
        <div class="card-header">
            <div class="card-title">Nearby Hospitals (Within 500m)</div>
            <button class="btn btn-primary" onclick="findNearbyHospitals()"><i class="fas fa-search-location"></i> Find Near Me</button>
        </div>
        <div id="nearby-results" class="mt-4">
            <p class="text-muted text-center" style="padding:2rem;">Click "Find Near Me" to locate hospitals close to you.</p>
        </div>
    </div>
`;

window.findNearbyHospitals = function () {
    const resultsDiv = document.getElementById('nearby-results');
    resultsDiv.innerHTML = '<p class="text-center"><i class="fas fa-spinner fa-spin"></i> Locating...</p>';

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLong = position.coords.longitude;

                // Filter Doctors
                // Logic: Distance < 0.5 km (500 meters)
                const nearby = state.doctors.filter(doc => {
                    if (!doc.latitude || !doc.longitude) return false;
                    const dist = calculateDistance(userLat, userLong, doc.latitude, doc.longitude);
                    doc.distanceObj = dist; // Store for display
                    return dist < 0.5; // less than 0.5 km
                });

                if (nearby.length === 0) {
                    resultsDiv.innerHTML = `
                        <div style="text-align:center; padding:2rem;">
                            <i class="fas fa-map-marked-alt" style="font-size:2rem; color:var(--text-muted); margin-bottom:1rem;"></i>
                            <p>No hospitals found within 500 meters.</p>
                            <p class="text-sm text-muted">Try asking doctors to update their location in their profile.</p>
                        </div>
                    `;
                } else {
                    resultsDiv.innerHTML = `
                        <div style="display:flex; flex-direction:column; gap:1rem;">
                            ${nearby.map(doc => `
                                <div style="display:flex; gap:1rem; padding:1rem; background:var(--surface); border:1px solid var(--primary); border-radius:12px;">
                                    <div style="width:60px; height:60px; background:var(--primary); color:white; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">
                                        <i class="fas fa-hospital"></i>
                                    </div>
                                    <div style="flex:1;">
                                        <h4 style="margin:0;">${doc.hospitalName || 'Unnamed Clinic'}</h4>
                                        <div style="font-size:0.9rem; margin-bottom:0.25rem;">${doc.hospitalAddress || 'Address not listed'}</div>
                                        <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; color:var(--text-secondary);">
                                            <span><strong>Dr. ${doc.name}</strong> (${doc.specialization})</span>
                                            <span>•</span>
                                            <span>${(doc.distanceObj * 1000).toFixed(0)}m away</span>
                                        </div>
                                    </div>
                                    <div style="display:flex; flex-direction:column; gap:0.5rem; align-items:end;">
                                        <a href="tel:${doc.phone}" class="btn btn-secondary btn-sm"><i class="fas fa-phone"></i> Call</a>
                                        <a href="https://www.google.com/maps/search/?api=1&query=${doc.latitude},${doc.longitude}" target="_blank" class="btn btn-primary btn-sm"><i class="fas fa-directions"></i> Map</a>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
            },
            (error) => {
                resultsDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}. Please enable location access.</div>`;
            }
        );
    } else {
        alert("Geolocation is not supported.");
    }
}

// Haversine Formula for distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

const DoctorAppointments = () => `
    <div class="card">
        <div class="card-header">
            <div class="card-title">My Appointments</div>
            <button class="btn btn-secondary btn-sm" onclick="fetchDoctorAppointments()"><i class="fas fa-sync"></i> Refresh</button>
        </div>
        ${state.appointments.length === 0 ? '<p class="text-muted">No appointments found.</p>' : ''}
<div style="display:flex;flex-direction:column;gap:1rem;">
    ${state.appointments.map(apt => `
                <div style="display:flex;align-items:center;gap:1rem;padding:1rem;background:rgba(0,0,0,0.2);border-radius:12px;">
                    <div style="flex:1;">
                        <h4 style="margin-bottom:0.25rem;">${apt.patientName} (${apt.type})</h4>
                        <div style="font-size:0.85rem;color:var(--text-secondary);">
                            <i class="fas fa-clock"></i> ${apt.date} at ${apt.time}
                        </div>
                         <div style="font-size:0.85rem;color:var(--text-secondary);">Status: <strong>${apt.status}</strong></div>
                    </div>
                    <div style="display:flex;gap:0.5rem;">
                        ${apt.status === 'PENDING' ? `
                            <button class="btn btn-primary btn-sm" onclick="updateAppointmentStatus('${apt.id}', 'ACCEPTED')">Accept</button>
                            <button class="btn btn-secondary btn-sm" onclick="updateAppointmentStatus('${apt.id}', 'CANCELLED')">Cancel</button>
                        ` : ''}
                         ${apt.status === 'ACCEPTED' ? `
                            <span class="badge" style="background:var(--warning);color:black;">Waiting Payment</span>
                            <button class="btn btn-success btn-sm" style="margin-left:0.5rem;" onclick="updateAppointmentStatus('${apt.id}', 'CONFIRMED')"><i class="fas fa-check"></i> Confirm</button>
                        ` : ''}
                         ${apt.status === 'CONFIRMED' ? `
                            <span class="badge" style="background:var(--success);color:black;">Confirmed</span>
                            <button class="btn btn-primary btn-sm" style="margin-left:0.5rem;" onclick="updateAppointmentStatus('${apt.id}', 'COMPLETED')">Complete Visit</button>
                        ` : ''}
                         ${apt.status === 'COMPLETED' ? `
                            <span class="badge" style="background:var(--secondary);color:white;"><i class="fas fa-check-double"></i> Completed</span>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
</div>
    </div >
    `;

const DoctorPatients = () => `
    < div class="grid-cols-2" >
        <div class="card">
             <div class="card-header"><div class="card-title">Upload Medical Report</div></div>
             <div id="report-success-box" style="display:none; margin-bottom:1rem;"></div>
             <form onsubmit="submitMedicalReport(event)">
                <div class="form-group">
                    <label class="form-label">Patient Email</label>
                    <input type="email" id="rep-email" class="form-input" placeholder="patient@example.com" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Report Title</label>
                    <input type="text" id="rep-title" class="form-input" placeholder="e.g. Blood Test Result" required>
                </div>
                <div class="form-group">
                     <label class="form-label">Date</label>
                     <input type="date" id="rep-date" class="form-input" required>
                </div>
                <div class="form-group">
                     <label class="form-label">Upload Report File (PDF/Image)</label>
                     <input type="file" id="rep-file" class="form-input" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg">
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%"><i class="fas fa-plus-circle"></i> Add Report</button>
             </form>
        </div>

        <div class="card">
             <div class="card-header"><div class="card-title">Recent Patients</div></div>
             <p class="text-muted text-sm mb-4">Patients with recent appointments.</p>
             <div id="recent-patients-list">
                <!-- TODO: Fetch unique patients from appointments -->
                <p class="text-muted">No recent history.</p>
             </div>
        </div>
    </div >
    `;

async function submitMedicalReport(e) {
    e.preventDefault();
    const email = document.getElementById('rep-email').value;
    const title = document.getElementById('rep-title').value;
    const date = document.getElementById('rep-date').value;
    const fileInput = document.getElementById('rep-file');

    let fileUrl = '#';

    // 1. Upload File if present
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const uploadBtn = e.target.querySelector('button[type="submit"]');
            const originalText = uploadBtn.innerHTML;
            uploadBtn.innerText = 'Uploading...';
            uploadBtn.disabled = true;

            const uploadRes = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json();
                throw new Error(err.error || 'Upload failed');
            }

            const uploadData = await uploadRes.json();
            fileUrl = uploadData.url;

            uploadBtn.innerHTML = originalText;
            uploadBtn.disabled = false;
        } catch (uploadErr) {
            console.error("Upload Error:", uploadErr);
            alert("Failed to upload file: " + uploadErr.message);
            return;
        }
    }

    // Validate doctor
    if (!state.user || state.user.role !== 'doctor') return alert('Unauthorized');

    try {
        const res = await fetch(`${API_BASE}/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patientEmail: email,
                title: title,
                doctorName: state.user.name, // Auto-fill doctor name
                date: date,
                fileUrl: fileUrl
            })
        });

        if (res.ok) {
            // Show Success Box
            const successBox = document.getElementById('report-success-box');
            if (successBox) {
                successBox.style.display = 'block';
                successBox.innerHTML = `
                    <div style="background:rgba(16, 185, 129, 0.1); border:1px solid var(--success); padding:1rem; border-radius:8px; display:flex; gap:1rem; align-items:center;">
                        <div style="font-size:2rem; color:var(--success);"><i class="fas fa-check-circle"></i></div>
                        <div>
                            <h4 style="margin:0; color:var(--success);">Report Uploaded Successfully!</h4>
                            <p style="margin:0; font-size:0.9rem; color:var(--text-secondary);">
                                Sent to ${email}<br>
                                File: <a href="${fileUrl}" target="_blank" style="text-decoration:underline;">View File</a>
                            </p>
                        </div>
                        <button onclick="this.parentElement.parentElement.style.display='none'" style="margin-left:auto; background:none; border:none; color:var(--text-secondary); cursor:pointer;"><i class="fas fa-times"></i></button>
                    </div>
                `;
            } else {
                alert('Medical Report Added Successfully! ✅');
            }

            // Clear form
            document.getElementById('rep-email').value = '';
            document.getElementById('rep-title').value = '';
            document.getElementById('rep-file').value = '';
        } else {
            alert('Failed to add report.');
        }
    } catch (err) {
        console.error(err);
        alert('Error adding report.');
    }
}


const TabDashboard = () => {
    // 1. Calculate Stats
    const upcoming = state.appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'PENDING');
    const past = state.appointments.filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED');
    const reportCount = state.reports.length;

    // 2. Filter for "Upcoming Appointments" Widget (Sort by date if possible, here just taking first 2)
    const upcomingWidgetList = upcoming.slice(0, 2);


    const doctorsWidgetList = state.doctors.slice(0, 3);

    return `
    <div class="grid-cols-3 mb-4">
        <div class="card stat-card">
            <div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
            <div class="stat-info">
                <h3>${upcoming.length}</h3>
                <p class="text-muted">Upcoming Appointments</p>
            </div>
        </div>
        <div class="card stat-card">
            <div class="stat-icon" style="color:var(--accent);background:rgba(114,9,183,0.1);"><i class="fas fa-file-medical-alt"></i></div>
            <div class="stat-info">
                <h3>${reportCount}</h3>
                <p class="text-muted">Medical Reports</p>
            </div>
        </div>
        <div class="card stat-card">
            <div class="stat-icon" style="color:var(--success);background:rgba(16,185,129,0.1);"><i class="fas fa-bell"></i></div>
            <div class="stat-info">
                <h3>${upcoming.filter(a => a.status === 'PENDING').length}</h3>
                <p class="text-muted">Pending Approvals</p>
            </div>
        </div>
    </div>
    
    <div class="grid-cols-2">
        <div class="card">
            <div class="card-header">
                <div class="card-title">Upcoming Appointments</div>
                <button class="btn btn-ghost btn-sm" onclick="setTab('bookings')">View All</button>
            </div>
            ${upcomingWidgetList.length === 0 ? '<p class="text-muted">No upcoming appointments.</p>' : ''}
            ${upcomingWidgetList.map(apt => `
                <div style="display:flex;align-items:center;gap:1rem;padding:1rem;background:rgba(0,0,0,0.2);border-radius:12px;margin-bottom:1rem;">
                    <div style="width:40px;height:40px;background:var(--surface);border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--primary);">
                        ${apt.date ? apt.date.split('-')[2] : 'DD'}
                    </div>
                    <div style="flex:1;">
                        <div style="font-weight:600;">${apt.doctorName}</div>
                        <div style="font-size:0.85rem;color:var(--text-secondary);">${apt.type || 'Consultation'} • ${apt.time}</div>
                    </div>
                    <span class="status-badge status-${apt.status ? apt.status.toLowerCase() : 'pending'}">${apt.status}</span>
                </div>
            `).join('')}
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-title">Find a Doctor</div>
                <button class="btn btn-ghost btn-sm" onclick="setTab('book-new')">Search</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:1rem;">
                ${doctorsWidgetList.length === 0 ? '<p class="text-muted">No doctors found.</p>' : ''}
                ${doctorsWidgetList.map(doc => `
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <div style="display:flex;align-items:center;gap:1rem;">
                            <div class="avatar" style="width:40px;height:40px;font-size:0.9rem;background:var(--accent);">${doc.name ? doc.name.substring(0, 2).toUpperCase() : 'DR'}</div>
                            <div>
                                <div style="font-weight:600;font-size:0.95rem;">${doc.name}</div>
                                <div style="font-size:0.8rem;color:var(--text-secondary);">${doc.specialization}</div>
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="setTab('book-new')">Book</button>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
`;
};

const TabProfile = () => {
    // If state.isEditingProfile is undefined, set default to false (view mode)
    if (state.isEditingProfile === undefined) state.isEditingProfile = false;

    if (!state.isEditingProfile) {
        // VIEW MODE (Read-only Profile Box)
        return `
        <div class="card" style="max-width:800px;margin:0 auto;">
             <div class="card-header">
                <div class="card-title">My Profile</div>
                <button class="btn btn-secondary btn-sm" onclick="state.isEditingProfile = true; render();"><i class="fas fa-edit"></i> Edit Profile</button>
             </div>
             
             <div style="display:flex; gap:2rem; align-items:flex-start; margin-top:1rem;">
                <div style="text-align:center; min-width:150px;">
                    <div style="width:120px;height:120px;background:var(--secondary);border-radius:50%;margin:0 auto 1rem auto;display:flex;align-items:center;justify-content:center;font-size:3rem;color:white;">
                        ${state.user.avatar}
                    </div>
                </div>

                <div style="flex:1; display:grid; grid-template-columns: repeat(2, 1fr); gap:1.5rem;">
                    <div>
                        <div class="text-muted text-sm">Full Name</div>
                        <div style="font-weight:600; font-size:1.1rem;">${state.patientProfile?.name || state.user.name}</div>
                    </div>
                     <div>
                        <div class="text-muted text-sm">Email</div>
                        <div style="font-weight:600;">${state.user.email}</div>
                    </div>
                     <div>
                        <div class="text-muted text-sm">Phone</div>
                        <div style="font-weight:600;">${state.patientProfile?.phone || '-'}</div>
                    </div>
                    <div>
                        <div class="text-muted text-sm">Age / Sex</div>
                        <div style="font-weight:600;">${state.patientProfile?.age || '-'} / ${state.patientProfile?.sex || '-'}</div>
                    </div>
                     <div style="grid-column: span 2;">
                        <div class="text-muted text-sm">Address</div>
                        <div style="font-weight:600;">${state.patientProfile?.address || '-'}</div>
                    </div>
                     <div style="grid-column: span 2;">
                        <div class="text-muted text-sm">Medical History</div>
                        <div style="font-weight:600;">${state.patientProfile?.disease || 'None recorded'}</div>
                    </div>
                </div>
             </div>
        </div>
        `;
    } else {
        // EDIT MODE (Form)
        return `
        <div class="card" style="max-width:800px;margin:0 auto;">
             <div class="card-header"><div class="card-title">Edit Profile</div></div>
             
             <form onsubmit="savePatientProfile(event)">
                <div class="grid-cols-2" style="gap:1rem;">
                    <div class="form-group">
                        <label class="form-label">Full Name</label>
                        <input type="text" id="p-name" class="form-input" value="${state.patientProfile?.name || state.user.name}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Phone</label>
                        <input type="tel" id="p-phone" class="form-input" value="${state.patientProfile?.phone || ''}" placeholder="+1 234 567 890">
                    </div>
                </div>
                <div class="grid-cols-2" style="gap:1rem;">
                    <div class="form-group">
                        <label class="form-label">Sex</label>
                        <select id="p-sex" class="form-input">
                            <option value="">Select</option>
                            <option value="Male" ${state.patientProfile?.sex === 'Male' ? 'selected' : ''}>Male</option>
                            <option value="Female" ${state.patientProfile?.sex === 'Female' ? 'selected' : ''}>Female</option>
                            <option value="Other" ${state.patientProfile?.sex === 'Other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Age</label>
                        <input type="number" id="p-age" class="form-input" value="${state.patientProfile?.age || ''}" placeholder="e.g. 30">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Address</label>
                    <input type="text" id="p-address" class="form-input" value="${state.patientProfile?.address || ''}" placeholder="123 Health St, Wellness City">
                </div>
                 <div class="form-group">
                    <label class="form-label">Known Diseases / Medical History</label>
                    <textarea id="p-disease" class="form-input" rows="3" placeholder="e.g. Diabetes, Hypertension...">${state.patientProfile?.disease || ''}</textarea>
                </div>
                <div style="display:flex; gap:1rem;">
                    <button type="submit" class="btn btn-primary" style="flex:1">Save Changes</button>
                    <button type="button" class="btn btn-ghost" style="flex:1" onclick="state.isEditingProfile = false; render();">Cancel</button>
                </div>
             </form>
        </div>
        `;
    }
};

const TabReports = () => `
    <div class="card">
        <div class="card-header">
             <div class="card-title">Medical Reports</div>
             <button class="btn btn-secondary btn-sm" onclick="fetchReports()"><i class="fas fa-sync"></i> Refresh</button>
        </div>
        <p class="text-muted mb-4">Access your history and test results.</p>
        ${state.reports.length === 0 ? '<p class="text-muted">No medical reports found.</p>' : ''}
        <div class="grid-cols-2">
            ${state.reports.map(rep => `
                 <div style="padding:1rem;background:rgba(0,0,0,0.2);border-radius:12px;display:flex;align-items:center;gap:1rem;">
                    <div style="padding:1rem;background:rgba(67,97,238,0.1);color:var(--secondary);border-radius:8px;">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div style="flex:1;">
                        <div style="font-weight:600;">${rep.title}</div>
                        <div style="font-size:0.85rem;color:var(--text-secondary);">${rep.date} • ${rep.doctorName}</div>
                    </div>
                    ${rep.fileUrl && rep.fileUrl !== '#' ?
        `<a href="${rep.fileUrl}" target="_blank" class="btn btn-secondary" style="text-decoration:none; display:flex; align-items:center; gap:0.5rem; padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                            <i class="fas fa-download"></i> Download
                        </a>` :
        `<button class="btn btn-ghost" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" disabled><i class="fas fa-ban"></i> No File</button>`
    }
                  </div>
            `).join('')}
        </div>
    </div>
`;

const TabBookings = () => `
    <div class="card">
        <div class="card-header">
            <div class="card-title">My Bookings</div>
            <button class="btn btn-secondary btn-sm" onclick="fetchAppointments()"><i class="fas fa-sync"></i> Refresh</button>
        </div>
        ${state.appointments.length === 0 ? '<p class="text-muted">No appointments found.</p>' : ''}
        <div style="display:flex;flex-direction:column;gap:1rem;">
             ${state.appointments.map(apt => `
                <div style="display:flex;align-items:center;gap:1rem;padding:1rem;background:rgba(0,0,0,0.2);border-radius:12px;">
                    <div style="width:50px;height:50px;background:var(--surface);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:700;color:var(--primary);line-height:1.2;">
                        <span style="font-size:1.2rem;">${apt.date ? apt.date.split('-')[2] : 'DD'}</span>
                        <span style="font-size:0.7rem;text-transform:uppercase;">${apt.date ? new Date(apt.date).toLocaleString('default', { month: 'short' }) : 'MON'}</span>
                    </div>
                    <div style="flex:1;">
                        <h4 style="margin-bottom:0.25rem;">${apt.doctorName}</h4>
                        <div style="font-size:0.85rem;color:var(--text-secondary);">
                            <i class="fas fa-clock"></i> ${apt.time} • ${apt.type || 'General Checkup'}
                        </div>
                    </div>
                    <div style="text-align:right; display:flex; flex-direction:column; align-items:end; gap:0.5rem;">
                        <span class="status-badge status-${apt.status ? apt.status.toLowerCase() : 'pending'}">${apt.status}</span>
                        ${apt.status === 'ACCEPTED' ? `
                            <button class="btn btn-primary btn-sm" onclick="payForAppointment('${apt.id}')">Pay Now (INR)</button>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
`;

const TabBookNew = () => {
    const query = (state.bookingSearchQuery || '').toLowerCase();
    const filteredDoctors = state.doctors.filter(doc =>
        (doc.name && doc.name.toLowerCase().includes(query)) ||
        (doc.specialization && doc.specialization.toLowerCase().includes(query))
    );

    return `
    <div class="card">
        <div class="card-header">
            <div class="card-title">Book New Appointment</div>
            <button class="btn btn-secondary btn-sm" onclick="fetchDoctors()"><i class="fas fa-sync"></i> Refresh Doctors</button>
        </div>
        <div class="form-group mt-4">
            <input type="text" id="doctor-search" class="form-input" placeholder="Search for doctors, specialities..." 
                   value="${state.bookingSearchQuery || ''}" 
                   oninput="state.bookingSearchQuery = this.value; render();" autofocus>
        </div>
        ${state.doctors.length === 0 ? '<p class="text-muted mt-4">No doctors available yet.</p>' : ''}
        ${state.doctors.length > 0 && filteredDoctors.length === 0 ? '<p class="text-muted mt-4 text-center">No doctors match your search.</p>' : ''}
        
        <div class="grid-cols-2 mt-4" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
             ${filteredDoctors.map(doc => `
                <div style="padding:1.5rem;border:1px solid var(--border);border-radius:16px;text-align:center;">
                    <div class="avatar" style="margin:0 auto 1rem auto;width:60px;height:60px;font-size:1.5rem;background:var(--accent);">${doc.name ? doc.name.substring(0, 2).toUpperCase() : 'DR'}</div>
                    <h4 class="mb-2">${doc.name}</h4>
                    <p class="text-muted mb-2">${doc.specialization}</p>
                    <p class="text-success mb-4" style="font-weight:600;">$${doc.consultationFee}</p>
                    
                    <div style="margin-bottom:1rem;color:var(--text-secondary);font-size:0.85rem;">
                       ${doc.schedule && doc.schedule.length > 0 ? 'Available Slots:' : 'No slots available'}
                    </div>
                    <div style="display:flex;justify-content:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;">
                        ${doc.schedule ? doc.schedule.slice(0, 3).map(s => `<span style="font-size:0.8rem;padding:4px 8px;background:var(--surface);border-radius:4px;">${s.date} ${s.startTime}</span>`).join('') : ''}
                    </div>
                    <button class="btn btn-primary" style="width:100%" onclick="bookAppointmentBackend('${doc.id}', '${doc.name}', '${doc.userId}')">Book Visit</button>
                </div>
            `).join('')}
        </div>
    </div>
`;
};


if (!state.calendarDate) state.calendarDate = new Date();

window.changeMonth = (offset) => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + offset);
    render();
}

const TabCalendar = () => {
    const year = state.calendarDate.getFullYear();
    const month = state.calendarDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthApts = state.appointments.filter(a => {
        const d = new Date(a.date);
        return d.getMonth() === month && d.getFullYear() === year && a.status !== 'CANCELLED';
    });

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    const isDoctor = state.user && state.user.role === 'doctor';

    return `
    <div class="card">
        <div class="card-header">
            <div class="card-title">${isDoctor ? 'My Appointments Calendar' : 'My Health Calendar'}</div>
            <div style="display:flex;gap:0.5rem;align-items:center;">
                <button class="btn btn-ghost btn-sm" onclick="changeMonth(-1)"><i class="fas fa-chevron-left"></i></button>
                <span style="font-weight:600;min-width:120px;text-align:center;">${monthNames[month]} ${year}</span>
                <button class="btn btn-ghost btn-sm" onclick="changeMonth(1)"><i class="fas fa-chevron-right"></i></button>
            </div>
        </div>
        
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:0.5rem;text-align:center;margin-bottom:1rem;">
            <div class="text-muted text-sm" style="color:var(--danger)">Sun</div>
            <div class="text-muted text-sm">Mon</div><div class="text-muted text-sm">Tue</div>
            <div class="text-muted text-sm">Wed</div><div class="text-muted text-sm">Thu</div>
            <div class="text-muted text-sm">Fri</div><div class="text-muted text-sm">Sat</div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:0.5rem;">
            ${Array(firstDay).fill('<div style="min-height:80px;"></div>').join('')}
            
            ${Array(daysInMonth).fill(0).map((_, i) => {
        const day = i + 1;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Find appointments for this day
        const dayApts = monthApts.filter(a => a.date === dateStr);
        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

        return `
                <div style="padding:0.5rem;border-radius:8px;background:${isToday ? 'rgba(67, 97, 238, 0.1)' : 'rgba(255,255,255,0.03)'};min-height:80px;border:${isToday ? '1px solid var(--primary)' : 'none'};display:flex;flex-direction:column;gap:4px;">
                    <div style="font-weight:600;font-size:0.9rem;${isToday ? 'color:var(--primary);' : ''}">${day}</div>
                    
                    ${dayApts.map(apt => `
                        <div style="font-size:0.7rem;background:${isDoctor ? 'var(--accent)' : 'var(--success)'};color:white;padding:2px 4px;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:help;" title="${apt.time} - ${isDoctor ? apt.patientName : apt.doctorName}">
                            ${apt.time} ${isDoctor ? apt.patientName : apt.doctorName || 'Doctor'}
                        </div>
                    `).join('')}
                </div>
                `;
    }).join('')}
        </div>
        
        <div class="mt-4 text-center">
            <button class="btn btn-secondary btn-sm" onclick="fetchAppointments()"><i class="fas fa-sync"></i> Refresh Calendar</button>
        </div>
    </div>
    `;
};

const TabPayment = () => {
    const pendingPayments = state.appointments.filter(a => a.status === 'ACCEPTED');
    const history = state.appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'COMPLETED');

    return `
    <div class="grid-cols-2">
        <div class="card">
            <div class="card-header">
                <div class="card-title">Pending Invoices</div>
                <span class="status-badge status-pending">${pendingPayments.length} Unpaid</span>
            </div>
            ${pendingPayments.length === 0 ? '<p class="text-muted text-center py-4">No pending payments.</p>' : ''}
            <div style="display:flex;flex-direction:column;gap:1rem;">
                ${pendingPayments.map(apt => {
        const doctor = state.doctors.find(d => d.id === apt.doctorId);
        const fee = doctor && doctor.consultationFee ? doctor.consultationFee : 500;
        return `
                    <div style="padding:1rem; border:1px solid var(--border); border-radius:8px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                            <span style="font-weight:600;">${apt.doctorName}</span>
                            <span style="font-weight:700;">Rs. ${fee}</span>
                        </div>
                        <div class="text-sm text-muted mb-2">${apt.type || 'Consultation'} • ${apt.date}</div>
                        <button class="btn btn-primary btn-sm" style="width:100%" onclick="payForAppointment('${apt.id}')">Pay Now</button>
                    </div>
                `}).join('')}
            </div>
        </div>

        <div class="card">
            <div class="card-header"><div class="card-title">Payment History</div></div>
            <table>
                <thead>
                    <tr><th>Date</th><th>Doctor</th><th>Amnt</th><th>Status</th></tr>
                </thead>
                <tbody>
                    ${history.length === 0 ? '<tr><td colspan="4" class="text-center text-muted">No payment history.</td></tr>' : ''}
                    ${history.map(apt => {
            const doctor = state.doctors.find(d => d.id === apt.doctorId);
            const fee = doctor && doctor.consultationFee ? doctor.consultationFee : 500;
            return `
                        <tr>
                            <td>${apt.date}</td>
                            <td>${apt.doctorName}</td>
                            <td>Rs. ${fee}</td>
                            <td><span style="color:var(--success)">Paid</span></td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>
    </div>
    `;
};

const TabSupport = () => `
    <div class="card" style="height: 600px; display: flex; flex-direction: column;">
        <div style="border-bottom:1px solid var(--border); padding-bottom:1rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
                <div style="width:40px;height:40px;background:#10a37f;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;">
                    <i class="fas fa-robot"></i>
                </div>
                <div>
                    <h3 style="margin:0;">Medical AI Assistant</h3>
                    <div style="font-size:0.8rem;color:var(--success);">● Powered by ChatGPT</div>
                </div>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="clearChat()">Clear Chat</button>
        </div>

        <div id="chat-history" style="flex:1; overflow-y:auto; padding:1rem; background:rgba(0,0,0,0.02); border-radius:8px; display:flex; flex-direction:column; gap:1rem;">
            ${(state.chatHistory || []).map(msg => `
                <div style="display:flex; justify-content: ${msg.role === 'user' ? 'flex-end' : 'flex-start'};">
                    <div style="max-width:80%; padding:0.8rem 1rem; border-radius:12px; 
                        background: ${msg.role === 'user' ? 'var(--primary)' : 'white'}; 
                        color: ${msg.role === 'user' ? 'white' : 'black'};
                        box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        ${msg.content}
                    </div>
                </div>
            `).join('')}
            ${(!state.chatHistory || state.chatHistory.length === 0) ? `
                <div style="text-align:center; color:var(--text-secondary); margin-top:2rem;">
                    <p>👋 Hello! I am your AI Medical Assistant.</p>
                    <p>You can ask me about general health tips, appointment definitions, or how to use this portal.</p>
                </div>
            ` : ''}
        </div>

        <div style="margin-top:1rem; display:flex; gap:0.5rem;">
            <input type="text" id="chat-input" class="form-input" placeholder="Type your health question..." onkeypress="handleChatEnter(event)">
            <button class="btn btn-primary" onclick="sendChatMessage()">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
        <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:0.5rem; text-align:center;">
            *AI can make mistakes. Please consult a real doctor for medical advice.
        </div>
    </div>

    <div class="card mt-4">
        <h3>Frequently Asked Questions</h3>
        <div style="margin-top:1rem;display:flex;flex-direction:column;gap:1rem;">
            <details style="background:rgba(255,255,255,0.03);padding:1rem;border-radius:8px;cursor:pointer;">
                <summary style="font-weight:500;">How do I reschedule an appointment?</summary>
                <p class="text-muted mt-4 text-sm">Go to "My Bookings" tab, select the appointment you wish to change, and click "Reschedule".</p>
            </details>
             <details style="background:rgba(255,255,255,0.03);padding:1rem;border-radius:8px;cursor:pointer;">
                <summary style="font-weight:500;">When will my test results be available?</summary>
                <p class="text-muted mt-4 text-sm">Typically results are available within 24-48 hours. You will receive a notification.</p>
            </details>
        </div>
    </div>
`;

const TabSettings = () => `<div class="card"><h3>Settings</h3><p>App preferences.</p></div>`;



const TabDoctorProfile = () => `
    <div class="card" style="max-width: 600px; margin: 0 auto;">
        <div class="card-header">
            <div class="card-title">Profile & Settings</div>
        </div>
        <div style="text-align: center; margin-bottom: 2rem;">
            <div style="width: 80px; height: 80px; background: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: white; margin: 0 auto 1rem auto;">
                ${state.user.avatar}
            </div>
            <h3>${state.user.name}</h3>
            <span class="badge" style="background: rgba(114,9,183,0.1); color: var(--accent);">Doctor</span>
        </div>

        <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" class="form-input" value="${state.user.name}" readonly>
        </div>
        <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="text" class="form-input" value="${state.user.email}" readonly>
        </div>
        
        <div class="alert" style="background: rgba(114,9,183,0.05); border: 1px solid rgba(114,9,183,0.2); color: var(--accent);">
            <i class="fas fa-info-circle"></i> To manage your <strong>Availability</strong> and <strong>Consultation Fees</strong>, please use the <a href="#" onclick="setTab('my-schedule')">My Schedule</a> tab.
        </div>
    </div>
`;


const AdminDashboardHome = () => `
    <div class="grid-cols-3 mb-4">
        <div class="card stat-card">
            <div class="stat-icon" style="color:var(--primary);background:rgba(76,201,240,0.1);"><i class="fas fa-users"></i></div>
            <div class="stat-info">
                <h3>150+</h3>
                <p class="text-muted">Total Patients</p>
            </div>
        </div>
        <div class="card stat-card">
             <div class="stat-icon" style="color:var(--accent);background:rgba(114,9,183,0.1);"><i class="fas fa-user-md"></i></div>
            <div class="stat-info">
                <h3>25</h3>
                <p class="text-muted">Active Doctors</p>
            </div>
        </div>
        <div class="card stat-card">
             <div class="stat-icon" style="color:var(--success);background:rgba(16,185,129,0.1);"><i class="fas fa-calendar-check"></i></div>
            <div class="stat-info">
                <h3>45</h3>
                <p class="text-muted">Appointments Today</p>
            </div>
        </div>
    </div>
    
    <div class="card">
        <div class="card-header">
            <div class="card-title">Recent System Activity</div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>User</th>
                    <th>Action</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Dr. House</td>
                    <td>Updated Availability</td>
                    <td>2 mins ago</td>
                </tr>
                <tr>
                    <td>Admin</td>
                    <td>Approved New Doctor</td>
                    <td>10 mins ago</td>
                </tr>
                 <tr>
                    <td>New Patient</td>
                    <td>Registered</td>
                    <td>15 mins ago</td>
                </tr>
            </tbody>
        </table>
    </div>
`;

const AdminManageDoctors = () => `
    <div class="card">
        <div class="card-header">
            <div class="card-title">Manage Doctors</div>
            <button class="btn btn-primary" onclick="state.showAddDoctorForm = !state.showAddDoctorForm; render();">
                ${state.showAddDoctorForm ? 'Close Form' : 'Add New Doctor'}
            </button>
        </div>

        ${state.showAddDoctorForm ? `
        <div class="form-group fade-in" style="background:var(--surface); padding:1.5rem; border-radius:12px; border:1px solid var(--border); margin-bottom:2rem;">
            <h4>Register New Doctor</h4>
            <form onsubmit="registerDoctor(event)">
                <div class="grid-cols-2">
                    <div>
                        <label class="form-label">Doctor Name</label>
                        <input type="text" id="doc-reg-name" class="form-input" placeholder="Dr. Name" required>
                    </div>
                    <div>
                        <label class="form-label">Email</label>
                        <input type="email" id="doc-reg-email" class="form-input" placeholder="doctor@medicare.com" required>
                    </div>
                </div>
                <div class="form-group mt-2">
                    <label class="form-label">Password</label>
                    <input type="password" id="doc-reg-password" class="form-input" placeholder="Create Password" required>
                </div>
                <button class="btn btn-primary">Create Doctor Account</button>
            </form>
        </div>
        ` : ''}

        <div style="margin-top:1rem;">
            <p class="text-muted mb-2">Existing External Doctors (Hardcoded Demo)</p>
             <div style="padding:1rem; border:1px solid var(--border); border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                   <span style="font-weight:600;">Dr. House</span><br>
                   <span class="text-sm text-muted">Diagnostics • doctor@medicare.com</span>
                </div>
                <span class="status-badge status-confirmed">Active</span>
             </div>
             
             <!-- To list DB doctors we would need a fetch call here analogous to state.doctors -->
             ${state.doctors && state.doctors.length > 0 ? `
                <p class="text-muted mt-4 mb-2">Registered Doctors</p>
                ${state.doctors.map(d => `
                     <div style="padding:1rem; border:1px solid var(--border); border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <div>
                        <span style="font-weight:600;">${d.name}</span><br>
                        <span class="text-sm text-muted">${d.specialization || 'General'} • ${d.experienceYears || '0'} Exp</span>
                        </div>
                        <span class="status-badge status-confirmed">Registered</span>
                    </div>
                `).join('')}
             ` : ''}
        </div>
    </div>
`;

const AdminManagePatients = () => `
     <div class="card">
        <h3>Manage Patients</h3>
        <p>List of all registered patients.</p>
    </div>
`;

const AdminSystemSettings = () => `
    <div class="card">
        <div class="card-header">
            <div class="card-title">System Settings</div>
        </div>
        
        <div style="padding:1.5rem; background:rgba(114,9,183,0.05); border-radius:12px; border:1px solid var(--accent);">
            <h4>Doctor Registration Access Code</h4>
            <p class="text-muted mb-4">Share this code with doctors to allow them to register themselves.</p>
            
            <div style="display:flex; align-items:center; gap:1rem;">
                <div style="font-size:1.5rem; font-weight:700; letter-spacing:2px; padding:0.5rem 1rem; background:var(--surface); border-radius:8px; border:1px dashed var(--border);">
                    ${state.doctorAccessCode || 'DOC-2024'}
                </div>
                <button class="btn btn-secondary" onclick="generateNewAccessCode()"><i class="fas fa-sync"></i> Generate New Code</button>
            </div>
        </div>
    </div>
`;

function generateNewAccessCode() {
    // Generate a random 6-character code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0 to avoid confusion
    let newCode = 'DOC-';
    for (let i = 0; i < 4; i++) {
        newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    state.doctorAccessCode = newCode;
    // In a real app, save this to backend. For now, it stays in session.
    alert(`New Access Code Generated: ${newCode}\nPlease share this with your doctors.`);
    render();
}

async function registerDoctor(e) {
    e.preventDefault();
    const name = document.getElementById('doc-reg-name').value;
    const email = document.getElementById('doc-reg-email').value;
    const password = document.getElementById('doc-reg-password').value;

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role: 'doctor' })
        });

        const data = await res.json();
        if (data.success || (data.message && data.message.toLowerCase().includes('success'))) {
            alert('Doctor Registered Successfully!');
            state.showAddDoctorForm = false;
            fetchDoctors(); // Refresh list if possible
            render();
        } else {
            alert(data.message || 'Failed to register doctor');
        }
    } catch (err) {
        console.error(err);
        alert('Error registering doctor');
    }
}


// Chat Functions
function handleChatEnter(e) {
    if (e.key === 'Enter') sendChatMessage();
}

function clearChat() {
    if (confirm('Clear chat history?')) {
        state.chatHistory = [];
        render();
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    if (!state.chatHistory) state.chatHistory = [];

    // Add User Message
    state.chatHistory.push({ role: 'user', content: message });
    input.value = '';
    render(); // Re-render to show user message immediately

    // Scroll to bottom
    const historyContainer = document.getElementById('chat-history');
    if (historyContainer) historyContainer.scrollTop = historyContainer.scrollHeight;

    // Simulate AI Thinking
    // In a real app, this would be: const response = await fetch('/api/chat', ...);

    // Simulate Delay
    await new Promise(r => setTimeout(r, 1000));

    let aiResponse = "I am a simulated AI Assistant. To connect me to real ChatGPT, please configure the Backend API Key. For now, I can tell you that staying hydrated is important!";

    // Simple mock logic for demo purposes
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('appointment')) aiResponse = "You can book an appointment by clicking on the 'Book Appointment' tab in the sidebar.";
    if (lowerMsg.includes('doctor')) aiResponse = "We have several specialists available. Check the 'Doctors' section to view their profiles.";
    if (lowerMsg.includes('report') || lowerMsg.includes('result')) aiResponse = "Medical reports are available in the 'Medical Reports' tab once your doctor uploads them.";
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) aiResponse = "Hello! How can I assist you with your health today?";

    // Add AI Response
    state.chatHistory.push({ role: 'assistant', content: aiResponse });
    render();

    // Scroll to bottom again
    const historyContainerAfter = document.getElementById('chat-history');
    if (historyContainerAfter) historyContainerAfter.scrollTop = historyContainerAfter.scrollHeight;
}

// Main Render Function
function render() {
    // ... existing render logic ...
    app.innerHTML = '';

    switch (state.route) {
        case 'login':
            app.innerHTML = LoginView();
            break;
        case 'register':
            app.innerHTML = RegisterView();
            break;
        case 'forgot-password':
            app.innerHTML = ForgotPasswordView();
            break;
        case 'dashboard':
            if (!state.user) {
                navigate('login');
                return;
            }

            // ROUTE TO CORRECT LAYOUT RESTRICTED BY ROLE
            if (state.user.role === 'admin') {
                app.innerHTML = AdminLayout();
            } else if (state.user.role === 'doctor') {
                app.innerHTML = DoctorLayout();
            } else {
                app.innerHTML = PatientLayout();
            }
            break;
    }

    // Auto-scroll chat if open
    if (state.activeTab === 'support') {
        const historyContainer = document.getElementById('chat-history');
        if (historyContainer) historyContainer.scrollTop = historyContainer.scrollHeight;
    }
}

// Init
render();
