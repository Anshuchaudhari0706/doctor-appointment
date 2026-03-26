



const state = {
    user: null, // Will be updated from localStorage if available
    route: 'login',
    activeTab: 'dashboard',
    selectedRole: 'patient',
    doctors: [],
    appointments: [],
    reports: [],
    beds: [],
    bloodRequests: [],
    lightMode: false,
    lang: 'en'
};

const i18n = {
    en: { Dashboard: 'Dashboard', Profile: 'Profile', 'Medical Reports': 'Medical Reports', Bookings: 'My Bookings', Nearby: 'Nearby Hospitals', Book: 'Book Appointment', Timeline: 'Health Timeline', Support: 'Support', Settings: 'Settings', Payments: 'Payments', Calendar: 'Calendar' },
    hi: { Dashboard: 'डैशबोर्ड', Profile: 'प्रोफ़ाइल', 'Medical Reports': 'मेडिकल रिपोर्ट', Bookings: 'बुकिंग', Nearby: 'अस्पताल', Book: 'अपॉइंटमेंट बुक करें', Timeline: 'स्वास्थ्य टाइमलाइन', Support: 'सहायता', Settings: 'सेटिंग्स', Payments: 'भुगतान', Calendar: 'कैलेंडर' },
    es: { Dashboard: 'Panel', Profile: 'Perfil', 'Medical Reports': 'Informes Médicos', Bookings: 'Mis Reservas', Nearby: 'Hospitales Cercanos', Book: 'Reservar Cita', Timeline: 'Línea de Vida', Support: 'Soporte', Settings: 'Ajustes', Payments: 'Pagos', Calendar: 'Calendario' }
};

function t(key) {
    if(!i18n[state.lang] || !i18n[state.lang][key]) return key;
    return i18n[state.lang][key];
}

if (localStorage.getItem('lang')) {
    state.lang = localStorage.getItem('lang');
}

// Check light mode
if (localStorage.getItem('lightMode') === 'true') {
    state.lightMode = true;
    document.body.classList.add('light-mode');
}

// Check for saved user session
const savedUser = localStorage.getItem('user');
if (savedUser) {
    try {
        state.user = JSON.parse(savedUser);
        if (state.user && state.user.role) {
            state.user.role = state.user.role.toLowerCase();
        }
        state.route = 'dashboard';
        const savedTab = localStorage.getItem('activeTab');
        if (savedTab) {
            state.activeTab = savedTab;
        }
    } catch (e) {
        console.error("Error parsing saved user session:", e);
        localStorage.removeItem('user');
        state.user = null;
    }
} else {
    // If no user, check if we have a saved route (e.g. register)
    const savedRoute = localStorage.getItem('route');
    if (savedRoute && ['login', 'register', 'forgot-password'].includes(savedRoute)) {
        state.route = savedRoute;
    }
}


const app = document.getElementById('app');


function navigate(route) {
    state.route = route;
    localStorage.setItem('route', route);
    render();
}

function setTab(tab) {
    state.activeTab = tab;
    // Persist this choice
    localStorage.setItem('activeTab', tab);
    const role = state.user ? state.user.role : state.selectedRole;

    if (tab === 'dashboard') {
        if (role === 'doctor' || role === 'receptionist') {
            fetchDoctorAppointments();
        } else if (role === 'admin') {
            fetchAdminDoctors();
            fetchAdminPatients();
            fetchAdminReceptionists();
            fetchAdminAppointments();
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
    if (tab === 'timeline') fetchAppointments(); // Fetch state for timeline
    if (tab === 'appointments') {
        if (role === 'admin') fetchAdminAppointments();
        else if (role === 'doctor' || role === 'receptionist') fetchDoctorAppointments();
        else fetchAppointments();
    }
    if (tab === 'reports') fetchReports();
    if (tab === 'nearby') fetchDoctors();
    if (tab === 'profile') fetchPatientProfile();
    if (tab === 'my-schedule') fetchDoctorProfile();
    if (tab === 'receptionists') fetchReceptionists();

    if (role === 'admin') {
        if (tab === 'doctors') fetchAdminDoctors();
        if (tab === 'patients') fetchAdminPatients();
        if (tab === 'receptionists') fetchAdminReceptionists();
    }
    if (role === 'doctor' || role === 'receptionist') {
        if (tab === 'beds') fetchAdminBeds();
        if (tab === 'blood-bank') fetchAdminBloodBank();
    }

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
        const today = new Date().toISOString().split('T')[0];
        data.forEach(d => {
            if (d.schedule) d.schedule = d.schedule.filter(s => s.date >= today);
        });
        state.doctors = data;
        render();
    } catch (e) { console.error("Failed to fetch doctors", e); }
}

async function fetchAppointments() {
    if (!state.user) return;
    try {
        const res = await fetch(`${API_BASE}/appointments/patient/${state.user.email}`);
        const data = await res.json();
        // Filter out past appointments
        const today = new Date().toISOString().split('T')[0];
        state.appointments = data.filter(a => a.date >= today);
        render();
    } catch (e) { console.error("Failed to fetch appointments", e); }
}

async function fetchDoctorAppointments() {
    if (!state.user) return;
    try {
        const targetId = state.user.role === 'receptionist' ? state.user.doctorId : state.user.email;
        const res = await fetch(`${API_BASE}/appointments/doctor/${targetId}`);
        const data = await res.json();
        // Filter out past appointments
        const today = new Date().toISOString().split('T')[0];
        state.appointments = data.filter(a => a.date >= today);
        render();
    } catch (e) { console.error("Failed to fetch doctor appointments", e); }
}

async function updateAppointmentStatus(id, status) {
    if (!confirm(`Change status to ${status}?`)) return;
    
    let details = { status: status };
    if (status === 'ACCEPTED') {
        const link = prompt("Provide an Online Meeting Link? (Leave blank for In-Person)");
        if (link) details.meetingLink = link;
    }
    if (status === 'COMPLETED') {
        const pre = prompt("Would you like to write a short digital prescription? (Leave blank if not needed)");
        if (pre) details.prescription = pre;
    }

    try {
        const res = await fetch(`${API_BASE}/appointments/${id}/details`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(details)
        });
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
        const targetId = state.user.role === 'receptionist' ? state.user.doctorId : state.user.email;
        const res = await fetch(`${API_BASE}/doctors/profile/${targetId}`);
        const data = await res.json();
        if (data) {
            state.doctorProfile = data;
            const today = new Date().toISOString().split('T')[0];
            window.tempSchedule = (data.schedule || []).filter(s => s.date >= today);
            render();
        }
    } catch (e) { console.error("Failed to fetch doctor profile", e); }
}

async function fetchReceptionists() {
    if (!state.user) return;
    try {
        const docId = state.user.role === 'receptionist' ? state.user.doctorId : state.user.email;
        const res = await fetch(`${API_BASE}/receptionists/doctor/${docId}`);
        state.receptionists = await res.json();
        render();
    } catch (e) {
        console.error("Failed to fetch receptionists", e);
    }
}

