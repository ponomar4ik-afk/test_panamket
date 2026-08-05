// Закрашиваем системный холст самого Телеграма (под WebView)
if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.setBackgroundColor('#030B1D');
    Telegram.WebApp.setHeaderColor('#030B1D');
}

// ================= СЦЕНАРИЙ ОНБОРДИНГА =================
const onboardingSteps = [
    {
        title: "⚡️ Режим Молния",
        text: "Бесконечный быстрый спринт по карточкам! Тапай слова на скорость, перелистывай и фарми XP в свободную минуту.",
        cat: "⚡️"
    },
    {
        title: "📖 Режим Книга",
        text: "Системные уроки со сборкой фраз из плиток. Жми ✕ вверху экрана, если захочешь быстро закончить уровень.",
        cat: "📖"
    },
    {
        title: "😼 Твой Профиль",
        text: "Следи за статистикой выученных слов, переключай языки (EN / PL) и используй кнопку работы над ошибками!",
        cat: "😼"
    }
];

let currentOnboardingStep = 0;

function checkAndStartOnboarding() {
    // Убираем проверку, просто запускаем всегда
    // const isDone = localStorage.getItem('panamket_onboarding_completed');
    // if (!isDone) {
        showOnboardingStep(0);
        const overlay = document.getElementById('onboarding-overlay');
        if (overlay) overlay.classList.remove('hidden');
    // }
}

function showOnboardingStep(stepIndex) {
    currentOnboardingStep = stepIndex;
    const step = onboardingSteps[stepIndex];

    const titleEl = document.getElementById('onboarding-step-title');
    const textEl = document.getElementById('onboarding-step-text');
    const catEl = document.querySelector('.onboarding-cat-icon');

    if(titleEl) titleEl.textContent = step.title;
    if(textEl) textEl.textContent = step.text;
    if(catEl) catEl.textContent = step.cat;

    for (let i = 0; i < onboardingSteps.length; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if (dot) {
            if (i === stepIndex) dot.classList.add('active');
            else dot.classList.remove('active');
        }
    }

    const btn = document.getElementById('onboarding-next-btn');
    if (btn) {
        btn.textContent = (stepIndex === onboardingSteps.length - 1) ? "Погнали! 🚀" : "Дальше ➔";
    }

    // ==========================================
    // МАГИЯ ПОДСВЕТКИ (SPOTLIGHT ЭФФЕКТ)
    // ==========================================
    
    // Удаляем старые клоны-подсветки
    document.querySelectorAll('.onboarding-clone').forEach(el => el.remove());

    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return;

    let targets = [];
    const tabs = activeScreen.querySelectorAll('.tabbar-global .tab-item');
    // Ищем кнопку возврата/крестика
    const backBtn = activeScreen.querySelector('.s4-back-btn, .s5-back-btn, .s3-back-btn');

    // Определяем, какие элементы подсвечивать на каждом шаге
    if (stepIndex === 0) {
        if (tabs[1]) targets.push(tabs[1]); // Режим Молния (по центру)
    } else if (stepIndex === 1) {
        if (tabs[0]) targets.push(tabs[0]); // Книга (слева)
        if (backBtn) targets.push(backBtn); // Кнопка Назад/Крестик (сверху слева)
    } else if (stepIndex === 2) {
        if (tabs[2]) targets.push(tabs[2]); // Профиль (справа)
    }

// Создаем светящиеся клоны поверх затемнения
    targets.forEach(el => {
        const rect = el.getBoundingClientRect();
        const clone = el.cloneNode(true);
        clone.classList.add('onboarding-clone');
        
        // Позиционируем точно над оригиналом
        clone.style.position = 'fixed';
        clone.style.top = rect.top + 'px';
        clone.style.left = rect.left + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        clone.style.margin = '0';
        clone.style.zIndex = '10002'; // Выше затемнения (10000)
        clone.style.pointerEvents = 'none'; // Блокируем клики по клонам
        clone.style.color = '#FFD24D'; // Зажигаем иконку жёлтым
        clone.style.backgroundColor = '#181C26'; // Темный фон перекрывает оригинал
        clone.style.display = 'flex';
        clone.style.alignItems = 'center';
        clone.style.justifyContent = 'center';

        // 👇 ТОТ САМЫЙ ФИКС С КРЕСТИКОМ 👇
        // Если это шаг про Книгу, жестко вставляем крестик внутрь клона, даже если под ним стрелка
        if (stepIndex === 1 && (el.classList.contains('s4-back-btn') || el.classList.contains('s5-back-btn') || el.classList.contains('s3-back-btn'))) {
            clone.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        }
        
        // Круглое скругление для таббара, квадратное для крестика
        if (el.classList.contains('tab-item')) {
            clone.style.borderRadius = '50%';
        } else {
            clone.style.borderRadius = '14px';
        }
        
        document.getElementById('onboarding-overlay').appendChild(clone);
    });
}

// ================= GLOBAL STATE =================
let errorReviewPool = []; 
let initialErrorCount = 0; 
let lastEntryScreen = 'screen-profile';
let currentLanguage = 'en';
let currentTopic = 'slang';

let globalWordsData = [];
let globalSentencesData = [];

let activeQuizPool = [];
let activeSentencePool = [];

let currentQuizIndex = 0;
let currentSentenceIndex = 0;
let isReverseQuiz = false;
let currentSentenceData = null;
let currentAudio = null; 

let appMode = 'words'; 
let lastBookScreen = 'screen-lessons';
let currentArchiveTab = 'progress';

// Глобальные счетчики и экономика очков
let currentAppStreak = 0;
let currentAppErrors = 0;

let totalUserXP = parseInt(localStorage.getItem('panamket_total_xp')) || 0;
let currentLessonWordsXP = 0;
let currentLessonPhrasesXP = 0;
let currentLessonComboXP = 0; 
let currentSentenceAttempts = 0;

// ФЛАГ ДЛЯ ПОДСКАЗКИ
let usedHintThisTurn = false;

const iconBackArrow = `<svg width="30" height="24" viewBox="0 0 30 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.33333 1L1 8.33333L8.33333 15.6667M1 8.33333H21.1667C23.1116 8.33333 24.9768 9.10595 26.3521 10.4812C27.7274 11.8565 28.5 13.7217 28.5 15.6667C28.5 17.6116 27.7274 19.4768 26.3521 20.8521C24.9768 22.2274 23.1116 23 21.1667 23H19.3333"/></svg>`;
const iconCloseCross = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

// ================= ЭКОНОМИКА ОЧКОВ (ПАНАМКИ) =================
function addXP(amount) {
    totalUserXP += amount;
    localStorage.setItem('panamket_total_xp', totalUserXP);
    const xpEl = document.getElementById('profile-total-xp');
    if(xpEl) xpEl.textContent = totalUserXP; 
}

function showPhantomPoint(element, text) {
    if(!element) return;
    const rect = element.getBoundingClientRect();
    const phantom = document.createElement('div');
    phantom.className = 'phantom-point';
    phantom.textContent = text;
    phantom.style.left = (rect.left + rect.width / 2 - 15) + 'px';
    phantom.style.top = (rect.top - 20) + 'px';
    document.body.appendChild(phantom);
    setTimeout(() => phantom.remove(), 800);
}

// ================= HAPTIC FEEDBACK (ВИБРАЦИЯ) =================
function triggerHaptic(type = 'light') {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        const haptic = window.Telegram.WebApp.HapticFeedback;
        if (type === 'light') haptic.impactOccurred('light');
        else if (type === 'medium') haptic.impactOccurred('medium');
        else if (type === 'heavy') haptic.impactOccurred('heavy');
        else if (type === 'success') haptic.notificationOccurred('success');
        else if (type === 'error') haptic.notificationOccurred('error');
        else if (type === 'warning') haptic.notificationOccurred('warning');
    }
}

