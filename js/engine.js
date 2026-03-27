// ─────────────────────────────────────────────────────────────────
//  MiniMind · Engine
// ─────────────────────────────────────────────────────────────────

let allData        = null;
let currentTrackId = null;
let currentLesson  = null;
let currentLessonIdx = null;
let currentTrack   = null;
let quizState      = { current: 0, score: 0, answered: false };

// ── Boot ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    try {
        allData = await fetchLessons();
    } catch (e) {
        document.body.innerHTML = `
        <div class="min-h-screen flex items-center justify-center p-6">
            <div class="text-center">
                <div class="text-5xl mb-4">⚠️</div>
                <h2 class="text-xl font-bold mb-2">Impossibile caricare le lezioni</h2>
                <p class="text-gray-500 text-sm">Assicurati che <code>lessons.json</code> sia nella cartella corretta.</p>
                <p class="text-red-400 text-xs mt-2">${e.message}</p>
            </div>
        </div>`;
        return;
    }
    refreshNavXP();
    routeFromURL();
});

// ✅ FIX: path corretto — lessons.json è nella root del progetto
async function fetchLessons() {
    const res = await fetch('data/lessons.json');
    if (!res.ok) throw new Error(`HTTP ${res.status} — file non trovato`);
    return res.json();
}

// ── URL routing ──────────────────────────────────────────────────
function routeFromURL() {
    const params   = new URLSearchParams(window.location.search);
    const trackId  = params.get('track');
    const lessonId = params.get('lesson');
    if (trackId && lessonId) {
        const track = allData.tracks.find(t => t.id === trackId);
        const idx   = track?.lessons.findIndex(l => l.id === lessonId);
        if (track && idx !== -1) { openLesson(trackId, idx); return; }
    }
    if (trackId) { showLessons(trackId); return; }
    showTracks();
}

function setURL(query) {
    history.replaceState(null, '', query ? `learn.html${query}` : 'learn.html');
}

// ── Helpers UI ───────────────────────────────────────────────────
function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }

function refreshNavXP() {
    const state = Progress.get();
    const el    = document.getElementById('nav-xp');
    if (el) el.textContent = `⭐ ${state.totalXP} XP`;
    const streak = document.getElementById('streak-count');
    if (streak) streak.textContent = state.streakDays || 0;
}

// ── Schermata: Percorsi ──────────────────────────────────────────
function showTracks() {
    hide('screen-lessons');
    hide('screen-lesson');
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
        fondamentali: { label: 'Principiante', color: 'text-green-600 bg-green-50 border-green-200' },
        prompting:    { label: 'Intermedio',   color: 'text-blue-600 bg-blue-50 border-blue-200'   },
        lavoro:       { label: 'Pratico',      color: 'text-purple-600 bg-purple-50 border-purple-200' },
        privacy:      { label: 'Essenziale',   color: 'text-orange-600 bg-orange-50 border-orange-200' },
        agenti:       { label: 'Avanzato',     color: 'text-red-600 bg-red-50 border-red-200'      }
    };

    allData.tracks.forEach(track => {
        const done      = progress[track.id]?.completed?.length || 0;
        const total     = track.lessons.length;
        const pct       = Math.round((done / total) * 100);
        const statusTxt = done === 0     ? 'Non ancora iniziato'
                        : done === total ? '✅ Completato!'
                        : `${done}/${total} lezioni completate`;
        const lv        = levels[track.id] || { label: '', color: '' };
        const accent    = accents[track.id] || 'border-gray-200 bg-white';
        const bar       = bars[track.id]    || 'bg-indigo-500';

        container.innerHTML += `
        <button onclick="showLessons('${track.id}')"
                class="w-full text-left p-6 rounded-3xl border-2 ${accent}
                       hover:shadow-md hover:border-opacity-80 transition-all card-hover">
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                    <span class="text-3xl">${track.emoji}</span>
                    <span class="text-xs font-semibold px-2.5 py-1 rounded-full border ${lv.color}">
                        ${lv.label}
                    </span>
                </div>
                <span class="text-xs font-semibold ${done > 0 ? 'text-indigo-600' : 'text-gray-300'}">
                    ${statusTxt}
                </span>
            </div>
            <h3 class="font-bold text-lg mb-1.5">${track.title}</h3>
            <p class="text-sm text-gray-500 leading-relaxed mb-4">${track.description}</p>
            <div class="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>${total} lezioni · ${total * 5} minuti</span>
                <span>${pct}%</span>
            </div>
            <div class="h-1.5 bg-white/80 rounded-full overflow-hidden border border-gray-200">
                <div class="h-full rounded-full ${bar} transition-all duration-500"
                     style="width:${pct}%"></div>
            </div>
        </button>`;
    });
}