async function createReceptionist(e) {
    e.preventDefault();
    const name = document.getElementById('rec-name').value;
    const email = document.getElementById('rec-email').value;
    const password = document.getElementById('rec-password').value;
    const doctorId = state.user.role === 'receptionist' ? state.user.doctorId : state.user.email;

    try {
        const res = await fetch(`${API_BASE}/receptionists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, doctorId })
        });
        if (res.ok) {
            alert('Receptionist Added Successfully!');
            document.getElementById('rec-name').value = '';
            document.getElementById('rec-email').value = '';
            document.getElementById('rec-password').value = '';
            fetchReceptionists();
        } else {
            alert('Failed to add receptionist');
        }
    } catch (err) {
        console.error(err);
        alert('Error adding receptionist');
    }
}

async function deleteReceptionist(id) {
    if (!confirm('Are you sure you want to remove this receptionist?')) return;
    try {
        const res = await fetch(`${API_BASE}/receptionists/${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchReceptionists();
        }
    } catch (e) {
        console.error(e);
    }
}

async function bookAppointmentBackend(docId, docName, docEmail) {
    if (!confirm(`Book appointment with ${docName}?`)) return;

    // 1. Get Date & Time
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    if (!date) return;
    const time = prompt("Enter Time (HH:MM):", "10:00 AM");
    if (!time) return;

    let type = prompt("Type of Visit:\n1. In-Person\n2. Video Consultation", "1");
    if (type === "2") type = "Video Consultation";
    else type = "In-Person";

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
                type: type,
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
                role: data.role ? data.role.toLowerCase() : 'patient',
                doctorId: data.doctorId,
                avatar: data.name ? data.name.substring(0, 2).toUpperCase() : 'US'
            };
            // Persist login
            localStorage.setItem('user', JSON.stringify(state.user));
            // Set default tab on login, maybe also save it
            state.activeTab = 'dashboard';
            localStorage.setItem('activeTab', 'dashboard');

            state.route = 'dashboard';
            localStorage.setItem('route', 'dashboard');
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
    let medicalLicenseNumber = '';

    if (role === 'doctor') {
        const codeElement = document.getElementById('reg-doc-license');
        medicalLicenseNumber = codeElement ? codeElement.value : '';

        if (!medicalLicenseNumber) {
            alert("Medical License Number (NPI) is required!");
            btn.innerText = originalText;
            btn.disabled = false;
            return;
        }
    }
    
    const bloodGroupElement = document.getElementById('reg-blood');
    const bloodGroup = bloodGroupElement ? bloodGroupElement.value : '';

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role: role, medicalLicenseNumber: medicalLicenseNumber, bloodGroup: bloodGroup })
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
    localStorage.removeItem('user');
    localStorage.removeItem('activeTab');
    localStorage.removeItem('route');
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
            ${navItem('dashboard', 'fas fa-th-large', t('Dashboard'))}
            ${navItem('timeline', 'fas fa-stream', t('Timeline'))}
            ${navItem('profile', 'fas fa-user', t('Profile'))}
            ${navItem('reports', 'fas fa-file-medical', t('Medical Reports'))}
            ${navItem('bookings', 'fas fa-calendar-check', t('Bookings'))}
            ${navItem('nearby', 'fas fa-map-marker-alt', t('Nearby'))}
            ${navItem('book-new', 'fas fa-plus-circle', t('Book'))}
            ${navItem('calendar', 'fas fa-calendar-alt', t('Calendar'))}
            ${navItem('payment', 'fas fa-credit-card', t('Payments'))}
            ${navItem('support', 'fas fa-headset', t('Support'))}
            ${navItem('settings', 'fas fa-cog', t('Settings'))}
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
            ${navItem('receptionists', 'fas fa-user-nurse', 'My Receptionists')}
            ${navItem('beds', 'fas fa-bed', 'Manage Beds')}
            ${navItem('blood-bank', 'fas fa-tint', 'Blood Bank')}
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
            ${navItem('receptionists', 'fas fa-user-nurse', 'Manage Receptionists')}
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

const ReceptionistNavbar = () => `
    <div class="sidebar">
        <div class="sidebar-header">
            <div style="width:32px;height:32px;background:var(--accent);border-radius:8px;display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-user-nurse" style="color:white;"></i>
            </div>
            <div class="logo-text">Receptionist</div>
        </div>
        <div class="nav-links">
            ${navItem('dashboard', 'fas fa-th-large', 'Dashboard')}
            ${navItem('calendar', 'fas fa-calendar-alt', 'Calendar')}
            ${navItem('my-schedule', 'fas fa-clock', 'My Schedule')}
            ${navItem('appointments', 'fas fa-calendar-check', 'Appointments')}
            ${navItem('patients', 'fas fa-users', 'Patients')}
            ${navItem('beds', 'fas fa-bed', 'Manage Beds')}
            ${navItem('blood-bank', 'fas fa-tint', 'Blood Bank')}
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
                <div class="role-btn ${state.selectedRole === 'receptionist' ? 'active' : ''}" onclick="setRole('receptionist')">Receptionist</div>
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
                ${state.selectedRole !== 'admin' && state.selectedRole !== 'receptionist' ? `
                    <span>Don't have an account? <a href="#" style="color: var(--primary)" onclick="navigate('register')">Register</a></span>
                ` : '<span></span>'}
                ${state.selectedRole !== 'receptionist' ? `
                    <a href="#" style="color: var(--text-secondary)" onclick="navigate('forgot-password')">Forgot Password?</a>
                ` : '<span></span>'}
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
                    <input type="text" id="reg-name" class="form-input" placeholder="Enter your Full Name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="reg-email" class="form-input" placeholder="Enter your Email ID" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" id="reg-password" class="form-input" placeholder="Create a password" required>
                </div>
                
                ${state.selectedRole === 'patient' || state.selectedRole === 'doctor' ? `
                <div class="form-group">
                    <label class="form-label">Blood Group</label>
                    <select id="reg-blood" class="form-input">
                        <option value="">Select Blood Group (Optional)</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                    </select>
                </div>
                ` : ''}

                ${state.selectedRole === 'doctor' ? `
                <div class="form-group fade-in" id="doc-code-group" style="background:rgba(114,9,183,0.05); padding:1rem; border-radius:8px; border:1px dashed var(--accent);">
                    <label class="form-label" style="color:var(--accent);">Medical License Number (NPI)</label>
                    <input type="text" id="reg-doc-license" class="form-input" placeholder="Enter 10-digit NPI" required>
                    <small class="text-muted" style="font-size:0.75rem;">Verified via National Provider Registry Api. Automatically validates if License exists and is active.</small>
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
                <div style="display:flex; align-items:center; gap:1rem;">
                    <div style="position:relative; cursor:pointer;" onclick="setTab('bookings')">
                        <i class="fas fa-bell" style="font-size:1.2rem;color:var(--text-secondary);"></i>
                        ${state.appointments.some(a=>a.status==='ACCEPTED') ? '<span style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;background:var(--danger);border-radius:50%;"></span>' : ''}
                    </div>
                    <div class="user-profile-widget">
                        <div class="avatar">${state.user.avatar}</div>
                        <div>
                            <div style="font-weight:600;font-size:0.9rem;">${state.user.name}</div>
                            <div style="font-size:0.75rem;color:var(--text-secondary);text-transform:capitalize;">Patient</div>
                        </div>
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
                <div style="display:flex; align-items:center; gap:1rem;">
                    <div style="position:relative; cursor:pointer;" onclick="setTab('appointments')">
                        <i class="fas fa-bell" style="font-size:1.2rem;color:var(--text-secondary);"></i>
                        ${state.appointments.some(a=>a.status==='PENDING') ? '<span style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;background:var(--danger);border-radius:50%;"></span>' : ''}
                    </div>
                    <div class="user-profile-widget" style="border-color: var(--accent);">
                        <div class="avatar" style="background: var(--accent);">${state.user.avatar}</div>
                        <div>
                            <div style="font-weight:600;font-size:0.9rem;">Dr. ${state.user.name}</div>
                            <div style="font-size:0.75rem;color:var(--text-secondary);text-transform:capitalize;">Specialist</div>
                        </div>
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


