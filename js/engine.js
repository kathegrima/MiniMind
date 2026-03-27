// ─── Stato globale ───────────────────────────────────────────────
let allData         = null;   // dati da lessons.json
let currentTrackId  = null;
let currentLesson   = null;
let currentLessonIdx= null;
let currentTrack    = null;
let quizState       = { current: 0, score: 0, answered: false };

// ─── Boot ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    allData = await fetchLessons();
    refreshNavXP();
    routeFromURL();
});

async function fetchLessons() {
    const res = await fetch('data/lessons.json');
    return res.json();
}

// Routing via query string  ?track=fondamentali&lesson=f1
function routeFromURL() {
    const params  = new URLSearchParams(window.location.search);
    const trackId = params.get('track');
    const lessonId= params.get('lesson');

    if (trackId && lessonId) {
        const track = allData.tracks.find(t => t.id === trackId);
        const idx   = track?.lessons.findIndex(l => l.id === lessonId);
        if (track && idx !== -1) { openLesson(trackId, idx); return; }
    }
    if (trackId) { showLessons(trackId); return; }
    showTracks();
}

// ─── Schermata: Percorsi ─────────────────────────────────────────
function showTracks() {
    hide('screen-lessons'); hide('screen-lesson');
    show('screen-tracks');
    renderTracks();
    setURL('');
}

function renderTracks() {
    const container = document.getElementById('track-list');
    const progress  = Progress.get();
    container.innerHTML = '';

    const accents = {
        fondamentali: 'border-indigo-200 bg-indigo-50',
        prompting:    'border-purple-200 bg-purple-50',
        lavoro:       'border-blue-200 bg-blue-50',
        privacy:      'border-green-200 bg-green-50',
        agenti:       'border-orange-200 bg-orange-50'
    };
    const bars = {
        fondamentali: 'bg-indigo-500',
        prompting:    'bg-purple-500',
        lavoro:       'bg-blue-500',
        privacy:      'bg-green-500',
        agenti:       'bg-orange-500'
    };
    const levels = {
        fondamentali: { label: 'Principiante',  color: 'text-green-600 bg-green-50 border-green-200' },
        prompting:    { label: 'Intermedio',    color: 'text-blue-600 bg-blue-50 border-blue-200' },
        lavoro:       { label: 'Pratico',       color: 'text-purple-600 bg-purple-50 border-purple-200' },
        privacy:      { label: 'Essenziale',    color: 'text-orange-600 bg-orange-50 border-orange-200' },
        agenti:       { label: 'Avanzato',      color: 'text-red-600 bg-red-50 border-red-200' }
    };

    allData.tracks.forEach(track => {
        const done     = progress[track.id]?.completed?.length || 0;
        const total    = track.lessons.length;
        const pct      = Math.round((done / total) * 100);
        const statusTxt= done === 0 ? 'Non ancora iniziato'
                       : done === total ? '✅ Completato!'
                       : `${done}/${total} lezioni completate`;
        const lv       = levels[track.id] || { label: '', color: '' };

        container.innerHTML += `
        <button onclick="showLessons('${track.id}')"
                class="text-left p-6 rounded-3xl border-2 ${accents[track.id] || 'border-gray-200 bg-white'}
                       hover:shadow-md transition-all hover:-translate-y-1">
            <div class="flex items-start justify-between mb-4">
                <span class="text-3xl">${track.emoji}</span>
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full border ${lv.color}">${lv.label}</span>
            </div>
            <h3 class="font-bold text-lg mb-1">${track.title}</h3>
            <p class="text-xs text-gray-500 mb-4">${total} lezioni · ~${total * 5} min</p>
            <div class="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>${statusTxt}</span><span>${pct}%</span>
            </div>
            <div class="h-1.5 bg-white/80 rounded-full overflow-hidden border border-gray-200">
                <div class="h-full rounded-full ${bars[track.id] || 'bg-gray-400'}" style="width:${pct}%"></div>
            </div>
        </button>`;
    });
}

// ─── Schermata: Lista lezioni ─────────────────────────────────────
function showLessons(trackId) {
    hide('screen-tracks'); hide('screen-lesson');
    show('screen-lessons');
    currentTrackId = trackId;
    currentTrack   = allData.tracks.find(t => t.id === trackId);
    setURL(`?track=${trackId}`);
    renderLessons();
}