// ── Schermata: Lista lezioni ─────────────────────────────────────
function showLessons(trackId) {
    hide('screen-tracks');
    hide('screen-lesson');
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

    document.getElementById('track-emoji').textContent         = track.emoji;
    document.getElementById('track-title').textContent         = track.title;
    document.getElementById('track-meta').textContent          = `${total} lezioni · ${total * 5} minuti totali`;
    document.getElementById('track-progress-bar').style.width  = `${pct}%`;

    const list = document.getElementById('lesson-list');
    list.innerHTML = '';

    track.lessons.forEach((lesson, idx) => {
        const isCompleted = done.includes(lesson.id);
        const isNext      = !isCompleted && (idx === 0 || done.includes(track.lessons[idx - 1]?.id));
        const isLocked    = !isCompleted && !isNext;

        list.innerHTML += `
        <button onclick="${isLocked ? '' : `openLesson('${track.id}', ${idx})`}"
                class="w-full text-left p-5 rounded-2xl border transition-all
                       ${isCompleted ? 'bg-green-50 border-green-200 hover:bg-green-100' :
                         isNext      ? 'bg-white border-indigo-200 hover:border-indigo-400 hover:shadow-sm' :
                                       'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'}">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg
                            ${isCompleted ? 'bg-green-500 text-white' :
                              isNext      ? 'bg-indigo-600 text-white' :
                                            'bg-gray-200 text-gray-400'}">
                    ${isCompleted ? '✓' : isNext ? '▶' : '🔒'}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-semibold text-sm text-gray-800 truncate">${lesson.title}</div>
                    <div class="text-xs text-gray-400 mt-0.5">
                        ${lesson.duration} min · ${lesson.xp} XP
                        ${isCompleted ? ' · <span class="text-green-600 font-medium">Completata</span>' : ''}
                    </div>
                </div>
                ${!isLocked ? '<span class="text-gray-300 text-sm">→</span>' : ''}
            </div>
        </button>`;
    });
}

// ── Schermata: Lezione ───────────────────────────────────────────
function openLesson(trackId, lessonIdx) {
    hide('screen-tracks');
    hide('screen-lessons');
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

    document.getElementById('lesson-counter').textContent       = `${currentLessonIdx + 1} / ${total}`;
    document.getElementById('lesson-progress-bar').style.width  = `${pct}%`;
    document.getElementById('lesson-title').textContent         = lesson.title;
    document.getElementById('lesson-concept').innerHTML         = lesson.concept;
    document.getElementById('lesson-example').innerHTML         = lesson.example;
    document.getElementById('lesson-tip').textContent           = lesson.tip;
    document.getElementById('lesson-duration').textContent      = lesson.duration;
    document.getElementById('lesson-xp').textContent            = lesson.xp;
    document.getElementById('lesson-source').textContent        = lesson.source;

    show('lesson-content');
    hide('quiz-content');
    hide('complete-content');
}

// ── Quiz ─────────────────────────────────────────────────────────
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
    <div>
        <div class="flex items-center justify-between mb-6">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Domanda ${quizState.current + 1} di ${total}
            </span>
        </div>
        <h3 class="text-lg font-bold text-gray-800 mb-6 leading-snug">${q.question}</h3>
        <div class="space-y-3" id="options-list"></div>
        <div id="quiz-feedback" class="hidden mt-5 p-4 rounded-2xl text-sm leading-relaxed"></div>
        <button id="btn-next-question" onclick="nextQuestion()"
                class="hidden w-full mt-4 bg-indigo-600 text-white font-semibold py-3.5
                       rounded-2xl hover:bg-indigo-700 transition-colors">
            ${quizState.current + 1 < total ? 'Prossima domanda →' : 'Vedi risultato →'}
        </button>
    </div>`;

    const optList = document.getElementById('options-list');
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = `w-full text-left p-4 rounded-2xl border-2 border-gray-200 bg-white
                         hover:border-indigo-300 hover:bg-indigo-50 transition-all text-sm font-medium`;
        btn.textContent = opt;
        btn.onclick     = () => selectAnswer(i, q.correct, q.explanation);
        optList.appendChild(btn);
    });
}

function selectAnswer(selected, correct, explanation) {
    if (quizState.answered) return;
    quizState.answered = true;

    const isCorrect = selected === correct;
    if (isCorrect) quizState.score++;

    const options = document.querySelectorAll('#options-list button');
    options.forEach((btn, i) => {
        btn.disabled  = true;
        btn.className = btn.className.replace('hover:border-indigo-300 hover:bg-indigo-50', '');
        if (i === correct)  btn.className += ' border-green-400 bg-green-50 text-green-800';
        if (i === selected && !isCorrect) btn.className += ' border-red-400 bg-red-50 text-red-800';
    });

    const feedback = document.getElementById('quiz-feedback');
    feedback.classList.remove('hidden');
    feedback.className = `mt-5 p-4 rounded-2xl text-sm leading-relaxed
        ${isCorrect ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'}`;
    feedback.innerHTML = `<strong>${isCorrect ? '✅ Corretto!' : '❌ Non esatto.'}</strong>
        <span class="ml-1">${explanation}</span>`;

    document.getElementById('btn-next-question').classList.remove('hidden');
}