function getStorageKey(type) {
    return `panamket_${type}_${currentLanguage}_${currentTopic}`;
}

function showScreen(screenId) {
    stopAllAudio(); 
    
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    const targetScreen = document.getElementById(screenId);
    
    if (targetScreen) {
        targetScreen.classList.add('active');
        
        // ЖЕЛЕЗОБЕТОННЫЙ ФИКС СКРОЛЛА:
        targetScreen.scrollTop = 0; 
        
        // На всякий случай сбрасываем глобальный скролл окна
        window.scrollTo(0, 0); 
    }

    if (typeof amplitude !== 'undefined') {
        amplitude.track('Screen Viewed', { screen_id: screenId });
    }
}

let currentTabIndex = 1; 

function updateTabbarUI(activeTab) {
    let newIndex = 1;
    if (activeTab === 'book') newIndex = 0;
    if (activeTab === 'lightning') newIndex = 1;
    if (activeTab === 'profile') newIndex = 2;

    const needsAnimation = (currentTabIndex !== newIndex);
    const oldIndex = currentTabIndex;
    currentTabIndex = newIndex; 

    document.querySelectorAll('.tabbar-global').forEach(tabbar => {
        const tabs = tabbar.querySelectorAll('.tab-item');
        const glass = tabbar.querySelector('.tab-glass-indicator');

        if (tabs.length >= 3) {
            tabs.forEach(t => t.classList.remove('active'));
            const avatar = tabbar.querySelector('.tab-avatar');
            if (avatar) avatar.classList.remove('active-avatar');

            tabs[newIndex].classList.add('active');
            if (newIndex === 2 && avatar) avatar.classList.add('active-avatar');
        }

        // --- ИДЕАЛЬНОЕ СКОЛЬЖЕНИЕ ЧЕРЕЗ TRANSFORM ---
        if (glass) {
            if (needsAnimation) {
                // Возвращаем на старое место без анимации
                glass.style.transition = 'none';
                glass.style.transform = getGlassTransform(oldIndex);

                // Ждем рендер нового экрана и запускаем скольжение
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        // Анимация transform отрабатывает 60 FPS без лагов
                        glass.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                        glass.style.transform = getGlassTransform(newIndex);
                    });
                });
            } else {
                glass.style.transition = 'none';
                glass.style.transform = getGlassTransform(newIndex);
            }
        }
    });
}

// Вспомогательная функция. Сдвигает ровно на X ширин плашки.
function getGlassTransform(index) {
    if (index === 0) return 'translateX(0%)';
    if (index === 1) return 'translateX(100%)';
    if (index === 2) return 'translateX(200%)';
    return 'translateX(100%)';
}

async function checkAudioFileExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (e) {
        return false;
    }
}

async function speakWord(text, type = 'word', id = null) {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    if (id !== null) {
        const langFolder = currentLanguage === 'pl' ? 'PL' : 'en';
        const cleanTopic = currentTopic.trim();
        const audioPath = `./data/${langFolder}/${cleanTopic}/audio/${type}_${id}.mp3`;
        
        const exists = await checkAudioFileExists(audioPath);
        
        if (exists) {
            currentAudio = new Audio(audioPath); 
            currentAudio.play().catch(e => console.log("Ошибка воспроизведения MP3:", e));
            return; 
        }
    }

    if (!('speechSynthesis' in window)) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLanguage === 'pl' ? 'pl-PL' : 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
}

function stopAllAudio() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
}

// ================= ЛОГИКА ОШИБОК И СТРИКОВ =================
function checkStreakTrigger() {
    let comboXP = 0;
    if (currentAppStreak === 3 || currentAppStreak === 5 || currentAppStreak === 10) {
        comboXP = 5;
        addXP(comboXP);
        if(appMode === 'book') currentLessonComboXP += comboXP;
    }

    if (currentAppStreak === 3) showStreakPopup('streak-3.webp', comboXP);
    else if (currentAppStreak === 5) showStreakPopup('streak-5.webp', comboXP);
    else if (currentAppStreak === 10) showStreakPopup('streak-10.webp', comboXP);
    
    if (currentAppErrors === 5) {
        showStreakPopup('fail-5.webp', 0);
        currentAppErrors = 0; 
    }
}

function showStreakPopup(imgName, bonusXP = 0) {
    const popup = document.getElementById('streak-popup');
    const content = popup.querySelector('.streak-popup-content');
    if(!popup || !content) return;
    
    const oldComboText = content.querySelector('.combo-text');
    if (oldComboText) oldComboText.remove();

    const img = document.getElementById('streak-img');
    if(img) img.src = imgName;

    if (bonusXP > 0) {
        const text = document.createElement('div');
        text.className = 'combo-text';
        text.textContent = `+${bonusXP} КОМБО`;
        content.appendChild(text);
    }

    popup.classList.add('show');
    
    setTimeout(() => {
        popup.classList.remove('show');
    }, 2000);
}

function logAppError(itemId, type) {
    const key = `panamket_errors_${currentLanguage}_${currentTopic}`;
    let currentErrors = JSON.parse(localStorage.getItem(key)) || [];
    
    if (!currentErrors.some(err => err.id === itemId && err.type === type)) {
        currentErrors.push({ id: itemId, type: type }); 
        localStorage.setItem(key, JSON.stringify(currentErrors));
    }
    updateReviewButtonsUI();
}

function updateReviewButtonsUI() {
    const key = `panamket_errors_${currentLanguage}_${currentTopic}`;
    const currentErrors = JSON.parse(localStorage.getItem(key)) || [];
    const errCount = currentErrors.length;

    const profBtn = document.getElementById('profile-btn-review');
    const profCount = document.getElementById('profile-errors-count');
    const lessonBox = document.getElementById('lessons-review-box');
    const lessonCount = document.getElementById('lessons-errors-count');

    if (profBtn && profCount) {
        profCount.textContent = errCount;
        profBtn.style.display = errCount > 0 ? 'block' : 'none';
    }
    if (lessonBox && lessonCount) {
        lessonCount.textContent = errCount;
        lessonBox.style.display = errCount > 0 ? 'block' : 'none';
    }
}

function startErrorReviewMode() {
    triggerHaptic('light');
    const key = `panamket_errors_${currentLanguage}_${currentTopic}`;
    const currentErrors = JSON.parse(localStorage.getItem(key)) || [];
    if (currentErrors.length === 0) return;

    appMode = 'errors';
    initialErrorCount = currentErrors.length; 
    
    errorReviewPool = currentErrors.map(err => {
        if (err.type === 'word') return { type: 'word', data: globalWordsData.find(w => w.id === err.id) };
        if (err.type === 'sentence') return { type: 'sentence', data: globalSentencesData.find(s => (s.id === err.id) || (s.russian === err.id)) };
    }).filter(item => item && item.data); 

    if (errorReviewPool.length === 0) {
        localStorage.removeItem(key);
        updateReviewButtonsUI();
        return;
    }

    playNextError();
}

function playNextError() {
    if (errorReviewPool.length === 0) {
        const key = `panamket_errors_${currentLanguage}_${currentTopic}`;
        localStorage.removeItem(key);
        updateReviewButtonsUI();
        
        const summaryTitle = document.getElementById('summary-title');
        if (summaryTitle) summaryTitle.textContent = `Ошибки исправлены! 🎉`;
        
        triggerHaptic('success');
        showScreen('screen-summary');
        return;
    }

    const current = errorReviewPool[0];
    isReverseQuiz = false; 

    if (current.type === 'word') {
        activeQuizPool = [current.data];
        currentQuizIndex = 0;
        showScreen('screen-quiz');
        loadQuizQuestion();
        speakWord(current.data.expression, 'word', current.data.id);
    } else if (current.type === 'sentence') {
        activeSentencePool = [current.data];
        currentSentenceIndex = 0;
        showScreen('screen-sentences');
        loadSentenceQuestion();
    }
}

