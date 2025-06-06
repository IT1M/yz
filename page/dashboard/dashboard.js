document.addEventListener('DOMContentLoaded', function() {
// --- 1. Authentication & State Management ---
const adminSession = JSON.parse(localStorage.getItem('yzUserSession'));
// التحقق من وجود جلسة مدير صالحة
if (!adminSession || !adminSession.isAdmin) {
    // إذا لم يكن هناك جلسة صالحة، يتم توجيه المستخدم إلى صفحة تسجيل الدخول
    window.location.href = '../login/login.html'; 
    // إيقاف تنفيذ بقية الكود لمنع تحميل بيانات اللوحة
    throw new Error("Redirecting to login."); 
}

const appState = {
        jobs: [],
        applications: [],
        users: [],
        filters: {
            departments: ["تطوير البرمجيات", "التسويق", "المبيعات", "الهندسة الطبية", "خدمة العملاء", "الموارد البشرية"],
            locations: ["الرياض", "جدة", "الدمام", "عن بُعد", "الخبر"],
            types: ["دوام كامل", "دوام جزئي", "تدريب", "عقد محدد"]
        },
        charts: {} // To store Chart.js instances
    };

    function loadData() {
        // Load data from localStorage, which is managed by the main script.js
        appState.jobs = JSON.parse(localStorage.getItem('yzMockJobs')) || [];
        appState.applications = JSON.parse(localStorage.getItem('yzMockApplications')) || [];
        appState.users = JSON.parse(localStorage.getItem('yzMockUsers')) || [];

        document.getElementById('adminNameDisplay').textContent = adminSession.name;
    }

    function saveData(key, data) {
        const localStorageKey = `yzMock${key.charAt(0).toUpperCase() + key.slice(1)}`;
        localStorage.setItem(localStorageKey, JSON.stringify(data));
    }

    // --- 2. DOM Elements Cache ---
    const DOMElements = {
        sidebar: document.querySelector('.sidebar'),
        mobileMenuToggle: document.getElementById('mobileMenuToggle'),
        navLinks: document.querySelectorAll('.nav-link'),
        sections: document.querySelectorAll('.dashboard-section'),
        pageTitle: document.getElementById('pageTitle'),
        // Modals & Forms
        jobModal: document.getElementById('jobModal'),
        jobForm: document.getElementById('jobForm'),
        applicationDetailsModal: document.getElementById('applicationDetailsModal'),
        // Filters & Search
        applicationStatusFilter: document.getElementById('applicationStatusFilter'),
        applicationSearchInput: document.getElementById('applicationSearchInput'),
    };

    // --- 3. UI Rendering & Updates ---
    function renderAll() {
        renderOverview();
        renderJobsTable();
        renderApplicationsTable();
        renderUsersTable();
    }

    function renderOverview() {
        const acceptedCount = appState.applications.filter(app => app.status === 'مقبول').length;
        document.getElementById('totalJobsStat').textContent = appState.jobs.length;
        document.getElementById('totalApplicationsStat').textContent = appState.applications.length;
        document.getElementById('totalUsersStat').textContent = appState.users.length;
        document.getElementById('acceptedApplicationsStat').textContent = acceptedCount;
        renderApplicationsStatusChart();
        renderJobsByDepartmentChart();
    }

    function renderApplicationsStatusChart() {
        const ctx = document.getElementById('applicationsStatusChart')?.getContext('2d');
        if (!ctx) return;
        const statusCounts = appState.applications.reduce((acc, app) => {
            acc[app.status] = (acc[app.status] || 0) + 1;
            return acc;
        }, {});
        if (appState.charts.applications) appState.charts.applications.destroy();
        appState.charts.applications = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#3498db', '#f39c12', '#27ae60', '#e74c3c', '#9b59b6', '#34495e'],
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, legend: { position: 'bottom' } }
        });
    }

    function renderJobsByDepartmentChart() {
        const ctx = document.getElementById('jobsByDepartmentChart')?.getContext('2d');
        if (!ctx) return;
        const deptCounts = appState.jobs.reduce((acc, job) => {
            acc[job.department] = (acc[job.department] || 0) + 1;
            return acc;
        }, {});
        if (appState.charts.jobsByDepartment) appState.charts.jobsByDepartment.destroy();
        appState.charts.jobsByDepartment = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(deptCounts),
                datasets: [{
                    label: 'الوظائف',
                    data: Object.values(deptCounts),
                    backgroundColor: '#3498db',
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }
    
    function renderJobsTable() {
        const tableBody = document.getElementById('jobsTable')?.querySelector('tbody');
        if (!tableBody) return;
        tableBody.innerHTML = appState.jobs.map(job => `
            <tr>
                <td data-label="العنوان">${job.title}</td>
                <td data-label="القسم">${job.department}</td>
                <td data-label="الموقع">${job.location}</td>
                <td data-label="تاريخ النشر">${new Date(job.datePosted).toLocaleDateString('ar-SA')}</td>
                <td data-label="الإجراءات" class="action-buttons">
                    <button class="btn btn-warning btn-sm edit-job" data-id="${job.id}"><i class="fas fa-edit"></i> تعديل</button>
                    <button class="btn btn-danger btn-sm delete-job" data-id="${job.id}"><i class="fas fa-trash"></i> حذف</button>
                </td>
            </tr>
        `).join('');
    }

    function renderApplicationsTable(filterStatus = '', searchTerm = '') {
        const tableBody = document.getElementById('applicationsTable')?.querySelector('tbody');
        if (!tableBody) return;
        const filteredApps = appState.applications.filter(app => {
            const statusMatch = !filterStatus || app.status === filterStatus;
            const searchMatch = !searchTerm || 
                                app.applicantName.toLowerCase().includes(searchTerm) ||
                                (app.applicantEmail && app.applicantEmail.toLowerCase().includes(searchTerm)) ||
                                (app.jobTitle && app.jobTitle.toLowerCase().includes(searchTerm));
            return statusMatch && searchMatch;
        });
        tableBody.innerHTML = filteredApps.map(app => `
            <tr>
                <td data-label="المتقدم">${app.applicantName}<br><small>${app.applicantEmail}</small></td>
                <td data-label="الوظيفة">${app.jobTitle || 'تقديم عام'}</td>
                <td data-label="تاريخ التقديم">${new Date(app.dateApplied).toLocaleDateString('ar-SA')}</td>
                <td data-label="الحالة">
                    <select class="action-select status-select" data-id="${app.id}">
                        ${['قيد المراجعة', 'تمت المقابلة', 'مقبول', 'مرفوض', 'تقديم عام محفوظ'].map(status =>
                            `<option value="${status}" ${app.status === status ? 'selected' : ''}>${status}</option>`
                        ).join('')}
                    </select>
                </td>
                <td data-label="الإجراءات" class="action-buttons">
                    <button class="btn btn-primary btn-sm view-application" data-id="${app.id}"><i class="fas fa-eye"></i> عرض</button>
                    <button class="btn btn-danger btn-sm delete-application" data-id="${app.id}"><i class="fas fa-trash"></i> حذف</button>
                    <button class="btn btn-success btn-sm btn-ai-screening" data-id="${app.id}">
                        <i class="fas fa-robot"></i> بدء الفحص بالذكاء الاصطناعي
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    function renderUsersTable() {
        const tableBody = document.getElementById('usersTable')?.querySelector('tbody');
        if (!tableBody) return;
        tableBody.innerHTML = appState.users.map(user => `
            <tr>
                <td data-label="الاسم">${user.name}</td>
                <td data-label="البريد الإلكتروني">${user.email}</td>
                <td data-label="رقم الهاتف">${user.phone || 'غير متوفر'}</td>
                <td data-label="تاريخ الانضمام">${new Date(user.dateJoined).toLocaleDateString('ar-SA')}</td>
                <td data-label="الصلاحية">${user.isAdmin ? 'مدير' : 'مستخدم'}</td>
                <td data-label="الإجراءات" class="action-buttons">
                    ${!user.isAdmin ? `<button class="btn btn-danger btn-sm delete-user" data-id="${user.id}"><i class="fas fa-trash"></i> حذف</button>` : '<span>-</span>'}
                </td>
            </tr>
        `).join('');
    }

    // --- 4. Event Handlers & Logic ---
    function handleNavigation(e) {
        const targetId = e.currentTarget.dataset.target;
        DOMElements.sections.forEach(s => s.classList.remove('active'));
        DOMElements.navLinks.forEach(l => l.classList.remove('active'));
        document.getElementById(targetId)?.classList.add('active');
        e.currentTarget.classList.add('active');
        DOMElements.pageTitle.textContent = e.currentTarget.textContent;
        // إغلاق القائمة الجانبية تلقائياً في الجوال
        if (window.innerWidth < 992) DOMElements.sidebar.classList.remove('open');
        // تمرير الصفحة للأعلى عند تغيير القسم في الجوال
        if (window.innerWidth < 768) window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Job Modal Logic
    function openJobModal(jobId = null) {
        DOMElements.jobForm.reset();
        document.getElementById('jobIdInput').value = '';
        const modalTitle = document.getElementById('jobModalTitle');
        if (jobId) {
            const job = appState.jobs.find(j => j.id === jobId);
            if (!job) return;
            modalTitle.textContent = 'تعديل وظيفة';
            Object.keys(job).forEach(key => {
                const input = document.getElementById(`job${key.charAt(0).toUpperCase() + key.slice(1)}Input`) || 
                              document.getElementById(`job${key.charAt(0).toUpperCase() + key.slice(1)}Select`) ||
                              document.getElementById(`job${key.charAt(0).toUpperCase() + key.slice(1)}Textarea`);
                if (input) {
                    input.value = Array.isArray(job[key]) ? job[key].join(input.id.includes('Skills') ? ', ' : '\n') : job[key];
                }
            });
            document.getElementById('jobIdInput').value = job.id;
        } else {
            modalTitle.textContent = 'إضافة وظيفة جديدة';
        }
        DOMElements.jobModal.style.display = 'flex';
    }

    function handleJobFormSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('jobIdInput').value;
        const jobData = {
            title: document.getElementById('jobTitleInput').value,
            department: document.getElementById('jobDepartmentSelect').value,
            location: document.getElementById('jobLocationSelect').value,
            type: document.getElementById('jobTypeSelect').value,
            description: document.getElementById('jobDescriptionTextarea').value,
            responsibilities: document.getElementById('jobResponsibilitiesTextarea').value.split('\n').filter(Boolean),
            qualifications: document.getElementById('jobQualificationsTextarea').value.split('\n').filter(Boolean),
            skills: document.getElementById('jobSkillsInput').value.split(',').map(s => s.trim()).filter(Boolean),
            datePosted: new Date().toISOString().split('T')[0]
        };

        if (id) {
            const index = appState.jobs.findIndex(j => j.id === id);
            appState.jobs[index] = { ...appState.jobs[index], ...jobData };
            showAlert('تم تحديث الوظيفة بنجاح!', 'success');
        } else {
            jobData.id = 'J' + Date.now();
            appState.jobs.push(jobData);
            showAlert('تمت إضافة الوظيفة بنجاح!', 'success');
        }
        saveData('jobs', appState.jobs);
        renderJobsTable();
        renderOverview();
        DOMElements.jobModal.style.display = 'none';
    }

    // Application Details Modal Logic
    function viewApplicationDetails(appId) {
        const app = appState.applications.find(a => a.id === appId);
        if (!app) return;
        const contentDiv = document.getElementById('applicationDetailsContent');
        contentDiv.innerHTML = `
            <div class="detail-section">
                <p><strong>اسم المتقدم:</strong> ${app.applicantName}</p>
                <p><strong>البريد الإلكتروني:</strong> <a href="mailto:${app.applicantEmail}">${app.applicantEmail}</a></p>
                <p><strong>رقم الهاتف:</strong> ${app.applicantPhone || 'غير متوفر'}</p>
            </div>
            <div class="detail-section">
                <p><strong>الوظيفة:</strong> ${app.jobTitle || 'تقديم عام'}</p>
                <p><strong>تاريخ التقديم:</strong> ${new Date(app.dateApplied).toLocaleDateString('ar-SA')}</p>
                <p><strong>الحالة:</strong> ${app.status}</p>
                <p><strong>الخبرة:</strong> ${app.experience ?? 'N/A'} سنوات</p>
            </div>
            <div class="detail-section">
                <p><strong>رسالة تعريفية/نبذة:</strong></p>
                <p style="white-space: pre-wrap; background: #f9f9f9; padding: 10px; border-radius: 5px;">${app.coverLetter || app.bio || 'لا يوجد'}</p>
            </div>
        `;
        DOMElements.applicationDetailsModal.style.display = 'flex';
    }
    
    // CRUD Actions
    function handleTableClicks(e) {
        const target = e.target.closest('button, .status-select');
        if (!target) return;

        const id = target.dataset.id;
        
        if (target.classList.contains('edit-job')) openJobModal(id);
        if (target.classList.contains('delete-job')) deleteItem('jobs', id, 'الوظيفة');
        
        if (target.classList.contains('view-application')) viewApplicationDetails(id);
        if (target.classList.contains('delete-application')) deleteItem('applications', id, 'طلب التوظيف');
        
        if (target.classList.contains('delete-user')) deleteItem('users', id, 'المستخدم');
        
        if (target.classList.contains('btn-ai-screening')) {
            const app = appState.applications.find(a => a.id === id);
            if (!app) return;
            // 1. Update status
            app.status = "في انتظار فحص الذكاء الاصطناعي";
            // 2. Generate unique token and link
            const token = 'AI-' + Math.random().toString(36).substr(2, 12) + Date.now();
            app.aiScreeningToken = token;
            app.aiScreeningCompleted = false;
            // 3. Save changes
            saveData('applications', appState.applications);
            renderApplicationsTable();
            renderOverview();
            // 4. Prepare email content
            const aiLink = `${window.location.origin}${window.location.pathname.replace('dashboard/dashboard.html','investment-AI/investment-AI.html')}?token=${token}`;
            const emailSubject = encodeURIComponent("دعوة لإجراء فحص الذكاء الاصطناعي لوظيفة");
            const emailBody = encodeURIComponent(
                `مرحباً ${app.applicantName}،

نشكرك على تقدمك لوظيفة "${app.jobTitle || 'تقديم عام'}" في شركة ميس للمنتجات الطبية.
نود دعوتك لإجراء فحص الذكاء الاصطناعي كخطوة مهمة في عملية التوظيف.

يرجى الضغط على الرابط التالي للبدء (الرابط صالح للاستخدام مرة واحدة فقط):
${aiLink}

نتمنى لك التوفيق!
فريق التوظيف - ميس`
            );
            // 5. Show modal with prefilled email
            showAIScreeningEmailModal(app.applicantEmail, emailSubject, emailBody, aiLink);
        }

        if (target.classList.contains('status-select')) {
            const app = appState.applications.find(a => a.id === id);
            app.status = target.value;
            saveData('applications', appState.applications);
            showAlert(`تم تحديث حالة طلب ${app.applicantName}.`, 'success');
            renderOverview();
        }
    }

    function deleteItem(itemType, itemId, itemName) {
        if (confirm(`هل أنت متأكد من حذف ${itemName}؟ لا يمكن التراجع عن هذا الإجراء.`)) {
            appState[itemType] = appState[itemType].filter(item => item.id !== itemId);
            saveData(itemType, appState[itemType]);
            showAlert(`تم حذف ${itemName} بنجاح.`, 'success');
            renderAll(); // Re-render everything to reflect changes
        }
    }

    // --- 5. Initializers & Listeners ---
    function initializeEventListeners() {
        DOMElements.navLinks.forEach(link => link.addEventListener('click', handleNavigation));
        DOMElements.mobileMenuToggle.addEventListener('click', () => DOMElements.sidebar.classList.toggle('open'));
        // إغلاق القائمة الجانبية عند الضغط خارجها في الجوال
        document.addEventListener('click', function(e) {
// --- AI Screening Email Modal ---
    function showAIScreeningEmailModal(email, subject, body, link) {
        document.getElementById('aiScreeningEmailTo').textContent = email;
        document.getElementById('aiScreeningLink').textContent = link;
        document.getElementById('aiScreeningLink').href = link;
        document.getElementById('aiScreeningEmailBody').value = decodeURIComponent(body);
        document.getElementById('aiScreeningMailtoBtn').href = `mailto:${email}?subject=${subject}&body=${body}`;
        document.getElementById('aiScreeningEmailModal').style.display = 'flex';
    }
            if (window.innerWidth < 992 && DOMElements.sidebar.classList.contains('open')) {
                if (!DOMElements.sidebar.contains(e.target) && !DOMElements.mobileMenuToggle.contains(e.target)) {
                    DOMElements.sidebar.classList.remove('open');
                }
            }
        });
        document.getElementById('addJobBtn')?.addEventListener('click', () => openJobModal());
        DOMElements.jobForm.addEventListener('submit', handleJobFormSubmit);
        
        // Modal closing
        document.querySelectorAll('.modal .close-button').forEach(btn => {
            btn.addEventListener('click', () => document.getElementById(btn.dataset.modalId).style.display = 'none');
        });
        window.addEventListener('click', e => {
            if (e.target.classList.contains('modal')) e.target.style.display = 'none';
        });

        // Table clicks (event delegation)
        document.querySelector('.page-content').addEventListener('click', handleTableClicks);
        document.querySelector('.page-content').addEventListener('change', handleTableClicks);

        // Filters
        DOMElements.applicationSearchInput?.addEventListener('input', (e) => renderApplicationsTable(DOMElements.applicationStatusFilter.value, e.target.value.toLowerCase()));
        DOMElements.applicationStatusFilter?.addEventListener('change', (e) => renderApplicationsTable(e.target.value, DOMElements.applicationSearchInput.value.toLowerCase()));
    }
    
    function populateSelects() {
        ['jobDepartmentSelect', 'jobLocationSelect', 'jobTypeSelect'].forEach(id => {
            const key = id.replace('Select', '').replace('job', '').toLowerCase() + 's';
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = appState.filters[key].map(opt => `<option value="${opt}">${opt}</option>`).join('');
            }
        });
    }

    function showAlert(message, type = 'success', duration = 3500) {
        const alertEl = document.getElementById('alertNotification');
        if (!alertEl) return;
        alertEl.textContent = message;
        alertEl.className = `alert-notification ${type} show`;
        setTimeout(() => alertEl.classList.remove('show'), duration);
    }
    
    // --- App Start ---
    loadData();
    populateSelects();
    renderAll();
    initializeEventListeners();
});