const ReceptionistLayout = () => `
    <div class="dashboard-layout fade-in">
        ${ReceptionistNavbar()}
        <main class="main-content">
            <header class="header-bar">
                <div class="greeting">
                    <h1>Receptionist ${state.user.name} 👋</h1>
                    <p class="text-muted">Managing Dr. ${state.user.doctorId || 'Doctor'}'s portal</p>
                </div>
                <div class="user-profile-widget" style="border-color: var(--accent);">
                    <div class="avatar" style="background: var(--accent);">${state.user.avatar}</div>
                    <div>
                        <div style="font-weight:600;font-size:0.9rem;">${state.user.name}</div>
                        <div style="font-size:0.75rem;color:var(--text-secondary);text-transform:capitalize;">Receptionist</div>
                    </div>
                </div>
            </header>
            <div id="content-area">${renderReceptionistTabs()}</div>
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
        case 'timeline': return TabTimeline();
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
        case 'receptionists': return DoctorReceptionists();
        case 'beds': return AdminManageBeds();
        case 'blood-bank': return AdminManageBloodBank();
        case 'profile': return TabDoctorProfile();
        default: return DoctorDashboardHome();
    }
}

function renderReceptionistTabs() {
    switch (state.activeTab) {
        case 'dashboard': return DoctorDashboardHome();
        case 'my-schedule': return DoctorSchedule();
        case 'appointments': return DoctorAppointments();
        case 'calendar': return TabCalendar();
        case 'patients': return DoctorPatients();
        case 'beds': return AdminManageBeds();
        case 'blood-bank': return AdminManageBloodBank();
        case 'profile': return TabDoctorProfile();
        default: return DoctorDashboardHome();
    }
}

function renderAdminTabs() {
    switch (state.activeTab) {
        case 'dashboard': return AdminDashboardHome();
        case 'doctors': return AdminManageDoctors();
        case 'patients': return AdminManagePatients();
        case 'receptionists': return AdminManageReceptionists();
        case 'appointments': return AdminManageAppointments();
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



    <div class="card mt-4">
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
                <label class="form-label">Consultation Fee (₹)</label>
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
                
                <div class="mt-2" style="background:rgba(16,185,129,0.05); border:1px dashed #10b981; padding:1rem; border-radius:8px;">
                    <label class="form-label" style="color:#10b981;"><i class="fas fa-map-marker-alt"></i> Hospital Location (Google Maps)</label>
                    <div style="display:flex; gap:0.5rem; margin-bottom:0.75rem;">
                        <input type="text" id="gmaps-url" class="form-input" placeholder="Paste Google Maps browser URL here..." style="flex:1;">
                        <button type="button" class="btn btn-primary" onclick="parseGoogleMapsUrl()" style="background:#10b981; border:none;">Extract Coordinates</button>
                    </div>
                    
                    <label class="form-label text-sm text-muted">Or manually enter exact coordinates:</label>
                    <div style="display:flex; gap:0.5rem;">
                        <input type="text" id="doc-lat" class="form-input" placeholder="Latitude (e.g. 37.422)" value="${state.doctorProfile?.latitude || ''}">
                        <input type="text" id="doc-long" class="form-input" placeholder="Longitude (e.g. -122.084)" value="${state.doctorProfile?.longitude || ''}">
                    </div>
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
                userId: state.user.role === 'receptionist' ? state.user.doctorId : state.user.email,
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

window.parseGoogleMapsUrl = function() {
    const url = document.getElementById('gmaps-url').value;
    if(!url) {
        alert("Please paste a Google Maps link first");
        return;
    }

    // RegEx match for /@latitude,longitude
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = url.match(regex);
    
    if (match && match.length >= 3) {
        document.getElementById('doc-lat').value = match[1];
        document.getElementById('doc-long').value = match[2];
        alert("Extracted coordinates successfully!");
    } else {
        alert("Could not extract coordinates directly. Please ensure you copied the URL from the browser address bar while viewing the location on Google Maps (it should contain @lat,lng). Alternatively, enter them manually.");
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
    resultsDiv.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
            <div class="skeleton skeleton-box"></div>
            <div class="skeleton skeleton-box"></div>
            <div class="skeleton skeleton-box"></div>
        </div>
    `;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setTimeout(() => {
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
                }, 800); // Simulated skeleton delay
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
                        ${apt.meetingLink && apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' ? `
                            <a href="${apt.meetingLink}" target="_blank" class="btn btn-success btn-sm"><i class="fas fa-video"></i> Join Video Call</a>
                        ` : ''}
                        ${apt.status === 'COMPLETED' && apt.prescription ? `
                            <button class="btn btn-secondary btn-sm" onclick="downloadPDF('Prescription - ${apt.doctorName}', '${apt.prescription.replace(/'/g, "\\'")}')"><i class="fas fa-file-pdf"></i> Download PDF</button>
                        ` : ''}
                        ${apt.status === 'COMPLETED' && !apt.rating ? `
                            <button class="btn btn-ghost btn-sm" onclick="rateDoctor('${apt.id}')"><i class="fas fa-star"></i> Rate</button>
                        ` : ''}
                        <button class="btn btn-outline btn-sm" onclick="showQRCode('${apt.id}')"><i class="fas fa-qrcode"></i> View QR Check-In</button>
                        ${apt.status !== 'CANCELLED' && apt.status !== 'PENDING' ? `
                            <button class="btn btn-outline btn-sm" style="border-color:var(--primary);color:var(--primary);" onclick="openChatModal('${apt.id}', '${(apt.doctorName||'').replace(/'/g,"\\'")}')"><i class="fas fa-comments"></i> Live Chat</button>
                        ` : ''}
                        ${apt.rating ? `<span style="color:#f59e0b; font-size:0.8rem;"><i class="fas fa-star"></i> ${apt.rating}/5</span>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
`;

window.rateDoctor = async function(appId) {
    const r = prompt("Rate the doctor from 1 to 5:");
    if (!r) return;
    const rating = parseInt(r);
    if (isNaN(rating) || rating < 1 || rating > 5) return alert('Invalid rating');
    const rev = prompt("Leave a brief review (Optional):");

    try {
        const res = await fetch(`${API_BASE}/appointments/${appId}/details`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: rating, review: rev || '' })
        });
        if (res.ok) {
            alert('Thank you for your feedback!');
            fetchAppointments();
        }
    } catch (e) { console.error(e); }
}

window.downloadPDF = function(title, content) {
    if (!window.jspdf) return alert('PDF library is still loading...');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("MediCare Official Document", 20, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text(title, 20, 40);
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(content || '', 170);
    doc.text(lines, 20, 50);
    doc.save(title.replace(/\\s+/g, "_") + ".pdf");
};

window.showQRCode = function(aptId) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '9999';
    
    const content = document.createElement('div');
    content.className = 'card';
    content.style.backgroundColor = 'var(--surface)';
    content.style.padding = '2rem';
    content.style.borderRadius = '12px';
    content.style.textAlign = 'center';
    content.style.minWidth = '300px';
    
    content.innerHTML = `
        <h3 style="margin-top:0;">Appointment QR Code</h3>
        <p class="text-muted" style="font-size:0.9rem;">Scan at the reception to instantly check-in.</p>
        <div id="qrcode-container" style="margin:2rem auto; display:flex; justify-content:center; background:white; padding:1rem; border-radius:8px; display:inline-block;"></div>
        <br>
        <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()" style="width:100%;">Close</button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    setTimeout(() => {
        new QRCode(document.getElementById("qrcode-container"), {
            text: "SYS_APPT_LINK_" + aptId,
            width: 200,
            height: 200,
            colorDark : "#000000",
            colorLight : "#ffffff"
        });
    }, 100);
};