function handleErrorAnswer(isCorrect) {
    setTimeout(() => {
        const current = errorReviewPool[0];
        if (isCorrect) {
            const key = `panamket_errors_${currentLanguage}_${currentTopic}`;
            let currentErrors = JSON.parse(localStorage.getItem(key)) || [];
            currentErrors = currentErrors.filter(err => err.id !== current.data.id && err.id !== current.data.russian);
            localStorage.setItem(key, JSON.stringify(currentErrors));
            updateReviewButtonsUI();
            errorReviewPool.shift(); 
        } else {
            const failed = errorReviewPool.shift();
            errorReviewPool.push(failed); 
        }
        playNextError();
    }, 1200);
}

// ================= ПОДГРУЗКА ДАННЫХ =================
async function loadContentData() {
    try {
        globalWordsData = [];
        globalSentencesData = [];

        const cacheBuster = `?v=${new Date().getTime()}`;
        const langFolder = currentLanguage === 'pl' ? 'PL' : 'en';
        const cleanTopic = currentTopic.trim();
        const baseUrl = `./data/${langFolder}/${cleanTopic}/`;

        const [wordsRes, sentencesRes] = await Promise.all([
            fetch(`${baseUrl}words_quiz.json${cacheBuster}`),
            fetch(`${baseUrl}sentences_constructor.json${cacheBuster}`)
        ]);

        if (!wordsRes.ok || !sentencesRes.ok) {
            throw new Error(`Файлы не найдены`);
        }

        globalWordsData = await wordsRes.json();
        globalSentencesData = await sentencesRes.json();

        updateProfileStats();
        updateReviewButtonsUI(); 
        
        const themeLabel = document.getElementById('profile-theme-label');
        if (themeLabel) themeLabel.textContent = currentTopic.toUpperCase();
        return true; 
    } catch (error) {
        alert("Ошибка загрузки данных! Проверь наличие .json файлов на GitHub.");
        return false; 
    }
}

// ================= РЕЖИМ МОЛНИИ (УМНАЯ ЛЕНТА) =================
function getWordsProgress() { return JSON.parse(localStorage.getItem(getStorageKey('words_progress'))) || {}; }
function saveWordsProgress(progress) { localStorage.setItem(getStorageKey('words_progress'), JSON.stringify(progress)); updateProfileStats(); }

function generateNextWordsCard() {
    const progress = getWordsProgress();
    let availableWords = globalWordsData.filter(word => {
        const stat = progress[word.id] || { streak: 0, cooldown: 0 };
        if (stat.streak >= 3 || stat.cooldown > 0) return false;
        return true;
    });

    if (availableWords.length === 0) {
        let hasUnlearned = false;
        for (let id in progress) {
            if (progress[id].streak < 3) {
                if (progress[id].cooldown > 0) progress[id].cooldown -= 10;
                hasUnlearned = true;
            }
        }
        if (!hasUnlearned && globalWordsData.length > 0) {
            alert("Ты выучил весь пак! Идем на второй круг!");
            localStorage.removeItem(getStorageKey('words_progress'));
            generateNextWordsCard();
            return;
        }
        saveWordsProgress(progress);
        availableWords = globalWordsData.filter(w => (progress[w.id]?.streak || 0) < 3);
    }

    activeQuizPool = [availableWords[Math.floor(Math.random() * availableWords.length)]];
    currentQuizIndex = 0;
    isReverseQuiz = false;
    loadQuizQuestion();
}

function handleWordsCardAnswer(wordId, isCorrect) {
    const progress = getWordsProgress();
    if (!progress[wordId]) progress[wordId] = { streak: 0, cooldown: 0 };

    for (let id in progress) {
        if (id != wordId && progress[id].cooldown > 0) progress[id].cooldown--;
    }

    if (isCorrect) {
        progress[wordId].streak++;
        if (progress[wordId].streak === 1) progress[wordId].cooldown = 40;
        else if (progress[wordId].streak === 2) progress[wordId].cooldown = 90;
        
        currentAppStreak++; currentAppErrors = 0; checkStreakTrigger();
    } else {
        progress[wordId].streak = 0;
        progress[wordId].cooldown = 20;
        
        currentAppStreak = 0; currentAppErrors++; checkStreakTrigger();
    }
    saveWordsProgress(progress);

    if (typeof amplitude !== 'undefined') {
        amplitude.track('Lightning Card Answered', { word_id: wordId, is_correct: isCorrect, language: currentLanguage, topic: currentTopic });
    }
}

