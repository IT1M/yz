// --- Global Application State & Configuration ---
const appState = {
    currentUser: null, // { id, name, email, isAdmin, phone, dateJoined, type, passwordHash (for mock only) }
    jobs: [],
    applications: [], // To store submitted applications (both specific and general)
    users: [], // To store registered users
    chat: {
        mode: 'text', // 'text' or 'voice'
        isVoiceListening: false,
        messages: [], // { sender: 'user'/'bot', text: 'message', timestamp: ... }
        aiIsTyping: false,
        isWindowOpen: false
    },
    ui: {
        activeModalId: null,
        isUserMenuOpen: false,
        isMobileNavOpen: false,
        alertTimeout: null
    },
    filters: { // These will be populated from unique values in jobs data
        departments: [],
        locations: [],
        types: []
    }
};


const GEMINI_API_KEY_FOR_CHATBOT = typeof window.DEV_GEMINI_API_KEY !== 'undefined'
                                  ? window.DEV_GEMINI_API_KEY
                                  : "YOUR_GEMINI_API_KEY_PLACEHOLDER"; // Fallback placeholder

if (GEMINI_API_KEY_FOR_CHATBOT === "YOUR_GEMINI_API_KEY_PLACEHOLDER" || !GEMINI_API_KEY_FOR_CHATBOT) {
    console.warn("Gemini API Key for Chatbot is not configured. Chat AI will not make real API calls.");
}

let speechRecognitionInstance = null;

// --- DOM Elements Cache ---
const DOMElements = {};

function cacheDOMElements() {
    // Header & Navigation
    DOMElements.header = document.querySelector('.header');
    DOMElements.userMenuButton = document.getElementById('userMenuButton');
    DOMElements.userDropdownMenu = document.getElementById('userDropdownMenu');
    DOMElements.mobileNavToggle = document.getElementById('mobileNavToggle');
    DOMElements.mainNav = document.querySelector('.main-nav');
    DOMElements.navMenuLinks = document.querySelectorAll('.nav-menu a');

    // Job Listing & Filters
    DOMElements.jobsGridContainer = document.getElementById('jobsGridContainer');
    DOMElements.noJobsMessage = document.getElementById('noJobsMessage');
    DOMElements.departmentFilter = document.getElementById('departmentFilter');
    DOMElements.locationFilter = document.getElementById('locationFilter');
    DOMElements.typeFilter = document.getElementById('typeFilter');
    DOMElements.showGeneralApplicationModalBtn = document.getElementById('showGeneralApplicationModalBtn');

    // Chat
    DOMElements.chatToggleButton = document.getElementById('chatToggleButton');
    DOMElements.chatWindowContainer = document.getElementById('chatWindowContainer');
    DOMElements.closeChatButton = document.getElementById('closeChatButton');
    DOMElements.chatModeTextBtn = document.getElementById('chatModeTextBtn');
    DOMElements.chatModeVoiceBtn = document.getElementById('chatModeVoiceBtn');
    DOMElements.chatMessagesContainer = document.getElementById('chatMessagesContainer');
    DOMElements.chatInputControl = document.getElementById('chatInputControl');
    DOMElements.sendChatMessageBtn = document.getElementById('sendChatMessageBtn');
    DOMElements.voiceRecognitionBtn = document.getElementById('voiceRecognitionBtn');

    // Modals
    DOMElements.loginModalContainer = document.getElementById('loginModalContainer');
    DOMElements.registerModalContainer = document.getElementById('registerModalContainer');
    DOMElements.jobDetailsModalContainer = document.getElementById('jobDetailsModalContainer');
    DOMElements.jobApplicationModalContainer = document.getElementById('jobApplicationModalContainer');
    DOMElements.generalApplicationModalContainer = document.getElementById('generalApplicationModalContainer');

    // Modal Forms & Content Elements
    DOMElements.loginFormElement = document.getElementById('loginFormElement');
    DOMElements.registerFormElement = document.getElementById('registerFormElement');
    DOMElements.jobDetailsModalTitle = document.getElementById('jobDetailsModalTitle');
    DOMElements.jobDetailsModalContent = document.getElementById('jobDetailsModalContent');
    DOMElements.jobApplicationModalTitleSpan = document.getElementById('jobApplicationModalTitleText')?.querySelector('span');
    DOMElements.applicationJobIdInput = document.getElementById('applicationJobIdInput');
    DOMElements.jobApplicationFormElement = document.getElementById('jobApplicationFormElement');
    DOMElements.generalApplicationFormElement = document.getElementById('generalApplicationFormElement');
    DOMElements.generalDesiredFieldSelect = document.getElementById('generalDesiredFieldSelect');
    DOMElements.applyResumeFileInput = document.getElementById('applyResumeFileInput');
    DOMElements.applyResumeFileError = document.getElementById('applyResumeFileError');
    DOMElements.generalApplyResumeFileInput = document.getElementById('generalApplyResumeFileInput');
    DOMElements.generalResumeFileError = document.getElementById('generalResumeFileError');

    // Global Alert Container
    DOMElements.globalAlertContainer = document.getElementById('globalAlertContainer');
    if (!DOMElements.globalAlertContainer) { // Create if not in HTML
        DOMElements.globalAlertContainer = document.createElement('div');
        DOMElements.globalAlertContainer.id = 'globalAlertContainer';
        document.body.appendChild(DOMElements.globalAlertContainer);
    }
}

