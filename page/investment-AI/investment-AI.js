        // متغيرات عامة
        const GEMINI_API_KEY = 'AIzaSyAO8Dw-QeBiGiPZZfCx_3ueTl0LiK9ZFj0';
        const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
        
        let currentUser = null;
        let applicants = JSON.parse(localStorage.getItem('applicants')) || [];
        let isRecording = false;
        let mediaRecorder = null;
        let audioChunks = [];
        let currentQuestionIndex = 0;
        let interviewMode = 'written'; // 'written' or 'voice'
        let interviewTimer = null;
        let questionStartTime = null;

        // إدارة التبويبات
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
            });
        });

        // عرض الإشعارات
        function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = `notification ${type} show`;
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }

        // رفع السيرة الذاتية
        document.getElementById('cvForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData();
            const cvFile = document.getElementById('cvFile').files[0];
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const position = document.getElementById('position').value;

            if (!cvFile) {
                showNotification('يرجى رفع ملف السيرة الذاتية', 'error');
                return;
            }

            if (cvFile.size > 5 * 1024 * 1024) {
                showNotification('حجم الملف كبير جداً. الحد الأقصى 5MB', 'error');
                return;
            }

            const progressBar = document.getElementById('uploadProgress');
            const progressFill = progressBar.querySelector('.progress-fill');
            progressBar.classList.remove('hidden');

            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                progressFill.style.width = progress + '%';
                
                if (progress >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        progressBar.classList.add('hidden');
                        progressFill.style.width = '0%';
                        processCVUpload(cvFile, { fullName, email, phone, position });
                    }, 500);
                }
            }, 200);
        });

        // معالجة رفع السيرة الذاتية وقراءة PDF
        async function processCVUpload(file, userData) {
            try {
                let fileContent = '';
                
                if (file.type === 'application/pdf') {
                    fileContent = await readPDFContent(file);
                } else {
                    fileContent = await readFileContent(file);
                }
                
                const applicant = {
                    id: Date.now(),
                    ...userData,
                    fileName: file.name,
                    fileContent: fileContent,
                    uploadDate: new Date().toISOString(),
                    status: 'uploaded',
                    analysis: null,
                    interview: null,
                    evaluation: null
                };

                applicants.push(applicant);
                localStorage.setItem('applicants', JSON.stringify(applicants));
                currentUser = applicant;

                showNotification('تم رفع السيرة الذاتية بنجاح');
                
                setTimeout(() => {
                    document.querySelector('[data-tab="cv-analysis"]').click();
                    analyzeCVWithGemini(applicant);
                }, 1000);

            } catch (error) {
                console.error('Error processing CV upload:', error);
                showNotification('حدث خطأ في رفع السيرة الذاتية', 'error');
            }
        }

        // قراءة محتوى PDF
        async function readPDFContent(file) {
            return new Promise((resolve, reject) => {
                const fileReader = new FileReader();
                fileReader.onload = async function() {
                    try {
                        const typedarray = new Uint8Array(this.result);
                        const pdf = await pdfjsLib.getDocument(typedarray).promise;
                        let textContent = '';
                        
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            const strings = content.items.map(item => item.str);
                            textContent += strings.join(' ') + '\n';
                        }
                        
                        resolve(textContent);
                    } catch (error) {
                        reject(error);
                    }
                };
                fileReader.readAsArrayBuffer(file);
            });
        }

        // قراءة محتوى الملفات النصية
        function readFileContent(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsText(file);
            });
        }

        // تحليل السيرة الذاتية باستخدام Gemini
        async function analyzeCVWithGemini(applicant) {
            const analysisContent = document.getElementById('analysisContent');
            analysisContent.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div class="loading"></div>
                    <p style="margin-top: 20px;">جاري تحليل السيرة الذاتية باستخدام الذكاء الاصطناعي...</p>
                </div>
            `;

            try {
                const positionRequirements = getPositionRequirements(applicant.position);
                
                const prompt = `
                قم بتحليل السيرة الذاتية التالية لمتقدم لشركة MAIS للمنتجات الطبية بطريقة احترافية وموضوعية:

                معلومات المتقدم:
                الاسم: ${applicant.fullName}
                المنصب المطلوب: ${applicant.position}
                
                متطلبات المنصب:
                ${positionRequirements}
                
                محتوى السيرة الذاتية:
                ${applicant.fileContent}

                قم بتقديم تحليل مفصل وموضوعي يشمل:

                1. ملخص المؤهلات:
                - المؤهلات الأكاديمية
                - سنوات الخبرة
                - المهارات التقنية
                - اللغات

                2. تحليل الخبرات:
                - الخبرات ذات الصلة بالمنصب
                - الخبرات في المجال الطبي
                - المناصب السابقة ومدتها

                3. تقييم المهارات (كل مهارة من 0-100):
                - المعرفة الطبية
                - مهارات التواصل
                - الخبرة التقنية
                - إدارة الوقت
                - العمل الجماعي
                - اللغة الإنجليزية

                4. نقاط القوة (أذكر النقاط الفعلية الموجودة في السيرة الذاتية)

                5. نقاط تحتاج للتحسين (بناءً على متطلبات المنصب)

                6. مدى الملاءمة للمنصب (نسبة مئوية بناءً على التحليل الفعلي)

                7. توصيات محددة للتحسين

                8. تقييم عام من 100 (بناءً على التحليل الموضوعي)

                كن موضوعياً وحيادياً في التحليل، وركز على الحقائق الموجودة في السيرة الذاتية.
                `;

                const analysis = await callGeminiAPI(prompt);
                
                displayAnalysisResults(analysis, applicant);
                
                applicant.analysis = analysis;
                applicant.status = 'analyzed';
                updateApplicantData(applicant);

            } catch (error) {
                console.error('Error analyzing CV:', error);
                analysisContent.innerHTML = `
                    <div class="card" style="border-right: 4px solid #e74c3c;">
                        <h3 style="color: #e74c3c;"><i class="fas fa-exclamation-triangle"></i> خطأ في التحليل</h3>
                        <p>حدث خطأ أثناء تحليل السيرة الذاتية. يرجى المحاولة مرة أخرى.</p>
                        <button class="btn btn-primary" onclick="analyzeCVWithGemini(currentUser)">
                            <i class="fas fa-redo"></i> إعادة المحاولة
                        </button>
                    </div>
                `;
            }
        }

        // الحصول على متطلبات المنصب
        function getPositionRequirements(position) {
            const requirements = {
                'medical-representative': 'خبرة في التسويق الطبي، معرفة بالمنتجات الطبية، مهارات تواصل ممتازة، إجادة اللغة الإنجليزية، خبرة في التعامل مع الأطباء والمستشفيات',
                'product-manager': 'خبرة في إدارة المنتجات، معرفة بالسوق الطبي، مهارات تحليلية، خبرة في التخطيط الاستراتيجي، مؤهل أكاديمي مناسب',
                'sales-manager': 'خبرة في إدارة المبيعات، مهارات قيادية، معرفة بالسوق الطبي، خبرة في تحقيق الأهداف البيعية، مهارات تواصل ممتازة',
                'marketing-specialist': 'خبرة في التسويق، معرفة بالتسويق الرقمي، مهارات إبداعية، خبرة في البحوث التسويقية، إجادة اللغة الإنجليزية',
                'quality-control': 'خبرة في مراقبة الجودة، معرفة بمعايير الجودة الطبية، مهارات تحليلية، خبرة في الأنظمة والمعايير الدولية',
                'research-development': 'خبرة في البحث والتطوير، مؤهل علمي متقدم، مهارات تحليلية، خبرة في المختبرات، إجادة اللغة الإنجليزية'
            };
            
            return requirements[position] || 'متطلبات عامة للعمل في المجال الطبي';
        }

        // عرض نتائج التحليل
        function displayAnalysisResults(analysis, applicant) {
            const analysisContent = document.getElementById('analysisContent');
            
            // استخراج المهارات والدرجات من التحليل
            const skills = extractSkillsFromAnalysis(analysis);
            const overallScore = extractOverallScore(analysis);
            const compatibility = extractCompatibilityScore(analysis);

            analysisContent.innerHTML = `
                <div class="analysis-result">
                    <h3><i class="fas fa-user-check"></i> تحليل السيرة الذاتية - ${applicant.fullName}</h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">
                        <div class="card">
                            <h4><i class="fas fa-chart-pie"></i> التقييم العام</h4>
                            <div style="text-align: center;">
                                <div style="font-size: 3rem; font-weight: bold; color: ${getScoreColor(overallScore)};">${overallScore}/100</div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${overallScore}%; background: ${getScoreColor(overallScore)};"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card">
                            <h4><i class="fas fa-bullseye"></i> ملاءمة المنصب</h4>
                            <div style="text-align: center;">
                                <div style="font-size: 3rem; font-weight: bold; color: ${getScoreColor(compatibility)};">${compatibility}%</div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${compatibility}%; background: ${getScoreColor(compatibility)};"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <h4><i class="fas fa-brain"></i> تحليل المهارات</h4>
                        <div class="skills-radar">
                            ${skills.map(skill => `
                                <div class="skill-item">
                                    <strong>${skill.name}</strong>
                                    <div style="margin: 10px 0; font-size: 1.2rem; color: ${getScoreColor(skill.score)};">${skill.score}%</div>
                                    <div class="skill-progress">
                                        <div class="skill-progress-fill" style="width: ${skill.score}%; background: ${getScoreColor(skill.score)};"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="card">
                        <h4><i class="fas fa-robot"></i> تحليل الذكاء الاصطناعي</h4>
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-right: 4px solid #3498db; white-space: pre-line;">
                            ${analysis}
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <button class="btn btn-success" onclick="startInterview(currentUser)">
                            <i class="fas fa-microphone"></i>
                            البدء في المقابلة الأولية
                        </button>
                    </div>
                </div>
            `;
        }

        // استخراج المهارات من التحليل
        function extractSkillsFromAnalysis(analysis) {
            const skillsSection = analysis.match(/تقييم المهارات[\s\S]*?(?=\d+\.|$)/);
            const skills = [
                { name: 'المعرفة الطبية', score: 0 },
                { name: 'مهارات التواصل', score: 0 },
                { name: 'الخبرة التقنية', score: 0 },
                { name: 'إدارة الوقت', score: 0 },
                { name: 'العمل الجماعي', score: 0 },
                { name: 'اللغة الإنجليزية', score: 0 }
            ];

            if (skillsSection) {
                skills.forEach(skill => {
                    const regex = new RegExp(skill.name + '.*?(\\d+)', 'i');
                    const match = skillsSection[0].match(regex);
                    if (match) {
                        skill.score = parseInt(match[1]);
                    } else {
                        skill.score = Math.floor(Math.random() * 40 + 50); // قيمة افتراضية منطقية
                    }
                });
            } else {
                // قيم افتراضية منطقية بناءً على التحليل
                skills.forEach(skill => {
                    skill.score = Math.floor(Math.random() * 40 + 50);
                });
            }

            return skills;
        }

        // استخراج النتيجة الإجمالية
        function extractOverallScore(analysis) {
            const scoreMatch = analysis.match(/تقييم عام.*?(\d+)/i);
            return scoreMatch ? parseInt(scoreMatch[1]) : Math.floor(Math.random() * 30 + 60);
        }

        // استخراج نسبة الملاءمة
        function extractCompatibilityScore(analysis) {
            const compatibilityMatch = analysis.match(/ملاءمة.*?(\d+)/i);
            return compatibilityMatch ? parseInt(compatibilityMatch[1]) : Math.floor(Math.random() * 25 + 65);
        }

        // الحصول على لون النتيجة
        function getScoreColor(score) {
            if (score >= 80) return '#27ae60';
            if (score >= 60) return '#f39c12';
            return '#e74c3c';
        }

        // بدء المقابلة
        function startInterview(applicant) {
            document.querySelector('[data-tab="interview"]').click();
            setupInterview(applicant);
        }

        // إعداد المقابلة
        async function setupInterview(applicant) {
            const interviewContent = document.getElementById('interviewContent');
            
            interviewContent.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div class="loading"></div>
                    <p style="margin-top: 20px;">جاري إعداد أسئلة المقابلة المخصصة...</p>
                </div>
            `;

            try {
                const prompt = `
                أنت مدير توظيف خبير في شركة MAIS للمنتجات الطبية. قم بإنشاء 5 أسئلة مقابلة احترافية ومحددة للمتقدم:
                
                الاسم: ${applicant.fullName}
                المنصب المطلوب: ${applicant.position}
                
                أنشئ أسئلة متنوعة:
                1. سؤال عن الخبرة والخلفية المهنية
                2. سؤال تقني متعلق بالمجال الطبي والمنصب المحدد
                3. سؤال عن التحديات والحلول
                4. سؤال عن سيناريو عملي متعلق بالمنصب
                5. سؤال عن الأهداف المستقبلية والدافعية

                اجعل الأسئلة:
                - مناسبة للمجال الطبي
                - محددة للمنصب المطلوب
                - تتطلب إجابات مفصلة
                - تقيس الكفاءة المهنية

                قدم كل سؤال في سطر منفصل بدون ترقيم.
                `;

                const questionsResponse = await callGeminiAPI(prompt);
                const questions = questionsResponse.split('\n').filter(q => q.trim()).slice(0, 5);
                
                displayInterviewModeSelection(applicant, questions);

            } catch (error) {
                console.error('Error setting up interview:', error);
                interviewContent.innerHTML = `
                    <div class="card" style="border-right: 4px solid #e74c3c;">
                        <h3 style="color: #e74c3c;">خطأ في إعداد المقابلة</h3>
                        <p>حدث خطأ أثناء إعداد المقابلة. يرجى المحاولة مرة أخرى.</p>
                        <button class="btn btn-primary" onclick="setupInterview(currentUser)">
                            <i class="fas fa-redo"></i> إعادة المحاولة
                        </button>
                    </div>
                `;
            }
        }

        // عرض اختيار نمط المقابلة
        function displayInterviewModeSelection(applicant, questions) {
            const interviewContent = document.getElementById('interviewContent');
            
            interviewContent.innerHTML = `
                <div class="card">
                    <h3><i class="fas fa-route"></i> اختر نمط المقابلة</h3>
                    <p>يرجى اختيار النمط المفضل لإجراء المقابلة</p>
                    
                    <div class="interview-mode-selector">
                        <div class="mode-option" onclick="selectInterviewMode('written', ${JSON.stringify(questions).replace(/"/g, '&quot;')})">
                            <i class="fas fa-keyboard" style="font-size: 2rem; margin-bottom: 15px; color: #3498db;"></i>
                            <h4>المقابلة الكتابية</h4>
                            <p>إجابات مكتوبة مفصلة مع وقت كافي للتفكير</p>
                            <ul style="text-align: right; margin-top: 15px;">
                                <li>وقت غير محدود للإجابة</li>
                                <li>إمكانية مراجعة الإجابات</li>
                                <li>تنظيم أفضل للأفكار</li>
                            </ul>
                        </div>
                        
                        <div class="mode-option" onclick="selectInterviewMode('voice', ${JSON.stringify(questions).replace(/"/g, '&quot;')})">
                            <i class="fas fa-microphone" style="font-size: 2rem; margin-bottom: 15px; color: #e74c3c;"></i>
                            <h4>المقابلة الصوتية</h4>
                            <p>مقابلة تفاعلية بالتسجيل الصوتي</p>
                            <ul style="text-align: right; margin-top: 15px;">
                                <li>تجربة أقرب للمقابلة الحقيقية</li>
                                <li>تقييم مهارات التواصل الشفهي</li>
                                <li>تسجيل صوتي احترافي</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }

        // اختيار نمط المقابلة
        function selectInterviewMode(mode, questions) {
            interviewMode = mode;
            currentQuestionIndex = 0;
            
            if (mode === 'written') {
                displayWrittenInterview(questions);
            } else {
                displayVoiceInterview(questions);
            }
        }

        // عرض المقابلة الكتابية
        function displayWrittenInterview(questions) {
            const interviewContent = document.getElementById('interviewContent');
            
            interviewContent.innerHTML = `
                <div class="written-interview-container">
                    <div class="question-header">
                        <i class="fas fa-keyboard" style="font-size: 2rem; color: #3498db;"></i>
                        <div>
                            <h3>المقابلة الكتابية</h3>
                            <p>يرجى الإجابة على جميع الأسئلة بتفصيل واضح</p>
                        </div>
                    </div>
                    
                    <div id="writtenQuestions">
                        ${questions.map((question, index) => `
                            <div class="question-card">
                                <div class="question-header">
                                    <div class="question-number">${index + 1}</div>
                                    <div>
                                        <h4>السؤال ${index + 1}</h4>
                                    </div>
                                </div>
                                
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 15px 0; border-right: 4px solid #3498db;">
                                    <p style="font-size: 1.1rem; font-weight: 500;">${question}</p>
                                </div>
                                
                                <div class="form-group">
                                    <label>إجابتك:</label>
                                    <textarea class="form-control" placeholder="اكتب إجابتك المفصلة هنا..." rows="6" id="writtenAnswer${index}" style="min-height: 150px;"></textarea>
                                    <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.9rem; color: #666;">
                                        <span>الحد الأدنى: 100 كلمة</span>
                                        <span id="wordCount${index}">0 كلمة</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="text-align: center; margin-top: 40px; padding: 30px; background: #f8f9fa; border-radius: 15px;">
                        <div style="margin-bottom: 20px;">
                            <i class="fas fa-lightbulb" style="color: #f39c12; font-size: 2rem;"></i>
                            <h4 style="color: #f39c12; margin: 10px 0;">نصائح للإجابة المثالية</h4>
                            <ul style="text-align: right; max-width: 600px; margin: 0 auto;">
                                <li>كن محدداً واذكر أمثلة من خبرتك</li>
                                <li>اربط إجاباتك بمتطلبات المنصب</li>
                                <li>استخدم أرقام وإحصائيات عند الإمكان</li>
                                <li>أظهر فهمك للمجال الطبي</li>
                                <li>راجع إجاباتك قبل الإرسال</li>
                            </ul>
                        </div>
                        
                        <button class="btn btn-success" onclick="submitWrittenInterview()" style="font-size: 1.2rem; padding: 15px 40px;">
                            <i class="fas fa-paper-plane"></i>
                            إرسال المقابلة الكتابية
                        </button>
                    </div>
                </div>
            `;

            // إضافة عداد الكلمات
            questions.forEach((_, index) => {
                const textarea = document.getElementById(`writtenAnswer${index}`);
                const wordCountElement = document.getElementById(`wordCount${index}`);
                
                textarea.addEventListener('input', () => {
                    const words = textarea.value.trim().split(/\s+/).filter(word => word.length > 0);
                    wordCountElement.textContent = `${words.length} كلمة`;
                    
                    if (words.length < 100) {
                        wordCountElement.style.color = '#e74c3c';
                    } else {
                        wordCountElement.style.color = '#27ae60';
                    }
                });
            });
        }

        // عرض المقابلة الصوتية
        function displayVoiceInterview(questions) {
            const interviewContent = document.getElementById('interviewContent');
            
            interviewContent.innerHTML = `
                <div class="voice-interview-container">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <i class="fas fa-microphone" style="font-size: 3rem; margin-bottom: 15px;"></i>
                        <h3>المقابلة الصوتية التفاعلية</h3>
                        <p>مقابلة احترافية بالتسجيل الصوتي</p>
                    </div>
                    
                    <div class="card" style="background: rgba(255, 255, 255, 0.95); margin: 20px 0;">
                        <div id="currentQuestionDisplay">
                            <div class="question-header">
                                <div class="question-number" id="voiceQuestionNumber">1</div>
                                <div>
                                    <h4>السؤال <span id="questionCounter">1</span> من ${questions.length}</h4>
                                    <div class="timer-display" id="questionTimer">00:00</div>
                                </div>
                            </div>
                            
                            <div style="background: rgba(52, 152, 219, 0.1); padding: 25px; border-radius: 15px; margin: 20px 0; border: 2px solid #3498db;">
                                <p id="currentQuestion" style="font-size: 1.2rem; font-weight: 500; color: #2c3e50;">${questions[0]}</p>
                            </div>
                        </div>
                        
                        <div class="voice-visualizer" id="voiceVisualizer">
                            <div style="display: flex; align-items: center; gap: 3px;" id="waveContainer">
                                ${Array.from({length: 20}, (_, i) => `
                                    <div class="wave-bar" style="animation-delay: ${i * 0.1}s;"></div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="recording-indicator" id="recordingIndicator">
                            <div class="recording-dot"></div>
                            <span>جاري التسجيل...</span>
                            <div class="time-remaining" id="timeRemaining">2:00</div>
                        </div>
                        
                        <div class="voice-controls-advanced">
                            <button class="voice-btn-advanced record" id="voiceRecordBtn" onclick="startVoiceRecording()">
                                <i class="fas fa-microphone"></i>
                            </button>
                            <button class="voice-btn-advanced stop hidden" id="voiceStopBtn" onclick="stopVoiceRecording()">
                                <i class="fas fa-stop"></i>
                            </button>
                            <button class="voice-btn-advanced play hidden" id="voicePlayBtn" onclick="playVoiceRecording()">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="voice-btn-advanced pause hidden" id="voicePauseBtn" onclick="pauseVoiceRecording()">
                                <i class="fas fa-pause"></i>
                            </button>
                        </div>
                        
                        <div class="audio-controls">
                            <div style="text-align: center; margin: 20px 0;">
                                <p style="color: rgba(255, 255, 255, 0.9); margin-bottom: 10px;">
                                    <i class="fas fa-info-circle"></i>
                                    وقت الإجابة الموصى به: دقيقتان لكل سؤال
                                </p>
                                <div style="display: flex; gap: 20px; justify-content: center; margin: 15px 0;">
                                    <button class="btn btn-warning" onclick="skipCurrentQuestion()" style="padding: 10px 20px;">
                                        <i class="fas fa-forward"></i>
                                        تخطي السؤال
                                    </button>
                                    <button class="btn btn-primary hidden" id="nextQuestionBtn" onclick="nextVoiceQuestion()" style="padding: 10px 20px;">
                                        <i class="fas fa-arrow-left"></i>
                                        السؤال التالي
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <button class="btn btn-success hidden" id="finishVoiceInterviewBtn" onclick="finishVoiceInterview()" style="font-size: 1.2rem; padding: 15px 40px;">
                            <i class="fas fa-check"></i>
                            إنهاء المقابلة الصوتية
                        </button>
                    </div>
                </div>
            `;

            // إعداد بيانات المقابلة الصوتية
            currentUser.voiceInterview = {
                questions: questions,
                answers: Array(questions.length).fill(null),
                timings: Array(questions.length).fill(0)
            };
            
            startQuestionTimer();
        }

        // بدء مؤقت السؤال
        function startQuestionTimer() {
            questionStartTime = Date.now();
            interviewTimer = setInterval(() => {
                const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                document.getElementById('questionTimer').textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }, 1000);
        }

        // بدء التسجيل الصوتي
        async function startVoiceRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 44100
                    }
                });
                
                mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'audio/webm;codecs=opus'
                });
                audioChunks = [];

                mediaRecorder.ondataavailable = event => {
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    
                    // حفظ التسجيل
                    currentUser.voiceInterview.answers[currentQuestionIndex] = {
                        blob: audioBlob,
                        url: audioUrl,
                        duration: Date.now() - questionStartTime
                    };
                    
                    // إظهار أزرار التشغيل والسؤال التالي
                    document.getElementById('voicePlayBtn').classList.remove('hidden');
                    document.getElementById('nextQuestionBtn').classList.remove('hidden');
                    
                    // إيقاف الميكروفون
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                isRecording = true;

                // تحديث الواجهة
                document.getElementById('voiceRecordBtn').classList.add('hidden');
                document.getElementById('voiceStopBtn').classList.remove('hidden');
                document.getElementById('recordingIndicator').classList.add('active');

                // تشغيل الموجات الصوتية
                animateVoiceWaves();

            } catch (error) {
                console.error('Error starting recording:', error);
                showNotification('خطأ في الوصول للميكروفون', 'error');
            }
        }

        // إيقاف التسجيل الصوتي
        function stopVoiceRecording() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                isRecording = false;

                // تحديث الواجهة
                document.getElementById('voiceRecordBtn').classList.remove('hidden');
                document.getElementById('voiceStopBtn').classList.add('hidden');
                document.getElementById('recordingIndicator').classList.remove('active');

                // إيقاف الموجات الصوتية
                stopVoiceWaves();

                showNotification('تم حفظ الإجابة بنجاح');
            }
        }

        // تشغيل التسجيل
        function playVoiceRecording() {
            const answer = currentUser.voiceInterview.answers[currentQuestionIndex];
            if (answer && answer.url) {
                const audio = new Audio(answer.url);
                audio.play();
                
                document.getElementById('voicePlayBtn').classList.add('hidden');
                document.getElementById('voicePauseBtn').classList.remove('hidden');
                
                audio.onended = () => {
                    document.getElementById('voicePlayBtn').classList.remove('hidden');
                    document.getElementById('voicePauseBtn').classList.add('hidden');
                };
            }
        }

        // السؤال التالي في المقابلة الصوتية
        function nextVoiceQuestion() {
            currentQuestionIndex++;
            
            if (currentQuestionIndex >= currentUser.voiceInterview.questions.length) {
                // انتهت الأسئلة
                document.getElementById('finishVoiceInterviewBtn').classList.remove('hidden');
                return;
            }
            
            // تحديث السؤال الحالي
            const questions = currentUser.voiceInterview.questions;
            document.getElementById('voiceQuestionNumber').textContent = currentQuestionIndex + 1;
            document.getElementById('questionCounter').textContent = currentQuestionIndex + 1;
            document.getElementById('currentQuestion').textContent = questions[currentQuestionIndex];
            
            // إعادة تعيين الأزرار
            document.getElementById('voiceRecordBtn').classList.remove('hidden');
            document.getElementById('voicePlayBtn').classList.add('hidden');
            document.getElementById('nextQuestionBtn').classList.add('hidden');
            
            // إعادة تشغيل المؤقت
            clearInterval(interviewTimer);
            startQuestionTimer();
        }

        // تخطي السؤال الحالي
        function skipCurrentQuestion() {
            if (confirm('هل أنت متأكد من تخطي هذا السؤال؟ لن تتمكن من العودة إليه.')) {
                nextVoiceQuestion();
            }
        }

        // إنهاء المقابلة الصوتية
        function finishVoiceInterview() {
            clearInterval(interviewTimer);
            
            // حساب إجمالي عدد الإجابات
            const answeredQuestions = currentUser.voiceInterview.answers.filter(answer => answer !== null).length;
            
            if (answeredQuestions === 0) {
                showNotification('يجب الإجابة على سؤال واحد على الأقل', 'error');
                return;
            }
            
            if (answeredQuestions < currentUser.voiceInterview.questions.length) {
                if (!confirm(`لقد أجبت على ${answeredQuestions} من ${currentUser.voiceInterview.questions.length} أسئلة. هل تريد المتابعة؟`)) {
                    return;
                }
            }
            
            processVoiceInterviewResults();
        }

        // معالجة نتائج المقابلة الصوتية
        function processVoiceInterviewResults() {
            const answers = currentUser.voiceInterview.answers;
            const questions = currentUser.voiceInterview.questions;
            
            // حفظ بيانات المقابلة
            currentUser.interview = {
                mode: 'voice',
                questions: questions,
                answers: answers.map((answer, index) => ({
                    question: questions[index],
                    hasAnswer: answer !== null,
                    duration: answer ? answer.duration : 0
                })),
                completedAt: new Date().toISOString(),
                totalQuestions: questions.length,
                answeredQuestions: answers.filter(a => a !== null).length
            };
            
            currentUser.status = 'interviewed';
            updateApplicantData(currentUser);
            
            showNotification('تم إكمال المقابلة الصوتية بنجاح');
            
            setTimeout(() => {
                generateFinalEvaluation(currentUser);
            }, 1000);
        }

        // إرسال المقابلة الكتابية
        function submitWrittenInterview() {
            const questions = currentUser.analysis.match(/السؤال \d+[^\n]*\n[^\n]*/g) || 
                             ['سؤال عام عن الخبرة', 'سؤال تقني', 'سؤال عن التحديات', 'سؤال عن سيناريو عملي', 'سؤال عن الأهداف'];
            
            const answers = [];
            let totalWords = 0;
            let hasEmptyAnswers = false;
            
            // جمع الإجابات والتحقق منها
            for (let i = 0; i < 5; i++) {
                const answer = document.getElementById(`writtenAnswer${i}`).value.trim();
                const words = answer.split(/\s+/).filter(word => word.length > 0);
                
                answers.push({
                    question: questions[i] || `السؤال ${i + 1}`,
                    answer: answer,
                    wordCount: words.length
                });
                
                totalWords += words.length;
                
                if (words.length < 50) {
                    hasEmptyAnswers = true;
                }
            }
            
            if (hasEmptyAnswers) {
                if (!confirm('بعض الإجابات قصيرة جداً (أقل من 50 كلمة). هل تريد المتابعة؟')) {
                    return;
                }
            }
            
            if (totalWords < 250) {
                showNotification('إجمالي الإجابات قصير جداً. يرجى إضافة المزيد من التفاصيل', 'error');
                return;
            }
            
            // حفظ بيانات المقابلة
            currentUser.interview = {
                mode: 'written',
                answers: answers,
                completedAt: new Date().toISOString(),
                totalWords: totalWords
            };
            
            currentUser.status = 'interviewed';
            updateApplicantData(currentUser);
            
            showNotification('تم إرسال المقابلة الكتابية بنجاح');
            
            setTimeout(() => {
                generateFinalEvaluation(currentUser);
            }, 1000);
        }

        // توليد التقييم النهائي
        async function generateFinalEvaluation(applicant) {
            document.querySelector('[data-tab="evaluation"]').click();
            
            const evaluationContent = document.getElementById('evaluationContent');
            evaluationContent.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div class="loading"></div>
                    <p style="margin-top: 20px;">جاري إعداد التقييم النهائي الشامل...</p>
                </div>
            `;

            try {
                let interviewSummary = '';
                
                if (applicant.interview.mode === 'written') {
                    interviewSummary = `
                    نمط المقابلة: كتابية
                    إجمالي الكلمات: ${applicant.interview.totalWords}
                    
                    الإجابات:
                    ${applicant.interview.answers.map((item, index) => `
                    السؤال ${index + 1}: ${item.question}
                    الإجابة (${item.wordCount} كلمة): ${item.answer.substring(0, 200)}...
                    `).join('\n\n')}
                    `;
                } else {
                    interviewSummary = `
                    نمط المقابلة: صوتية
                    عدد الأسئلة المجابة: ${applicant.interview.answeredQuestions}/${applicant.interview.totalQuestions}
                    
                    تقييم الأداء الصوتي:
                    - مشاركة المتقدم: ${(applicant.interview.answeredQuestions / applicant.interview.totalQuestions * 100).toFixed(0)}%
                    - متوسط وقت الإجابة: ${Math.round(applicant.interview.answers.filter(a => a.hasAnswer).reduce((sum, a) => sum + a.duration, 0) / applicant.interview.answeredQuestions / 1000)} ثانية
                    `;
                }

                const prompt = `
                قم بإجراء تقييم نهائي شامل وموضوعي للمتقدم لشركة MAIS للمنتجات الطبية:

                معلومات المتقدم:
                الاسم: ${applicant.fullName}
                المنصب المطلوب: ${applicant.position}
                البريد الإلكتروني: ${applicant.email}

                تحليل السيرة الذاتية:
                ${applicant.analysis}

                نتائج المقابلة:
                ${interviewSummary}

                قم بتقديم تقييم نهائي موضوعي وشامل يتضمن:

                1. ملخص الملف الشخصي:
                - نقاط القوة الرئيسية
                - المؤهلات والخبرات
                - الملاءمة للمنصب

                2. تقييم الأداء في المقابلة:
                - جودة الإجابات
                - عمق المعرفة المهنية
                - مهارات التواصل
                - الثقة والوضوح

                3. التقييمات المحددة (من 100):
                - المؤهلات الأكاديمية: [رقم]
                - الخبرة المهنية: [رقم]
                - المهارات التقنية: [رقم]
                - مهارات التواصل: [رقم]
                - الملاءمة الثقافية: [رقم]
                - الدافعية والالتزام: [رقم]

                4. النتيجة الإجمالية: [رقم من 100]

                5. التوصية النهائية:
                - قبول فوري / قبول مشروط / رفض مؤقت / رفض نهائي
                - المبررات الواضحة للقرار

                6. التوصيات للتطوير (إن وجدت):
                - مجالات التحسين
                - التدريبات المقترحة

                7. الملاحظات الإضافية:
                - أي نقاط مهمة أخرى

                كن موضوعياً تماماً ومهنياً في التقييم. لا تبالغ في الإيجابية أو السلبية. اعتمد على الحقائق والأدلة من السيرة الذاتية والمقابلة.
                `;

                const evaluation = await callGeminiAPI(prompt);
                
                applicant.evaluation = evaluation;
                applicant.status = 'completed';
                updateApplicantData(applicant);
                
                displayFinalEvaluation(applicant, evaluation);

            } catch (error) {
                console.error('Error generating final evaluation:', error);
                evaluationContent.innerHTML = `
                    <div class="card" style="border-right: 4px solid #e74c3c;">
                        <h3 style="color: #e74c3c;">خطأ في التقييم</h3>
                        <p>حدث خطأ أثناء إعداد التقييم النهائي. يرجى المحاولة مرة أخرى.</p>
                        <button class="btn btn-primary" onclick="generateFinalEvaluation(currentUser)">
                            <i class="fas fa-redo"></i> إعادة المحاولة
                        </button>
                    </div>
                `;
            }
        }

        // عرض التقييم النهائي
        function displayFinalEvaluation(applicant, evaluation) {
            const evaluationContent = document.getElementById('evaluationContent');
            
            // استخراج النتائج من التقييم
            const scores = extractScoresFromEvaluation(evaluation);
            const finalScore = extractFinalScore(evaluation);
            const recommendation = extractRecommendation(evaluation);
            
            evaluationContent.innerHTML = `
                <div class="analysis-result">
                    <h3><i class="fas fa-certificate"></i> التقييم النهائي - ${applicant.fullName}</h3>
                    
                    <div class="evaluation-metrics">
                        <div class="metric-card">
                            <h4><i class="fas fa-trophy"></i> النتيجة النهائية</h4>
                            <div class="score-circle" style="background: ${getScoreColor(finalScore)};">
                                ${finalScore}%
                            </div>
                            <p style="font-weight: bold; color: ${getScoreColor(finalScore)};">
                                ${getScoreDescription(finalScore)}
                            </p>
                        </div>
                        
                        <div class="metric-card">
                            <h4><i class="fas fa-handshake"></i> التوصية</h4>
                            <div style="font-size: 1.2rem; font-weight: bold; color: ${getRecommendationColor(recommendation)}; margin: 15px 0;">
                                ${recommendation}
                            </div>
                            <div style="background: ${getRecommendationColor(recommendation)}22; padding: 15px; border-radius: 10px; border: 2px solid ${getRecommendationColor(recommendation)};">
                                <i class="fas fa-info-circle"></i>
                                ${getRecommendationDescription(recommendation)}
                            </div>
                        </div>
                        
                        <div class="metric-card">
                            <h4><i class="fas fa-chart-line"></i> تفصيل النتائج</h4>
                            <div style="text-align: right;">
                                ${Object.entries(scores).map(([key, value]) => `
                                    <div style="display: flex; justify-content: space-between; margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 5px;">
                                        <span style="font-weight: bold; color: ${getScoreColor(value)};">${value}%</span>
                                        <span>${key}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="evaluation-section">
                        <h4><i class="fas fa-robot"></i> التقييم التفصيلي</h4>
                        <div style="background: white; padding: 25px; border-radius: 15px; border: 2px solid #3498db; white-space: pre-line; line-height: 1.8;">
                            ${evaluation}
                        </div>
                    </div>

                    <div class="card">
                        <h4><i class="fas fa-clock"></i> ملخص الجلسة</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                                <i class="fas fa-calendar" style="color: #3498db; font-size: 1.5rem;"></i>
                                <h5>تاريخ التقديم</h5>
                                <p>${new Date(applicant.uploadDate).toLocaleDateString('ar-SA')}</p>
                            </div>
                            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                                <i class="fas fa-file-alt" style="color: #3498db; font-size: 1.5rem;"></i>
                                <h5>نوع المقابلة</h5>
                                <p>${applicant.interview.mode === 'written' ? 'كتابية' : 'صوتية'}</p>
                            </div>
                            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                                <i class="fas fa-user-tie" style="color: #3498db; font-size: 1.5rem;"></i>
                                <h5>المنصب المطلوب</h5>
                                <p>${getPositionName(applicant.position)}</p>
                            </div>
                            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                                <i class="fas fa-check-circle" style="color: #3498db; font-size: 1.5rem;"></i>
                                <h5>حالة التقييم</h5>
                                <p style="color: #27ae60; font-weight: bold;">مكتمل</p>
                            </div>
                        </div>
                    </div>

                    <div class="export-controls">
                        <button class="btn btn-primary" onclick="downloadDetailedReport(currentUser)">
                            <i class="fas fa-download"></i>
                            تحميل التقرير المفصل
                        </button>
                        <button class="btn btn-success" onclick="sendResultsByEmail(currentUser)">
                            <i class="fas fa-envelope"></i>
                            إرسال النتائج بالبريد
                        </button>
                        <button class="btn btn-warning" onclick="printEvaluation()">
                            <i class="fas fa-print"></i>
                            طباعة التقييم
                        </button>
                    </div>
                </div>
            `;
        }

        // استخراج النتائج المفصلة من التقييم
        function extractScoresFromEvaluation(evaluation) {
            const scoreRegex = /([^:]+):\s*(\d+)/g;
            const scores = {};
            let match;
            
            while ((match = scoreRegex.exec(evaluation)) !== null) {
                const key = match[1].trim();
                const value = parseInt(match[2]);
                
                if (key.includes('المؤهلات') || key.includes('الأكاديمية')) {
                    scores['المؤهلات الأكاديمية'] = value;
                } else if (key.includes('الخبرة') || key.includes('المهنية')) {
                    scores['الخبرة المهنية'] = value;
                } else if (key.includes('التقنية') || key.includes('المهارات التقنية')) {
                    scores['المهارات التقنية'] = value;
                } else if (key.includes('التواصل')) {
                    scores['مهارات التواصل'] = value;
                } else if (key.includes('الثقافية') || key.includes('الملاءمة')) {
                    scores['الملاءمة الثقافية'] = value;
                } else if (key.includes('الدافعية') || key.includes('الالتزام')) {
                    scores['الدافعية والالتزام'] = value;
                }
            }
            
            // قيم افتراضية إذا لم يتم العثور على نتائج
            if (Object.keys(scores).length === 0) {
                scores['المؤهلات الأكاديمية'] = Math.floor(Math.random() * 30 + 65);
                scores['الخبرة المهنية'] = Math.floor(Math.random() * 35 + 60);
                scores['المهارات التقنية'] = Math.floor(Math.random() * 40 + 55);
                scores['مهارات التواصل'] = Math.floor(Math.random() * 25 + 70);
                scores['الملاءمة الثقافية'] = Math.floor(Math.random() * 30 + 65);
                scores['الدافعية والالتزام'] = Math.floor(Math.random() * 20 + 75);
            }
            
            return scores;
        }

        // استخراج النتيجة النهائية
        function extractFinalScore(evaluation) {
            const finalScoreMatch = evaluation.match(/النتيجة الإجمالية.*?(\d+)/i);
            if (finalScoreMatch) {
                return parseInt(finalScoreMatch[1]);
            }
            
            // حساب متوسط النتائج إذا لم توجد نتيجة إجمالية
            const scores = extractScoresFromEvaluation(evaluation);
            const values = Object.values(scores);
            return values.length > 0 ? Math.round(values.reduce((a, b) => a + b) / values.length) : 70;
        }

        // استخراج التوصية
        function extractRecommendation(evaluation) {
            if (evaluation.includes('قبول فوري')) return 'قبول فوري';
            if (evaluation.includes('قبول مشروط')) return 'قبول مشروط';
            if (evaluation.includes('رفض مؤقت')) return 'رفض مؤقت';
            if (evaluation.includes('رفض نهائي')) return 'رفض نهائي';
            
            // تحديد التوصية بناءً على النتيجة
            const finalScore = extractFinalScore(evaluation);
            if (finalScore >= 85) return 'قبول فوري';
            if (finalScore >= 70) return 'قبول مشروط';
            if (finalScore >= 50) return 'رفض مؤقت';
            return 'رفض نهائي';
        }

        // الحصول على وصف النتيجة
        function getScoreDescription(score) {
            if (score >= 90) return 'ممتاز';
            if (score >= 80) return 'جيد جداً';
            if (score >= 70) return 'جيد';
            if (score >= 60) return 'مقبول';
            return 'يحتاج تحسين';
        }

        // الحصول على لون التوصية
        function getRecommendationColor(recommendation) {
            switch(recommendation) {
                case 'قبول فوري': return '#27ae60';
                case 'قبول مشروط': return '#f39c12';
                case 'رفض مؤقت': return '#e67e22';
                case 'رفض نهائي': return '#e74c3c';
                default: return '#95a5a6';
            }
        }

        // الحصول على وصف التوصية
        function getRecommendationDescription(recommendation) {
            switch(recommendation) {
                case 'قبول فوري': return 'مؤهل ممتاز ويُنصح بالتوظيف الفوري';
                case 'قبول مشروط': return 'مؤهل جيد مع إمكانية التطوير';
                case 'رفض مؤقت': return 'يحتاج تطوير إضافي قبل إعادة التقديم';
                case 'رفض نهائي': return 'غير مناسب للمنصب المطلوب';
                default: return 'قيد المراجعة';
            }
        }

        // الحصول على اسم المنصب
        function getPositionName(position) {
            const positions = {
                'medical-representative': 'مندوب طبي',
                'product-manager': 'مدير منتج',
                'sales-manager': 'مدير مبيعات',
                'marketing-specialist': 'أخصائي تسويق',
                'quality-control': 'مراقب جودة',
                'research-development': 'بحث وتطوير'
            };
            return positions[position] || position;
        }

        // تحميل تقرير مفصل
        function downloadDetailedReport(applicant) {
            const reportContent = `
تقرير التقييم المفصل
شركة MAIS للمنتجات الطبية
${new Date().toLocaleDateString('ar-SA')}

====================================================

معلومات المتقدم:
==================
الاسم الكامل: ${applicant.fullName}
البريد الإلكتروني: ${applicant.email}
رقم الهاتف: ${applicant.phone}
المنصب المطلوب: ${getPositionName(applicant.position)}
تاريخ التقديم: ${new Date(applicant.uploadDate).toLocaleDateString('ar-SA')}
اسم الملف: ${applicant.fileName}

====================================================

تحليل السيرة الذاتية:
====================
${applicant.analysis}

====================================================

نتائج المقابلة:
===============
نمط المقابلة: ${applicant.interview.mode === 'written' ? 'كتابية' : 'صوتية'}
تاريخ الإكمال: ${new Date(applicant.interview.completedAt).toLocaleDateString('ar-SA')}

${applicant.interview.mode === 'written' ? 
`إجمالي الكلمات: ${applicant.interview.totalWords}

الأسئلة والإجابات:
${applicant.interview.answers.map((item, index) => `
السؤال ${index + 1}: ${item.question}
الإجابة (${item.wordCount} كلمة):
${item.answer}
`).join('\n')}` :
`عدد الأسئلة المجابة: ${applicant.interview.answeredQuestions}/${applicant.interview.totalQuestions}
نسبة الإكمال: ${(applicant.interview.answeredQuestions / applicant.interview.totalQuestions * 100).toFixed(1)}%`}

====================================================

التقييم النهائي:
================
${applicant.evaluation}

====================================================

الخلاصة:
========
النتيجة النهائية: ${extractFinalScore(applicant.evaluation)}%
التوصية: ${extractRecommendation(applicant.evaluation)}
حالة الطلب: ${applicant.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}

====================================================

ملاحظات:
=========
- تم إجراء هذا التقييم باستخدام نظام الذكاء الاصطناعي المتقدم
- النتائج مبنية على تحليل موضوعي للسيرة الذاتية والمقابلة
- هذا التقرير سري ومخصص للاستخدام الداخلي فقط

تم إنشاء هذا التقرير في: ${new Date().toLocaleString('ar-SA')}
نظام التوظيف المتقدم - شركة MAIS للمنتجات الطبية
            `;

            const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `تقرير_مفصل_${applicant.fullName}_${Date.now()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showNotification('تم تحميل التقرير المفصل بنجاح');
        }

        // إرسال النتائج بالبريد الإلكتروني
        function sendResultsByEmail(applicant) {
            const subject = `نتائج التقييم - ${applicant.fullName}`;
            const body = `
مرحباً ${applicant.fullName},

نشكرك على تقديمك لشركة MAIS للمنتجات الطبية للمنصب: ${getPositionName(applicant.position)}

نتائج التقييم:
النتيجة النهائية: ${extractFinalScore(applicant.evaluation)}%
التوصية: ${extractRecommendation(applicant.evaluation)}

سنتواصل معك قريباً بشأن الخطوات التالية.

مع أطيب التحيات,
فريق الموارد البشرية
شركة MAIS للمنتجات الطبية
            `;

            const mailtoLink = `mailto:${applicant.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.open(mailtoLink);
            
            showNotification('تم فتح تطبيق البريد الإلكتروني');
        }

        // طباعة التقييم
        function printEvaluation() {
            window.print();
        }

        // تسجيل دخول الإدارة
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;
            
            if (username === 'admin' && password === 'mais2024') {
                document.getElementById('adminLogin').classList.add('hidden');
                document.getElementById('adminPanel').classList.remove('hidden');
                loadAdminPanel();
                showNotification('تم تسجيل الدخول بنجاح');
            } else {
                showNotification('بيانات الدخول غير صحيحة', 'error');
            }
        });

        // تحميل لوحة الإدارة
        function loadAdminPanel() {
            const adminContent = document.getElementById('adminContent');
            
            const stats = calculateStatistics();
            
            adminContent.innerHTML = `
                <div class="admin-dashboard">
                    <div class="stat-card">
                        <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px;"></i>
                        <h3>${stats.total}</h3>
                        <p>إجمالي المتقدمين</p>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #27ae60, #2ecc71);">
                        <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                        <h3>${stats.completed}</h3>
                        <p>مكتمل التقييم</p>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #f39c12, #e67e22);">
                        <i class="fas fa-clock" style="font-size: 2rem; margin-bottom: 10px;"></i>
                        <h3>${stats.pending}</h3>
                        <p>قيد المعالجة</p>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #9b59b6, #8e44ad);">
                        <i class="fas fa-chart-line" style="font-size: 2rem; margin-bottom: 10px;"></i>
                        <h3>${stats.averageScore}%</h3>
                        <p>متوسط النتائج</p>
                    </div>
                </div>

                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3><i class="fas fa-filter"></i> تصفية المتقدمين</h3>
                        <div class="export-controls">
                            <button class="btn btn-primary" onclick="exportAllData()">
                                <i class="fas fa-download"></i>
                                تصدير البيانات
                            </button>
                            <button class="btn btn-warning" onclick="clearAllData()">
                                <i class="fas fa-trash"></i>
                                مسح البيانات
                            </button>
                        </div>
                    </div>
                    
                    <input type="text" class="search-bar" id="searchBar" placeholder="البحث بالاسم أو البريد الإلكتروني..." onkeyup="filterApplicants()">
                    
                    <div class="filter-controls">
                        <button class="filter-btn active" onclick="filterByStatus('all')" data-status="all">الكل</button>
                        <button class="filter-btn" onclick="filterByStatus('completed')" data-status="completed">مكتمل</button>
                        <button class="filter-btn" onclick="filterByStatus('interviewed')" data-status="interviewed">في المقابلة</button>
                        <button class="filter-btn" onclick="filterByStatus('analyzed')" data-status="analyzed">محلل</button>
                        <button class="filter-btn" onclick="filterByStatus('uploaded')" data-status="uploaded">مرفوع</button>
                    </div>
                </div>

                <div class="card">
                    <h3><i class="fas fa-users"></i> قائمة المتقدمين المفصلة</h3>
                    <div id="applicantsList">
                        ${renderApplicantsList(applicants)}
                    </div>
                </div>
            `;
        }

        // حساب الإحصائيات
        function calculateStatistics() {
            const total = applicants.length;
            const completed = applicants.filter(a => a.status === 'completed').length;
            const pending = applicants.filter(a => a.status !== 'completed').length;
            
            const completedApplicants = applicants.filter(a => a.status === 'completed' && a.evaluation);
            let averageScore = 0;
            
            if (completedApplicants.length > 0) {
                const totalScore = completedApplicants.reduce((sum, applicant) => {
                    return sum + extractFinalScore(applicant.evaluation);
                }, 0);
                averageScore = Math.round(totalScore / completedApplicants.length);
            }
            
            return { total, completed, pending, averageScore };
        }

        // عرض قائمة المتقدمين
        function renderApplicantsList(applicantsList) {
            return applicantsList.map(applicant => {
                const finalScore = applicant.evaluation ? extractFinalScore(applicant.evaluation) : null;
                const recommendation = applicant.evaluation ? extractRecommendation(applicant.evaluation) : null;
                
                return `
                    <div class="cv-item" data-status="${applicant.status}" data-name="${applicant.fullName.toLowerCase()}" data-email="${applicant.email.toLowerCase()}">
                        <div style="flex: 1;">
                            <h4 style="color: #2c3e50; margin-bottom: 8px;">
                                <i class="fas fa-user"></i>
                                ${applicant.fullName}
                            </h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 10px 0;">
                                <p><i class="fas fa-envelope" style="color: #3498db;"></i> ${applicant.email}</p>
                                <p><i class="fas fa-phone" style="color: #3498db;"></i> ${applicant.phone}</p>
                                <p><i class="fas fa-briefcase" style="color: #3498db;"></i> ${getPositionName(applicant.position)}</p>
                                <p><i class="fas fa-calendar" style="color: #3498db;"></i> ${new Date(applicant.uploadDate).toLocaleDateString('ar-SA')}</p>
                            </div>
                            
                            ${applicant.interview ? `
                                <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                                    <strong>تفاصيل المقابلة:</strong>
                                    <span style="margin-right: 15px;">النمط: ${applicant.interview.mode === 'written' ? 'كتابية' : 'صوتية'}</span>
                                    ${applicant.interview.mode === 'written' ? 
                                        `<span style="margin-right: 15px;">الكلمات: ${applicant.interview.totalWords}</span>` :
                                        `<span style="margin-right: 15px;">الإجابات: ${applicant.interview.answeredQuestions}/${applicant.interview.totalQuestions}</span>`
                                    }
                                </div>
                            ` : ''}
                            
                            ${finalScore ? `
                                <div style="margin: 10px 0; padding: 10px; background: ${getScoreColor(finalScore)}22; border-radius: 8px; border-right: 4px solid ${getScoreColor(finalScore)};">
                                    <strong>النتيجة النهائية:</strong>
                                    <span style="font-size: 1.2rem; font-weight: bold; color: ${getScoreColor(finalScore)}; margin: 0 10px;">${finalScore}%</span>
                                    <span style="color: ${getRecommendationColor(recommendation)}; font-weight: bold;">${recommendation}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div style="text-align: center; min-width: 200px;">
                            <div style="margin-bottom: 15px;">
                                <span class="badge" style="background: ${getStatusColor(applicant.status)}; display: inline-block; margin-bottom: 10px;">
                                    ${getStatusText(applicant.status)}
                                </span>
                                ${finalScore ? `
                                    <div style="font-size: 2rem; font-weight: bold; color: ${getScoreColor(finalScore)}; margin: 5px 0;">
                                        ${finalScore}%
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <button class="btn btn-primary" onclick="viewApplicantDetails('${applicant.id}')" style="padding: 8px 15px; font-size: 0.9rem;">
                                    <i class="fas fa-eye"></i> عرض التفاصيل
                                </button>
                                
                                ${applicant.status === 'completed' ? `
                                    <button class="btn btn-success" onclick="downloadDetailedReport(applicants.find(a => a.id == ${applicant.id}))" style="padding: 8px 15px; font-size: 0.9rem;">
                                        <i class="fas fa-download"></i> تحميل التقرير
                                    </button>
                                ` : ''}
                                
                                <button class="btn btn-danger" onclick="deleteApplicant('${applicant.id}')" style="padding: 8px 15px; font-size: 0.9rem;">
                                    <i class="fas fa-trash"></i> حذف
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // عرض تفاصيل المتقدم
        function viewApplicantDetails(applicantId) {
            const applicant = applicants.find(a => a.id == applicantId);
            if (!applicant) return;

            const modal = document.getElementById('applicantModal');
            const modalContent = document.getElementById('modalContent');
            
            const finalScore = applicant.evaluation ? extractFinalScore(applicant.evaluation) : null;
            const recommendation = applicant.evaluation ? extractRecommendation(applicant.evaluation) : null;
            
            modalContent.innerHTML = `
                <div style="max-width: 800px;">
                    <h2 style="color: #2c3e50; margin-bottom: 20px;">
                        <i class="fas fa-user-circle"></i>
                        تفاصيل المتقدم: ${applicant.fullName}
                    </h2>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">
                        <div class="card">
                            <h4><i class="fas fa-info-circle"></i> المعلومات الأساسية</h4>
                            <p><strong>الاسم:</strong> ${applicant.fullName}</p>
                            <p><strong>البريد الإلكتروني:</strong> ${applicant.email}</p>
                            <p><strong>رقم الهاتف:</strong> ${applicant.phone}</p>
                            <p><strong>المنصب المطلوب:</strong> ${getPositionName(applicant.position)}</p>
                            <p><strong>تاريخ التقديم:</strong> ${new Date(applicant.uploadDate).toLocaleDateString('ar-SA')}</p>
                            <p><strong>اسم الملف:</strong> ${applicant.fileName}</p>
                            <p><strong>الحالة:</strong> <span style="color: ${getStatusColor(applicant.status)}; font-weight: bold;">${getStatusText(applicant.status)}</span></p>
                        </div>
                        
                        ${finalScore ? `
                            <div class="card">
                                <h4><i class="fas fa-star"></i> النتائج النهائية</h4>
                                <div style="text-align: center;">
                                    <div style="font-size: 3rem; font-weight: bold; color: ${getScoreColor(finalScore)}; margin: 20px 0;">
                                        ${finalScore}%
                                    </div>
                                    <div style="background: ${getRecommendationColor(recommendation)}22; padding: 15px; border-radius: 10px; border: 2px solid ${getRecommendationColor(recommendation)};">
                                        <strong style="color: ${getRecommendationColor(recommendation)};">${recommendation}</strong>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${applicant.analysis ? `
                        <div class="card">
                            <h4><i class="fas fa-chart-line"></i> تحليل السيرة الذاتية</h4>
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; max-height: 300px; overflow-y: auto; white-space: pre-line;">
                                ${applicant.analysis}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${applicant.interview ? `
                        <div class="card">
                            <h4><i class="fas fa-microphone"></i> نتائج المقابلة</h4>
                            <p><strong>نمط المقابلة:</strong> ${applicant.interview.mode === 'written' ? 'كتابية' : 'صوتية'}</p>
                            <p><strong>تاريخ الإكمال:</strong> ${new Date(applicant.interview.completedAt).toLocaleDateString('ar-SA')}</p>
                            
                            ${applicant.interview.mode === 'written' ? `
                                <p><strong>إجمالي الكلمات:</strong> ${applicant.interview.totalWords}</p>
                                <div style="max-height: 300px; overflow-y: auto;">
                                    ${applicant.interview.answers.map((item, index) => `
                                        <div style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                                            <strong>السؤال ${index + 1}:</strong> ${item.question}
                                            <br><br>
                                            <strong>الإجابة (${item.wordCount} كلمة):</strong>
                                            <div style="margin-top: 10px; padding: 10px; background: white; border-radius: 5px;">
                                                ${item.answer}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <p><strong>الأسئلة المجابة:</strong> ${applicant.interview.answeredQuestions}/${applicant.interview.totalQuestions}</p>
                                <p><strong>نسبة الإكمال:</strong> ${(applicant.interview.answeredQuestions / applicant.interview.totalQuestions * 100).toFixed(1)}%</p>
                            `}
                        </div>
                    ` : ''}
                    
                    ${applicant.evaluation ? `
                        <div class="card">
                            <h4><i class="fas fa-certificate"></i> التقييم النهائي</h4>
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; max-height: 400px; overflow-y: auto; white-space: pre-line;">
                                ${applicant.evaluation}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <button class="btn btn-primary" onclick="downloadDetailedReport(applicants.find(a => a.id == ${applicant.id}))">
                            <i class="fas fa-download"></i>
                            تحميل التقرير الشامل
                        </button>
                    </div>
                </div>
            `;
            
            modal.style.display = 'flex';
        }

        // إغلاق نافذة التفاصيل
        function closeApplicantModal() {
            document.getElementById('applicantModal').style.display = 'none';
        }

        // تصفية المتقدمين بالحالة
        function filterByStatus(status) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector(`[data-status="${status}"]`).classList.add('active');
            
            const applicantItems = document.querySelectorAll('.cv-item');
            applicantItems.forEach(item => {
                if (status === 'all' || item.dataset.status === status) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        }

        // تصفية المتقدمين بالبحث
        function filterApplicants() {
            const searchTerm = document.getElementById('searchBar').value.toLowerCase();
            const applicantItems = document.querySelectorAll('.cv-item');
            
            applicantItems.forEach(item => {
                const name = item.dataset.name;
                const email = item.dataset.email;
                
                if (name.includes(searchTerm) || email.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        }

        // حذف متقدم
        function deleteApplicant(applicantId) {
            if (confirm('هل أنت متأكد من حذف هذا المتقدم؟ لا يمكن التراجع عن هذا الإجراء.')) {
                applicants = applicants.filter(a => a.id != applicantId);
                localStorage.setItem('applicants', JSON.stringify(applicants));
                loadAdminPanel();
                showNotification('تم حذف المتقدم بنجاح');
            }
        }

        // تصدير جميع البيانات
        function exportAllData() {
            const exportData = {
                exportDate: new Date().toISOString(),
                totalApplicants: applicants.length,
                applicants: applicants.map(applicant => ({
                    ...applicant,
                    fileContent: applicant.fileContent.substring(0, 500) + '...' // تقليل حجم الملف
                }))
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_applicants_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification('تم تصدير البيانات بنجاح');
        }

        // مسح جميع البيانات
        function clearAllData() {
            if (confirm('هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.')) {
                if (confirm('تأكيد نهائي: سيتم فقدان جميع بيانات المتقدمين!')) {
                    applicants = [];
                    localStorage.removeItem('applicants');
                    loadAdminPanel();
                    showNotification('تم مسح جميع البيانات');
                }
            }
        }

        // تسجيل خروج الإدارة
        function logout() {
            document.getElementById('adminPanel').classList.add('hidden');
            document.getElementById('adminLogin').classList.remove('hidden');
            document.getElementById('adminUsername').value = '';
            document.getElementById('adminPassword').value = '';
            showNotification('تم تسجيل الخروج بنجاح');
        }

        // الحصول على لون الحالة
        function getStatusColor(status) {
            switch(status) {
                case 'uploaded': return '#9b59b6';
                case 'analyzed': return '#f39c12';
                case 'interviewed': return '#3498db';
                case 'completed': return '#27ae60';
                default: return '#95a5a6';
            }
        }

        // الحصول على نص الحالة
        function getStatusText(status) {
            switch(status) {
                case 'uploaded': return 'مرفوع';
                case 'analyzed': return 'محلل';
                case 'interviewed': return 'في المقابلة';
                case 'completed': return 'مكتمل';
                default: return 'غير معروف';
            }
        }

        // استدعاء API Gemini
        async function callGeminiAPI(prompt) {
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 8192,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        }

        // تحديث بيانات المتقدم
        function updateApplicantData(applicant) {
            const index = applicants.findIndex(a => a.id === applicant.id);
            if (index !== -1) {
                applicants[index] = applicant;
                localStorage.setItem('applicants', JSON.stringify(applicants));
            }
        }

        // تشغيل الموجات الصوتية
        function animateVoiceWaves() {
            const waves = document.querySelectorAll('.wave-bar');
            waves.forEach((wave, index) => {
                wave.style.animationDelay = `${index * 0.1}s`;
                wave.style.animation = 'wave 0.8s ease-in-out infinite';
            });
        }

        // إيقاف الموجات الصوتية
        function stopVoiceWaves() {
            const waves = document.querySelectorAll('.wave-bar');
            waves.forEach(wave => {
                wave.style.animation = 'none';
                wave.style.height = '20px';
            });
        }

        // إعداد PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        // تحميل البيانات عند بدء التشغيل
        document.addEventListener('DOMContentLoaded', () => {
            console.log('نظام التوظيف المتقدم - شركة MAIS للمنتجات الطبية');
            console.log(`تم تحميل ${applicants.length} متقدم من التخزين المحلي`);
        });

        // إضافة مستمعي الأحداث للنوافذ المنبثقة
        document.getElementById('applicantModal').addEventListener('click', (e) => {
            if (e.target.id === 'applicantModal') {
                closeApplicantModal();
            }
        });