// ================= ДВИЖОК КВИЗА (ЭКРАН 4) =================
function loadQuizQuestion() {
    if (!activeQuizPool || activeQuizPool.length === 0) return;

    usedHintThisTurn = false; // Сбрасываем флаг подсказки для новой карточки

    const cardInner = document.getElementById('s4-card-inner');
    if (cardInner) cardInner.classList.remove('is-flipped'); // Сбрасываем переворот карточки

    const wordData = activeQuizPool[currentQuizIndex];
    const wordEnEl = document.getElementById('s4-word-en');
    const wordRuEl = document.getElementById('s4-word-ru');
    const optionsListEl = document.getElementById('s4-options-list');
    const progressBarEl = document.getElementById('s4-progress-bar');
    const progressTextEl = document.getElementById('s4-progress-text');
    const headerTitleEl = document.querySelector('#screen-quiz .s4-title');
    const btnSpeak = document.getElementById('s4-btn-speak');
    
    // ПРАВИЛЬНАЯ ЛОГИКА ТАББАРА И КРЕСТИКА
    const btnBack1 = document.getElementById('s4-btn-back');
    if(appMode === 'book' || appMode === 'errors') {
        document.body.classList.add('hide-tabbar'); // Скрываем таббар
        if(btnBack1) btnBack1.innerHTML = iconCloseCross; // Ставим крестик
    } else {
        document.body.classList.remove('hide-tabbar'); // Возвращаем таббар
        if(btnBack1) btnBack1.innerHTML = iconBackArrow; // Возвращаем стрелку
    }

    // ПРАВИЛЬНАЯ ЛОГИКА ПРОГРЕСС-БАРА
    if (appMode === 'words') {
        if (progressBarEl) progressBarEl.style.width = `100%`;
        if (progressTextEl) progressTextEl.innerHTML = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z"/></svg>`;
    } else if (appMode === 'errors') {
        const perc = (errorReviewPool.length / Math.max(initialErrorCount, 1)) * 100;
        if (progressBarEl) progressBarEl.style.width = `${perc}%`;
        if (progressTextEl) progressTextEl.textContent = `${errorReviewPool.length}`; // Обратный счетчик!
        if (headerTitleEl) headerTitleEl.textContent = "Работа над ошибками";
    } else {
        const stepNum = currentQuizIndex + (isReverseQuiz ? 10 : 1);
        if (progressBarEl) progressBarEl.style.width = `${(stepNum / 15) * 100}%`;
        if (progressTextEl) progressTextEl.textContent = `${stepNum}/15`;
    }

    // ЗАПОЛНЯЕМ ОБРАТНУЮ СТОРОНУ (ПОДСКАЗКА)
    const backWord = document.getElementById('s4-back-word');
    const backTrans = document.getElementById('s4-back-trans');
    const backExText = document.getElementById('s4-back-ex-text');
    const backExTrans = document.getElementById('s4-back-ex-trans');
    const backExBox = document.querySelector('.s4-back-ex-box');

    // Если это реверсивный режим, слова надо показать наоборот, но на подсказке всегда оригинал крупно
    if (backWord) backWord.textContent = wordData.expression;
    if (backTrans) backTrans.textContent = wordData.correct_answer;

    if (wordData.example && wordData.example.text) {
        if (backExBox) backExBox.style.display = 'block';
        if (backExText) backExText.textContent = wordData.example.text;
        if (backExTrans) backExTrans.textContent = wordData.example.translation;
    } else {
        if (backExBox) backExBox.style.display = 'none';
    }

    if(optionsListEl) optionsListEl.innerHTML = '';
    if (wordEnEl) { wordEnEl.style.textAlign = 'center'; wordEnEl.style.width = '100%'; }

    if (!isReverseQuiz) {
        if (headerTitleEl && appMode !== 'errors') headerTitleEl.textContent = "Выбери правильный перевод.";
        if (wordEnEl) wordEnEl.textContent = wordData.expression;
        
        // Показываем кнопку плавно через класс
        if (btnSpeak) btnSpeak.classList.remove('icon-hidden');

        if (wordData.literal) {
            if (wordRuEl) { wordRuEl.textContent = `(досл. ${wordData.literal})`; wordRuEl.style.color = '#7F848D'; wordRuEl.style.textAlign = 'center'; }
        } else {
            if (wordRuEl) wordRuEl.textContent = "";
        }

        let shuffledOptions = [...wordData.options];
        shuffledOptions.sort(() => 0.5 - Math.random());

        shuffledOptions.forEach(optText => {
            const btn = document.createElement('button');
            btn.className = 's4-option-btn';
            btn.textContent = optText;

            btn.addEventListener('click', () => {
                if (!optionsListEl) return;
                const allBtns = optionsListEl.querySelectorAll('.s4-option-btn');
                allBtns.forEach(b => b.classList.add('disabled'));
                
                const isCorrect = (optText === wordData.correct_answer);

                if (!isCorrect && appMode !== 'errors') {
                    logAppError(wordData.id, 'word');
                }

                if (isCorrect) {
                    triggerHaptic('success');
                    btn.classList.add('correct');
                    
                    if (!usedHintThisTurn) { // Даем XP только если не юзали подсказку
                        if (appMode === 'words') {
                            showPhantomPoint(btn, "+1");
                            addXP(1);
                        } else if (appMode === 'book') {
                            showPhantomPoint(btn, "+2");
                            currentLessonWordsXP += 2;
                            addXP(2);
                        }
                    }
                } else {
                    triggerHaptic('error');
                    btn.classList.add('error');
                    Array.from(allBtns).find(b => b.textContent === wordData.correct_answer)?.classList.add('correct');
                }

                if (appMode === 'errors') {
                    handleErrorAnswer(isCorrect);
                } else if (appMode === 'words') {
                    handleWordsCardAnswer(wordData.id, isCorrect);
                    setTimeout(() => { 
                        generateNextWordsCard(); 
                        if(activeQuizPool[0]) speakWord(activeQuizPool[0].expression, 'word', activeQuizPool[0].id);
                    }, 1200);
                } else {
                    if (typeof amplitude !== 'undefined') amplitude.track('Book Quiz Answered', { chapter: getBookProgress(), is_correct: isCorrect, is_reverse: false, language: currentLanguage });
                    handleBookQuizAnswer(isCorrect);
                }
            });
            if (optionsListEl) optionsListEl.appendChild(btn);
        });
    } else {
        if (headerTitleEl && appMode !== 'errors') headerTitleEl.textContent = "Переверни режим: угадай оригинал!";
        if (wordEnEl) wordEnEl.textContent = wordData.correct_answer;
        if (wordRuEl) wordRuEl.textContent = "";
        
        // Скрываем кнопку плавно через класс
        if (btnSpeak) btnSpeak.classList.add('icon-hidden');

        let wrongOptions = globalWordsData.filter(w => w.id !== wordData.id).map(w => w.expression);
        wrongOptions.sort(() => 0.5 - Math.random());
        let revOptions = [wordData.expression, wrongOptions[0], wrongOptions[1]];
        revOptions.sort(() => 0.5 - Math.random());

        revOptions.forEach(optText => {
            const btn = document.createElement('button');
            btn.className = 's4-option-btn';
            btn.textContent = optText;

            btn.addEventListener('click', () => {
                if (!optionsListEl) return;
                const allBtns = optionsListEl.querySelectorAll('.s4-option-btn');
                allBtns.forEach(b => b.classList.add('disabled'));
                const isCorrect = (optText === wordData.expression);

                if (!isCorrect && appMode !== 'errors') {
                    logAppError(wordData.id, 'word');
                }

                if (isCorrect) {
                    triggerHaptic('success');
                    btn.classList.add('correct');
                    
                    if (appMode === 'book' && !usedHintThisTurn) {
                        showPhantomPoint(btn, "+2");
                        currentLessonWordsXP += 2;
                        addXP(2);
                    }
                    
                    // ОЗВУЧИВАЕМ ИНОСТРАННОЕ СЛОВО В ОБРАТНОМ ПЕРЕВОДЕ ПРИ УСПЕХЕ
                    speakWord(wordData.expression, 'word', wordData.id);
                } else {
                    triggerHaptic('error');
                    btn.classList.add('error');
                    Array.from(allBtns).find(b => b.textContent === wordData.expression)?.classList.add('correct');
                }

                if (appMode === 'errors') {
                    handleErrorAnswer(isCorrect);
                } else {
                    if (typeof amplitude !== 'undefined') amplitude.track('Book Quiz Answered', { chapter: getBookProgress(), is_correct: isCorrect, is_reverse: true, language: currentLanguage });
                    handleBookQuizAnswer(isCorrect);
                }
            });
            if (optionsListEl) optionsListEl.appendChild(btn);
        });
    }
}

// ================= РЕЖИМ КНИГИ (ЦИКЛЫ ГЛАВ) =================
function getBookProgress() { return parseInt(localStorage.getItem(getStorageKey('book_progress'))) || 1; }
function saveBookProgress(chapter) { localStorage.setItem(getStorageKey('book_progress'), chapter); updateProfileStats(); }

function startBookChapter() {
    appMode = 'book';
    document.body.classList.add('hide-tabbar'); 
    currentLessonWordsXP = 0;
    currentLessonPhrasesXP = 0;
    currentLessonComboXP = 0; 
    
    const currentChapter = getBookProgress();
    const wordEndIdx = currentChapter * 6;
    const wordStartIdx = wordEndIdx - 6;

    activeQuizPool = globalWordsData.slice(wordStartIdx, wordEndIdx);

    if (activeQuizPool.length === 0) {
        document.body.classList.remove('hide-tabbar');
        showScreen('screen-lessons');
        return;
    }

    currentQuizIndex = 0;
    isReverseQuiz = false;
    lastBookScreen = 'screen-quiz';

    updateTabbarUI('book');
    showScreen('screen-quiz');
    loadQuizQuestion();

    if(activeQuizPool[currentQuizIndex]) speakWord(activeQuizPool[currentQuizIndex].expression, 'word', activeQuizPool[currentQuizIndex].id);

    if (typeof amplitude !== 'undefined') amplitude.track('Chapter Started', { chapter_number: currentChapter, language: currentLanguage });
}