// --- Application Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    cacheDOMElements();
    loadInitialMockData();
    populateJobFiltersFromData();
    renderJobsGrid();
    initializeSpeechRecognitionAPI();
    updateUserMenuDisplay();
    addEventListeners();
    checkUserSession();
    // لا تفتح نافذة الدعم الفني تلقائياً عند التحميل
    if (DOMElements.chatWindowContainer) {
        DOMElements.chatWindowContainer.classList.remove('show');
        appState.chat.isWindowOpen = false;
        DOMElements.chatToggleButton?.setAttribute('aria-expanded', 'false');
    }
});

function addEventListeners() {
    window.addEventListener('scroll', handleHeaderScroll);
    DOMElements.userMenuButton?.addEventListener('click', () => toggleUserMenu());
    DOMElements.mobileNavToggle?.addEventListener('click', () => toggleMobileNav());

    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.modalId));
    });

    document.getElementById('switchToRegisterLink')?.addEventListener('click', (e) => { e.preventDefault(); showRegisterModal(); });
    document.getElementById('switchToLoginLink')?.addEventListener('click', (e) => { e.preventDefault(); showLoginModal(); });

    DOMElements.chatToggleButton?.addEventListener('click', () => {
        // لا تغلق نافذة الدعم الفني عند الضغط على الزر
        if (!appState.chat.isWindowOpen) {
            toggleChatWindow(true);
        }
    });
    DOMElements.closeChatButton?.addEventListener('click', () => toggleChatWindow(false));
    DOMElements.chatModeTextBtn?.addEventListener('click', () => selectChatMode('text'));
    DOMElements.chatModeVoiceBtn?.addEventListener('click', () => selectChatMode('voice'));
    DOMElements.sendChatMessageBtn?.addEventListener('click', sendUserChatMessage);
    DOMElements.chatInputControl?.addEventListener('keypress', handleChatInputKeyPress);
    DOMElements.voiceRecognitionBtn?.addEventListener('click', toggleVoiceRecognition);

    DOMElements.departmentFilter?.addEventListener('change', renderJobsGrid);
    DOMElements.locationFilter?.addEventListener('change', renderJobsGrid);
    DOMElements.typeFilter?.addEventListener('change', renderJobsGrid);
    DOMElements.showGeneralApplicationModalBtn?.addEventListener('click', openGeneralApplicationModal);

    DOMElements.loginFormElement?.addEventListener('submit', handleUserLogin);
    DOMElements.registerFormElement?.addEventListener('submit', handleUserRegister);
    DOMElements.jobApplicationFormElement?.addEventListener('submit', handleSpecificJobApplication);
    DOMElements.generalApplicationFormElement?.addEventListener('submit', handleGeneralCvSubmission);

    DOMElements.applyResumeFileInput?.addEventListener('change', () => validateResumeFile(DOMElements.applyResumeFileInput, DOMElements.applyResumeFileError.id));
    DOMElements.generalApplyResumeFileInput?.addEventListener('change', () => validateResumeFile(DOMElements.generalApplyResumeFileInput, DOMElements.generalResumeFileError.id));


    window.addEventListener('click', handleOutsideClicks);
    document.addEventListener('keydown', handleGlobalKeyDown);

    DOMElements.navMenuLinks?.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (appState.ui.isMobileNavOpen) toggleMobileNav(false);
                DOMElements.navMenuLinks.forEach(link => link.classList.remove('active-link'));
                this.classList.add('active-link');
            }
        });
    });
}

// --- UI Interaction & State Management ---
function handleHeaderScroll() {
    DOMElements.header?.classList.toggle('scrolled', window.scrollY > 50);
}

function toggleUserMenu(forceState) {
    const isOpen = DOMElements.userDropdownMenu?.classList.toggle('show', forceState);
    appState.ui.isUserMenuOpen = isOpen;
    DOMElements.userMenuButton?.setAttribute('aria-expanded', isOpen.toString());
}

function toggleMobileNav(forceState) {
    const isOpen = DOMElements.mainNav?.classList.toggle('mobile-active', forceState);
    appState.ui.isMobileNavOpen = isOpen;
    DOMElements.mobileNavToggle?.setAttribute('aria-expanded', isOpen.toString());
    if (DOMElements.mobileNavToggle) {
        DOMElements.mobileNavToggle.querySelector('i').className = isOpen ? 'fas fa-times' : 'fas fa-bars';
    }
    // Lock body scroll when mobile nav is open
    if (isOpen) {
        document.body.classList.add('mobile-nav-open');
    } else {
        document.body.classList.remove('mobile-nav-open');
    }
}

function handleOutsideClicks(event) {
    if (appState.ui.isUserMenuOpen && DOMElements.userMenuButton && !DOMElements.userMenuButton.contains(event.target) && !DOMElements.userDropdownMenu.contains(event.target)) {
        toggleUserMenu(false);
    }
    if (appState.ui.isMobileNavOpen && DOMElements.mobileNavToggle && !DOMElements.mobileNavToggle.contains(event.target) && !DOMElements.mainNav.contains(event.target)) {
        toggleMobileNav(false);
    }
}

function handleGlobalKeyDown(event) {
    if (event.key === "Escape") {
        if (appState.ui.activeModalId) {
            closeModal(appState.ui.activeModalId);
        } else if (appState.chat.isWindowOpen) {
            toggleChatWindow(false);
        } else if (appState.ui.isUserMenuOpen) {
            toggleUserMenu(false);
        } else if (appState.ui.isMobileNavOpen) {
            toggleMobileNav(false);
        }
    }
}

