document.addEventListener('DOMContentLoaded', () => {

    // إذا كان المستخدم مسجلاً دخوله بالفعل، يتم توجيهه مباشرة إلى لوحة التحكم
    const existingSession = JSON.parse(localStorage.getItem('yzUserSession'));
    if (existingSession && existingSession.isAdmin) {
        window.location.href = '../dashboard/dashboard.html';
        return; // إيقاف تنفيذ بقية الكود
    }

    const loginForm = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        errorMessage.classList.remove('show'); // إخفاء أي رسالة خطأ سابقة

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // التحقق من بيانات الدخول
        if (email === 'admin@login.com' && password === 'admin13579') {
            // نجاح تسجيل الدخول
            
            // إنشاء كائن جلسة المستخدم
            const userSession = {
                id: 'U001', // ID افتراضي للأدمن
                name: 'المدير يزيد',
                email: 'admin@login.com',
                isAdmin: true
            };
            
            // تخزين الجلسة في localStorage
            localStorage.setItem('yzUserSession', JSON.stringify(userSession));
            
            // توجيه المستخدم إلى لوحة التحكم
            window.location.href = '../dashboard/dashboard.html';

        } else {
            // فشل تسجيل الدخول
            errorMessage.textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
            errorMessage.classList.add('show');
        }
    });
});