const TabTimeline = () => {
    let events = [];
    state.appointments.forEach(a => {
        if(a.date) events.push({ date: new Date(a.date), type: 'Appointment', text: `Appointment with Dr. ${a.doctorName} (${a.status})`, icon: 'fas fa-stethoscope' });
        if(a.prescription && a.date) events.push({ date: new Date(a.date), type: 'Prescription', text: `Digital Prescription issued by Dr. ${a.doctorName}`, icon: 'fas fa-pills' });
    });
    state.reports.forEach(r => {
        if(r.date) events.push({ date: new Date(r.date), type: 'Medical Report', text: `Report uploaded: ${r.title}`, icon: 'fas fa-file-medical-alt' });
    });
    events.sort((a,b) => b.date - a.date);

    return `
    <div class="card" style="max-width:600px; margin:0 auto;">
        <div class="card-header"><div class="card-title">Interactive Health Timeline</div></div>
        <p class="text-muted mb-4">A complete history of your medical journey.</p>
        <div class="timeline">
            ${events.length === 0 ? '<p class="text-muted">No health history found.</p>' : ''}
            ${events.map(e => `
                <div class="timeline-item">
                    <div class="timeline-date">${e.date.toDateString()}</div>
                    <div class="timeline-content">
                        <div style="font-weight:600;display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
                            <i class="${e.icon}" style="color:var(--primary);"></i> ${e.type}
                        </div>
                        <div class="text-sm text-muted">${e.text}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    `;
};

const TabBookNew = () => {
    const query = (state.bookingSearchQuery || '').toLowerCase();

    // Only show doctors that have available slots
    const availableDocs = state.doctors.filter(d => d.schedule && d.schedule.length > 0);

    const filteredDoctors = availableDocs.filter(doc =>
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
        ${availableDocs.length === 0 ? '<p class="text-muted mt-4">No doctors with available slots today.</p>' : ''}
        ${availableDocs.length > 0 && filteredDoctors.length === 0 ? '<p class="text-muted mt-4 text-center">No doctors match your search.</p>' : ''}
        
        <div class="grid-cols-2 mt-4" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
             ${filteredDoctors.map(doc => `
                <div style="padding:1.5rem;border:1px solid var(--border);border-radius:16px;text-align:center;">
                    <div class="avatar" style="margin:0 auto 1rem auto;width:60px;height:60px;font-size:1.5rem;background:var(--accent);">${doc.name ? doc.name.substring(0, 2).toUpperCase() : 'DR'}</div>
                    <h4 class="mb-2">${doc.name}</h4>
                    <p class="text-muted mb-2">${doc.specialization || 'General'}</p>
                    <p class="text-success mb-4" style="font-weight:600;">₹${doc.consultationFee || '500'}</p>
                    
                    <div style="margin-bottom:1rem;color:var(--text-secondary);font-size:0.85rem;">
                       Available Slots:
                    </div>
                    <div style="display:flex;justify-content:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;">
                        ${doc.schedule.slice(0, 3).map(s => `<span style="font-size:0.8rem;padding:4px 8px;background:var(--surface);border-radius:4px;">${s.date} ${s.startTime}</span>`).join('')}
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
                <div style="width:40px;height:40px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white; box-shadow:0 0 10px var(--accent);">
                    <i class="fas fa-brain"></i>
                </div>
                <div>
                    <h3 style="margin:0;">MedDeep AI</h3>
                    <div style="font-size:0.8rem;color:var(--success);">● Clinical Decision Support</div>
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
                    <p>👋 Hello! I am <strong>MedDeep AI</strong>.</p>
                    <p>I am a clinical decision support tool capable of retrieving medical knowledge, analyzing symptoms, and generating advanced health insights.</p>
                    <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:0.5rem; margin-top:1rem;">
                        <span class="badge" style="background:var(--surface); border:1px solid var(--border); color:var(--text-secondary);">Differential Diagnosis</span>
                        <span class="badge" style="background:var(--surface); border:1px solid var(--border); color:var(--text-secondary);">Research Citations</span>
                        <span class="badge" style="background:var(--surface); border:1px solid var(--border); color:var(--text-secondary);">Drug Interactions</span>
                    </div>
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

const TabSettings = () => `
    <div class="card" style="max-width:600px; margin:0 auto;">
        <h3>App Settings</h3>
        <p class="text-muted mb-4">Manage your application preferences.</p>
        
        <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; border:1px solid var(--border); border-radius:12px; margin-bottom:1rem;">
            <div>
                <div style="font-weight:600;font-size:1.1rem;"><i class="fas ${state.lightMode ? 'fa-sun' : 'fa-moon'}"></i> Theme Mode</div>
                <div class="text-sm text-muted">Switch between dark and light themes</div>
            </div>
            <button class="btn btn-secondary" onclick="toggleTheme()">
                ${state.lightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            </button>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; border:1px solid var(--border); border-radius:12px; margin-bottom:1rem;">
            <div>
                <div style="font-weight:600;font-size:1.1rem;"><i class="fas fa-language"></i> Language</div>
                <div class="text-sm text-muted">Select your preferred language</div>
            </div>
            <select class="form-input" style="width: auto; padding: 0.5rem;" onchange="changeLanguage(this.value)">
                <option value="en" ${state.lang === 'en' ? 'selected' : ''}>English</option>
                <option value="hi" ${state.lang === 'hi' ? 'selected' : ''}>Hindi</option>
                <option value="es" ${state.lang === 'es' ? 'selected' : ''}>Spanish</option>
            </select>
        </div>
        
    </div>
`;

window.changeLanguage = function(lang) {
    state.lang = lang;
    localStorage.setItem('lang', lang);
    render();
}

window.toggleTheme = function() {
    state.lightMode = !state.lightMode;
    localStorage.setItem('lightMode', state.lightMode);
    if(state.lightMode) document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
    render();
}



const TabDoctorProfile = () => {
    const isRec = state.user.role === 'receptionist';
    return `
    <div class="card" style="max-width:800px;margin:0 auto;">
         <div class="card-header">
            <div class="card-title">My Profile</div>
            <button class="btn btn-secondary btn-sm" onclick="setTab('my-schedule')"><i class="fas fa-edit"></i> Edit Profile Settings</button>
         </div>
         
         <div style="display:flex; gap:2rem; align-items:flex-start; margin-top:1rem;">
            <div style="text-align:center; min-width:150px;">
                <div style="width:120px;height:120px;background:var(--accent);border-radius:50%;margin:0 auto 1rem auto;display:flex;align-items:center;justify-content:center;font-size:3rem;color:white;">
                    ${state.user.avatar}
                </div>
                <span class="badge" style="background: rgba(114,9,183,0.1); color: var(--accent); padding: 5px 10px; border-radius: 20px;">${isRec ? 'Receptionist' : 'Doctor'}</span>
            </div>

            <div style="flex:1; display:grid; grid-template-columns: repeat(2, 1fr); gap:1.5rem;">
                <div>
                    <div class="text-muted text-sm">Full Name</div>
                    <div style="font-weight:600; font-size:1.1rem;">${isRec ? state.user.name : (state.doctorProfile?.name || state.user.name)}</div>
                </div>
                 <div>
                    <div class="text-muted text-sm">Email</div>
                    <div style="font-weight:600;">${state.user.email}</div>
                </div>
                 <div>
                    <div class="text-muted text-sm">Phone</div>
                    <div style="font-weight:600;">${isRec ? '-' : (state.doctorProfile?.phone || '-')}</div>
                </div>
                <div>
                    <div class="text-muted text-sm">Specialization</div>
                    <div style="font-weight:600;">${state.doctorProfile?.specialization || 'General'}</div>
                </div>
                 <div>
                    <div class="text-muted text-sm">Consultation Fee</div>
                    <div style="font-weight:600;">₹${state.doctorProfile?.consultationFee || '500'}</div>
                </div>
                 <div style="grid-column: span 2;">
                    <div class="text-muted text-sm">Hospital Name</div>
                    <div style="font-weight:600;">${state.doctorProfile?.hospitalName || '-'}</div>
                </div>
                 <div style="grid-column: span 2;">
                    <div class="text-muted text-sm">Hospital Address</div>
                    <div style="font-weight:600;">${state.doctorProfile?.hospitalAddress || '-'}</div>
                </div>
                ${isRec ? `
                 <div style="grid-column: span 2;">
                    <div class="text-muted text-sm">Managed By Doctor</div>
                    <div style="font-weight:600;">Dr. ${state.doctorProfile?.name || state.user.doctorId}</div>
                </div>
                ` : ''}
            </div>
         </div>
    </div>
    `;
};



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
    // In a real app, this would be: const response = await fetch('/api/meddeep', ...);

    // Simulate Delay
    await new Promise(r => setTimeout(r, 1000));

    let aiResponse = "I am MedDeep AI, a simulated advanced patient support assistant driven by clinical AI models like Med-PaLM 2 and BioGPT. To connect me to the actual medical APIs, please configure the Backend server environment variables. However, I can currently provide simulated insights to help guide you!";

    const lowerMsg = message.toLowerCase();
    
    // Extensive Patient Diagnostic & Support Logic
    
    // 1. Queries about the AI itself
    if (lowerMsg.includes('what ai') || lowerMsg.includes('how do you work') || lowerMsg.includes('who are you')) {
        aiResponse = "<strong>About MedDeep AI:</strong><br><br>I am a simulated clinical decision support tool designed for <strong>Patient Support & Triage</strong>. In a live production environment, my logic is powered by large multimodal medical models similar to <strong>Google's Med-PaLM 2</strong> and <strong>Microsoft's BioGPT</strong>, which are trained specifically on biomedical research, PubMed datasets, and clinical guidelines. <br><br><em>Note: As an AI, I provide educational insights. Always consult your doctor for an official diagnosis.</em>";
    } 
    // 2. Neurological / Head
    else if (lowerMsg.includes('headache') || lowerMsg.includes('migraine')) {
        aiResponse = "<strong>Symptom Analysis: Headache</strong><br><br>📝 <strong>Possible Causes:</strong> Tension headache (stress-related), Migraine (throbbing, light sensitivity), or Sinusitis.<br>⚠️ <strong>Red Flags:</strong> Sudden 'thunderclap' onset, worst headache of your life, or accompanied by vision loss/numbness.<br>📌 <strong>Recommendation:</strong> Rest and hydration. If severe or accompanied by red flags, visit an ER. Otherwise, consider booking a <strong>Neurologist</strong> or General Physician via the 'Book' tab.";
    }
    // 3. Respiratory / Chest
    else if (lowerMsg.includes('cough') || lowerMsg.includes('breathing') || lowerMsg.includes('shortness of breath')) {
        aiResponse = "<strong>Symptom Analysis: Respiratory</strong><br><br>📝 <strong>Possible Causes:</strong> Viral URI (Common Cold), Asthma, Bronchitis, or Seasonal Allergies.<br>⚠️ <strong>Red Flags:</strong> Coughing up blood, severe shortness of breath at rest, chest pain, or high persistent fever.<br>📌 <strong>Recommendation:</strong> If you have red flags, seek urgent care. For chronic cough, book a <strong>Pulmonologist</strong> or General Physician.";
    } else if (lowerMsg.includes('heart') || lowerMsg.includes('chest pain')) {
        aiResponse = "🚨 <strong>URGENT MEDICAL ALERT:</strong> Chest pain can be an indicator of Acute Coronary Syndrome (Heart Attack).<br><br><strong>Action:</strong> Please immediately route to the nearest Emergency Room or call emergency services. Do not use telehealth for sudden, severe chest pain. If chronic/mild, consult a <strong>Cardiologist</strong>.";
    }
    // 4. Dermatology / Skin
    else if (lowerMsg.includes('skin') || lowerMsg.includes('rash') || lowerMsg.includes('acne')) {
        aiResponse = "<strong>Symptom Analysis: Dermatology</strong><br><br>📝 <strong>Possible Causes:</strong> Contact dermatitis (allergic reaction), Eczema, Psoriasis, or viral exanthem.<br>📌 <strong>Recommendation:</strong> Avoid scratching or applying unknown creams. You can search for a <strong>Dermatologist</strong> in the 'Book Appointment' tab for a proper visual examination.";
    }
    // 5. Gastrointestinal / Stomach
    else if (lowerMsg.includes('stomach') || lowerMsg.includes('belly') || lowerMsg.includes('nausea') || lowerMsg.includes('diarrhea')) {
        aiResponse = "<strong>Symptom Analysis: Gastrointestinal</strong><br><br>📝 <strong>Possible Causes:</strong> Gastroenteritis (Stomach flu), Food Poisoning, Acid Reflux (GERD), or IBS.<br>⚠️ <strong>Red Flags:</strong> Severe abdominal right-lower-quadrant pain (Appendicitis concern), black/bloody stool, or inability to keep fluids down for 24+ hours.<br>📌 <strong>Recommendation:</strong> Stay hydrated with electrolytes. If red flags are present, go to urgent care. For chronic issues, book a <strong>Gastroenterologist</strong>.";
    }
    // 6. Musculoskeletal / Bones & Joints
    else if (lowerMsg.includes('joint') || lowerMsg.includes('knee') || lowerMsg.includes('arthritis')) {
        aiResponse = "<strong>Symptom Analysis: Joint Pain</strong><br><br>📝 <strong>Possible Causes:</strong> Osteoarthritis (wear and tear), Rheumatoid Arthritis (autoimmune), or acute ligament strain.<br>📌 <strong>Recommendation:</strong> R.I.C.E. (Rest, Ice, Compression, Elevation) for acute injuries. For chronic pain, consult an <strong>Orthopedic Surgeon</strong> or <strong>Rheumatologist</strong>.";
    } else if (lowerMsg.includes('back pain') || lowerMsg.includes('spine')) {
        aiResponse = "<strong>Symptom Analysis: Back Pain</strong><br><br>📝 <strong>Possible Causes:</strong> Muscle strain, herniated disc, or sciatica.<br>⚠️ <strong>Red Flags:</strong> Loss of bowel/bladder control, leg weakness, or pain radiating below the knee.<br>📌 <strong>Recommendation:</strong> Maintain gentle movement; avoid heavy lifting. If red flags occur, seek urgent care. Otherwise, book an <strong>Orthopedist</strong> or <strong>Physiotherapist</strong>.";
    }
    // 7. ENT (Ear, Nose, Throat)
    else if (lowerMsg.includes('ear') || lowerMsg.includes('throat') || lowerMsg.includes('swallow')) {
        aiResponse = "<strong>Symptom Analysis: ENT</strong><br><br>📝 <strong>Possible Causes:</strong> Strep throat, viral pharyngitis, or Otitis Media (Ear infection).<br>📌 <strong>Recommendation:</strong> Warm saline gargles for throat pain. If you experience severe ear pain, fever, or difficulty swallowing liquids, book an <strong>ENT Specialist</strong>.";
    }
    // 8. Systemic / General
    else if (lowerMsg.includes('fever') || lowerMsg.includes('temperature') || lowerMsg.includes('chills')) {
        aiResponse = "<strong>Symptom Analysis: Fever</strong><br><br>📝 <strong>Context:</strong> Fever is your body's natural response to fighting an infection (viral or bacterial).<br>⚠️ <strong>Red Flags:</strong> Fever over 103°F (39.4°C), stiff neck, confusion, or lasting more than 3 days.<br>📌 <strong>Recommendation:</strong> Rest, hydrate, and consider over-the-counter antipyretics (like Paracetamol). Consult a <strong>General Physician</strong> if symptoms persist.";
    } else if (lowerMsg.includes('tired') || lowerMsg.includes('fatigue') || lowerMsg.includes('sleep')) {
        aiResponse = "<strong>Symptom Analysis: Fatigue</strong><br><br>📝 <strong>Possible Causes:</strong> Viral illness recovery, anemia, thyroid dysfunction, poor sleep hygiene, or stress.<br>📌 <strong>Recommendation:</strong> Ensure 7-8 hours of sleep and adequate hydration. If fatigue is chronic and unexplained, book a <strong>General Physician</strong> to check your blood panels (e.g., CBC, Thyroid).";
    }
    // 9. Medications Setup
    else if (lowerMsg.includes('drug') || lowerMsg.includes('interaction') || lowerMsg.includes('medicine')) {
        aiResponse = "<strong>MedDeep Pharmacokinetics:</strong><br><br>I am trained on medical guidelines to cross-reference drug interactions. Please provide the specific list of medications (e.g., 'Aspirin and Ibuprofen').<br><em>Always consult your prescribing doctor before changing your dosage.</em>";
    }
    // 10. Greetings & Defaults
    else if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
        aiResponse = "Hello! I am MedDeep AI, your clinical support and patient triage assistant. Describe your symptoms (e.g., 'I have a sore throat and fever') and I will help analyze them and recommend the right specialist!";
    } else {
        aiResponse = "I am analyzing your query.<br><br>Based on your input, I recommend providing more specific symptoms (e.g. 'Stomach pain after eating' or 'Lower back pain'). <br>MedDeep AI can process specific diagnostic inquiries, simulate drug interactions, and recommend the correct specialist for you.<br><br><em>*Disclaimer: This is an AI triage tool, not a replacement for a doctor's diagnosis.</em>";
    }

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
            const userRole = state.user.role ? state.user.role.toLowerCase() : 'patient';
            if (userRole === 'admin') {
                app.innerHTML = AdminLayout();
            } else if (userRole === 'doctor') {
                app.innerHTML = DoctorLayout();
            } else if (userRole === 'receptionist') {
                app.innerHTML = ReceptionistLayout();
            } else {
                app.innerHTML = PatientLayout();
            }
            if (userRole === 'admin') window.renderAdminCharts();

            break;
    }

    // Auto-scroll chat if open
    if (state.activeTab === 'support') {
        const historyContainer = document.getElementById('chat-history');
        if (historyContainer) historyContainer.scrollTop = historyContainer.scrollHeight;
    }
}

