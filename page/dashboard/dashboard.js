document.addEventListener('DOMContentLoaded', () => {
    // Basic auth check (simulated) - In a real app, this would be more robust
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true'; // Assuming index.html sets this
    const currentAdmin = JSON.parse(localStorage.getItem('currentUser'));

    // For demo purposes, if not logged in, we'll use a default admin or show a message.
    // In a real app, you'd redirect:
    // if (!isAdminLoggedIn) {
    //     showAlert('الوصول مرفوض. يرجى تسجيل الدخول كمدير.', 'error');
    //     setTimeout(() => window.location.href = 'index.html', 2000);
    //     return;
    // }

    let appData = {
        jobs: [],
        applications: [],
        users: [],
        filters: {
            departments: ["تطوير البرمجيات", "التسويق", "المبيعات", "الموارد البشرية", "المالية", "الهندسة الطبية", "خدمة العملاء"],
            locations: ["الرياض", "جدة", "الدمام", "عن بُعد", "الخبر"],
            types: ["دوام كامل", "دوام جزئي", "تدريب", "مؤقت", "عقد محدد"]
        }
    };
    
    let charts = {}; // To store chart instances

    function loadData() {
        // Attempt to load from localStorage, otherwise use defaults
        appData.jobs = JSON.parse(localStorage.getItem('appState_jobs')) || [
            { id: 'J001', title: 'مطور واجهة أمامية أول', department: 'تطوير البرمجيات', location: 'الرياض', type: 'دوام كامل', datePosted: '2024-07-15', description: 'نبحث عن مطور واجهة أمامية محترف يتمتع بخبرة واسعة...', responsibilities: ['قيادة تصميم الواجهات', 'تحسين الأداء'], qualifications: ['5 سنوات خبرة', 'إتقان React'], skills: ['React', 'JavaScript', 'HTML', 'CSS'] },
            { id: 'J002', title: 'أخصائي تسويق رقمي', department: 'التسويق', location: 'جدة', type: 'دوام كامل', datePosted: '2024-07-20', description: 'مطلوب أخصائي تسويق رقمي مبدع...', responsibilities: ['إدارة الحملات', 'تحليل البيانات'], qualifications: ['3 سنوات خبرة', 'معرفة بـ Google Ads'], skills: ['SEO', 'SEM', 'Social Media'] },
            { id: 'J003', title: 'مهندس أجهزة طبية', department: 'الهندسة الطبية', location: 'الدمام', type: 'دوام كامل', datePosted: '2024-06-10', description: 'تصميم وتطوير أجهزة طبية مبتكرة.', responsibilities: ['التصميم بمساعدة الحاسوب (CAD)', 'الاختبار والتحقق من الصحة'], qualifications: ['بكالوريوس هندسة طبية', 'خبرة في SolidWorks'], skills: ['CAD', 'Embedded Systems', 'Prototyping'] }
        ];
        appData.applications = JSON.parse(localStorage.getItem('appState_applications')) || [
            { id: 'A001', applicantName: 'سارة خالد', applicantEmail: 'sara.k@email.com', jobId: 'J001', jobTitle: 'مطور واجهة أمامية أول', dateApplied: '2024-07-18', status: 'قيد المراجعة', resumeFile: 'sara_cv.pdf', experience: 4, applicantPhone: '0512345678', coverLetter: 'لدي شغف بتطوير الواجهات...' },
            { id: 'A002', applicantName: 'محمد عبدالله', applicantEmail: 'mo.abd@email.com', jobId: 'J002', jobTitle: 'أخصائي تسويق رقمي', dateApplied: '2024-07-22', status: 'تمت المقابلة', resumeFile: 'mo_cv.docx', experience: 2, applicantPhone: '0587654321', coverLetter: 'مهتم بالانضمام لفريقكم.'},
            { id: 'A003', applicantName: 'أحمد ياسر', applicantEmail: 'ahmad.y@email.com', jobId: 'J001', jobTitle: 'مطور واجهة أمامية أول', dateApplied: '2024-07-25', status: 'مقبول', resumeFile: 'ahmad_cv.pdf', experience: 6, applicantPhone: '0555555555', coverLetter: 'خبرة طويلة في المجال.' },
            { id: 'A004', applicantName: 'ليلى حسن', applicantEmail: 'laila.h@email.com', jobId: 'J003', jobTitle: 'مهندس أجهزة طبية', dateApplied: '2024-07-12', status: 'مرفوض', resumeFile: 'laila_cv.pdf', experience: 1, applicantPhone: '0567890123', coverLetter: 'حديثة التخرج وأبحث عن فرصة.' },
            { id: 'A005', applicantName: 'عمر فاروق', applicantEmail: 'omar.f@email.com', jobId: null, jobTitle: 'تقديم عام', dateApplied: '2024-07-28', status: 'تقديم عام محفوظ', resumeFile: 'omar_cv.pdf', experience: 5, applicantPhone: '0598765432', coverLetter: 'أبحث عن فرصة في مجال المبيعات أو التسويق.', desiredField: 'المبيعات' }
        ];
         appData.users = JSON.parse(localStorage.getItem('appState_users')) || [
            { id: 'U001', name: 'المدير العام', email: 'admin@login.com', phone: '0500000000', dateJoined: '2023-01-01', type: 'مدير', isAdmin: true },
            { id: 'U002', name: 'أحمد الموظف', email: 'ahmad@mays.com', phone: '0511111111', dateJoined: '2023-05-15', type: 'موظف', isAdmin: false }
        ];

        const adminUser = currentAdmin && currentAdmin.isAdmin ? currentAdmin : appData.users.find(u => u.isAdmin);
        if (adminUser) {
            document.getElementById('currentAdminName').textContent = adminUser.name;
        } else {
             document.getElementById('currentAdminName').textContent = "مدير النظام"; // Fallback
        }
    }
    
    function saveData(key, data) {
        localStorage.setItem(`appState_${key}`, JSON.stringify(data));
    }

    // Navigation
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const sections = document.querySelectorAll('.dashboard-section');

    function handleNavigation() {
        const hash = window.location.hash || '#overview';
        const targetSectionId = hash.substring(1);

        sections.forEach(section => section.classList.remove('active'));
        navLinks.forEach(link => link.classList.remove('active'));

        const activeSection = document.getElementById(targetSectionId);
        const activeLink = document.querySelector(`.nav-link[data-target="${targetSectionId}"]`);

        if (activeSection) activeSection.classList.add('active');
        if (activeLink) activeLink.classList.add('active');
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // e.preventDefault(); // Keep for actual navigation if not using hash
            const target = link.dataset.target;
            window.location.hash = target; // This will trigger hashchange or be handled by direct call
            handleNavigation();
        });
    });
    window.addEventListener('hashchange', handleNavigation);


    // Mobile Menu Toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }


    // Overview Rendering
    function renderOverview() {
        document.getElementById('totalJobsStat').textContent = appData.jobs.length;
        document.getElementById('totalApplicationsStat').textContent = appData.applications.length;
        document.getElementById('totalUsersStat').textContent = appData.users.length;
        document.getElementById('acceptedApplicationsStat').textContent = appData.applications.filter(app => app.status === 'مقبول').length;
        renderApplicationsStatusChart();
        renderJobsByDepartmentChart();
    }

    function renderApplicationsStatusChart() {
        const ctx = document.getElementById('applicationsStatusChart')?.getContext('2d');
        if (!ctx) return;

        const statusCounts = appData.applications.reduce((acc, app) => {
            acc[app.status] = (acc[app.status] || 0) + 1;
            return acc;
        }, {});

        if (charts.applicationsStatus) charts.applicationsStatus.destroy();
        charts.applicationsStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    label: 'الطلبات حسب الحالة',
                    data: Object.values(statusCounts),
                    backgroundColor: ['#3498db', '#f39c12', '#27ae60', '#e74c3c', '#9b59b6', '#34495e'],
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function renderJobsByDepartmentChart() {
        const ctx = document.getElementById('jobsByDepartmentChart')?.getContext('2d');
        if (!ctx) return;

        const departmentCounts = appData.jobs.reduce((acc, job) => {
            acc[job.department] = (acc[job.department] || 0) + 1;
            return acc;
        }, {});
        
        if (charts.jobsByDepartment) charts.jobsByDepartment.destroy();
        charts.jobsByDepartment = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(departmentCounts),
                datasets: [{
                    label: 'الوظائف حسب القسم',
                    data: Object.values(departmentCounts),
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }


    // Job Management
    const jobsTableBody = document.getElementById('jobsTable')?.querySelector('tbody');
    const jobModal = document.getElementById('jobModal');
    const jobForm = document.getElementById('jobForm');
    const jobModalTitle = document.getElementById('jobModalTitle');

    function renderJobsTable() {
        if (!jobsTableBody) return;
        jobsTableBody.innerHTML = '';
        appData.jobs.forEach(job => {
            const row = jobsTableBody.insertRow();
            row.innerHTML = `
                <td data-label="العنوان">${job.title}</td>
                <td data-label="القسم">${job.department}</td>
                <td data-label="الموقع">${job.location}</td>
                <td data-label="تاريخ النشر">${job.datePosted}</td>
                <td data-label="الإجراءات" class="action-buttons">
                    <button class="btn btn-warning btn-sm edit-job" data-id="${job.id}"><i class="fas fa-edit"></i> تعديل</button>
                    <button class="btn btn-danger btn-sm delete-job" data-id="${job.id}"><i class="fas fa-trash"></i> حذف</button>
                </td>
            `;
        });
        addJobActionListeners();
    }
    
    function addJobActionListeners() {
        document.querySelectorAll('.edit-job').forEach(button => {
            button.addEventListener('click', (e) => openJobModal(e.currentTarget.dataset.id));
        });
        document.querySelectorAll('.delete-job').forEach(button => {
            button.addEventListener('click', (e) => deleteJob(e.currentTarget.dataset.id));
        });
    }

    document.getElementById('addJobBtn')?.addEventListener('click', () => openJobModal());

    function openJobModal(jobId = null) {
        jobForm.reset();
        document.getElementById('jobId').value = '';
        if (jobId) {
            const job = appData.jobs.find(j => j.id === jobId);
            if (job) {
                jobModalTitle.textContent = 'تعديل وظيفة';
                document.getElementById('jobId').value = job.id;
                document.getElementById('jobTitle').value = job.title;
                document.getElementById('jobDepartment').value = job.department;
                document.getElementById('jobLocation').value = job.location;
                document.getElementById('jobType').value = job.type;
                document.getElementById('jobDescription').value = job.description;
                document.getElementById('jobResponsibilities').value = Array.isArray(job.responsibilities) ? job.responsibilities.join('\n') : '';
                document.getElementById('jobQualifications').value = Array.isArray(job.qualifications) ? job.qualifications.join('\n') : '';
                document.getElementById('jobSkills').value = Array.isArray(job.skills) ? job.skills.join(', ') : '';
            }
        } else {
            jobModalTitle.textContent = 'إضافة وظيفة جديدة';
        }
        jobModal.style.display = 'flex';
    }

    jobForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('jobId').value;
        const jobData = {
            title: document.getElementById('jobTitle').value,
            department: document.getElementById('jobDepartment').value,
            location: document.getElementById('jobLocation').value,
            type: document.getElementById('jobType').value,
            description: document.getElementById('jobDescription').value,
            responsibilities: document.getElementById('jobResponsibilities').value.split('\n').map(s=>s.trim()).filter(Boolean),
            qualifications: document.getElementById('jobQualifications').value.split('\n').map(s=>s.trim()).filter(Boolean),
            skills: document.getElementById('jobSkills').value.split(',').map(s=>s.trim()).filter(Boolean),
            datePosted: new Date().toISOString().split('T')[0]
        };

        if (id) { // Edit
            const index = appData.jobs.findIndex(j => j.id === id);
            appData.jobs[index] = { ...appData.jobs[index], ...jobData };
            showAlert('تم تحديث الوظيفة بنجاح!', 'success');
        } else { // Add
            jobData.id = 'J' + String(Date.now()).slice(-4); // Simple ID generation
            appData.jobs.push(jobData);
            showAlert('تمت إضافة الوظيفة بنجاح!', 'success');
        }
        saveData('jobs', appData.jobs);
        renderJobsTable();
        renderOverview(); // Update stats and charts
        closeModal(jobModal);
    });

    function deleteJob(jobId) {
        if (confirm('هل أنت متأكد من حذف هذه الوظيفة؟')) {
            appData.jobs = appData.jobs.filter(j => j.id !== jobId);
            saveData('jobs', appData.jobs);
            renderJobsTable();
            renderOverview(); // Update stats and charts
            showAlert('تم حذف الوظيفة.', 'success');
        }
    }


    // Application Management
    const applicationsTableBody = document.getElementById('applicationsTable')?.querySelector('tbody');
    const applicationDetailsModal = document.getElementById('applicationDetailsModal');
    const applicationStatusFilter = document.getElementById('applicationStatusFilter');
    const applicationSearchInput = document.getElementById('applicationSearchInput');

    function renderApplicationsTable(filterStatus = '', searchTerm = '') {
        if (!applicationsTableBody) return;
        applicationsTableBody.innerHTML = '';
        
        const filteredApplications = appData.applications.filter(app => {
            const statusMatch = !filterStatus || app.status === filterStatus;
            const searchMatch = !searchTerm || 
                                app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (app.jobTitle && app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()));
            return statusMatch && searchMatch;
        });

        filteredApplications.forEach(app => {
            const row = applicationsTableBody.insertRow();
            row.innerHTML = `
                <td data-label="المتقدم">${app.applicantName}<br><small>${app.applicantEmail}</small></td>
                <td data-label="الوظيفة">${app.jobTitle || 'N/A'}</td>
                <td data-label="تاريخ التقديم">${app.dateApplied}</td>
                <td data-label="الحالة">
                    <select class="action-select" data-id="${app.id}" onchange="updateApplicationStatus(this.dataset.id, this.value)">
                        <option value="قيد المراجعة" ${app.status === 'قيد المراجعة' ? 'selected' : ''}>قيد المراجعة</option>
                        <option value="تمت المقابلة" ${app.status === 'تمت المقابلة' ? 'selected' : ''}>تمت المقابلة</option>
                        <option value="مقبول" ${app.status === 'مقبول' ? 'selected' : ''}>مقبول</option>
                        <option value="مرفوض" ${app.status === 'مرفوض' ? 'selected' : ''}>مرفوض</option>
                        <option value="تقديم عام محفوظ" ${app.status === 'تقديم عام محفوظ' ? 'selected' : ''}>تقديم عام محفوظ</option>
                    </select>
                </td>
                <td data-label="الإجراءات" class="action-buttons">
                    <button class="btn btn-primary btn-sm view-application" data-id="${app.id}"><i class="fas fa-eye"></i> عرض</button>
                    <button class="btn btn-danger btn-sm delete-application" data-id="${app.id}"><i class="fas fa-trash"></i> حذف</button>
                </td>
            `;
        });
        addApplicationActionListeners();
    }
    
    applicationStatusFilter?.addEventListener('change', (e) => renderApplicationsTable(e.target.value, applicationSearchInput.value));
    applicationSearchInput?.addEventListener('input', (e) => renderApplicationsTable(applicationStatusFilter.value, e.target.value));


    window.updateApplicationStatus = function(appId, newStatus) { // Make it global for onchange
        const app = appData.applications.find(a => a.id === appId);
        if (app) {
            app.status = newStatus;
            saveData('applications', appData.applications);
            showAlert(`تم تحديث حالة طلب ${app.applicantName}.`, 'success');
            renderOverview(); // Update stats and charts
        }
    }
    
    function addApplicationActionListeners() {
         document.querySelectorAll('.view-application').forEach(button => {
            button.addEventListener('click', (e) => viewApplicationDetails(e.currentTarget.dataset.id));
        });
        document.querySelectorAll('.delete-application').forEach(button => {
            button.addEventListener('click', (e) => deleteApplication(e.currentTarget.dataset.id));
        });
    }

    function viewApplicationDetails(appId) {
        const app = appData.applications.find(a => a.id === appId);
        if (app) {
            const contentDiv = document.getElementById('applicationDetailsContent');
            contentDiv.innerHTML = `
                <div class="detail-section">
                    <p><strong>اسم المتقدم:</strong> ${app.applicantName}</p>
                    <p><strong>البريد الإلكتروني:</strong> ${app.applicantEmail}</p>
                    <p><strong>رقم الهاتف:</strong> ${app.applicantPhone || 'غير متوفر'}</p>
                </div>
                <div class="detail-section">
                    <p><strong>الوظيفة المطلوبة:</strong> ${app.jobTitle || (app.jobId ? 'وظيفة محذوفة' : 'تقديم عام')}</p>
                    ${app.jobId === null && app.desiredField ? `<p><strong>مجال الاهتمام:</strong> ${app.desiredField}</p>` : ''}
                    <p><strong>تاريخ التقديم:</strong> ${app.dateApplied}</p>
                    <p><strong>الحالة الحالية:</strong> ${app.status}</p>
                </div>
                <div class="detail-section">
                    <p><strong>سنوات الخبرة:</strong> ${app.experience !== undefined ? app.experience : 'غير محدد'}</p>
                    <p><strong>ملف السيرة الذاتية:</strong> ${app.resumeFile || 'غير متوفر'} 
                        ${app.resumeFile && app.resumeFile !=='N/A' ? `<a href="#" onclick="alert('محاكاة تنزيل: ${app.resumeFile}')" class="btn btn-light btn-sm" style="margin-right:10px;"><i class="fas fa-download"></i></a>` : ''}
                    </p>
                </div>
                <div class="detail-section">
                    <p><strong>رسالة تعريفية / نبذة:</strong></p>
                    <p style="white-space: pre-wrap;">${app.coverLetter || (app.bio) || 'لا يوجد'}</p>
                </div>
            `;
            applicationDetailsModal.style.display = 'flex';
        }
    }
    
    function deleteApplication(appId) {
        if (confirm('هل أنت متأكد من حذف طلب التوظيف هذا؟')) {
            appData.applications = appData.applications.filter(a => a.id !== appId);
            saveData('applications', appData.applications);
            renderApplicationsTable(applicationStatusFilter.value, applicationSearchInput.value);
            renderOverview(); // Update stats
            showAlert('تم حذف طلب التوظيف.', 'success');
        }
    }


    // User Management
    const usersTableBody = document.getElementById('usersTable')?.querySelector('tbody');
    function renderUsersTable() {
        if (!usersTableBody) return;
        usersTableBody.innerHTML = '';
        appData.users.forEach(user => {
            const row = usersTableBody.insertRow();
            row.innerHTML = `
                <td data-label="الاسم">${user.name}</td>
                <td data-label="البريد">${user.email}</td>
                <td data-label="الهاتف">${user.phone || 'N/A'}</td>
                <td data-label="تاريخ الانضمام">${user.dateJoined}</td>
                <td data-label="النوع">${user.type} ${user.isAdmin ? '(مدير)' : ''}</td>
                <td data-label="الإجراءات" class="action-buttons">
                    ${!user.isAdmin ? `<button class="btn btn-danger btn-sm delete-user" data-id="${user.id}"><i class="fas fa-trash"></i> حذف</button>` : '<span class="text-muted">لا يمكن الحذف</span>'}
                </td>
            `;
        });
        addUserActionListeners();
    }
    
    function addUserActionListeners() {
        document.querySelectorAll('.delete-user').forEach(button => {
            button.addEventListener('click', (e) => deleteUser(e.currentTarget.dataset.id));
        });
    }

    function deleteUser(userId) {
        if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
            appData.users = appData.users.filter(u => u.id !== userId);
            saveData('users', appData.users);
            renderUsersTable();
            renderOverview(); // Update stats
            showAlert('تم حذف المستخدم.', 'success');
        }
    }


    // Modal Closing
    document.querySelectorAll('.modal .close-button').forEach(button => {
        button.addEventListener('click', () => {
            closeModal(document.getElementById(button.dataset.modalId) || button.closest('.modal'));
        });
    });
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target);
        }
    });
    function closeModal(modalElement) {
        if (modalElement) modalElement.style.display = 'none';
    }


    // Helper: Populate Select Options
    function populateSelectWithOptions(selectId, optionsArray) {
        const selectElement = document.getElementById(selectId);
        if (selectElement) {
            optionsArray.forEach(opt => {
                selectElement.add(new Option(opt, opt));
            });
        }
    }

    // Helper: Show Alert/Notification
    const alertElement = document.getElementById('alertNotification');
    let alertTimeout;
    function showAlert(message, type = 'success') {
        if (!alertElement) return;
        clearTimeout(alertTimeout);
        alertElement.textContent = message;
        alertElement.className = `alert-notification ${type}`; // Reset classes
        alertElement.classList.add('show');
        alertTimeout = setTimeout(() => {
            alertElement.classList.remove('show');
        }, 3000);
    }

    // Initial Load
    loadData();
    populateSelectWithOptions('jobDepartment', appData.filters.departments);
    populateSelectWithOptions('jobLocation', appData.filters.locations);
    populateSelectWithOptions('jobType', appData.filters.types);
    
    renderOverview();
    renderJobsTable();
    renderApplicationsTable(); // Initial render for applications
    renderUsersTable();
    handleNavigation(); // Set initial active tab and content
});