function renderLessons() {
    const track    = currentTrack;
    const progress = Progress.get();
    const done     = progress[track.id]?.completed || [];
    const total    = track.lessons.length;
    const pct      = Math.round((done.length / total) * 100);

    document.getElementById('track-emoji').textContent   = track.emoji;
    document.getElementById('track-title').textContent   = track.title;
    document.getElementById('track-meta').textContent    = `${total} lezioni · ${total * 5} minuti totali`;
    document.getElementById('track-progress-bar').style.width = `${pct}%`;

    const list = document.getElementById('lesson-list');
    list.innerHTML = '';

    track.lessons.forEach((lesson, idx) => {
        const isCompleted = done.includes(lesson.id);
        const isNext      = !isCompleted && (idx === 0 || done.includes(track.lessons[idx - 1]?.id));
        const isLocked    = !isCompleted && !isNext;

        list.innerHTML += `
        <button onclick="${isLocked ? '' : `openLesson('${track.id}', ${idx})`}"
                class="w-full flex items-center gap-4 p-5 rounded-2xl border text-left transition-all
                       ${isCompleted ? 'border-green-200 bg-green-50 hover:bg-green-100'
                       : isNext      ? 'border-indigo-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5'
                       :               'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'}">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0
                        ${isCompleted ? 'bg-green-500 text-white'
                        : isNext      ? 'bg-indigo-600 text-white'
                        :               'bg-gray-200 text-gray-400'}">
                ${isCompleted ? '✓' : isNext ? (idx + 1) : '🔒'}
            </div>
            <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm ${isLocked ? 'text-gray-400' : 'text-gray-800'}">${lesson.title}</div>
                <div class="text-xs text-gray-400 mt-0.5">${lesson.duration} min · +${lesson.xp} XP</div>
            </div>
            ${isCompleted ? '<span class="text-green-500 text-sm">✅</span>'
            : isNext      ? '<span class="text-indigo-400 text-sm">→</span>'
            :               ''}
        </button>`;
    });
}

// ─── Schermata: Lezione ───────────────────────────────────────────
function openLesson(trackId, lessonIdx) {
    hide('screen-tracks'); hide('screen-lessons');
    show('screen-lesson');

    currentTrackId   = trackId;
    currentTrack     = allData.tracks.find(t => t.id === trackId);
    currentLessonIdx = lessonIdx;
    currentLesson    = currentTrack.lessons[lessonIdx];

    setURL(`?track=${trackId}&lesson=${currentLesson.id}`);
    renderLesson();
}

function renderLesson() {
    const lesson = currentLesson;
    const track  = currentTrack;
    const total  = track.lessons.length;
    const pct    = Math.round(((currentLessonIdx + 1) / total) * 100);

    // Header progress
    document.getElementById('lesson-counter').textContent      = `${currentLessonIdx + 1} / ${total}`;
    document.getElementById('lesson-progress-bar').style.width = `${pct}%`;

    // Contenuto
    document.getElementById('lesson-title').textContent    = lesson.title;
    document.getElementById('lesson-concept').innerHTML    = lesson.concept;
    document.getElementById('lesson-example').innerHTML    = lesson.example;
    document.getElementById('lesson-tip').textContent      = lesson.tip;
    document.getElementById('lesson-duration').textContent = lesson.duration;
    document.getElementById('lesson-xp').textContent       = lesson.xp;
    document.getElementById('lesson-source').textContent   = lesson.source;

    // Reset schermate
    show('lesson-content');
    hide('quiz-content');
    hide('complete-content');
}

// ─── Quiz ─────────────────────────────────────────────────────────
function startQuiz() {
    hide('lesson-content');
    show('quiz-content');
    quizState = { current: 0, score: 0, answered: false };
    renderQuestion();
}

function renderQuestion() {
    const quiz      = currentLesson.quiz;
    const q         = quiz[quizState.current];
    const container = document.getElementById('quiz-questions');
    const total     = quiz.length;
    const pct       = Math.round((quizState.current / total) * 100);

    document.getElementById('lesson-progress-bar').style.width = `${pct}%`;

    container.innerHTML = `
    <div class="fade-in">
        <div class="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm mb-4">
            <div class="flex items-center gap-2 text-xs font-semibold text-purple-500 uppercase tracking-wide mb-5">
                <span>🧩</span> Domanda ${quizState.current + 1} di ${total}
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-6 leading-snug">${q.question}</h3>
            <div class="space-y-3" id="options-container">
                ${q.options.map((opt, i) => `
                <button id="opt-${i}"
                        onclick="selectAnswer(${i})"
                        class="option-btn w-full text-left px-5 py-4 rounded-2xl border-2 border-gray-200
                               bg-white text-gray-700 font-medium text-sm hover:border-indigo-300
                               hover:bg-indigo-50 transition-all">
                    <span class="inline-flex items-center gap-3">
                        <span class="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-bold">
                            ${String.fromCharCode(65 + i)}
                        </span>
                        ${opt}
                    </span>
                </button>`).join('')}
            </div>
        </div>
        <div id="explanation-box" class="hidden fade-in bg-white rounded-2xl border p-6 mb-4"></div>
        <button id="btn-continue" onclick="continueQuiz()"
                class="hidden w-full bg-indigo-600 text-white font-semibold py-4 rounded-2xl
                       hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-lg">
            Continua →
        </button>
    </div>`;
}