function handleBookQuizAnswer(isCorrect) {
    if (isCorrect) {
        currentAppStreak++; currentAppErrors = 0; checkStreakTrigger();
    } else {
        currentAppStreak = 0; currentAppErrors++; checkStreakTrigger();
    }

    setTimeout(() => {
        if (currentQuizIndex < activeQuizPool.length - 1) {
            currentQuizIndex++;
            loadQuizQuestion();
            if(!isReverseQuiz && activeQuizPool[currentQuizIndex]) speakWord(activeQuizPool[currentQuizIndex].expression, 'word', activeQuizPool[currentQuizIndex].id);
        } else {
            if (!isReverseQuiz) startBookSentencesEngine();
            else {
                const chapterCompleted = getBookProgress();
                if (typeof amplitude !== 'undefined') {
                    amplitude.track('Chapter Completed', { chapter_number: chapterCompleted, language: currentLanguage });
                }
                saveBookProgress(chapterCompleted + 1);

                addXP(10);
                const totalLessonXP = currentLessonWordsXP + currentLessonPhrasesXP + currentLessonComboXP + 20;

                const summaryTitle = document.getElementById('summary-title');
                if (summaryTitle) summaryTitle.textContent = `Глава ${chapterCompleted} пройдена!`;
                
                const sumTotalXP = document.getElementById('summary-total-xp');
                if(sumTotalXP) sumTotalXP.textContent = totalLessonXP;

                const sumWordsXP = document.getElementById('summary-words-xp');
                if(sumWordsXP) sumWordsXP.textContent = `+${currentLessonWordsXP}`;

                const sumPhrasesXP = document.getElementById('summary-phrases-xp');
                if(sumPhrasesXP) sumPhrasesXP.textContent = `+${currentLessonPhrasesXP}`;
                
                const sumComboXP = document.getElementById('summary-combo-xp');
                if(sumComboXP) sumComboXP.textContent = `+${currentLessonComboXP}`;

                document.body.classList.remove('hide-tabbar'); 
                triggerHaptic('success');
                showScreen('screen-summary');
            }
        }
    }, 1200);
}

// ================= КОНСТРУКТОР ПРЕДЛОЖЕНИЙ =================
function startBookSentencesEngine() {
    const currentChapter = getBookProgress();
    const sentenceEndIdx = currentChapter * 3;
    const sentenceStartIdx = sentenceEndIdx - 3;

    activeSentencePool = globalSentencesData.slice(sentenceStartIdx, sentenceEndIdx);
    currentSentenceIndex = 0;
    currentSentenceAttempts = 0;
    lastBookScreen = 'screen-sentences';

    updateTabbarUI('book');
    showScreen('screen-sentences');
    loadSentenceQuestion();
}

function loadSentenceQuestion() {
    const btnBack2 = document.getElementById('s5-btn-back');
    if(appMode === 'book' || appMode === 'errors') {
        document.body.classList.add('hide-tabbar');
        if(btnBack2) btnBack2.innerHTML = iconCloseCross;
    } else {
        document.body.classList.remove('hide-tabbar');
        if(btnBack2) btnBack2.innerHTML = iconBackArrow;
    }

    const errorBox = document.getElementById('s5-error-box');
    if (errorBox) {
        errorBox.classList.remove('show');
        errorBox.style.display = '';
        errorBox.innerHTML = '';
    }

    const feedbackBox = document.getElementById('s5-feedback');
    if (feedbackBox) {
        feedbackBox.classList.remove('show', 'success', 'error');
    }

    const btnSubmitClean = document.getElementById('s5-btn-submit');
    if (btnSubmitClean) {
        btnSubmitClean.classList.remove('error', 'success', 'failed-state');
    }

    const catImg = document.getElementById('s5-cat');
    if (catImg) {
        catImg.className = 's5-cat'; 
        catImg.style.backgroundImage = '';
    }

    if (!activeSentencePool || activeSentencePool.length === 0 || currentSentenceIndex >= activeSentencePool.length) {
        if (appMode === 'errors') return; 
        isReverseQuiz = true;
        currentQuizIndex = 0;
        lastBookScreen = 'screen-quiz';
        showScreen('screen-quiz');
        loadQuizQuestion();
        return;
    }

    currentSentenceData = activeSentencePool[currentSentenceIndex];

    const s5ProgressFill = document.querySelector('#screen-sentences .s4-progress-fill');
    const s5ProgressText = document.querySelector('#screen-sentences .s4-progress-text');

    if (appMode === 'errors') {
        const perc = (errorReviewPool.length / Math.max(initialErrorCount, 1)) * 100;
        if(s5ProgressFill) s5ProgressFill.style.width = `${perc}%`;
        if(s5ProgressText) s5ProgressText.textContent = `${errorReviewPool.length}`;
        const headerTitleEl = document.querySelector('#screen-sentences .s4-title');
        if (headerTitleEl) headerTitleEl.textContent = "Работа над ошибками";
    } else {
        const stepNum = 7 + currentSentenceIndex;
        if(s5ProgressFill) s5ProgressFill.style.width = `${(stepNum / 15) * 100}%`;
        if(s5ProgressText) s5ProgressText.textContent = `${stepNum}/15`;
        const headerTitleEl = document.querySelector('#screen-sentences .s4-title');
        if (headerTitleEl) headerTitleEl.textContent = "Переведи и составь предложение.";
    }

    const taskText = document.querySelector('.s5-task-text');
    if (taskText) taskText.textContent = currentSentenceData.russian;

    const dropZone = document.getElementById('s5-drop-zone');
    const wordBank = document.getElementById('s5-word-bank');
    if (dropZone) dropZone.innerHTML = '';
    if (wordBank) wordBank.innerHTML = '';

    if (dropZone && typeof Sortable !== 'undefined') {
        if (dropZone.sortableInstance) dropZone.sortableInstance.destroy();
        dropZone.sortableInstance = new Sortable(dropZone, {
            animation: 150, ghostClass: 'sortable-ghost', delay: 50, delayOnTouchOnly: true
        });
    }

    const submitBtn = document.getElementById('s5-btn-submit');
    if (submitBtn) {
        submitBtn.className = 's5-submit-btn';
        submitBtn.textContent = 'Отправить';
    }

    let shuffledPool = [...currentSentenceData.words_pool];
    shuffledPool.sort(() => 0.5 - Math.random());

    shuffledPool.forEach(word => {
        const wordEl = document.createElement('div');
        wordEl.className = 's5-word draggable-word';
        wordEl.textContent = word;
        wordEl.addEventListener('click', () => {
            if (!wordEl.classList.contains('used')) {
                triggerHaptic('light');
                wordEl.classList.add('used');
                const clone = wordEl.cloneNode(true);
                clone.classList.remove('used');
                clone.addEventListener('click', () => {
                    triggerHaptic('light');
                    wordEl.classList.remove('used');
                    if(dropZone) dropZone.removeChild(clone);
                });
                if(dropZone) dropZone.appendChild(clone);
            }
        });
        if (wordBank) wordBank.appendChild(wordEl);
    });
}

// ================= МОДАЛКА ПРИМЕРОВ ПРЕДЛОЖЕНИЙ =================
function openWordModal(wordObj) {
    triggerHaptic('light');
    const modal = document.getElementById('word-modal');
    if (!modal) return;
    
    document.getElementById('modal-word-title').innerHTML = `<b>${wordObj.expression}</b> — ${wordObj.correct_answer}`;
    
    if (wordObj.example && wordObj.example.text) {
        document.getElementById('modal-ex-text').innerHTML = `<i>${wordObj.example.text}</i>`;
        document.getElementById('modal-ex-trans').textContent = wordObj.example.translation;
    } else {
        document.getElementById('modal-ex-text').textContent = '';
        document.getElementById('modal-ex-trans').textContent = '';
    }
    
    modal.classList.add('active');
}

// ================= СТАТИСТИКА ПРОФИЛЯ =================
function updateProfileStats() {
    const progress = getWordsProgress();
    let learnedCount = 0;
    let inProgressCount = 0;

    for (let id in progress) {
        if (progress[id].streak >= 3) learnedCount++;
        else inProgressCount++;
    }

    const topLearnedEl = document.getElementById('profile-learned-words-top');
    if (topLearnedEl) topLearnedEl.textContent = learnedCount;

    const statProcess = document.getElementById('process-words-count');
    if (statProcess) statProcess.textContent = inProgressCount;

    const statPhrases = document.getElementById('phrases-count');
    const realPhrasesCount = parseInt(localStorage.getItem(`panamket_total_phrases_${currentLanguage}`)) || 0;
    if (statPhrases) statPhrases.textContent = realPhrasesCount;

    const el1 = document.querySelector('.s3-card-slang .s3-stat-text:nth-child(1)');
    const fill = document.querySelector('.s3-card-slang .s3-progress-fill');

    if(el1) el1.textContent = `Глава ${getBookProgress()}`;
    if(fill) fill.style.width = `${(learnedCount / (globalWordsData.length || 250)) * 100}%`;
    
    const xpEl = document.getElementById('profile-total-xp');
    if(xpEl) xpEl.textContent = totalUserXP;

    updateReviewButtonsUI();
}