// --- Mock Data & Initialization ---
function loadInitialMockData() {
    appState.jobs = [
        { id: 'J001', title: 'مطور واجهة أمامية أول (Senior Frontend Developer)', department: 'تطوير البرمجيات', location: 'الرياض', type: 'دوام كامل', datePosted: '2024-07-28', description: 'نبحث عن مطور واجهة أمامية محترف يتمتع بخبرة واسعة في بناء تطبيقات ويب تفاعلية باستخدام أحدث التقنيات. ستكون مسؤولاً عن قيادة تطوير الواجهات الأمامية، وضمان جودة الكود، والتعاون مع فرق التصميم والـ backend.', responsibilities: ['قيادة تصميم وتنفيذ واجهات مستخدم متقدمة باستخدام React و TypeScript.', 'تحسين أداء وسرعة تحميل التطبيقات لضمان أفضل تجربة مستخدم.', 'كتابة كود نظيف، قابل للصيانة، وموثق بشكل جيد وفقًا لأفضل الممارسات.', 'مراجعة كود الزملاء وتقديم التوجيه والإرشاد الفني.', 'البقاء على اطلاع دائم بأحدث اتجاهات وتقنيات تطوير الواجهات الأمامية.'], qualifications: ['خبرة لا تقل عن 5 سنوات في تطوير الواجهات الأمامية.', 'إتقان HTML5, CSS3, JavaScript (ES6+), و TypeScript.', 'خبرة عميقة ومثبتة في React (Hooks, Context API, Redux/Zustand).', 'فهم جيد لـ RESTful APIs وكيفية التفاعل معها بكفاءة.', 'خبرة في أدوات بناء (Webpack/Vite) واختبار الواجهات الأمامية (Jest, React Testing Library).', 'قدرة على العمل بشكل مستقل وضمن فريق.'], skills: ['React', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3/SASS', 'Redux', 'Jest', 'Git', 'Agile Development', 'Problem Solving', 'Leadership'] },
        { id: 'J002', title: 'أخصائي تسويق منتجات طبية', department: 'التسويق', location: 'جدة', type: 'دوام كامل', datePosted: '2024-07-25', description: 'نسعى لتوظيف أخصائي تسويق منتجات طبية مبدع لإدارة وتطوير استراتيجيات التسويق لمنتجاتنا الطبية المبتكرة، وزيادة الوعي بالعلامة التجارية في السوق السعودي.', responsibilities: ['تطوير وتنفيذ خطط التسويق للمنتجات الطبية الجديدة والحالية.', 'إجراء أبحاث السوق وتحليل المنافسين لتحديد الفرص والتحديات.', 'إنشاء محتوى تسويقي جذاب (كتيبات، عروض تقديمية، محتوى رقمي).', 'تنظيم والمشاركة في الفعاليات والمعارض الطبية.', 'بناء علاقات قوية مع قادة الرأي في المجال الطبي.'], qualifications: ['شهادة جامعية في التسويق، الصيدلة، أو مجال طبي ذي صلة.', 'خبرة عملية لا تقل عن 3 سنوات في تسويق المنتجات الطبية أو الأدوية.', 'فهم عميق للسوق الطبي السعودي والمتطلبات التنظيمية.', 'مهارات تواصل وعرض ممتازة باللغتين العربية والإنجليزية.'], skills: ['Product Marketing', 'Medical Devices', 'Pharmaceutical Marketing', 'Market Research', 'Content Creation', 'Event Management', 'Communication Skills'] },
        { id: 'J003', title: 'مهندس صيانة أجهزة طبية', department: 'الهندسة الطبية', location: 'الدمام', type: 'تدريب', datePosted: '2024-07-22', description: 'فرصة تدريب للخريجين الجدد في مجال الهندسة الطبية للمساهمة في تصميم واختبار أجهزة طبية مبتكرة تحت إشراف فريق من المهندسين الخبراء.', responsibilities: ['المساعدة في تصميم وتطوير نماذج أولية للأجهزة الطبية.', 'إجراء الاختبارات والفحوصات على الأجهزة.', 'توثيق نتائج الاختبارات والمساهمة في إعداد التقارير الفنية.', 'الالتزام بمعايير الجودة والسلامة.'], qualifications: ['حديث التخرج بدرجة البكالوريوس في الهندسة الطبية أو هندسة الإلكترونيات/الميكانيكا.', 'شغف بمجال الأجهزة الطبية والابتكار.', 'قدرة على التعلم السريع والعمل ضمن فريق.', 'مهارات تواصل جيدة باللغتين العربية والإنجليزية.'], skills: ['CAD (SolidWorks/AutoCAD)', 'Microcontrollers', 'Problem Solving', 'Teamwork', 'Technical Writing'] },
        { id: 'J004', title: 'مدير حسابات عملاء (قطاع الأدوية)', department: 'المبيعات', location: 'عن بُعد', type: 'دوام كامل', datePosted: '2024-07-20', description: 'نبحث عن مدير حسابات ذو خبرة في قطاع الأدوية لإدارة وتنمية العلاقات مع العملاء الرئيسيين. العمل يتطلب زيارات ميدانية وتواصل عن بعد.', responsibilities: ['تحقيق أهداف المبيعات.', 'بناء علاقات مع العملاء.', 'تقديم عروض عن المنتجات.', 'متابعة السوق.'], qualifications: ['شهادة جامعية.', 'خبرة 4 سنوات في مبيعات الأدوية.', 'سجل مبيعات حافل.'], skills: ['Pharmaceutical Sales', 'Account Management', 'Negotiation'] }
    ];
    appState.users = [
        { id: 'U001', name: 'المدير يزيد', email: 'admin@login.com', phone: '0501234567', dateJoined: '2023-01-01', type: 'مدير', passwordHash: 'admin13579', isAdmin: true },
        { id: 'U002', name: 'سالم الموظف', email: 'salem@mays.com', phone: '0512223333', dateJoined: '2023-06-10', type: 'موظف', passwordHash: 'salem123', isAdmin: false }
    ];
    appState.applications = []; // Start empty
    // Save to localStorage if you want persistence for mock data (optional)
    // localStorage.setItem('yzMockJobs', JSON.stringify(appState.jobs));
    // localStorage.setItem('yzMockUsers', JSON.stringify(appState.users));
}

function populateJobFiltersFromData() {
    const departments = [...new Set(appState.jobs.map(job => job.department))];
    const locations = [...new Set(appState.jobs.map(job => job.location))];
    const types = [...new Set(appState.jobs.map(job => job.type))];

    appState.filters.departments = departments;
    appState.filters.locations = locations;
    appState.filters.types = types;

    populateSelectWithOptions(DOMElements.departmentFilter, departments, "جميع الأقسام");
    populateSelectWithOptions(DOMElements.locationFilter, locations, "جميع المواقع");
    populateSelectWithOptions(DOMElements.typeFilter, types, "جميع أنواع الدوام");
    populateSelectWithOptions(DOMElements.generalDesiredFieldSelect, departments, "-- اختر المجال --");
    DOMElements.generalDesiredFieldSelect?.add(new Option('أخرى', 'أخرى'));
}

function populateSelectWithOptions(selectElement, optionsArray, defaultOptionText = "") {
    if (!selectElement) return;
    // Clear existing options except the first one
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }
    if (selectElement.options.length === 0 && defaultOptionText) { // Add default if not present
        selectElement.add(new Option(defaultOptionText, ""));
    } else if (selectElement.options.length > 0 && defaultOptionText) {
        selectElement.options[0].text = defaultOptionText;
        selectElement.options[0].value = "";
    }

    optionsArray.forEach(optValue => {
        selectElement.add(new Option(optValue, optValue));
    });
}


// --- UI Rendering & Updates ---
function renderJobsGrid() {
    if (!DOMElements.jobsGridContainer || !DOMElements.noJobsMessage) return;
    DOMElements.jobsGridContainer.innerHTML = '';

    const departmentFilter = DOMElements.departmentFilter.value;
    const locationFilter = DOMElements.locationFilter.value;
    const typeFilter = DOMElements.typeFilter.value;

    const filteredJobs = appState.jobs.filter(job =>
        (!departmentFilter || job.department === departmentFilter) &&
        (!locationFilter || job.location === locationFilter) &&
        (!typeFilter || job.type === typeFilter)
    );

    if (filteredJobs.length === 0) {
        DOMElements.noJobsMessage.style.display = 'block';
        return;
    }
    DOMElements.noJobsMessage.style.display = 'none';

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
                <button class="details-btn" data-job-id="${job.id}" aria-label="عرض تفاصيل وظيفة ${job.title}">عرض التفاصيل</button>
                <button class="apply-btn-in-card" data-job-id="${job.id}" aria-label="التقديم على وظيفة ${job.title}">قدم الآن</button>
            </div>
        `;
        card.querySelector('.details-btn').addEventListener('click', () => openJobDetailsModal(job.id));
        card.querySelector('.apply-btn-in-card').addEventListener('click', () => openJobApplicationModal(job.id));
        DOMElements.jobsGridContainer.appendChild(card);
    });
}

function updateUserMenuDisplay() {
    if (!DOMElements.userDropdownMenu || !DOMElements.userMenuButton) return;
    const userIcon = DOMElements.userMenuButton.querySelector('i');

    if (appState.currentUser) {
        userIcon.className = 'fas fa-user-check user-icon-loggedin';
        DOMElements.userMenuButton.setAttribute('aria-label', `قائمة المستخدم: ${appState.currentUser.name}`);
        DOMElements.userDropdownMenu.innerHTML = `
            <div class="dropdown-menu-header">
                <strong>${appState.currentUser.name}</strong>
                <small>${appState.currentUser.email}</small>
            </div>
            ${appState.currentUser.isAdmin ? `<a href="#" id="adminDashboardLinkMenu" role="menuitem"><i class="fas fa-tachometer-alt"></i> لوحة التحكم</a>` : ''}
            <a href="#" id="logoutMenuLinkInternal" role="menuitem"><i class="fas fa-sign-out-alt"></i> تسجيل الخروج</a>
        `;
        document.getElementById('logoutMenuLinkInternal')?.addEventListener('click', (e) => {e.preventDefault(); userLogout();});
        document.getElementById('adminDashboardLinkMenu')?.addEventListener('click', (e) => {
            e.preventDefault();
            toggleUserMenu(false); // Close dropdown
            window.location.href = 'page/dashboard/dashboard.html';
        });
    } else {
        userIcon.className = 'fas fa-user-circle';
        userIcon.style.color = ''; // Reset color
        DOMElements.userMenuButton.setAttribute('aria-label', 'قائمة المستخدم');
        DOMElements.userDropdownMenu.innerHTML = `
            <a href="#" id="loginMenuLinkInternal" role="menuitem"><i class="fas fa-sign-in-alt"></i> تسجيل الدخول</a>
            <a href="#" id="registerMenuLinkInternal" role="menuitem"><i class="fas fa-user-plus"></i> إنشاء حساب</a>
        `;
        document.getElementById('loginMenuLinkInternal')?.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginModal();
            window.location.href = 'page/login/login.html';
        });
        document.getElementById('registerMenuLinkInternal')?.addEventListener('click', (e) => { e.preventDefault(); showRegisterModal(); });
    }
}

// --- Modal Handling ---
function openModal(modalId) {
    closeActiveModal(); // Close any other open modal
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        appState.ui.activeModalId = modalId;
        document.body.style.overflow = 'hidden';
        const firstFocusable = modal.querySelector('button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])');
        firstFocusable?.focus();
    }
}

function closeModal(modalIdOrElement) {
    const modalElement = typeof modalIdOrElement === 'string' ? document.getElementById(modalIdOrElement) : modalIdOrElement;
    if (modalElement) {
        modalElement.style.display = 'none';
    }
    if (appState.ui.activeModalId === modalElement?.id || !modalIdOrElement) {
        appState.ui.activeModalId = null;
        document.body.style.overflow = 'auto';
    }
}

function showLoginModal() { openModal('loginModalContainer'); }
function showRegisterModal() { openModal('registerModalContainer'); }

function openJobDetailsModal(jobId) {
    const job = appState.jobs.find(j => j.id === jobId);
    if (!job || !DOMElements.jobDetailsModalTitle || !DOMElements.jobDetailsModalContent) return;
    DOMElements.jobDetailsModalTitle.textContent = job.title;
    DOMElements.jobDetailsModalContent.innerHTML = `
        <p><strong>القسم:</strong> ${job.department}</p>
        <p><strong>الموقع:</strong> ${job.location}</p>
        <p><strong>نوع الدوام:</strong> ${job.type}</p>
        <hr style="margin: 1rem 0;">
        <h4>الوصف الوظيفي:</h4>
        <p style="white-space: pre-wrap;">${job.description}</p>
        <h4 style="margin-top:1rem;">المسؤوليات:</h4>
        <ul style="padding-right: 20px;">${(Array.isArray(job.responsibilities) ? job.responsibilities : [job.responsibilities]).map(r => `<li>${r}</li>`).join('')}</ul>
        <h4 style="margin-top:1rem;">المؤهلات:</h4>
        <ul style="padding-right: 20px;">${(Array.isArray(job.qualifications) ? job.qualifications : [job.qualifications]).map(q => `<li>${q}</li>`).join('')}</ul>
        <h4 style="margin-top:1rem;">المهارات المطلوبة:</h4>
        <p>${(Array.isArray(job.skills) ? job.skills.join(', ') : job.skills)}</p>
        <div style="margin-top: 2rem; text-align: center;">
            <button class="cta-button" onclick="openJobApplicationModal('${job.id}'); closeModal('jobDetailsModalContainer');">
                <i class="fas fa-paper-plane"></i> قدم على هذه الوظيفة
            </button>
        </div>
    `;
    openModal('jobDetailsModalContainer');
}

function openJobApplicationModal(jobId) {
    const job = appState.jobs.find(j => j.id === jobId);
    if (!job || !DOMElements.jobApplicationModalTitleSpan || !DOMElements.applicationJobIdInput || !DOMElements.jobApplicationFormElement) return;
    DOMElements.jobApplicationModalTitleSpan.textContent = job.title;
    DOMElements.applicationJobIdInput.value = jobId;
    const form = DOMElements.jobApplicationFormElement;
    form.reset();
    DOMElements.applyResumeFileError.textContent = '';

    if (appState.currentUser && !appState.currentUser.isAdmin) {
        form.elements['applyNameInput'].value = appState.currentUser.name || '';
        form.elements['applyEmailInput'].value = appState.currentUser.email || '';
        form.elements['applyPhoneInput'].value = appState.currentUser.phone || '';
    }
    openModal('jobApplicationModalContainer');
}

function openGeneralApplicationModal() {
    if (!DOMElements.generalApplicationFormElement) return;
    const form = DOMElements.generalApplicationFormElement;
    form.reset();
    DOMElements.generalResumeFileError.textContent = '';

    if (appState.currentUser && !appState.currentUser.isAdmin) {
        form.elements['generalApplyNameInput'].value = appState.currentUser.name || '';
        form.elements['generalApplyEmailInput'].value = appState.currentUser.email || '';
        form.elements['generalApplyPhoneInput'].value = appState.currentUser.phone || '';
    }
    openModal('generalApplicationModalContainer');
}

// --- User Authentication & Session ---
function handleUserLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmailInput').value;
    const password = document.getElementById('loginPasswordInput').value;

    if (email === 'admin@login.com' && password === 'admin13579') {
        const adminUser = appState.users.find(u => u.email === email && u.isAdmin);
        appState.currentUser = adminUser || { id:'ADMIN_RUNTIME', name: 'المدير يزيد', email: email, isAdmin: true };
        if (!adminUser) appState.users.push(appState.currentUser); // Add if not in mock users

        localStorage.setItem('yzUserSession', JSON.stringify(appState.currentUser));
        displayAlert('تم تسجيل الدخول كمدير بنجاح! جاري توجيهك...', 'success');
        closeModal('loginModalContainer');
        updateUserMenuDisplay();
        setTimeout(() => { window.location.href = 'page/dashboard/dashboard.html'; }, 1200);
        return;
    }

    const user = appState.users.find(u => u.email === email && u.passwordHash === password && !u.isAdmin);
    if (user) {
        appState.currentUser = { ...user, isAdmin: false };
        localStorage.setItem('yzUserSession', JSON.stringify(appState.currentUser));
        displayAlert('تم تسجيل الدخول بنجاح!', 'success');
        closeModal('loginModalContainer');
        updateUserMenuDisplay();
    } else {
        displayAlert('بيانات الدخول غير صحيحة.', 'error');
    }
}

function handleUserRegister(event) {
    event.preventDefault();
    const name = document.getElementById('registerNameInput').value;
    const email = document.getElementById('registerEmailInput').value;
    const phone = document.getElementById('registerPhoneInput').value;
    const password = document.getElementById('registerPasswordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;

    if (password.length < 6) { displayAlert('كلمة المرور قصيرة جداً (6 أحرف على الأقل).', 'error'); return; }
    if (password !== confirmPassword) { displayAlert('كلمتا المرور غير متطابقتين!', 'error'); return; }
    if (appState.users.find(u => u.email === email)) { displayAlert('هذا البريد مسجل مسبقاً!', 'error'); return; }

    const newUser = {
        id: 'U' + String(Date.now()).slice(-4),
        name, email, phone,
        dateJoined: new Date().toISOString().split('T')[0],
        type: 'مستخدم', passwordHash: password, isAdmin: false
    };
    appState.users.push(newUser);
    appState.currentUser = newUser;
    localStorage.setItem('yzUserSession', JSON.stringify(appState.currentUser));
    displayAlert('تم إنشاء حسابك بنجاح! مرحباً بك.', 'success');
    closeModal('registerModalContainer');
    updateUserMenuDisplay();
    // Note: If admin functionality was here, would call renderAdminUsersTable()
}

function userLogout() {
    appState.currentUser = null;
    localStorage.removeItem('yzUserSession');
    displayAlert('تم تسجيل الخروج بنجاح.', 'info');
    updateUserMenuDisplay();
    if (DOMElements.userDropdownMenu.classList.contains('show')) toggleUserMenu(false);
}

function checkUserSession() {
    const sessionData = localStorage.getItem('yzUserSession');
    if (sessionData) {
        try {
            const userData = JSON.parse(sessionData);
            // Here, you might want to re-validate the session with a backend in a real app
            appState.currentUser = userData;
            updateUserMenuDisplay();
            // No auto-redirect for admin from index.html anymore, login handles it.
        } catch (e) {
            console.error("Error parsing session data:", e);
            localStorage.removeItem('yzUserSession');
        }
    }
}

// --- Job Application & File Handling ---
function validateResumeFile(fileInput, errorElementId) {
    const errorElement = document.getElementById(errorElementId);
    if (!fileInput || !errorElement) return false;
    errorElement.textContent = '';

    const file = fileInput.files[0];
    if (!file) {
        errorElement.textContent = 'يرجى اختيار ملف.';
        return false;
    }
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
        errorElement.textContent = 'صيغة غير مدعومة (PDF, DOC, DOCX فقط).';
        return false;
    }
    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
        errorElement.textContent = `حجم الملف كبير (الأقصى ${maxSizeMB}MB).`;
        return false;
    }
    return true;
}

function handleSpecificJobApplication(event) {
    event.preventDefault();
    if (!validateResumeFile(DOMElements.applyResumeFileInput, DOMElements.applyResumeFileError.id)) return;

    const jobId = DOMElements.applicationJobIdInput.value;
    const job = appState.jobs.find(j => j.id === jobId);
    const applicationData = {
        id: 'APP' + String(Date.now()).slice(-5),
        applicantName: document.getElementById('applyNameInput').value,
        applicantEmail: document.getElementById('applyEmailInput').value,
        applicantPhone: document.getElementById('applyPhoneInput').value,
        experience: document.getElementById('applyExperienceInput').value,
        coverLetter: document.getElementById('applyCoverLetterTextarea').value,
        resumeFileName: DOMElements.applyResumeFileInput.files[0].name,
        jobId: jobId,
        jobTitle: job ? job.title : 'N/A',
        dateApplied: new Date().toISOString().split('T')[0],
        status: 'قيد المراجعة' // Default status
    };
    appState.applications.push(applicationData);
    // In a real app, upload file and save applicationData to backend
    // localStorage.setItem('yzMockApplications', JSON.stringify(appState.applications)); // Optional: persist mock data
    displayAlert('تم إرسال طلب التوظيف بنجاح!', 'success');
    closeModal('jobApplicationModalContainer');
    event.target.reset();
}

function handleGeneralCvSubmission(event) {
    event.preventDefault();
    if (!validateResumeFile(DOMElements.generalApplyResumeFileInput, DOMElements.generalResumeFileError.id)) return;

     const generalApplicationData = {
        id: 'GEN' + String(Date.now()).slice(-5),
        applicantName: document.getElementById('generalApplyNameInput').value,
        applicantEmail: document.getElementById('generalApplyEmailInput').value,
        applicantPhone: document.getElementById('generalApplyPhoneInput').value,
        desiredField: DOMElements.generalDesiredFieldSelect.value,
        experience: document.getElementById('generalApplyExperienceInput').value,
        bio: document.getElementById('generalApplyBioTextarea').value,
        resumeFileName: DOMElements.generalApplyResumeFileInput.files[0].name,
        jobId: null, jobTitle: 'تقديم عام',
        dateApplied: new Date().toISOString().split('T')[0],
        status: 'تقديم عام محفوظ'
    };
    appState.applications.push(generalApplicationData);
    // localStorage.setItem('yzMockApplications', JSON.stringify(appState.applications));
    displayAlert('تم إرسال سيرتك الذاتية بنجاح!', 'success');
    closeModal('generalApplicationModalContainer');
    event.target.reset();
}

// --- Chat Functionality ---
function toggleChatWindow(forceState) {
    // اجعل الدردشة لا تغلق عند الضغط على الزر، فقط عند الضغط على زر الإغلاق
    if (forceState === false) {
        DOMElements.chatWindowContainer.classList.remove('show');
        appState.chat.isWindowOpen = false;
        DOMElements.chatToggleButton.setAttribute('aria-expanded', 'false');
    } else {
        DOMElements.chatWindowContainer.classList.add('show');
        appState.chat.isWindowOpen = true;
        DOMElements.chatToggleButton.setAttribute('aria-expanded', 'true');
        if (appState.chat.mode === 'text') DOMElements.chatInputControl.focus();
    }
}

function selectChatMode(mode) {
    appState.chat.mode = mode;
    const textInput = DOMElements.chatInputControl;
    const voiceBtn = DOMElements.voiceRecognitionBtn;
    const sendBtn = DOMElements.sendChatMessageBtn;
    const textModeBtn = DOMElements.chatModeTextBtn;
    const voiceModeBtn = DOMElements.chatModeVoiceBtn;

    textInput.style.display = (mode === 'text') ? 'block' : 'none';
    sendBtn.style.display = (mode === 'text') ? 'flex' : 'none';
    voiceBtn.style.display = (mode === 'voice') ? 'flex' : 'none';
    textModeBtn.classList.toggle('active', mode === 'text');
    voiceModeBtn.classList.toggle('active', mode === 'voice');
    textModeBtn.setAttribute('aria-pressed', mode === 'text');
    voiceModeBtn.setAttribute('aria-pressed', mode === 'voice');

    if(appState.chat.isVoiceListening && speechRecognitionInstance) speechRecognitionInstance.stop();
    if (mode === 'text') textInput.focus();
}

function handleChatInputKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendUserChatMessage();
    }
}

function sendUserChatMessage() {
    const messageText = DOMElements.chatInputControl.value.trim();
    if (!messageText) return;
    appendChatMessage(messageText, 'user');
    DOMElements.chatInputControl.value = '';
    DOMElements.chatInputControl.focus();
    processUserMessageWithAI(messageText);
}

function appendChatMessage(text, sender, isLoading = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    if (isLoading) {
        messageElement.classList.add('loading-dots');
        messageElement.setAttribute('aria-label', 'المساعد يكتب الآن');
        messageElement.innerHTML = `<span>.</span><span>.</span><span>.</span>`;
    } else {
        messageElement.textContent = text;
    }
    DOMElements.chatMessagesContainer.appendChild(messageElement);
    DOMElements.chatMessagesContainer.scrollTop = DOMElements.chatMessagesContainer.scrollHeight;
    return messageElement;
}

async function processUserMessageWithAI(userMessage) {
    if (appState.chat.aiIsTyping || GEMINI_API_KEY_FOR_CHATBOT === "YOUR_GEMINI_API_KEY_PLACEHOLDER" || !GEMINI_API_KEY_FOR_CHATBOT) {
        if (GEMINI_API_KEY_FOR_CHATBOT === "YOUR_GEMINI_API_KEY_PLACEHOLDER" || !GEMINI_API_KEY_FOR_CHATBOT) {
            appendChatMessage("عذرًا، خدمة المساعد الذكي غير مفعّلة حاليًا بسبب عدم تكوين مفتاح API.", 'bot');
        }
        return;
    }
    appState.chat.aiIsTyping = true;
    const loadingElement = appendChatMessage('', 'bot', true);

    try {
        const jobTitles = appState.jobs.map(j => j.title).join('؛ ');
        const prompt = `أنت "مساعد ميس الذكي"، مساعد موارد بشرية ودود ومحترف لشركة "ميس للمنتجات الطبية". مهمتك الأساسية هي مساعدة المستخدمين في استفساراتهم المتعلقة بالتوظيف والشركة.
رد دائمًا باللغة العربية وبأسلوب مهذب وموجز.
الشركة متخصصة في المنتجات الطبية وتسعى لتوظيف أفضل الكفاءات.
الوظائف المتاحة حاليًا هي: ${jobTitles || "لا توجد وظائف معلنة حاليًا"}.
إذا سئلت عن ثقافة الشركة، يمكنك ذكر: الرعاية، الابتكار، العمل الجماعي، التميز، النمو، النزاهة.
إذا سئلت عن كيفية التقديم، وجه المستخدم إلى قسم "الوظائف" في الصفحة أو زر "تقديم عام للسيرة الذاتية".
إذا لم تكن متأكدًا من الإجابة أو كان السؤال خارج نطاق الموارد البشرية والتوظيف، اعتذر بلطف واقترح على المستخدم التواصل مع القسم المختص أو عبر معلومات الاتصال في صفحة "تواصل معنا".
رسالة المستخدم: "${userMessage}"`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY_FOR_CHATBOT}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.6, topP: 0.95, topK: 40, maxOutputTokens: 300 }
            })
        });
        loadingElement.remove();

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Gemini API Error:", response.status, errorData);
            appendChatMessage('عذرًا، أواجه بعض الصعوبات التقنية. يرجى المحاولة لاحقًا.', 'bot');
            appState.chat.aiIsTyping = false;
            return;
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            const botResponse = data.candidates[0].content.parts[0].text;
            appendChatMessage(botResponse, 'bot');
        } else if (data.promptFeedback?.blockReason) {
            appendChatMessage('عذرًا، لا يمكنني معالجة هذا الطلب حاليًا.', 'bot');
        } else {
            appendChatMessage('عذرًا، لم أفهم طلبك. هل يمكنك توضيحه؟', 'bot');
        }
    } catch (error) {
        console.error("Chat AI Processing Error:", error);
        loadingElement?.remove();
        appendChatMessage('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.', 'bot');
    }
    appState.chat.aiIsTyping = false;
}

function initializeSpeechRecognitionAPI() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && DOMElements.chatModeVoiceBtn && DOMElements.voiceRecognitionBtn) {
        speechRecognitionInstance = new SpeechRecognition();
        speechRecognitionInstance.lang = 'ar-SA';
        speechRecognitionInstance.continuous = false;
        speechRecognitionInstance.interimResults = false;

        speechRecognitionInstance.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            appendChatMessage(transcript, 'user');
            processUserMessageWithAI(transcript);
        };
        speechRecognitionInstance.onerror = function(event) {
            console.error("Speech Reco Error:", event.error);
            let errorMsg = 'حدث خطأ في التعرف على الصوت.';
            if (event.error === 'no-speech') errorMsg = 'لم يتم اكتشاف أي كلام.';
            if (event.error === 'audio-capture') errorMsg = 'مشكلة في الميكروفون.';
            if (event.error === 'not-allowed') errorMsg = 'تم رفض إذن الميكروفون.';
            appendChatMessage(errorMsg, 'bot');
        };
        speechRecognitionInstance.onstart = function() { appState.chat.isVoiceListening = true; updateVoiceRecognitionButtonUI(); };
        speechRecognitionInstance.onend = function() { appState.chat.isVoiceListening = false; updateVoiceRecognitionButtonUI(); };
    } else {
        console.warn("Speech Recognition API not supported or buttons missing.");
        if(DOMElements.chatModeVoiceBtn) DOMElements.chatModeVoiceBtn.disabled = true;
        if(DOMElements.chatModeVoiceBtn) DOMElements.chatModeVoiceBtn.title = "التعرف على الصوت غير مدعوم";
        if(DOMElements.voiceRecognitionBtn) DOMElements.voiceRecognitionBtn.style.display = 'none';
    }
}

function toggleVoiceRecognition() {
    if (!speechRecognitionInstance) { appendChatMessage('خاصية التعرف على الصوت غير مدعومة.', 'bot'); return; }
    if (appState.chat.isVoiceListening) {
        speechRecognitionInstance.stop();
    } else {
        try { speechRecognitionInstance.start(); }
        catch (e) { appendChatMessage('لم أتمكن من بدء التعرف. تحقق من أذونات الميكروفون.', 'bot');}
    }
}

function updateVoiceRecognitionButtonUI() {
    const voiceBtn = DOMElements.voiceRecognitionBtn;
    if (!voiceBtn) return;
    if (appState.chat.isVoiceListening) {
        voiceBtn.innerHTML = '<i class="fas fa-stop-circle"></i>';
        voiceBtn.classList.add('listening');
        voiceBtn.setAttribute('aria-label', 'إيقاف التسجيل الصوتي');
        voiceBtn.setAttribute('aria-pressed', 'true');
    } else {
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceBtn.classList.remove('listening');
        voiceBtn.setAttribute('aria-label', 'بدء التسجيل الصوتي');
        voiceBtn.setAttribute('aria-pressed', 'false');
    }
}

// --- Utility Functions ---
function displayAlert(message, type = 'success', duration = 4600) {
    if (!DOMElements.globalAlertContainer) return;
    // Remove any existing alert of the same type to prevent spamming (optional)
    // const existingAlertSameType = DOMElements.globalAlertContainer.querySelector(`.message-alert.${type}`);
    // if(existingAlertSameType) existingAlertSameType.remove();

    const alertElement = document.createElement('div');
    alertElement.className = `message-alert ${type}`;
    alertElement.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const icon = document.createElement('i');
    icon.className = `fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}`;
    alertElement.appendChild(icon);
    alertElement.appendChild(document.createTextNode(" " + message));

    // Prepend for newest on top, or append for newest at bottom
    DOMElements.globalAlertContainer.prepend(alertElement);

    // Force reflow for animation
    void alertElement.offsetWidth;
    alertElement.style.animation = `slideInFadeAlert 0.4s ease-out forwards, fadeOutAlertLater 0.4s ease-in ${ (duration - 400) / 1000}s forwards`;

    setTimeout(() => {
        // Check if element still exists before trying to remove
        if (alertElement.parentElement) {
            alertElement.remove();
        }
    }, duration);
}

// Debounce function (optional, for search or other frequent events)
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}
