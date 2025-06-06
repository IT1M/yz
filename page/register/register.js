// إعداد supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
const supabaseUrl = "https://qovspvegmjvslzizibxr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvdnNwdmVnbWp2c2x6aXppYnhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTU0NjcsImV4cCI6MjA2NDc5MTQ2N30.RNvl_GWX8fWNnGi2Nkq4HPVTYFbhKamfygdvtG55bOY";
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");
    const nameInput = document.getElementById("nameInput");
    const emailInput = document.getElementById("emailInput");
    const passwordInput = document.getElementById("passwordInput");
    const errorMessage = document.getElementById("errorMessage");

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorMessage.classList.remove("show");
        errorMessage.textContent = "";

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!name || !email || !password) {
            errorMessage.textContent = "يرجى تعبئة جميع الحقول.";
            errorMessage.classList.add("show");
            return;
        }

        // إنشاء مستخدم جديد في Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });

        if (error) {
            errorMessage.textContent = error.message === "User already registered"
                ? "البريد الإلكتروني مستخدم بالفعل."
                : "حدث خطأ أثناء إنشاء الحساب: " + error.message;
            errorMessage.classList.add("show");
            return;
        }

        // إضافة الاسم إلى جدول profiles (اختياري، إذا كان موجود)
        try {
            await supabase
                .from("profiles")
                .upsert([{ id: data.user.id, name, email }], { onConflict: ["id"] });
        } catch (e) {
            // تجاهل الخطأ هنا، الحساب تم إنشاؤه بنجاح
        }

        // إعلام المستخدم بالنجاح وتوجيهه
        alert("تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.");
        window.location.href = "../login/login.html";
    });
});