const DoctorReceptionists = () => `
    <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h3>Manage Receptionists</h3>
        </div>

        <div class="grid-cols-2">
            <div class="card" style="box-shadow: none; border: 1px solid var(--border);">
                <h4 style="margin-bottom: 1rem;">Add New Receptionist</h4>
                <form onsubmit="createReceptionist(event)">
                    <div class="form-group">
                        <label class="form-label">Full Name</label>
                        <input type="text" id="rec-name" class="form-input" placeholder="Receptionist Name" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email / Login ID</label>
                        <input type="email" id="rec-email" class="form-input" placeholder="receptionist@hospital.com" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Temporary Password</label>
                        <input type="password" id="rec-password" class="form-input" placeholder="Password for receptionist" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Add Receptionist</button>
                </form>
            </div>

            <div>
                <h4 style="margin-bottom: 1rem;">Your Receptionists</h4>
                <div class="patients-list">
                    ${(state.receptionists || []).length === 0 ? '<p class="text-muted">No receptionists added yet.</p>' : ''}
                    ${(state.receptionists || []).map(r => `
                        <div class="patient-card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <div style="display: flex; gap: 1rem; align-items: center;">
                                <div class="avatar" style="width: 40px; height: 40px; font-size: 1rem;">${r.name.substring(0, 2).toUpperCase()}</div>
                                <div>
                                    <div style="font-weight: 600;">${r.name}</div>
                                    <div class="text-sm text-muted">${r.email}</div>
                                </div>
                            </div>
                            <button class="btn btn-outline" style="border-color: var(--danger); color: var(--danger); padding: 0.25rem 0.5rem;" onclick="deleteReceptionist('${r.id}')">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>
    `;


// --- ADMIN FETCH FUNCTIONS ---

async function fetchAdminDoctors() {
    try {
        const res = await fetch(`${API_BASE}/admin/doctors`);
        state.adminDoctors = await res.json();
        render();
    } catch (e) { console.error(e); }
}

async function fetchAdminPatients() {
    try {
        const res = await fetch(`${API_BASE}/admin/patients`);
        state.adminPatients = await res.json();
        render();
    } catch (e) { console.error(e); }
}

async function fetchAdminReceptionists() {
    try {
        const res = await fetch(`${API_BASE}/admin/receptionists`);
        state.adminReceptionists = await res.json();
        render();
    } catch (e) { console.error(e); }
}

async function fetchAdminAppointments() {
    try {
        const res = await fetch(`${API_BASE}/admin/appointments`);
        state.adminAppointments = await res.json();
        render();
    } catch (e) { console.error(e); }
}

async function deleteAdminDoctor(id) {
    if (!confirm('Delete this doctor?')) return;
    try {
        const res = await fetch(`${API_BASE}/admin/doctors/${id}`, { method: 'DELETE' });
        if (res.ok) fetchAdminDoctors();
    } catch (e) { console.error(e); }
}

async function deleteAdminPatient(id) {
    if (!confirm('Delete this patient?')) return;
    try {
        const res = await fetch(`${API_BASE}/admin/patients/${id}`, { method: 'DELETE' });
        if (res.ok) fetchAdminPatients();
    } catch (e) { console.error(e); }
}

async function deleteAdminReceptionist(id) {
    if (!confirm('Delete this receptionist?')) return;
    try {
        const res = await fetch(`${API_BASE}/admin/receptionists/${id}`, { method: 'DELETE' });
        if (res.ok) fetchAdminReceptionists();
    } catch (e) { console.error(e); }
}

async function deleteAdminAppointment(id) {
    if (!confirm('Delete this appointment?')) return;
    try {
        const res = await fetch(`${API_BASE}/admin/appointments/${id}`, { method: 'DELETE' });
        if (res.ok) fetchAdminAppointments();
    } catch (e) { console.error(e); }
}

async function fetchAdminBeds() {
    try {
        const res = await fetch(`${API_BASE}/beds`);
        state.beds = await res.json();
        render();
    } catch (e) { console.error(e); }
}

async function addAdminBed(e) {
    e.preventDefault();
    const wardName = document.getElementById('bed-ward').value;
    const bedNumber = document.getElementById('bed-number').value;
    try {
        const res = await fetch(`${API_BASE}/beds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wardName, bedNumber, status: 'AVAILABLE' })
        });
        if (res.ok) fetchAdminBeds();
    } catch (e) { console.error(e); }
}