// ================= РЕНДЕР АРХИВА =================
function renderArchiveLoot() {
    const container = document.getElementById('archive-list-container');
    if (!container) return;
    container.innerHTML = '';

    const progress = JSON.parse(localStorage.getItem(getStorageKey('words_progress'))) || {};

    document.querySelectorAll('.archive-tab').forEach(t => t.classList.remove('active'));
    if (currentArchiveTab === 'progress') {
        const tp = document.getElementById('tab-loot-progress');
        if(tp) tp.classList.add('active');
    }
    if (currentArchiveTab === 'phrases') {
        const tph = document.getElementById('tab-loot-phrases');
        if(tph) tph.classList.add('active');
    }
    if (currentArchiveTab === 'learned') {
        const tl = document.getElementById('tab-loot-learned');
        if(tl) tl.classList.add('active');
    }

    if (currentArchiveTab === 'progress') {
        let progressWords = globalWordsData.filter(word => progress[word.id] && progress[word.id].streak < 3);

        if (progressWords.length === 0) {
            const mockProgress = [
                { expression: "Flop", correct_answer: "Провал / неудачный исход" },
                { expression: "Glow up", correct_answer: "Преображение в лучшую сторону" }
            ];
            mockProgress.forEach(word => {
                const item = document.createElement('div');
                item.style.cssText = "background: #181C26; border: 1px solid #232936; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-family: sans-serif; opacity: 0.4;";
                item.innerHTML = `
                    <div style="flex-grow: 1; margin-right: 12px;">
                      <div style="color: #7F848D; font-weight: 600; font-size: 15px;">${word.expression}</div>
                      <div style="color: #4E5461; font-size: 13px; margin-top: 2px;">Слова из ленты и квизов</div>
                    </div>
                    <div style="background: rgba(253, 125, 45, 0.1); color: #FD7D2D; font-size: 11px; padding: 4px 8px; border-radius: 20px; font-weight: 600; white-space: nowrap; flex-shrink: 0;">В процессе ⏳</div>
                `;
                container.appendChild(item);
            });
            return;
        }

        progressWords.forEach(word => {
            const currentStreak = progress[word.id]?.streak || 0;
            const item = document.createElement('div');
            item.style.cssText = "background: #181C26; border: 1px solid #232936; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-family: sans-serif; cursor: pointer;";
            item.innerHTML = `
                <div style="flex-grow: 1; margin-right: 12px;">
                  <div style="color: #FFFFFF; font-weight: 600; font-size: 15px;">${word.expression}</div>
                  <div style="color: #7F848D; font-size: 13px; margin-top: 2px;">${word.correct_answer}</div>
                </div>
                <div style="background: rgba(253, 125, 45, 0.1); color: #FD7D2D; font-size: 11px; padding: 4px 8px; border-radius: 20px; font-weight: 600; white-space: nowrap; flex-shrink: 0;">${currentStreak} / 3 🔥</div>
            `;
            item.addEventListener('click', () => {
                if (word.example) openWordModal(word);
            });
            container.appendChild(item);
        });
    }
    else if (currentArchiveTab === 'phrases') {
        const totalPhrases = parseInt(localStorage.getItem(`panamket_total_phrases_${currentLanguage}`)) || 0;

        if (totalPhrases === 0) {
            const item = document.createElement('div');
            item.style.cssText = "background: #181C26; border: 1px solid #232936; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; font-family: sans-serif; opacity: 0.4;";
            item.innerHTML = `
                <div style="color: #7F848D; font-weight: 500; font-size: 14px; font-style: italic;">"Эта дизайн-система просто пушка..."</div>
                <div style="color: #4E5461; font-size: 12px;">Здесь будут храниться собранные тобой предложения.</div>
            `;
            container.appendChild(item);
            return;
        }

        let activePhrases = globalSentencesData.slice(0, totalPhrases);
        if(activePhrases.length === 0) activePhrases = globalSentencesData.slice(0, 3);

        activePhrases.forEach(phrase => {
            const item = document.createElement('div');
            item.style.cssText = "background: #181C26; border: 1px solid #232936; border-radius: 12px; padding: 16px; margin-bottom: 8px; font-family: sans-serif;";
            
            const idealPhrase = phrase.correct_sequences[0].join(' ');

            item.innerHTML = `
                <div style="color: #FFFFFF; font-weight: 600; font-size: 14px; line-height: 1.4;">${idealPhrase}</div>
                <div style="color: #7F848D; font-size: 13px; margin-top: 6px;">${phrase.russian}</div>
            `;
            
            item.addEventListener('click', () => {
                triggerHaptic('light');
                speakWord(idealPhrase, 'sentence', phrase.id);
            });
            
            container.appendChild(item);
        });
    }
    else if (currentArchiveTab === 'learned') {
        let learnedWords = globalWordsData.filter(word => progress[word.id]?.streak >= 3);

        if (learnedWords.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; font-family: sans-serif;">
                    <img src="empty.webp" style="width: 200px; height: auto; margin-bottom: 16px; object-fit: contain;">
                    <div style="color: #FFFFFF; font-size: 18px; font-weight: 600; margin-bottom: 8px;">Здесь пока пусто</div>
                    <div style="color: #7F848D; font-size: 14px; line-height: 1.5;">
                        Переведи слова 3 раза без ошибок, <br> чтобы они попали сюда!
                    </div>
                </div>
            `;
            return;
        }

        learnedWords.forEach(word => {
            const item = document.createElement('div');
            item.style.cssText = "background: #181C26; border: 1px solid #232936; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-family: sans-serif; cursor: pointer;";
            item.innerHTML = `
                <div style="flex-grow: 1; margin-right: 12px;">
                  <div style="color: #FFD214; font-weight: 600; font-size: 15px;">${word.expression}</div>
                  <div style="color: #7F848D; font-size: 13px; margin-top: 2px;">${word.correct_answer}</div>
                </div>
                <div style="background: rgba(255, 210, 20, 0.1); color: #FFD214; font-size: 11px; padding: 4px 8px; border-radius: 20px; font-weight: 600; white-space: nowrap; flex-shrink: 0;">3 / 3 ✔</div>
            `;
            item.addEventListener('click', () => {
                if (word.example) openWordModal(word);
            });
            container.appendChild(item);
        });
    }
}

// ================= НАВИГАЦИЯ И ИНИЦИАЛИЗАЦИЯ =================
document.addEventListener('DOMContentLoaded', () => {

    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp; 
        
        tg.ready();
        tg.expand();
        
        // === ФИКС ФОНА TELEGRAM ===
        try {
            tg.setBackgroundColor('#030b1d'); // Строго lowercase hex
            tg.setHeaderColor('#030b1d');
            if (tg.setBottomBarColor) {
                tg.setBottomBarColor('#030b1d');
            }
        } catch (e) {
            console.log('TG API Color Error', e);
        }
        
        if (tg.disableVerticalSwipes) {
            tg.disableVerticalSwipes();
        }
    }

    // --- ЖЕЛЕЗОБЕТОННЫЙ ФИКС РЕЗИНКИ ДЛЯ iOS ---
    let startY = 0;
    
    document.body.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
    }, { passive: true });

    document.body.addEventListener('touchmove', (e) => {
        const screen = e.target.closest('.screen');
        const card = e.target.closest('.s4-question-card'); // Сама карточка
        const dropZone = e.target.closest('.s5-drop-zone-container'); // Зона конструктора
        
        // 1. Если тянут за карточку, зону перетаскивания слов или вообще вне экрана — блокируем скролл окна!
        if (!screen || card || dropZone) {
            e.preventDefault();
            return;
        }
        
        // 2. Логика для остального экрана: блокируем тягучий эффект на краях контента
        const y = e.touches[0].clientY;
        const isScrollingUp = y > startY;
        const isScrollingDown = y < startY;

        if (isScrollingUp && screen.scrollTop <= 0) {
            e.preventDefault(); // Запрещаем тянуть окно вниз, когда мы в самом верху экрана
        } else if (isScrollingDown && screen.scrollTop >= screen.scrollHeight - screen.clientHeight) {
            e.preventDefault(); // Запрещаем тянуть окно вверх, когда мы в самом низу
        }
    }, { passive: false });

    if (typeof amplitude !== 'undefined') {
        amplitude.init('1b7d6e320d00d7bda0f43a207e3bc742', { defaultTracking: { pageViews: true, sessions: true } });
    }
    
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        
        if (user) {
            if (user.photo_url) {
                const avatarImg = document.getElementById('tg-avatar');
                if (avatarImg) avatarImg.src = user.photo_url;
            }
            
            const nameEl = document.getElementById('tg-name');
            if (nameEl && user.first_name) {
                nameEl.textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
            }
            
            const handleEl = document.getElementById('tg-handle');
            if (handleEl && user.username) {
                handleEl.textContent = '@' + user.username;
            }
        }
    }

    const resetBtn = document.getElementById('btn-reset-progress');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            triggerHaptic('warning');
            const lang = currentLanguage;
            const topic = currentTopic;
            const isConfirmed = confirm('Ты уверен, что хочешь сбросить ВЕСЬ прогресс в этой теме (слова + фразы)?');
            if (isConfirmed) {
                localStorage.removeItem(`panamket_words_progress_${lang}_${topic}`);
                localStorage.removeItem(`panamket_book_progress_${lang}_${topic}`);
                localStorage.removeItem(`panamket_errors_${lang}_${topic}`);
                localStorage.setItem(`panamket_total_phrases_${lang}`, 0);
                
                localStorage.setItem('panamket_total_xp', 0);
                totalUserXP = 0;
                
                updateProfileStats();
                triggerHaptic('success');
                alert("Прогресс сброшен до нуля!");
            }
        });
    }

    const selectWordsMode = () => {
        triggerHaptic('light');
        appMode = 'words'; document.body.classList.remove('hide-tabbar');
        updateTabbarUI('lightning'); generateNextWordsCard(); showScreen('screen-quiz');
        setTimeout(() => { if(activeQuizPool[0]) speakWord(activeQuizPool[0].expression, 'word', activeQuizPool[0].id); }, 200);
        // ВЫЗЫВАЕМ ПОКАЗ ОНБОРДИНГА
        setTimeout(checkAndStartOnboarding, 500); 
    };

    const selectBookMode = () => {
        triggerHaptic('light');
        appMode = 'book'; updateTabbarUI('book'); startBookChapter();
    };

    document.querySelectorAll('.tabbar-global').forEach(tabbar => {
        const tabs = tabbar.querySelectorAll('.tab-item');
        if (tabs.length >= 3) {
            tabs[0].addEventListener('click', selectBookMode);
            tabs[1].addEventListener('click', selectWordsMode);
            tabs[2].addEventListener('click', () => { 
                triggerHaptic('light');
                appMode = 'profile'; document.body.classList.remove('hide-tabbar');
                updateTabbarUI('profile'); showScreen('screen-profile'); 
            });
        }
    });

// Обработчик Онбординга
    document.getElementById('onboarding-next-btn')?.addEventListener('click', () => {
        if (typeof triggerHaptic === 'function') triggerHaptic('light');

        if (currentOnboardingStep < onboardingSteps.length - 1) {
            showOnboardingStep(currentOnboardingStep + 1);
        } else {
            // Финал онбординга: скрываем оверлей и чистим клоны
            const overlay = document.getElementById('onboarding-overlay');
            if (overlay) overlay.classList.add('hidden');
            document.querySelectorAll('.onboarding-clone').forEach(el => el.remove());
            
            // ОТКЛЮЧЕНО ДЛЯ ТЕСТОВ: больше не записываем в память, что тур пройден
            // localStorage.setItem('panamket_onboarding_completed', 'true');
        }
    });

    // ПЕРЕВОРОТ КАРТОЧКИ ПОДСКАЗКИ
    document.getElementById('s4-btn-hint')?.addEventListener('click', () => {
        triggerHaptic('light');
        usedHintThisTurn = true; 
        document.getElementById('s4-card-inner')?.classList.add('is-flipped');
    });

    // ЗАКРЫТИЕ (ОБРАТНЫЙ ПЕРЕВОРОТ) ПОДСКАЗКИ
    document.getElementById('s4-btn-close-hint')?.addEventListener('click', () => {
        triggerHaptic('light');
        document.getElementById('s4-card-inner')?.classList.remove('is-flipped');
    });

    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
        triggerHaptic('light');
        document.getElementById('word-modal')?.classList.remove('active');
    });

    document.getElementById('word-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('word-modal')) {
            triggerHaptic('light');
            document.getElementById('word-modal').classList.remove('active');
        }
    });

    document.getElementById('profile-btn-review')?.addEventListener('click', startErrorReviewMode);
    document.getElementById('lessons-review-box')?.addEventListener('click', startErrorReviewMode);

    // СТАРТ ТЕМЫ СРАЗУ В РЕЖИМЕ МОЛНИИ + ЗАПИСЬ ТЕМЫ В ПАМЯТЬ
    document.getElementById('s3-btn-slang')?.addEventListener('click', async () => {
        triggerHaptic('light');
        currentTopic = 'slang';
        localStorage.setItem('panamket_user_topic', 'slang');
        
        const lbl = document.getElementById('profile-theme-label');
        if (lbl) lbl.textContent = 'SLANG';
        
        const success = await loadContentData();
        if(success) selectWordsMode();
    });

    document.getElementById('s3-btn-design')?.addEventListener('click', async () => {
        triggerHaptic('light');
        currentTopic = 'design';
        localStorage.setItem('panamket_user_topic', 'design');

        const lbl = document.getElementById('profile-theme-label');
        if (lbl) lbl.textContent = 'DESIGN';
        
        const success = await loadContentData();
        if(success) selectWordsMode();
    });

    document.getElementById('s3-btn-back')?.addEventListener('click', () => { triggerHaptic('light'); showScreen('screen-lang'); });

    // Логика кнопок назад
    const backToLessonsFn = () => {
        if (appMode === 'book' || appMode === 'errors') {
            selectWordsMode(); 
        } else if (appMode === 'words' || appMode === 'sentences') {
            appMode = 'menu';
            document.body.classList.remove('hide-tabbar'); 
            showScreen('screen-lessons');
        } else {
            showScreen('screen-lessons');
        }
    };

    const s4BackBtn = document.getElementById('s4-btn-back');
    if (s4BackBtn) s4BackBtn.onclick = backToLessonsFn;

    const s5BackBtn = document.getElementById('s5-btn-back');
    if (s5BackBtn) s5BackBtn.onclick = backToLessonsFn;


    document.getElementById('s4-btn-speak')?.addEventListener('click', () => {
        triggerHaptic('light');
        if(activeQuizPool[currentQuizIndex] && !isReverseQuiz) speakWord(activeQuizPool[currentQuizIndex].expression, 'word', activeQuizPool[currentQuizIndex].id);
    });

    const btnSubmit = document.getElementById('s5-btn-submit');
    if(btnSubmit) {
        btnSubmit.addEventListener('click', () => {
            const dropZone = document.getElementById('s5-drop-zone');
            const errorBox = document.getElementById('s5-error-box');

            if (btnSubmit.classList.contains('success')) {
                triggerHaptic('light');
                if (appMode === 'errors') {
                    handleErrorAnswer(true);
                    return;
                }
                let totalPhrasesSaved = parseInt(localStorage.getItem(`panamket_total_phrases_${currentLanguage}`)) || 0;
                localStorage.setItem(`panamket_total_phrases_${currentLanguage}`, totalPhrasesSaved + 1);
                currentSentenceIndex++;
                currentSentenceAttempts = 0; 
                loadSentenceQuestion();
                return;
            }

            if (btnSubmit.classList.contains('failed-state')) {
                triggerHaptic('light');
                if (appMode === 'errors') {
                    handleErrorAnswer(false);
                    return;
                }
                loadSentenceQuestion(); return;
            }

            if(!dropZone) return;
            const currentWords = Array.from(dropZone.children).map(el => el.textContent.trim());
            if (currentWords.length === 0) return;

            const userSentenceString = currentWords.join(' ');
            const targetSequenceString = currentSentenceData.correct_sequences[0].map(w => w.trim()).join(' ');
            
            const isCorrectSequence = currentSentenceData.correct_sequences.some(seq => {
                return seq.join(' ') === userSentenceString;
            });

            if (typeof amplitude !== 'undefined') {
                amplitude.track('Sentence Checked', { chapter: getBookProgress(), is_correct: isCorrectSequence, language: currentLanguage });
            }

            if (!isCorrectSequence && appMode !== 'errors') {
                const sentId = currentSentenceData.id || currentSentenceData.russian;
                logAppError(sentId, 'sentence');
            }

            if (isCorrectSequence) {
                triggerHaptic('success');
                currentAppStreak++; currentAppErrors = 0; checkStreakTrigger();

                if (appMode === 'book') {
                    let pts = Math.max(3, 5 - currentSentenceAttempts);
                    showPhantomPoint(btnSubmit, "+" + pts);
                    currentLessonPhrasesXP += pts;
                    addXP(pts);
                }

                btnSubmit.className = 's5-submit-btn success'; 
                btnSubmit.textContent = appMode === 'errors' ? 'Далее' : 'Продолжить';
                const feedback = document.getElementById('s5-feedback'); 
                if (feedback) feedback.className = 's5-feedback show success';
                
                const catImg = document.getElementById('s5-cat');

                if (currentLanguage === 'pl') {
                    if (catImg) {
                        catImg.className = 's5-cat pl-success';
                        catImg.style.backgroundImage = "url('like_dobrze.webp')";
                    }
                } else if (currentLanguage === 'en') {
                    if (catImg) {
                        catImg.className = 's5-cat en-success';
                        catImg.style.backgroundImage = "url('like_gas.webp')";
                    }
                }

                if (errorBox) errorBox.classList.remove('show');
                speakWord(targetSequenceString, 'sentence', currentSentenceData.id);
            } else {
                triggerHaptic('error');
                currentAppStreak = 0; currentAppErrors++; checkStreakTrigger();
                currentSentenceAttempts++; 

                btnSubmit.className = 's5-submit-btn error failed-state'; 
                btnSubmit.textContent = appMode === 'errors' ? 'Далее' : 'Попробовать снова';
                const feedback = document.getElementById('s5-feedback'); 
                if (feedback) feedback.className = 's5-feedback show error';
                
                const catImg = document.getElementById('s5-cat');

                if (currentLanguage === 'pl') {
                    if (catImg) {
                        catImg.className = 's5-cat pl-error';
                        catImg.style.backgroundImage = "url('ani_lose.webp')";
                    }
                } else if (currentLanguage === 'en') {
                    if (catImg) {
                        catImg.className = 's5-cat en-error';
                        catImg.style.backgroundImage = "url('loose.webp')";
                    }
                }

                if (errorBox) { 
                    errorBox.innerHTML = '<span style="color: #FF6666;">Правильно:</span> <span style="color: #FFFFFF;">' + targetSequenceString + '</span>'; 
                    errorBox.classList.add('show'); 
                }
            }
        });
    }

    // ЗАПИСЬ ЯЗЫКА В ПАМЯТЬ ПРИ СМЕНЕ
    document.getElementById('btn-eng')?.addEventListener('click', () => {
        triggerHaptic('light');
        currentLanguage = 'en';
        localStorage.setItem('panamket_user_lang', 'en');
        const langLabel = document.getElementById('profile-lang-label');
        if(langLabel) langLabel.textContent = 'EN';
        if (typeof amplitude !== 'undefined') amplitude.track('Language Changed', { target_language: 'en' });
        loadContentData().then(() => { updateProfileStats(); lastBookScreen = 'screen-lessons'; showScreen('screen-lessons'); });
    });

    document.getElementById('btn-pln')?.addEventListener('click', () => {
        triggerHaptic('light');
        currentLanguage = 'pl';
        localStorage.setItem('panamket_user_lang', 'pl');
        const langLabel = document.getElementById('profile-lang-label');
        if(langLabel) langLabel.textContent = 'PL';
        if (typeof amplitude !== 'undefined') amplitude.track('Language Changed', { target_language: 'pl' });
        loadContentData().then(() => { updateProfileStats(); lastBookScreen = 'screen-lessons'; showScreen('screen-lessons'); });
    });

    document.getElementById('btn-change-lang')?.addEventListener('click', () => { triggerHaptic('light'); showScreen('screen-lang'); });
    document.getElementById('btn-change-theme')?.addEventListener('click', () => { triggerHaptic('light'); showScreen('screen-lessons'); });
    document.getElementById('btn-privacy')?.addEventListener('click', () => { triggerHaptic('light'); showScreen('screen-privacy'); });
    document.getElementById('privacy-btn-back')?.addEventListener('click', () => { triggerHaptic('light'); showScreen('screen-profile'); });

    document.getElementById('summary-btn-next')?.addEventListener('click', () => { triggerHaptic('light'); startBookChapter(); });

    document.getElementById('summary-btn-loot')?.addEventListener('click', () => {
        triggerHaptic('light');
        lastEntryScreen = 'screen-summary';
        currentArchiveTab = 'progress';
        renderArchiveLoot();
        showScreen('screen-archive');
    });

    document.getElementById('profile-btn-loot')?.addEventListener('click', () => {
        triggerHaptic('light');
        lastEntryScreen = 'screen-profile';
        currentArchiveTab = 'progress';
        renderArchiveLoot();
        showScreen('screen-archive');
    });

    document.getElementById('archive-btn-back')?.addEventListener('click', () => { triggerHaptic('light'); showScreen(lastEntryScreen); });

    document.getElementById('tab-loot-learned')?.addEventListener('click', () => { triggerHaptic('light'); currentArchiveTab = 'learned'; renderArchiveLoot(); });
    document.getElementById('tab-loot-progress')?.addEventListener('click', () => { triggerHaptic('light'); currentArchiveTab = 'progress'; renderArchiveLoot(); });
    document.getElementById('tab-loot-phrases')?.addEventListener('click', () => { triggerHaptic('light'); currentArchiveTab = 'phrases'; renderArchiveLoot(); });

    // ================= УМНЫЙ СТАРТ =================
    setTimeout(async () => {
        const savedLang = localStorage.getItem('panamket_user_lang');
        const savedTopic = localStorage.getItem('panamket_user_topic');
        
        if (savedLang && savedTopic) {
            currentLanguage = savedLang;
            currentTopic = savedTopic;
            
            const langLabel = document.getElementById('profile-lang-label');
            if(langLabel) langLabel.textContent = currentLanguage.toUpperCase();
            
            const success = await loadContentData();
            if (success) {
                selectWordsMode(); 
            } else {
                showScreen('screen-lang'); 
            }
        } else {
            showScreen('screen-lang');
        }
    }, 2500);
});
