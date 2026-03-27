// ─────────────────────────────────────────────────────────────────
//  MiniMind · Progress System — con Supabase + localStorage fallback
// ─────────────────────────────────────────────────────────────────

// !! SOSTITUISCI CON I TUOI DATI !!
const SUPABASE_URL  = 'https://ckxobcqqqqkasumfejie.supabase.co';
const SUPABASE_ANON = 'sb_publishable_Hx0brmeykTMFjlwF5B2GhQ_eo2O7Pqg';

const Progress = (() => {

    const KEY = 'mm_progress';
    let   _supabase = null;
    let   _userId   = null;

    // ── Inizializzazione Supabase ────────────────────────────────
    async function initSupabase() {
        try {
            // Carica il client Supabase (aggiunto via CDN in HTML)
            _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

            // Prova a recuperare la sessione esistente
            const { data: { session } } = await _supabase.auth.getSession();

            if (session?.user) {
                _userId = session.user.id;
            } else {
                // Login anonimo: nessun account richiesto
                const { data, error } = await _supabase.auth.signInAnonymously();
                if (!error) _userId = data.user.id;
            }
        } catch (e) {
            // Se Supabase non è disponibile, si va in modalità offline
            _supabase = null;
            _userId   = null;
        }
    }

    // ── Struttura dati default ───────────────────────────────────
    const defaultState = () => ({
        totalXP:             0,
        streakDays:          0,
        lastLearnedDate:     null,
        badges:              [],
        fondamentali:        { completed: [] },
        prompting:           { completed: [] },
        lavoro:              { completed: [] },
        privacy:             { completed: [] },
        agenti:              { completed: [] }
    });

    // ── localStorage (lettura/scrittura locale) ──────────────────
    function getLocal() {
        try {
            const raw = localStorage.getItem(KEY);
            return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
        } catch { return defaultState(); }
    }

    function saveLocal(state) {
        localStorage.setItem(KEY, JSON.stringify(state));
    }

    // ── Supabase (lettura) ───────────────────────────────────────
    async function getFromCloud() {
        if (!_supabase || !_userId) return null;
        try {
            const { data, error } = await _supabase
                .from('user_progress')
                .select('*')
                .eq('user_id', _userId)
                .single();

            if (error || !data) return null;

            // Normalizza il formato cloud → formato locale
            return {
                totalXP:         data.total_xp          || 0,
                streakDays:      data.streak_days        || 0,
                lastLearnedDate: data.last_learned_date  || null,
                badges:          data.badges             || [],
                fondamentali:    { completed: data.track_fondamentali || [] },
                prompting:       { completed: data.track_prompting    || [] },
                lavoro:          { completed: data.track_lavoro       || [] },
                privacy:         { completed: data.track_privacy      || [] },
                agenti:          { completed: data.track_agenti       || [] }
            };
        } catch { return null; }
    }

    // ── Supabase (scrittura) ─────────────────────────────────────
    async function saveToCloud(state) {
        if (!_supabase || !_userId) return;
        try {
            await _supabase.from('user_progress').upsert({
                user_id:             _userId,
                total_xp:            state.totalXP,
                streak_days:         state.streakDays,
                last_learned_date:   state.lastLearnedDate,
                badges:              state.badges,
                track_fondamentali:  state.fondamentali?.completed || [],
                track_prompting:     state.prompting?.completed    || [],
                track_lavoro:        state.lavoro?.completed       || [],
                track_privacy:       state.privacy?.completed      || [],
                track_agenti:        state.agenti?.completed       || [],
                updated_at:          new Date().toISOString()
            }, { onConflict: 'user_id' });
        } catch { /* silenzioso — i dati sono comunque in localStorage */ }
    }

    // ── Lettura principale (cloud con fallback locale) ───────────
    // Chiamata sincrona per compatibilità con il resto del codice
    function get() {
        return getLocal();
    }

    // Versione asincrona da usare al boot della pagina
    async function getAsync() {
        const cloud = await getFromCloud();
        if (cloud) {
            saveLocal(cloud); // sincronizza locale con cloud
            return cloud;
        }
        return getLocal();
    }

    // ── Salvataggio (locale + cloud) ─────────────────────────────
    function save(state) {
        saveLocal(state);
        saveToCloud(state); // fire & forget — non blocca l'UI
    }

    // ── Data utils ───────────────────────────────────────────────
    function today() {
        return new Date().toISOString().slice(0, 10);
    }

    function daysBetween(a, b) {
        return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
    }

    function updateStreak(state) {
        const t = today(), last = state.lastLearnedDate;
        if (last === t) return state;
        state.streakDays     = (last && daysBetween(last, t) === 1) ? state.streakDays + 1 : 1;
        state.lastLearnedDate = t;
        return state;
    }

    // ── Badge ────────────────────────────────────────────────────
    const BADGES = [
        { id: 'first_step',        emoji: '🌱', name: 'Primo passo',               desc: 'Hai completato la tua prima lezione. Il viaggio è iniziato.',                         check: s => totalCompleted(s) >= 1 },
        { id: 'curious_mind',      emoji: '🔍', name: 'Mente curiosa',             desc: 'Hai completato 5 lezioni. La curiosità è la tua superpotenza.',                       check: s => totalCompleted(s) >= 5 },
        { id: 'on_fire',           emoji: '🔥', name: 'In fiamme',                 desc: 'Tre giorni di fila. L\'abitudine si sta formando.',                                   check: s => s.streakDays >= 3 },
        { id: 'week_warrior',      emoji: '⚡', name: 'Guerriero della settimana', desc: 'Sette giorni consecutivi. Pochi arrivano fin qui.',                                   check: s => s.streakDays >= 7 },
        { id: 'xp_100',            emoji: '💫', name: 'Primo centinaio',           desc: 'Hai raggiunto 100 XP. Stai costruendo qualcosa di solido.',                          check: s => s.totalXP >= 100 },
        { id: 'xp_500',            emoji: '🚀', name: 'In orbita',                 desc: '500 XP. Sei ufficialmente un utente AI avanzato.',                                   check: s => s.totalXP >= 500 },
        { id: 'track_fondamentali',emoji: '🧠', name: 'Basi solide',               desc: 'Hai completato "Fondamentali AI". Ora capisci davvero come funziona.',                check: s => isTrackComplete(s, 'fondamentali', 8) },
        { id: 'track_prompting',   emoji: '✍️', name: 'Prompt Master',             desc: 'Hai completato "Prompt Engineering". Sai come parlare con l\'AI.',                   check: s => isTrackComplete(s, 'prompting', 10) },
        { id: 'track_lavoro',      emoji: '💼', name: 'AI Professional',           desc: 'Hai completato "AI nel lavoro". L\'AI lavora per te, non il contrario.',              check: s => isTrackComplete(s, 'lavoro', 9) },
        { id: 'track_privacy',     emoji: '🛡️', name: 'Guardian digitale',         desc: 'Hai completato "AI & Privacy". I tuoi dati sono al sicuro.',                        check: s => isTrackComplete(s, 'privacy', 6) },
        { id: 'track_agenti',      emoji: '🤖', name: 'Esploratore del futuro',    desc: 'Hai completato "Agenti & Futuro". Sei già nel domani.',                               check: s => isTrackComplete(s, 'agenti', 7) },
        { id: 'all_tracks',        emoji: '🏆', name: 'MiniMind Completo',         desc: 'Hai completato tutti i percorsi. Non molti ci riescono.',                             check: s => isTrackComplete(s,'fondamentali',8) && isTrackComplete(s,'prompting',10) && isTrackComplete(s,'lavoro',9) && isTrackComplete(s,'privacy',6) && isTrackComplete(s,'agenti',7) }
    ];

    function totalCompleted(state) {
        return ['fondamentali','prompting','lavoro','privacy','agenti']
            .reduce((sum, id) => sum + (state[id]?.completed?.length || 0), 0);
    }

    function isTrackComplete(state, trackId, expected) {
        return (state[trackId]?.completed?.length || 0) >= expected;
    }

    function checkNewBadge(state) {
        for (const badge of BADGES) {
            if (!state.badges.includes(badge.id) && badge.check(state)) {
                state.badges.push(badge.id);
                return badge;
            }
        }
        return null;
    }

    // ── Completa una lezione ─────────────────────────────────────
    function completeLesson(trackId, lessonId, xpEarned) {
        let state = get();
        if (!state[trackId]) state[trackId] = { completed: [] };

        if (!state[trackId].completed.includes(lessonId)) {
            state[trackId].completed.push(lessonId);
            state.totalXP += xpEarned;
        }

        state = updateStreak(state);
        const newBadge = checkNewBadge(state);
        save(state); // salva in localStorage + Supabase
        return newBadge;
    }

    function reset() {
        localStorage.removeItem(KEY);
        // Opzionale: cancella anche dal cloud
        if (_supabase && _userId) {
            _supabase.from('user_progress').delete().eq('user_id', _userId);
        }
    }

    // ── Esponi la funzione di init ───────────────────────────────
    return { init: initSupabase, getAsync, get, save, completeLesson, reset, BADGES, totalCompleted };

})();