async function assignAdminBed(id) {
    const pEmail = prompt("Enter Patient Email to assign:");
    if (!pEmail) return;
    const pName = prompt("Enter Patient Name:");
    if (!pName) return;
    try {
        const res = await fetch(`${API_BASE}/beds/${id}/assign`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientEmail: pEmail, patientName: pName })
        });
        if (res.ok) fetchAdminBeds();
    } catch (e) { console.error(e); }
}

async function dischargeAdminBed(id) {
    if (!confirm('Discharge this patient and free the bed?')) return;
    try {
        const res = await fetch(`${API_BASE}/beds/${id}/discharge`, { method: 'PUT' });
        if (res.ok) fetchAdminBeds();
    } catch (e) { console.error(e); }
}

async function deleteAdminBed(id) {
    if (!confirm('Delete this bed entirely?')) return;
    try {
        const res = await fetch(`${API_BASE}/beds/${id}`, { method: 'DELETE' });
        if (res.ok) fetchAdminBeds();
    } catch (e) { console.error(e); }
}

// --- ADMIN COMPONENTS ---

async function fetchAdminBloodBank() {
    try {
        const res = await fetch(`${API_BASE}/blood-bank`);
        state.bloodRequests = await res.json();
        render();
    } catch (e) { console.error(e); }
}

async function fulfillBloodRequest(id) {
    if(!confirm('Mark this blood request as fulfilled?')) return;
    try {
        const res = await fetch(`${API_BASE}/blood-bank/${id}/fulfill`, { method: 'PUT' });
        if(res.ok) fetchAdminBloodBank();
    } catch(e) { console.error(e); }
}

async function requestEmergencyBlood(e) {
    e.preventDefault();
    const bg = document.getElementById('bb-group').value;
    const units = document.getElementById('bb-units').value;
    const urgency = document.getElementById('bb-urgency').value;
    const btn = e.target.querySelector('button');
    btn.innerHTML = "Broadcasting Emails...";
    btn.disabled = true;
    
    try {
        const res = await fetch(`${API_BASE}/blood-bank/emergency`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bloodGroupRequired: bg, unitsRequired: parseInt(units), urgency: urgency })
        });
        if(res.ok) {
            alert('Emergency Broadcast sent to all matching donors!');
            fetchAdminBloodBank();
        }
    } catch (e) {
        console.error(e);
        alert('Failed to send broadcast.');
    } finally {
        btn.innerHTML = "Send Emergency Broadcast Emails";
        btn.disabled = false;
    }
}