function nextQuestion() {
    quizState.current++;
    quizState.answered = false;
    if (quizState.current < currentLesson.quiz.length) {
        renderQuestion();
    } else {
        completeLesson();
    }
}

// ── Lezione completata ───────────────────────────────────────────
function completeLesson() {
    hide('quiz-content');
    show('complete-content');

    const lesson  = currentLesson;
    const total   = lesson.quiz.length;
    const score   = quizState.score;
    const ratio   = total > 0 ? score / total : 0;
    const perfect = score === total;

    let xpEarned = 0;
    if (perfect) {
        xpEarned = lesson.xp;
    } else if (score > 0) {
        xpEarned = Math.max(Math.round(lesson.xp * ratio), Math.round(lesson.xp * 0.3));
    }

    const badge = Progress.completeLesson(currentTrackId, lesson.id, xpEarned);
    refreshNavXP();

    const perf = ratio === 1 ? 'perfect'
               : ratio >= 0.5 ? 'good'
               : score > 0    ? 'low'
               : 'zero';

    const ui = {
        perfect: { emoji: '🎉', title: 'Perfetto!',          color: 'text-green-600' },
        good:    { emoji: '💪', title: 'Bel lavoro!',        color: 'text-indigo-600' },
        low:     { emoji: '📖', title: 'Lezione completata', color: 'text-amber-600' },
        zero:    { emoji: '🔄', title: 'Ripassala ancora',   color: 'text-red-500' }
    }[perf];

    document.getElementById('complete-emoji').textContent  = ui.emoji;
    document.getElementById('complete-title').textContent  = ui.title;
    document.getElementById('complete-title').className    = `text-3xl font-bold mb-3 ${ui.color}`;

    document.getElementById('complete-xp').textContent    = xpEarned > 0
        ? `+${xpEarned} XP` : '0 XP';
    document.getElementById('complete-xp').className      = `text-2xl font-bold
        ${xpEarned > 0 ? 'text-indigo-600' : 'text-gray-400'}`;

    document.getElementById('complete-subtitle').textContent =
        perf === 'perfect' ? `Tutte le ${total} domande corrette. Sei in forma!`
      : perf === 'good'    ? `${score} su ${total} corrette. Stai andando bene.`
      : perf === 'low'     ? `${score} su ${total} corrette. Vale la pena ripassarla.`
      : `Nessuna risposta corretta questa volta. Ci vogliono solo 2 minuti per riprovarla.`;

    // Badge
    const badgeEl = document.getElementById('badge-earned');
    if (badge && badgeEl) {
        badgeEl.classList.remove('hidden');
        document.getElementById('badge-emoji').textContent = badge.emoji;
        document.getElementById('badge-name').textContent  = badge.name;
        document.getElementById('badge-desc').textContent  = badge.desc;
    } else if (badgeEl) {
        badgeEl.classList.add('hidden');
    }

    // Pulsante prossima lezione
    const nextIdx = currentLessonIdx + 1;
    const hasNext = nextIdx < currentTrack.lessons.length;
    const btnNext = document.getElementById('btn-next');
    if (hasNext) {
        btnNext.textContent = `Prossima: ${currentTrack.lessons[nextIdx].title} →`;
        btnNext.onclick     = () => nextLesson();
    } else {
        btnNext.textContent = '🏆 Hai finito il percorso!';
        btnNext.onclick     = () => showTracks();
    }

    // Bottone riprova se score basso
    const existingRetry = document.getElementById('btn-retry');
    if (existingRetry) existingRetry.remove();

    if (perf === 'zero' || perf === 'low') {
        const retryBtn    = document.createElement('button');
        retryBtn.id       = 'btn-retry';
        retryBtn.textContent = '🔄 Riprova il quiz';
        retryBtn.className   = `w-full bg-amber-50 border border-amber-200 text-amber-700
                                font-semibold py-3 rounded-2xl hover:bg-amber-100 transition-colors mt-0`;
        retryBtn.onclick     = () => {
            quizState = { current: 0, score: 0, answered: false };
            hide('complete-content');
            show('quiz-content');
            renderQuestion();
        };
        const btnContainer = document.querySelector('#complete-content .flex.flex-col.gap-3');
        if (btnContainer) btnContainer.appendChild(retryBtn);
    }

    // Streak pulse
    const streakEl = document.getElementById('streak-count');
    if (streakEl) {
        streakEl.parentElement.classList.add('streak-pulse');
        setTimeout(() => streakEl.parentElement.classList.remove('streak-pulse'), 600);
    }

    document.getElementById('lesson-progress-bar').style.width = '100%';
}

function nextLesson() {
    openLesson(currentTrackId, currentLessonIdx + 1);
}

function showTracks() {
    hide('screen-lessons');
    hide('screen-lesson');
    show('screen-tracks');
    renderTracks();
    setURL('');
}
