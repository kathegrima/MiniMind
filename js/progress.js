// ─────────────────────────────────────────────────────────────────
//  MiniMind · Progress System
//  Tutto salvato in localStorage — nessun account richiesto.
// ─────────────────────────────────────────────────────────────────

const Progress = (() => {

    const KEY = 'mm_progress';

    // Struttura dati di default per un nuovo utente
    const defaultState = () => ({
        totalXP:      0,
        streakDays:   0,
        lastLearnedDate: null,   // 'YYYY-MM-DD'
        badges:       [],        // array di id badge sbloccati
        fondamentali: { completed: [] },
        prompting:    { completed: [] },
        lavoro:       { completed: [] },
        privacy:      { completed: [] },
        agenti:       { completed: [] }
    });

    // ── Lettura / Scrittura ──────────────────────────────────────
    function get() {
        try {
            const raw = localStorage.getItem(KEY);
            return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
        } catch {
            return defaultState();
        }
    }

    function save(state) {
        localStorage.setItem(KEY, JSON.stringify(state));
    }

    // ── Data di oggi in formato YYYY-MM-DD ───────────────────────
    function today() {
        return new Date().toISOString().slice(0, 10);
    }

    function daysBetween(dateA, dateB) {
        const a = new Date(dateA);
        const b = new Date(dateB);
        return Math.round((b - a) / (1000 * 60 * 60 * 24));
    }

    // ── Aggiorna la streak ───────────────────────────────────────
    // Logica: se hai già studiato oggi → streak invariata.
    // Se hai studiato ieri → streak +1. Altrimenti → reset a 1.
    function updateStreak(state) {
        const t    = today();
        const last = state.lastLearnedDate;

        if (last === t) return state; // già aggiornata oggi

        if (last && daysBetween(last, t) === 1) {
            state.streakDays++;       // giorno consecutivo
        } else {
            state.streakDays = 1;     // nuovo inizio o salto
        }

        state.lastLearnedDate = t;
        return state;
    }

    // ── Definizione badge ────────────────────────────────────────
    // Ogni badge ha: id, emoji, name, desc, e una funzione check(state)
    const BADGES = [
        {
            id:    'first_step',
            emoji: '🌱',
            name:  'Primo passo',
            desc:  'Hai completato la tua prima lezione. Il viaggio è iniziato.',
            check: s => totalCompleted(s) >= 1
        },
        {
            id:    'curious_mind',
            emoji: '🔍',
            name:  'Mente curiosa',
            desc:  'Hai completato 5 lezioni. La curiosità è la tua superpotenza.',
            check: s => totalCompleted(s) >= 5
        },
        {
            id:    'on_fire',
            emoji: '🔥',
            name:  'In fiamme',
            desc:  'Tre giorni di fila. L\'abitudine si sta formando.',
            check: s => s.streakDays >= 3
        },
        {
            id:    'week_warrior',
            emoji: '⚡',
            name:  'Guerriero della settimana',
            desc:  'Sette giorni consecutivi. Pochi arrivano fin qui.',
            check: s => s.streakDays >= 7
        },
        {
            id:    'xp_100',
            emoji: '💫',
            name:  'Primo centinaio',
            desc:  'Hai raggiunto 100 XP. Stai costruendo qualcosa di solido.',
            check: s => s.totalXP >= 100
        },
        {
            id:    'xp_500',
            emoji: '🚀',
            name:  'In orbita',
            desc:  '500 XP. Sei ufficialmente un utente AI avanzato.',
            check: s => s.totalXP >= 500
        },
        {
            id:    'track_fondamentali',
            emoji: '🧠',
            name:  'Basi solide',
            desc:  'Hai completato "Fondamentali AI". Ora capisci davvero come funziona.',
            check: s => isTrackComplete(s, 'fondamentali', 8)
        },
        {
            id:    'track_prompting',
            emoji: '✍️',
            name:  'Prompt Master',
            desc:  'Hai completato "Prompt Engineering". Sai come parlare con l\'AI.',
            check: s => isTrackComplete(s, 'prompting', 10)
        },
        {
            id:    'track_lavoro',
            emoji: '💼',
            name:  'AI Professional',
            desc:  'Hai completato "AI nel lavoro". L\'AI lavora per te, non il contrario.',
            check: s => isTrackComplete(s, 'lavoro', 9)
        },
        {
            id:    'track_privacy',
            emoji: '🛡️',
            name:  'Guardian digitale',
            desc:  'Hai completato "AI & Privacy". I tuoi dati sono al sicuro.',
            check: s => isTrackComplete(s, 'privacy', 6)
        },
        {
            id:    'track_agenti',
            emoji: '🤖',
            name:  'Esploratore del futuro',
            desc:  'Hai completato "Agenti & Futuro". Sei già nel domani.',
            check: s => isTrackComplete(s, 'agenti', 7)
        },
        {
            id:    'all_tracks',
            emoji: '🏆',
            name:  'MiniMind Completo',
            desc:  'Hai completato tutti i percorsi. Non molti ci riescono.',
            check: s =>
                isTrackComplete(s, 'fondamentali', 8) &&
                isTrackComplete(s, 'prompting', 10)   &&
                isTrackComplete(s, 'lavoro', 9)        &&
                isTrackComplete(s, 'privacy', 6)       &&
                isTrackComplete(s, 'agenti', 7)
        }
    ];

    // ── Helper per i badge ───────────────────────────────────────
    function totalCompleted(state) {
        return ['fondamentali','prompting','lavoro','privacy','agenti']
            .reduce((sum, id) => sum + (state[id]?.completed?.length || 0), 0);
    }

    function isTrackComplete(state, trackId, expectedTotal) {
        return (state[trackId]?.completed?.length || 0) >= expectedTotal;
    }

    // Controlla se c'è un badge appena sbloccato e lo restituisce
    function checkNewBadge(state) {
        for (const badge of BADGES) {
            if (!state.badges.includes(badge.id) && badge.check(state)) {
                state.badges.push(badge.id);
                return badge; // ritorna il primo badge nuovo trovato
            }
        }
        return null;
    }

    // ── Funzione principale: completa una lezione ────────────────
    function completeLesson(trackId, lessonId, xpEarned) {
        let state = get();

        // Inizializza il percorso se manca
        if (!state[trackId]) state[trackId] = { completed: [] };

        // Aggiungi la lezione se non già presente
        if (!state[trackId].completed.includes(lessonId)) {
            state[trackId].completed.push(lessonId);
            state.totalXP += xpEarned;
        }

        // Aggiorna la streak
        state = updateStreak(state);

        // Controlla badge
        const newBadge = checkNewBadge(state);

        save(state);
        return newBadge; // null o { emoji, name, desc }
    }

    // ── Reset (utile per test o "ricomincia da capo") ────────────
    function reset() {
        localStorage.removeItem(KEY);
    }

    // ── Esporta ──────────────────────────────────────────────────
    return { get, save, completeLesson, reset, BADGES, totalCompleted };

})();