const AdminDashboardHome = () => {
    const totalDoctors = (state.adminDoctors || []).length;
    const totalPatients = (state.adminPatients || []).length;
    const totalReceptionists = (state.adminReceptionists || []).length;
    const totalAppointments = (state.adminAppointments || []).length;

    return `
        <div class="grid-cols-4 mb-4">
        <div class="card stat-card">
            <div class="stat-icon" style="color:var(--primary);"><i class="fas fa-user-md"></i></div>
            <div class="stat-info">
                <h3>${totalDoctors}</h3>
                <p class="text-muted">Total Doctors</p>
            </div>
        </div>
        <div class="card stat-card">
            <div class="stat-icon" style="color:var(--accent);"><i class="fas fa-users"></i></div>
            <div class="stat-info">
                <h3>${totalPatients}</h3>
                <p class="text-muted">Total Patients</p>
            </div>
        </div>
        <div class="card stat-card">
            <div class="stat-icon" style="color:#0ea5e9;"><i class="fas fa-user-nurse"></i></div>
            <div class="stat-info">
                <h3>${totalReceptionists}</h3>
                <p class="text-muted">Total Receptionists</p>
            </div>
        </div>
        <div class="card stat-card">
            <div class="stat-icon" style="color:var(--success);"><i class="fas fa-calendar-check"></i></div>
            <div class="stat-info">
                <h3>${totalAppointments}</h3>
                <p class="text-muted">Total Appointments</p>
            </div>
        </div>
    </div>
    <div class="grid-cols-2 mt-4">
        <div class="card">
            <div class="card-header"><div class="card-title">Daily Appointments</div></div>
            <canvas id="appointmentsChart" width="400" height="200"></canvas>
        </div>
        <div class="card">
            <div class="card-header"><div class="card-title">Doctors by Specialization</div></div>
            <canvas id="specialtiesChart" width="400" height="200"></canvas>
        </div>
    </div>
        `;
};

window.renderAdminCharts = function() {
    // Wait for canvas to be in DOM
    setTimeout(() => {
        const aptCtx = document.getElementById('appointmentsChart');
        const specCtx = document.getElementById('specialtiesChart');
        if (!aptCtx || !specCtx) return;

        // Appointments data
        const aptData = (state.adminAppointments || []).reduce((acc, curr) => {
            acc[curr.date] = (acc[curr.date] || 0) + 1;
            return acc;
        }, {});
        
        new Chart(aptCtx, {
            type: 'line',
            data: {
                labels: Object.keys(aptData),
                datasets: [{
                    label: 'Appointments',
                    data: Object.values(aptData),
                    borderColor: '#4361ee',
                    tension: 0.1
                }]
            }
        });

        // Specialties data
        const specData = (state.adminDoctors || []).reduce((acc, curr) => {
            const spec = curr.specialization || 'General';
            acc[spec] = (acc[spec] || 0) + 1;
            return acc;
        }, {});

        new Chart(specCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(specData),
                datasets: [{
                    data: Object.values(specData),
                    backgroundColor: ['#4cc9f0', '#4361ee', '#7209b7', '#10b981', '#f59e0b']
                }]
            }
        });
    }, 100);
}

const AdminManageDoctors = () => `
        <div class="card">
        <h3>Manage Doctors</h3>
        <p class="text-muted mb-4">View and remove doctors</p>
        <div class="patients-list">
            ${(state.adminDoctors || []).map(d => `
                <div class="patient-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <div>
                        <div style="font-weight:600;">Dr. ${d.name} (${d.specialization})</div>
                        <div class="text-sm text-muted">${d.hospitalName} - ${d.phone}</div>
                    </div>
                    <button class="btn btn-outline" style="border-color:var(--danger);color:var(--danger);padding:0.25rem 0.5rem;" onclick="deleteAdminDoctor('${d.id}')">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            `).join('')}
        </div>
    </div>
        `;

const AdminManagePatients = () => `
        <div class="card">
        <h3>Manage Patients</h3>
        <p class="text-muted mb-4">View and remove patients</p>
        <div class="patients-list">
            ${(state.adminPatients || []).map(p => `
                <div class="patient-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <div>
                        <div style="font-weight:600;">${p.name}</div>
                        <div class="text-sm text-muted">${p.email} | ${p.phone}</div>
                    </div>
                    <button class="btn btn-outline" style="border-color:var(--danger);color:var(--danger);padding:0.25rem 0.5rem;" onclick="deleteAdminPatient('${p.id}')">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            `).join('')}
        </div>
    </div>
        `;

const AdminManageReceptionists = () => `
        <div class="card">
        <h3>Manage Receptionists</h3>
        <p class="text-muted mb-4">View and remove receptionists</p>
        <div class="patients-list">
            ${(state.adminReceptionists || []).map(r => `
                <div class="patient-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <div>
                        <div style="font-weight:600;">${r.name}</div>
                        <div class="text-sm text-muted">Email: ${r.email} | Managing Dr. ${r.doctorId}</div>
                    </div>
                    <button class="btn btn-outline" style="border-color:var(--danger);color:var(--danger);padding:0.25rem 0.5rem;" onclick="deleteAdminReceptionist('${r.id}')">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            `).join('')}
        </div>
    </div>
        `;

const AdminSystemSettings = () => `
        <div class="card">
        <h3>System Settings</h3>
        <p class="text-muted">Configuration and settings (Admin only)</p>
    </div>
        `;

const AdminManageAppointments = () => `
        <div class="card">
        <h3>All System Appointments</h3>
        <p class="text-muted mb-4">View and remove appointments globally</p>
        <div class="patients-list">
            ${(state.adminAppointments || []).map(a => `
                <div class="patient-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <div>
                        <div style="font-weight:600;">Date: ${a.date} | Time: ${a.time} - Status: ${a.status}</div>
                        <div class="text-sm text-muted">Doc ID: ${a.doctorId} | Patient Name: ${a.patientName}</div>
                    </div>
                    <button class="btn btn-outline" style="border-color:var(--danger);color:var(--danger);padding:0.25rem 0.5rem;" onclick="deleteAdminAppointment('${a.id}')">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            `).join('')}
            ${(state.adminAppointments || []).length === 0 ? '<p>No appointments found.</p>' : ''}
        </div>
    </div>
    </div>
        `;

const AdminManageBeds = () => `
    <div class="card">
        <h3>Hospital Bed & Ward Management</h3>
        <p class="text-muted mb-4">View and assign ICU & General Beds</p>
        
        <div style="background:rgba(114,9,183,0.05); padding:1rem; border-radius:8px; margin-bottom:1rem; border:1px dashed var(--accent);">
            <h4>Add New Bed</h4>
            <form onsubmit="addAdminBed(event)" style="display:flex; gap:1rem; align-items:flex-end; margin-top:0.5rem;">
                <div>
                    <label class="form-label">Ward Name</label>
                    <input type="text" id="bed-ward" class="form-input" placeholder="e.g. ICU" required>
                </div>
                <div>
                    <label class="form-label">Bed Number</label>
                    <input type="number" id="bed-number" class="form-input" placeholder="e.g. 101" required>
                </div>
                <button type="submit" class="btn btn-primary">Add Bed</button>
            </form>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:1rem;">
            ${(state.beds || []).map(b => `
                <div style="border:1px solid ${b.status === 'AVAILABLE' ? '#10b981' : '#ef4444'}; border-radius:8px; padding:1rem; background:${b.status === 'AVAILABLE' ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)'}">
                    <div style="font-weight:bold; font-size:1.1rem; margin-bottom:0.5rem;">
                        <i class="fas fa-bed"></i> ${b.wardName} - #${b.bedNumber}
                    </div>
                    <div style="color:${b.status === 'AVAILABLE' ? '#10b981' : '#ef4444'}; font-weight:bold; font-size:0.8rem; margin-bottom:1rem;">
                        ${b.status}
                    </div>
                    ${b.status === 'OCCUPIED' ? `
                        <div class="text-sm mb-2"><b>Patient:</b> ${b.patientName}</div>
                        <div class="text-sm mb-3"><b>Admitted:</b> ${b.admissionDate}</div>
                        <button class="btn btn-outline" style="width:100%; border-color:#f59e0b; color:#f59e0b" onclick="dischargeAdminBed('${b.id}')">Discharge Patient</button>
                    ` : `
                        <button class="btn btn-primary" style="width:100%; margin-bottom:0.5rem;" onclick="assignAdminBed('${b.id}')">Assign Patient</button>
                        <button class="btn btn-outline" style="width:100%; border-color:var(--danger); color:var(--danger)" onclick="deleteAdminBed('${b.id}')">Delete Bed</button>
                    `}
                </div>
            `).join('')}
            ${(state.beds || []).length === 0 ? '<p>No beds found. Add one above.</p>' : ''}
        </div>
    </div>
`;

