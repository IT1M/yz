       // --- Global State & Mock Data ---
        let appState = {
            currentUser: null, // { id, name, email, isAdmin }
            jobs: [],
            applications: [],
            users: [],
            chat: {
                mode: 'text', // 'text' or 'voice'
                isVoiceListening: false,
                messages: [],
                aiIsTyping: false
            },
            admin: {
                activeTab: 'adminJobsContent',
                editingJobId: null
            },
            filters: {
                departments: ["تطوير البرمجيات", "التسويق", "المبيعات", "الموارد البشرية", "المالية", "الهندسة الطبية", "خدمة العملاء"],
                locations: ["الرياض", "جدة", "الدمام", "عن بُعد", "الخبر"],
                types: ["دوام كامل", "دوام جزئي", "تدريب", "مؤقت", "عقد محدد"]
            }
        };

        // Gemini API Key - تنبيه: لا تضع مفتاح حقيقي هنا في الإنتاج!
        // استخدم هذا المفتاح للمساعد الذكي. لابد من استبداله أو حمايته في بيئة الإنتاج.
        const GEMINI_API_KEY_FOR_CHATBOT = "AIzaSyCV3Kb2rHMQoyAiYkrAFA82UlcGbYAAC0M"; // استبدل بمفتاحك إذا أردت اختبار حقيقي

        let speechRecognitionInstance = null;

        // --- Initialization ---
        document.addEventListener('DOMContentLoaded', function() {
            loadInitialData();
            renderJobsGrid();
            populateFilterDropdowns();
            initializeSpeechRecognitionAPI();
            updateUserMenuDisplay();
            setupAdminTabs();
            
            // Add smooth scroll to nav links
            document.querySelectorAll('.nav-menu a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    const targetId = this.getAttribute('href');
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });

            // Header scroll effect
            const header = document.querySelector('.header');
            window.addEventListener('scroll', function() {
                if (window.scrollY > 50) { // تغيير طفيف في الارتفاع
                    header.style.backgroundColor = 'rgba(31, 58, 85, 0.97)'; // أكثر شفافية قليلاً
                    header.style.boxShadow = '0 6px 15px rgba(0,0,0,0.2)';
                } else {
                    header.style.background = 'linear-gradient(135deg, #1F3A55, #3498db)';
                    header.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }
            });
        });

        function loadInitialData() {
            // Sample Jobs Data
            appState.jobs = [
                { id: 'J001', title: 'مطور واجهة أمامية أول (Senior Frontend Developer)', department: 'تطوير البرمجيات', location: 'الرياض', type: 'دوام كامل', datePosted: '2024-07-15', description: 'نبحث عن مطور واجهة أمامية محترف يتمتع بخبرة واسعة في بناء تطبيقات ويب تفاعلية باستخدام أحدث التقنيات. ستكون مسؤولاً عن قيادة تطوير الواجهات الأمامية، وضمان جودة الكود، والتعاون مع فرق التصميم والـ backend.', responsibilities: ['قيادة تصميم وتنفيذ واجهات مستخدم متقدمة.', 'تحسين أداء وسرعة تحميل التطبيقات.', 'كتابة كود نظيف، قابل للصيانة، وموثق بشكل جيد.', 'مراجعة كود الزملاء وتقديم التوجيه.', 'البقاء على اطلاع بأحدث اتجاهات وتقنيات تطوير الواجهات الأمامية.'], qualifications: ['خبرة لا تقل عن 5 سنوات في تطوير الواجهات الأمامية.', 'إتقان HTML5, CSS3, JavaScript (ES6+).', 'خبرة عميقة في أحد أطر العمل الحديثة مثل React, Angular, أو Vue.js (نفضل React).', 'فهم جيد لـ RESTful APIs والتفاعل معها.', 'خبرة في أدوات بناء واختبار الواجهات الأمامية.'], skills: ['React', 'JavaScript', 'TypeScript', 'HTML5', 'CSS3/SASS', 'Redux/Context API', 'Git', 'Agile', 'Problem Solving'] },
                { id: 'J002', title: 'أخصائي تسويق رقمي', department: 'التسويق', location: 'جدة', type: 'دوام كامل', datePosted: '2024-07-20', description: 'مطلوب أخصائي تسويق رقمي مبدع لإدارة وتطوير استراتيجيات التسويق الرقمي للشركة، بما في ذلك إدارة الحملات الإعلانية، تحسين محركات البحث (SEO)، والتسويق عبر وسائل التواصل الاجتماعي.', responsibilities: ['تخطيط وتنفيذ جميع حملات التسويق الرقمي.', 'إدارة ميزانية التسويق الرقمي وتحقيق أفضل عائد على الاستثمار.', 'تحليل أداء الحملات وتقديم تقارير دورية.', 'تحسين ترتيب الموقع في محركات البحث (SEO).', 'إدارة وتنمية حسابات الشركة على وسائل التواصل الاجتماعي.'], qualifications: ['شهادة جامعية في التسويق، إدارة الأعمال، أو مجال ذي صلة.', 'خبرة عملية لا تقل عن 3 سنوات في التسويق الرقمي.', 'معرفة قوية بـ Google Ads, Google Analytics, SEO/SEM, Social Media Marketing.', 'قدرة على تحليل البيانات واستخلاص رؤى قابلة للتنفيذ.'], skills: ['Digital Marketing', 'SEO', 'SEM', 'Social Media', 'Google Analytics', 'Content Creation', 'Email Marketing'] },
                { id: 'J003', title: 'مهندس أجهزة طبية مبتدئ', department: 'الهندسة الطبية', location: 'الدمام', type: 'تدريب', datePosted: '2024-07-25', description: 'فرصة تدريب للخريجين الجدد في مجال الهندسة الطبية للمساهمة في تصميم واختبار أجهزة طبية مبتكرة تحت إشراف فريق من المهندسين الخبراء.', responsibilities: ['المساعدة في تصميم وتطوير نماذج أولية للأجهزة الطبية.', 'إجراء الاختبارات والفحوصات على الأجهزة.', 'توثيق نتائج الاختبارات والمساهمة في إعداد التقارير الفنية.', 'الالتزام بمعايير الجودة والسلامة.'], qualifications: ['حديث التخرج بدرجة البكالوريوس في الهندسة الطبية أو هندسة الإلكترونيات/الميكانيكا.', 'شغف بمجال الأجهزة الطبية والابتكار.', 'قدرة على التعلم السريع والعمل ضمن فريق.', 'مهارات تواصل جيدة باللغتين العربية والإنجليزية.'], skills: ['CAD (SolidWorks/AutoCAD)', 'Microcontrollers (Arduino/Raspberry Pi - Plus)', 'Problem Solving', 'Teamwork', 'Technical Writing'] },
                { id: 'J004', title: 'مسؤول موارد بشرية', department: 'الموارد البشرية', location: 'الرياض', type: 'دوام جزئي', datePosted: '2024-07-18', description: 'نبحث عن مسؤول موارد بشرية بدوام جزئي للمساعدة في عمليات التوظيف، وإدارة شؤون الموظفين، والمساهمة في تطوير بيئة عمل إيجابية.', responsibilities: ['المساعدة في عملية التوظيف من فرز السير الذاتية إلى جدولة المقابلات.', 'إعداد عقود العمل والوثائق المتعلقة بالموظفين.', 'الرد على استفسارات الموظفين.', 'المساهمة في تنظيم فعاليات الشركة.'], qualifications: ['خبرة سنة على الأقل في مجال الموارد البشرية أو مجال مشابه.', 'معرفة جيدة بقانون العمل السعودي.', 'مهارات تنظيمية وتواصل ممتازة.', 'إتقان استخدام برامج Microsoft Office.'], skills: ['HR Administration', 'Recruitment Support', 'Communication Skills', 'Organizational Skills', 'Saudi Labor Law'] }
            ];
            // Sample Users Data
            appState.users = [
                { id: 'U001', name: 'المدير العام', email: 'admin@login.com', phone: '0500000000', dateJoined: '2023-01-01', type: 'مدير', passwordHash: 'admin13579' /* For demo only, never store plain passwords */ },
                { id: 'U002', name: 'أحمد الموظف', email: 'ahmad@mays.com', phone: '0511111111', dateJoined: '2023-05-15', type: 'موظف', passwordHash: 'password123' }
            ];
            // Sample Applications Data
            appState.applications = [
                { id: 'A001', applicantName: 'سارة خالد', applicantEmail: 'sara.k@email.com', jobId: 'J001', jobTitle: appState.jobs.find(j=>j.id==='J001')?.title, dateApplied: '2024-07-18', status: 'قيد المراجعة', resumeFile: 'sara_cv.pdf', experience: 4 },
                { id: 'A002', applicantName: 'محمد عبدالله', applicantEmail: 'mo.abd@email.com', jobId: 'J002', jobTitle: appState.jobs.find(j=>j.id==='J002')?.title, dateApplied: '2024-07-22', status: 'تمت المقابلة', resumeFile: 'mo_cv.docx', experience: 2 }
            ];
        }

        // --- UI Rendering & Updates ---
        function renderJobsGrid() {
            const jobsGridContainer = document.getElementById('jobsGridContainer');
            const noJobsMessage = document.getElementById('noJobsMessage');
            jobsGridContainer.innerHTML = ''; // Clear previous jobs

            const departmentFilter = document.getElementById('departmentFilter').value;
            const locationFilter = document.getElementById('locationFilter').value;
            const typeFilter = document.getElementById('typeFilter').value;

            const filteredJobs = appState.jobs.filter(job =>
                (!departmentFilter || job.department === departmentFilter) &&
                (!locationFilter || job.location === locationFilter) &&
                (!typeFilter || job.type === typeFilter)
            );

            if (filteredJobs.length === 0) {
                noJobsMessage.style.display = 'block';
                return;
            }
            noJobsMessage.style.display = 'none';

            filteredJobs.forEach(job => {
                const card = document.createElement('div');
                card.className = 'job-card';
                card.innerHTML = `
                    <h3 class="job-title">${job.title}</h3>
                    <div class="job-department">${job.department}</div>
                    <div class="job-details">
                        <span class="job-detail"><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                        <span class="job-detail"><i class="fas fa-briefcase"></i> ${job.type}</span>
                    </div>
                    <p class="job-description-snippet">${job.description.substring(0, 120)}...</p>
                    <div class="job-actions">
                        <button class="details-btn" onclick="openJobDetailsModal('${job.id}')">عرض التفاصيل</button>
                        <button class="apply-btn" onclick="openJobApplicationModal('${job.id}')">قدم الآن</button>
                    </div>
                `;
                jobsGridContainer.appendChild(card);
            });
        }

        function populateFilterDropdowns() {
            const depFilter = document.getElementById('departmentFilter');
            const locFilter = document.getElementById('locationFilter');
            const typeFilter = document.getElementById('typeFilter');

            appState.filters.departments.forEach(dep => depFilter.add(new Option(dep, dep)));
            appState.filters.locations.forEach(loc => locFilter.add(new Option(loc, loc)));
            appState.filters.types.forEach(type => typeFilter.add(new Option(type, type)));

            const generalDesiredField = document.getElementById('generalDesiredFieldSelect');
            appState.filters.departments.forEach(dep => generalDesiredField.add(new Option(dep, dep)));
            generalDesiredField.add(new Option('أخرى', 'أخرى'));


            const adminJobDepartment = document.getElementById('adminJobDepartmentSelect');
            const adminJobLocation = document.getElementById('adminJobLocationSelect');
            const adminJobType = document.getElementById('adminJobTypeSelect');

            appState.filters.departments.forEach(dep => adminJobDepartment.add(new Option(dep, dep)));
            appState.filters.locations.forEach(loc => adminJobLocation.add(new Option(loc, loc)));
            appState.filters.types.forEach(type => adminJobType.add(new Option(type, type)));
        }

        function filterJobsDisplay() { // Renamed from filterJobs to avoid conflict
            renderJobsGrid();
        }
        
        function updateUserMenuDisplay() {
            const dropdown = document.getElementById('userDropdown');
            const userIcon = document.querySelector('.user-icon');

            if (appState.currentUser) {
                userIcon.classList.remove('fa-user-circle'); // Remove default
                userIcon.classList.add('fa-user-check'); // Icon for logged-in user
                userIcon.style.color = '#2ecc71'; // Green color for logged in

                dropdown.innerHTML = `
                    <div style="padding: 1rem; border-bottom: 1px solid #eee; text-align: center;">
                        <strong>${appState.currentUser.name}</strong><br>
                        <small>${appState.currentUser.email}</small>
                    </div>
                    ${appState.currentUser.isAdmin ? '<a href="#" onclick="toggleAdminDashboard()">لوحة التحكم</a>' : ''}
                    <a href="#" onclick="userLogout()">تسجيل الخروج</a>
                `;
            } else {
                userIcon.classList.add('fa-user-circle');
                userIcon.classList.remove('fa-user-check');
                userIcon.style.color = 'white'; // Default color

                dropdown.innerHTML = `
                    <a href="#" onclick="showLoginModal()">تسجيل الدخول</a>
                    <a href="#" onclick="showRegisterModal()">إنشاء حساب جديد</a>
                `;
            }
        }


        // --- Modal Handling ---
        let activeModalId = null;
        function openModal(modalId) {
            closeActiveModal(); // Close any other open modal first
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('show');
                activeModalId = modalId;
                document.body.style.overflow = 'hidden'; // Prevent background scroll
            }
        }

        function closeActiveModal() {
            if (activeModalId) {
                const modal = document.getElementById(activeModalId);
                if (modal) {
                    modal.classList.remove('show');
                }
                activeModalId = null;
                document.body.style.overflow = 'auto'; // Restore scroll
            }
        }
         // Close modal on escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === "Escape" && activeModalId) {
                closeActiveModal();
            }
        });
        // Close modal on overlay click
        window.addEventListener('click', function(event) {
            if (activeModalId && event.target.classList.contains('modal') && event.target.id === activeModalId) {
                 closeActiveModal();
            }
        });


        function showLoginModal() { openModal('loginModalContainer'); }
        function showRegisterModal() { openModal('registerModalContainer'); }
        function showRegisterModalFromLogin() { closeActiveModal(); setTimeout(showRegisterModal, 300); }
        function showLoginModalFromRegister() { closeActiveModal(); setTimeout(showLoginModal, 300); }


        function openJobDetailsModal(jobId) {
            const job = appState.jobs.find(j => j.id === jobId);
            if (!job) return;
            document.getElementById('jobDetailsModalTitle').textContent = job.title;
            const contentDiv = document.getElementById('jobDetailsModalContent');
            contentDiv.innerHTML = `
                <p><strong>القسم:</strong> ${job.department}</p>
                <p><strong>الموقع:</strong> ${job.location}</p>
                <p><strong>نوع الدوام:</strong> ${job.type}</p>
                <hr style="margin: 1rem 0;">
                <h4>الوصف الوظيفي:</h4>
                <p style="white-space: pre-wrap;">${job.description}</p>
                <h4 style="margin-top:1rem;">المسؤوليات:</h4>
                <ul style="padding-right: 20px;">${job.responsibilities.map(r => `<li>${r}</li>`).join('')}</ul>
                <h4 style="margin-top:1rem;">المؤهلات:</h4>
                <ul style="padding-right: 20px;">${job.qualifications.map(q => `<li>${q}</li>`).join('')}</ul>
                <h4 style="margin-top:1rem;">المهارات المطلوبة:</h4>
                <p>${job.skills.join(', ')}</p>
                <div style="margin-top: 2rem; text-align: center;">
                    <button class="cta-button" onclick="openJobApplicationModal('${job.id}'); closeActiveModal();">
                        <i class="fas fa-paper-plane"></i> قدم على هذه الوظيفة
                    </button>
                </div>
            `;
            openModal('jobDetailsModalContainer');
        }

        function openJobApplicationModal(jobId) {
            const job = appState.jobs.find(j => j.id === jobId);
            if (!job) return;
            document.getElementById('jobApplicationModalTitle').querySelector('span').textContent = job.title;
            document.getElementById('applicationJobIdInput').value = jobId;
            // Pre-fill with user data if logged in
            if (appState.currentUser) {
                document.getElementById('applyNameInput').value = appState.currentUser.name || '';
                document.getElementById('applyEmailInput').value = appState.currentUser.email || '';
                document.getElementById('applyPhoneInput').value = appState.currentUser.phone || '';
            } else {
                document.getElementById('jobApplicationFormElement').reset();
            }
            openModal('jobApplicationModalContainer');
        }

        function showGeneralApplicationModal() {
             if (appState.currentUser) {
                document.getElementById('generalApplyNameInput').value = appState.currentUser.name || '';
                document.getElementById('generalApplyEmailInput').value = appState.currentUser.email || '';
                document.getElementById('generalApplyPhoneInput').value = appState.currentUser.phone || '';
            } else {
                document.getElementById('generalApplicationFormElement').reset();
            }
            openModal('generalApplicationModalContainer');
        }


        // --- User Actions ---
        function toggleUserMenu() {
            document.getElementById('userDropdown').classList.toggle('show');
        }

        function handleUserLogin(event) {
            event.preventDefault();
            const email = document.getElementById('loginEmailInput').value;
            const password = document.getElementById('loginPasswordInput').value;

            // Admin login
            if (email === 'admin@login.com' && password === 'admin13579') {
                appState.currentUser = appState.users.find(u => u.email === email && u.passwordHash === password) || // Check if admin exists in users array
                                      { id:'ADMIN_ID', name: 'المدير العام', email: email, isAdmin: true, phone:'N/A', dateJoined:'N/A', type:'مدير' };
                if (!appState.users.find(u => u.email === email)) appState.users.push(appState.currentUser); // Add if not present
                
                displayAlert('تم تسجيل الدخول كمدير بنجاح!', 'success');
                closeActiveModal();
                updateUserMenuDisplay();
                toggleAdminDashboard(true); // Show admin panel
                return;
            }
            // Regular user login (mock)
            const user = appState.users.find(u => u.email === email && u.passwordHash === password);
            if (user) {
                appState.currentUser = { ...user, isAdmin: false }; // Ensure isAdmin is false for regular users
                displayAlert('تم تسجيل الدخول بنجاح!', 'success');
                closeActiveModal();
                updateUserMenuDisplay();
                toggleAdminDashboard(false); // Ensure admin panel is hidden
            } else {
                displayAlert('بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.', 'error');
            }
        }

        function handleUserRegister(event) {
            event.preventDefault();
            const name = document.getElementById('registerNameInput').value;
            const email = document.getElementById('registerEmailInput').value;
            const phone = document.getElementById('registerPhoneInput').value;
            const password = document.getElementById('registerPasswordInput').value;
            const confirmPassword = document.getElementById('confirmPasswordInput').value;

            if (password !== confirmPassword) {
                displayAlert('كلمتا المرور غير متطابقتين!', 'error'); return;
            }
            if (appState.users.find(u => u.email === email)) {
                displayAlert('هذا البريد الإلكتروني مسجل مسبقاً!', 'error'); return;
            }

            const newUser = {
                id: 'U' + String(appState.users.length + 1).padStart(3, '0'),
                name: name, email: email, phone: phone,
                dateJoined: new Date().toISOString().split('T')[0],
                type: 'مستخدم', passwordHash: password, // Store password (hashed in real app)
                isAdmin: false
            };
            appState.users.push(newUser);
            appState.currentUser = newUser;
            displayAlert('تم إنشاء حسابك بنجاح! مرحباً بك.', 'success');
            closeActiveModal();
            updateUserMenuDisplay();
            renderAdminUsersTable(); // Update admin table if admin is viewing
        }

        function userLogout() {
            appState.currentUser = null;
            displayAlert('تم تسجيل الخروج بنجاح.', 'success');
            updateUserMenuDisplay();
            toggleAdminDashboard(false); // Hide admin panel on logout
            toggleUserMenu(); // Close dropdown
        }


        // --- Job Application Handling ---
        function handleSpecificJobApplication(event) {
            event.preventDefault();
            const jobId = document.getElementById('applicationJobIdInput').value;
            const job = appState.jobs.find(j => j.id === jobId);
            const applicationData = {
                id: 'A' + String(appState.applications.length + 1).padStart(3, '0'),
                applicantName: document.getElementById('applyNameInput').value,
                applicantEmail: document.getElementById('applyEmailInput').value,
                applicantPhone: document.getElementById('applyPhoneInput').value,
                experience: document.getElementById('applyExperienceInput').value,
                coverLetter: document.getElementById('applyCoverLetterTextarea').value,
                resumeFile: document.getElementById('applyResumeFileInput').files[0]?.name || 'N/A',
                jobId: jobId,
                jobTitle: job ? job.title : 'N/A',
                dateApplied: new Date().toISOString().split('T')[0],
                status: 'قيد المراجعة'
            };
            appState.applications.push(applicationData);
            displayAlert('تم إرسال طلب التوظيف بنجاح! سيتم التواصل معك قريباً.', 'success');
            closeActiveModal();
            renderAdminApplicationsTable();
            event.target.reset();
        }

        function handleGeneralCvSubmission(event) {
            event.preventDefault();
             const generalApplicationData = {
                id: 'GA' + String(appState.applications.filter(a=>a.id.startsWith("GA")).length + 1).padStart(3, '0'),
                applicantName: document.getElementById('generalApplyNameInput').value,
                applicantEmail: document.getElementById('generalApplyEmailInput').value,
                applicantPhone: document.getElementById('generalApplyPhoneInput').value,
                desiredField: document.getElementById('generalDesiredFieldSelect').value,
                experience: document.getElementById('generalApplyExperienceInput').value,
                bio: document.getElementById('generalApplyBioTextarea').value,
                resumeFile: document.getElementById('generalApplyResumeFileInput').files[0]?.name || 'N/A',
                jobId: null, // General application
                jobTitle: 'تقديم عام',
                dateApplied: new Date().toISOString().split('T')[0],
                status: 'تقديم عام محفوظ'
            };
            appState.applications.push(generalApplicationData); // Add to same applications list or a different one
            displayAlert('تم إرسال سيرتك الذاتية بنجاح! سنقوم بمراجعتها والتواصل معك عند توفر فرصة مناسبة.', 'success');
            closeActiveModal();
            renderAdminApplicationsTable(); // Update admin view
            event.target.reset();
        }

        // --- Admin Panel Logic ---
        function toggleAdminDashboard(forceShow = null) {
            const adminPanel = document.getElementById('adminDashboardPanel');
            if (forceShow === true) {
                adminPanel.style.display = 'block';
                renderAdminData();
            } else if (forceShow === false) {
                adminPanel.style.display = 'none';
            } else { // Toggle
                adminPanel.style.display = adminPanel.style.display === 'none' ? 'block' : 'none';
                if (adminPanel.style.display === 'block') renderAdminData();
            }
        }

        function setupAdminTabs() {
            document.querySelectorAll('.admin-tab').forEach(tabButton => {
                tabButton.addEventListener('click', function() {
                    document.querySelectorAll('.admin-tab').forEach(btn => btn.classList.remove('active'));
                    document.querySelectorAll('.admin-content').forEach(content => content.classList.remove('active'));
                    this.classList.add('active');
                    document.getElementById(this.dataset.tab).classList.add('active');
                    appState.admin.activeTab = this.dataset.tab;
                    renderAdminData(); // Re-render data for the activated tab
                });
            });
        }

        function renderAdminData() {
            if (!appState.currentUser || !appState.currentUser.isAdmin) return;
            if (document.getElementById('adminDashboardPanel').style.display === 'none') return;

            if (appState.admin.activeTab === 'adminJobsContent') renderAdminJobsTable();
            else if (appState.admin.activeTab === 'adminApplicationsContent') renderAdminApplicationsTable();
            else if (appState.admin.activeTab === 'adminUsersContent') renderAdminUsersTable();
            else if (appState.admin.activeTab === 'adminAnalyticsContent') renderAdminAnalytics();
        }

        function renderAdminJobsTable() {
            const tbody = document.getElementById('adminJobsTableBody');
            tbody.innerHTML = '';
            appState.jobs.forEach(job => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${job.title}</td>
                    <td>${job.department}</td>
                    <td>${job.location}</td>
                    <td>${job.datePosted}</td>
                    <td>
                        <button class="action-btn edit-btn" onclick="openEditJobModal('${job.id}')">تعديل</button>
                        <button class="action-btn delete-btn" onclick="adminDeleteJob('${job.id}')">حذف</button>
                    </td>`;
            });
        }
        
        function openAddJobModal() {
            document.getElementById('addEditJobModalTitle').textContent = 'إضافة وظيفة جديدة';
            document.getElementById('addEditJobSubmitBtn').textContent = 'إضافة الوظيفة';
            document.getElementById('addEditJobFormElement').reset();
            appState.admin.editingJobId = null;
            openModal('addEditJobModalContainer');
        }

        function openEditJobModal(jobId) {
            const job = appState.jobs.find(j => j.id === jobId);
            if (!job) return;
            appState.admin.editingJobId = jobId;
            document.getElementById('addEditJobModalTitle').textContent = 'تعديل وظيفة';
            document.getElementById('addEditJobSubmitBtn').textContent = 'حفظ التعديلات';
            
            document.getElementById('adminJobTitleInput').value = job.title;
            document.getElementById('adminJobDepartmentSelect').value = job.department;
            document.getElementById('adminJobLocationSelect').value = job.location;
            document.getElementById('adminJobTypeSelect').value = job.type;
            document.getElementById('adminJobDescriptionTextarea').value = job.description;
            document.getElementById('adminJobResponsibilitiesTextarea').value = Array.isArray(job.responsibilities) ? job.responsibilities.join('\n') : job.responsibilities;
            document.getElementById('adminJobQualificationsTextarea').value = Array.isArray(job.qualifications) ? job.qualifications.join('\n') : job.qualifications;
            document.getElementById('adminJobSkillsTextarea').value = Array.isArray(job.skills) ? job.skills.join(', ') : job.skills;

            openModal('addEditJobModalContainer');
        }

        function handleAdminAddEditJob(event) {
            event.preventDefault();
            const title = document.getElementById('adminJobTitleInput').value;
            const department = document.getElementById('adminJobDepartmentSelect').value;
            const location = document.getElementById('adminJobLocationSelect').value;
            const type = document.getElementById('adminJobTypeSelect').value;
            const description = document.getElementById('adminJobDescriptionTextarea').value;
            const responsibilities = document.getElementById('adminJobResponsibilitiesTextarea').value.split('\n').map(s=>s.trim()).filter(Boolean);
            const qualifications = document.getElementById('adminJobQualificationsTextarea').value.split('\n').map(s=>s.trim()).filter(Boolean);
            const skills = document.getElementById('adminJobSkillsTextarea').value.split(',').map(s=>s.trim()).filter(Boolean);

            if (appState.admin.editingJobId) { // Editing existing job
                const jobIndex = appState.jobs.findIndex(j => j.id === appState.admin.editingJobId);
                if (jobIndex > -1) {
                    appState.jobs[jobIndex] = { ...appState.jobs[jobIndex], title, department, location, type, description, responsibilities, qualifications, skills };
                    displayAlert('تم تحديث الوظيفة بنجاح!', 'success');
                }
            } else { // Adding new job
                const newJob = {
                    id: 'J' + String(appState.jobs.length + 1).padStart(3, '0'),
                    title, department, location, type, description, responsibilities, qualifications, skills,
                    datePosted: new Date().toISOString().split('T')[0]
                };
                appState.jobs.push(newJob);
                displayAlert('تمت إضافة الوظيفة بنجاح!', 'success');
            }
            renderJobsGrid(); // Update public jobs list
            renderAdminJobsTable(); // Update admin jobs table
            closeActiveModal();
            event.target.reset();
            appState.admin.editingJobId = null;
        }


        function adminDeleteJob(jobId) {
            if (confirm('هل أنت متأكد من حذف هذه الوظيفة بشكل دائم؟')) {
                appState.jobs = appState.jobs.filter(j => j.id !== jobId);
                renderJobsGrid();
                renderAdminJobsTable();
                displayAlert('تم حذف الوظيفة بنجاح.', 'success');
            }
        }
        
        function renderAdminApplicationsTable() {
            const tbody = document.getElementById('adminApplicationsTableBody');
            tbody.innerHTML = '';
            appState.applications.forEach(app => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${app.applicantName} (${app.applicantEmail})</td>
                    <td>${app.jobTitle}</td>
                    <td>${app.dateApplied}</td>
                    <td>
                        <select onchange="updateApplicationStatus('${app.id}', this.value)">
                            <option value="قيد المراجعة" ${app.status === 'قيد المراجعة' ? 'selected' : ''}>قيد المراجعة</option>
                            <option value="تمت المقابلة" ${app.status === 'تمت المقابلة' ? 'selected' : ''}>تمت المقابلة</option>
                            <option value="مقبول" ${app.status === 'مقبول' ? 'selected' : ''}>مقبول</option>
                            <option value="مرفوض" ${app.status === 'مرفوض' ? 'selected' : ''}>مرفوض</option>
                        </select>
                    </td>
                    <td>
                        <button class="action-btn delete-btn" onclick="adminDeleteApplication('${app.id}')">حذف</button>
                        ${app.resumeFile !== 'N/A' ? `<a href="#" onclick="alert('عرض السيرة الذاتية لـ ${app.applicantName}')" class="action-btn edit-btn" style="text-decoration:none; display:inline-block;">عرض CV</a>` : ''}
                    </td>`;
            });
        }

        function updateApplicationStatus(appId, newStatus) {
            const app = appState.applications.find(a => a.id === appId);
            if (app) {
                app.status = newStatus;
                displayAlert(`تم تحديث حالة طلب ${app.applicantName} إلى ${newStatus}.`, 'success');
                // No need to call renderAdminApplicationsTable() again as the select itself changed.
                // If other parts of the row need update, then call it.
            }
        }
        function adminDeleteApplication(appId) {
             if (confirm('هل أنت متأكد من حذف طلب التوظيف هذا؟')) {
                appState.applications = appState.applications.filter(a => a.id !== appId);
                renderAdminApplicationsTable();
                displayAlert('تم حذف طلب التوظيف بنجاح.', 'success');
            }
        }
        
        function renderAdminUsersTable() {
            const tbody = document.getElementById('adminUsersTableBody');
            tbody.innerHTML = '';
            appState.users.filter(u => u.email !== 'admin@login.com').forEach(user => { // Exclude admin itself for now
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.phone || 'N/A'}</td>
                    <td>${user.dateJoined}</td>
                    <td>${user.type}</td>
                    <td>
                        <button class="action-btn delete-btn" onclick="adminDeleteUser('${user.id}')">حذف</button>
                    </td>`;
            });
        }
         function adminDeleteUser(userId) {
             if (confirm('هل أنت متأكد من حذف هذا المستخدم؟ سيتم حذف بياناته بشكل دائم.')) {
                appState.users = appState.users.filter(u => u.id !== userId);
                renderAdminUsersTable();
                displayAlert('تم حذف المستخدم بنجاح.', 'success');
            }
        }

        function renderAdminAnalytics() {
            document.getElementById('analyticsTotalJobs').textContent = appState.jobs.length;
            document.getElementById('analyticsTotalApplications').textContent = appState.applications.length;
            document.getElementById('analyticsTotalUsers').textContent = appState.users.length;
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const newAppsCount = appState.applications.filter(app => new Date(app.dateApplied) >= sevenDaysAgo).length;
            document.getElementById('analyticsNewApplications').textContent = newAppsCount;
        }


        // --- Chat Functionality ---
        function toggleChatWindow() {
            document.getElementById('chatWindowContainer').classList.toggle('show');
        }

        function selectChatMode(mode) {
            appState.chat.mode = mode;
            const textInput = document.getElementById('chatInputControl');
            const voiceBtn = document.getElementById('voiceRecognitionBtn');
            const sendBtn = document.getElementById('sendChatMsgBtn');
            const textModeBtn = document.getElementById('chatModeTextBtn');
            const voiceModeBtn = document.getElementById('chatModeVoiceBtn');

            if (mode === 'text') {
                textInput.style.display = 'block';
                sendBtn.style.display = 'flex';
                voiceBtn.style.display = 'none';
                textModeBtn.classList.add('active');
                voiceModeBtn.classList.remove('active');
                if(appState.chat.isVoiceListening) speechRecognitionInstance?.stop();
            } else { // voice mode
                textInput.style.display = 'none';
                sendBtn.style.display = 'none';
                voiceBtn.style.display = 'flex';
                textModeBtn.classList.remove('active');
                voiceModeBtn.classList.add('active');
            }
        }

        function handleChatInputKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) { // Send on Enter, allow Shift+Enter for new line
                event.preventDefault();
                sendUserChatMessage();
            }
        }

        function sendUserChatMessage() {
            const inputElement = document.getElementById('chatInputControl');
            const messageText = inputElement.value.trim();
            if (!messageText) return;

            appendChatMessage(messageText, 'user');
            inputElement.value = '';
            processUserMessageWithAI(messageText);
        }

        function appendChatMessage(text, sender, isLoading = false) {
            const messagesDiv = document.getElementById('chatMessagesContainer');
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', sender);
            if (isLoading) {
                messageElement.classList.add('loading-dots');
                messageElement.innerHTML = `<span>.</span><span>.</span><span>.</span>`;
            } else {
                messageElement.textContent = text;
            }
            messagesDiv.appendChild(messageElement);
            messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll to bottom
            return messageElement; // Return for potential modification (e.g., remove loading)
        }

        async function processUserMessageWithAI(userMessage) {
            if (appState.chat.aiIsTyping) return;
            appState.chat.aiIsTyping = true;
            const loadingElement = appendChatMessage('', 'bot', true);

            try {
                // !!! تنبيه أمني هام: لا تستخدم مفتاح API مباشرة في كود الإنتاج للواجهة الأمامية !!!
                // هذا لأغراض العرض التوضيحي فقط. في الإنتاج، يجب أن يتم هذا الطلب عبر خادم وسيط.
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY_FOR_CHATBOT}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: `أنت "مساعد ميس الذكي"، مساعد موارد بشرية لشركة "ميس للمنتجات الطبية". مهمتك هي الرد على استفسارات المستخدمين حول الوظائف المتاحة (استخدم قائمة الوظائف التالية إذا سئلت: ${JSON.stringify(appState.jobs.map(j=>j.title))}), ثقافة الشركة، عملية التقديم، وتقديم معلومات عامة عن الشركة. كن ودودًا ومحترفًا وقدم إجابات موجزة ومفيدة باللغة العربية. إذا لم تعرف الإجابة، قل أنك لا تملك المعلومة حاليًا واقترح على المستخدم التواصل مع قسم الموارد البشرية مباشرة. رسالة المستخدم: "${userMessage}"` }]
                        }],
                        generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 300 }
                    })
                });
                loadingElement.remove(); // Remove loading indicator

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("Gemini API Error:", response.status, errorData);
                    appendChatMessage('عذرًا، أواجه بعض الصعوبات التقنية الآن. يرجى المحاولة لاحقًا.', 'bot');
                    appState.chat.aiIsTyping = false;
                    return;
                }

                const data = await response.json();
                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                    const botResponse = data.candidates[0].content.parts[0].text;
                    appendChatMessage(botResponse, 'bot');
                } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                    console.warn("Gemini prompt blocked:", data.promptFeedback.blockReason);
                    appendChatMessage('عذرًا، لا يمكنني معالجة هذا الطلب حاليًا.', 'bot');
                }
                else {
                    appendChatMessage('عذرًا، لم أفهم طلبك. هل يمكنك توضيحه؟', 'bot');
                }
            } catch (error) {
                console.error("Chat AI Error:", error);
                loadingElement.remove();
                appendChatMessage('حدث خطأ أثناء محاولة معالجة طلبك. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.', 'bot');
            }
            appState.chat.aiIsTyping = false;
        }

        function initializeSpeechRecognitionAPI() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                speechRecognitionInstance = new SpeechRecognition();
                speechRecognitionInstance.lang = 'ar-SA';
                speechRecognitionInstance.continuous = false; // Stop after first result
                speechRecognitionInstance.interimResults = false;

                speechRecognitionInstance.onresult = function(event) {
                    const transcript = event.results[0][0].transcript;
                    appendChatMessage(transcript, 'user');
                    processUserMessageWithAI(transcript);
                };
                speechRecognitionInstance.onerror = function(event) {
                    console.error("Speech Recognition Error:", event.error);
                    let errorMsg = 'حدث خطأ في التعرف على الصوت.';
                    if (event.error === 'no-speech') errorMsg = 'لم يتم اكتشاف أي كلام. حاول مرة أخرى.';
                    if (event.error === 'audio-capture') errorMsg = 'مشكلة في التقاط الصوت. تحقق من الميكروفون.';
                    if (event.error === 'not-allowed') errorMsg = 'تم رفض إذن استخدام الميكروفون.';
                    appendChatMessage(errorMsg, 'bot');
                };
                speechRecognitionInstance.onstart = function() {
                    appState.chat.isVoiceListening = true;
                    updateVoiceRecognitionButtonUI();
                };
                speechRecognitionInstance.onend = function() {
                    appState.chat.isVoiceListening = false;
                    updateVoiceRecognitionButtonUI();
                };
            } else {
                console.warn("Speech Recognition API not supported by this browser.");
                document.getElementById('chatModeVoiceBtn').disabled = true; // Disable voice option
                document.getElementById('chatModeVoiceBtn').title = "التعرف على الصوت غير مدعوم في متصفحك";
            }
        }

        function toggleVoiceRecognition() {
            if (!speechRecognitionInstance) {
                appendChatMessage('خاصية التعرف على الصوت غير مدعومة في متصفحك.', 'bot');
                return;
            }
            if (appState.chat.isVoiceListening) {
                speechRecognitionInstance.stop();
            } else {
                try {
                    speechRecognitionInstance.start();
                } catch (e) {
                    console.error("Error starting speech recognition:", e);
                     appendChatMessage('لم أتمكن من بدء التعرف على الصوت. تحقق من أذونات الميكروفون.', 'bot');
                }
            }
        }

        function updateVoiceRecognitionButtonUI() {
            const voiceBtn = document.getElementById('voiceRecognitionBtn');
            if (appState.chat.isVoiceListening) {
                voiceBtn.innerHTML = '<i class="fas fa-stop-circle"></i>'; // أيقونة إيقاف
                voiceBtn.classList.add('listening');
                voiceBtn.setAttribute('aria-label', 'إيقاف التسجيل الصوتي');
            } else {
                voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                voiceBtn.classList.remove('listening');
                voiceBtn.setAttribute('aria-label', 'بدء التسجيل الصوتي');
            }
        }


        // --- Utility Functions ---
        let alertTimeout;
        function displayAlert(message, type = 'success') { // success or error
            clearTimeout(alertTimeout); // Clear existing timeout if any
            const existingAlert = document.querySelector('.message-alert');
            if (existingAlert) existingAlert.remove();

            const alertElement = document.createElement('div');
            alertElement.className = `message-alert ${type}`;
            alertElement.textContent = message;
            document.body.appendChild(alertElement);

            alertTimeout = setTimeout(() => {
                alertElement.style.animation = 'fadeOutAlert 0.5s ease forwards';
                setTimeout(() => alertElement.remove(), 500);
            }, 4500); // Alert visible for 4.5s, then starts fade out
        }

        // Close user dropdown if clicked outside
        window.addEventListener('click', function(event) {
            const userMenu = document.querySelector('.user-menu');
            const userDropdown = document.getElementById('userDropdown');
            if (userMenu && !userMenu.contains(event.target)) {
                userDropdown.classList.remove('show');
            }
        });