function selectAnswer(selectedIdx) {
    if (quizState.answered) return;
    quizState.answered = true;

    const q       = currentLesson.quiz[quizState.current];
    const correct = q.correct;
    const isRight = selectedIdx === correct;

    if (isRight) quizState.score++;

    // Colora i bottoni
    for (let i = 0; i < q.options.length; i++) {
        const btn = document.getElementById(`opt-${i}`);
        btn.disabled = true;
        if (i === correct)      btn.classList.add('option-correct');
        if (i === selectedIdx && !isRight) btn.classList.add('option-wrong');
    }

    // Spiegazione
    const exBox = document.getElementById('explanation-box');
    exBox.classList.remove('hidden');
    exBox.className = `fade-in rounded-2xl border p-6 mb-4 ${isRight
        ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-red-50 border-red-200 text-red-800'}`;
    exBox.innerHTML = `
        <div class="font-bold mb-1">${isRight ? '✅ Esatto!' : '❌ Non proprio…'}</div>
        <div class="text-sm leading-relaxed">${q.explanation}</div>`;

    document.getElementById('btn-continue').classList.remove('hidden');
}

function continueQuiz() {
    quizState.current++;
    quizState.answered = false;
    const total = currentLesson.quiz.length;

    if (quizState.current < total) {
        renderQuestion();
    } else {
        completeLesson();
    }
}

// ─── Completamento lezione ────────────────────────────────────────
function completeLesson() {
    hide('quiz-content');
    show('complete-content');

    const lesson    = currentLesson;
    const perfect   = quizState.score === lesson.quiz.length;
    const xpEarned  = perfect ? lesson.xp : Math.round(lesson.xp * 0.7);

    // Salva progressi
    const badge = Progress.completeLesson(currentTrackId, lesson.id, xpEarned);
    refreshNavXP();

    // UI completamento
    document.getElementById('complete-emoji').textContent    = perfect ? '🎉' : '💪';
    document.getElementById('complete-title').textContent    = perfect ? 'Perfetto!' : 'Lezione completata!';
    document.getElementById('complete-xp').textContent       = `+${xpEarned} XP`;
    document.getElementById('complete-subtitle').textContent = perfect
        ? `Hai risposto correttamente a tutte le domande. Sei in forma!`
        : `Hai risposto a ${quizState.score}/${lesson.quiz.length} domande. Ripassala quando vuoi!`;

    // Badge
    if (badge) {
        document.getElementById('badge-earned').classList.remove('hidden');
        document.getElementById('badge-emoji').textContent = badge.emoji;
        document.getElementById('badge-name').textContent  = badge.name;
        document.getElementById('badge-desc').textContent  = badge.desc;
    }

    // Bottone prossima lezione
    const nextIdx = currentLessonIdx + 1;
    const hasNext = nextIdx < currentTrack.lessons.length;
    const btnNext = document.getElementById('btn-next');

    if (hasNext) {
        btnNext.textContent = `Prossima: ${currentTrack.lessons[nextIdx].title} →`;
    } else {
        btnNext.textContent = '🏆 Hai finito il percorso!';
        btnNext.onclick     = () => showTracks();
    }

    // Streak pulse
    const streakEl = document.getElementById('streak-count');
    streakEl.parentElement.classList.add('streak-pulse');
    setTimeout(() => streakEl.parentElement.classList.remove('streak-pulse'), 600);

    document.getElementById('lesson-progress-bar').style.width = '100%';
}

function nextLesson() {
    const nextIdx = currentLessonIdx + 1;
    if (nextIdx < currentTrack.lessons.length) {
        openLesson(currentTrackId, nextIdx);
    } else {
        showTracks();
    }
}

// ─── Utils ────────────────────────────────────────────────────────
function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }
function setURL(query) {
    history.replaceState(null, '', window.location.pathname + query);
}
function refreshNavXP() {
    const p = Progress.get();
    document.getElementById('xp-display').textContent    = p.totalXP    || 0;
    document.getElementById('streak-count').textContent  = p.streakDays || 0;
}