// Init

const AdminManageBloodBank = () => `
    <div class="card">
        <h3><i class="fas fa-tint" style="color:red;"></i> Blood Bank Control Center</h3>
        <p class="text-muted mb-4">Request emergency blood and the system will automatically email matching donors.</p>
        
        <div style="background:rgba(239,68,68,0.05); padding:1.5rem; border-radius:8px; margin-bottom:2rem; border:1px solid rgba(239,68,68,0.3);">
            <h4 style="color:var(--danger); margin-bottom:1rem;">Broadcast Emergency Blood Request</h4>
            <form onsubmit="requestEmergencyBlood(event)" style="display:flex; gap:1rem; align-items:flex-end; flex-wrap:wrap;">
                <div style="flex:1;">
                    <label class="form-label">Blood Group Needed</label>
                    <select id="bb-group" class="form-input" required>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                    </select>
                </div>
                <div style="flex:1;">
                    <label class="form-label">Units (Pints)</label>
                    <input type="number" id="bb-units" class="form-input" placeholder="e.g. 5" min="1" required>
                </div>
                <div style="flex:1;">
                    <label class="form-label">Urgency</label>
                    <select id="bb-urgency" class="form-input" required>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical (Immediate)</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary" style="background:var(--danger); border:none;">Send Emergency Broadcast Emails</button>
            </form>
        </div>

        <h4>Active Target Requests</h4>
        <div style="display:flex;flex-direction:column;gap:1rem;margin-top:1rem;">
            ${(state.bloodRequests || []).map(r => `
                <div style="border:1px solid ${r.status === 'FULFILLED' ? '#10b981' : 'var(--danger)'}; border-radius:8px; padding:1rem; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:bold; font-size:1.1rem; margin-bottom:0.25rem;">
                            <i class="fas fa-tint" style="color:${r.status === 'FULFILLED' ? '#10b981' : 'var(--danger)'};"></i> ${r.unitsRequired} Units of ${r.bloodGroupRequired}
                        </div>
                        <div class="text-sm text-muted">Requested: ${r.requestedDate} | Urgency: <b style="color:var(--danger)">${r.urgency}</b></div>
                    </div>
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <span style="font-weight:bold; color:${r.status === 'FULFILLED' ? '#10b981' : 'var(--danger)'};">${r.status}</span>
                        ${r.status === 'PENDING' ? `<button class="btn btn-outline btn-sm" style="border-color:#10b981; color:#10b981;" onclick="fulfillBloodRequest('${r.id}')"><i class="fas fa-check"></i> Mark Fulfilled</button>` : ''}
                    </div>
                </div>
            `).join('')}
            ${(state.bloodRequests || []).length === 0 ? '<p>No emergency requests right now.</p>' : ''}
        </div>
    </div>
`;
if (state.user) {
    // If logged in, fetch data for the active tab and render
    setTab(state.activeTab);
} else {
    // Otherwise render login page
    render();
}

// =============================================
// FEATURE 1: REAL-TIME LIVE CHAT (WebSockets)
// =============================================

let stompClient = null;
let currentChatAptId = null;

window.openChatModal = function(aptId, doctorName) {
    currentChatAptId = aptId;

    // Remove any existing modal
    const existing = document.getElementById('chat-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'chat-modal-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.65);display:flex;justify-content:center;align-items:center;z-index:9999;';

    overlay.innerHTML = `
        <div style="background:var(--surface);border-radius:16px;width:420px;max-width:95vw;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="background:var(--primary);padding:1rem 1.5rem;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-weight:700;color:white;font-size:1.1rem;"><i class="fas fa-comments"></i> Live Chat</div>
                    <div style="color:rgba(255,255,255,0.75);font-size:0.8rem;">With Dr. ${doctorName}</div>
                </div>
                <button onclick="closeChatModal()" style="background:none;border:none;color:white;font-size:1.2rem;cursor:pointer;"><i class="fas fa-times"></i></button>
            </div>
            <div id="chat-messages" style="flex:1;padding:1rem;height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:0.75rem;background:var(--bg);">
                <div style="text-align:center;color:var(--text-secondary);font-size:0.8rem;">Connecting to chat room...</div>
            </div>
            <div style="padding:1rem;border-top:1px solid rgba(255,255,255,0.1);display:flex;gap:0.5rem;">
                <input id="chat-input" type="text" placeholder="Type a message..." 
                    style="flex:1;padding:0.6rem 1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:var(--text-primary);outline:none;"
                    onkeydown="if(event.key==='Enter') sendChatMessage()">
                <button onclick="sendChatMessage()" style="background:var(--primary);color:white;border:none;padding:0.6rem 1rem;border-radius:8px;cursor:pointer;"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    connectWebSocket(aptId);
};

window.closeChatModal = function() {
    if (stompClient) {
        stompClient.disconnect();
        stompClient = null;
    }
    const overlay = document.getElementById('chat-modal-overlay');
    if (overlay) overlay.remove();
};

function connectWebSocket(aptId) {
    const socket = new SockJS('/ws-chat');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // Suppress debug logs

    stompClient.connect({}, function() {
        stompClient.subscribe('/topic/public/' + aptId, function(payload) {
            const message = JSON.parse(payload.body);
            displayChatMessage(message);
        });

        // Announce user joined
        const sender = state.user ? state.user.name : 'Guest';
        const role = state.user ? state.user.role : 'patient';
        stompClient.send('/app/chat/' + aptId + '/addUser', {}, JSON.stringify({ sender, role, content: sender + ' joined the chat.' }));

        const messagesDiv = document.getElementById('chat-messages');
        if (messagesDiv) messagesDiv.innerHTML = '';
    }, function(err) {
        const messagesDiv = document.getElementById('chat-messages');
        if (messagesDiv) messagesDiv.innerHTML = '<div style="text-align:center;color:#ef4444;font-size:0.85rem;">Connection failed. Please refresh and try again.</div>';
    });
}

window.sendChatMessage = function() {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim() || !stompClient) return;

    const sender = state.user ? state.user.name : 'Guest';
    const role = state.user ? state.user.role : 'patient';

    stompClient.send('/app/chat/' + currentChatAptId + '/sendMessage', {}, JSON.stringify({
        sender,
        role,
        content: input.value.trim()
    }));
    input.value = '';
};

function displayChatMessage(message) {
    const messagesDiv = document.getElementById('chat-messages');
    if (!messagesDiv) return;

    const isMine = state.user && message.sender === state.user.name;
    const isSystem = !message.role || message.content.endsWith('joined the chat.');

    const msgEl = document.createElement('div');

    if (isSystem) {
        msgEl.style.cssText = 'text-align:center;color:var(--text-secondary);font-size:0.75rem;';
        msgEl.textContent = message.content;
    } else {
        msgEl.style.cssText = `display:flex;flex-direction:column;align-items:${isMine ? 'flex-end' : 'flex-start'};`;
        msgEl.innerHTML = `
            <div style="font-size:0.7rem;color:var(--text-secondary);margin-bottom:2px;">${message.sender} (${message.role})</div>
            <div style="background:${isMine ? 'var(--primary)' : 'rgba(255,255,255,0.08)'};color:${isMine ? 'white' : 'var(--text-primary)'};padding:0.5rem 0.85rem;border-radius:${isMine ? '12px 12px 4px 12px' : '12px 12px 12px 4px'};max-width:80%;font-size:0.9rem;word-break:break-word;">
                ${message.content}
            </div>
        `;
    }

    messagesDiv.appendChild(msgEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

