import {
    seals,
    scenes,
    processes,
    processesWork,
    processesStudy,
    processesCreate,
    processesRest,
    processesMove,
    processesOther,
    raidBanners,
    fieldMantras,
    sfxTags,
    activityPlaceholders,
    sealsInput,
    koushiou,
    afterglows
} from './deck.js?v=force4';
import { Storage } from './storage.js';

// [RULE] Import Safety:
// 1. Ensure all imported names exist in 'deck.js' (export const).
// 2. Mismatch leads to 'APP IMPORT FAIL'. Check RULES.md.

// ... (Force Debug Module) ...

// --- Utils ---
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getTodayDateKey() {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

// Simple Hash (FNV-1a like)
function hashStringToInt(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
}

function applyTemplate(str, vars = {}) {
    if (typeof str !== "string") return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

function getProcessPoolByMode(mode) {
    switch (mode) {
        case "work":
        case "仕事":
        case "忍務":
            return processesWork?.length ? processesWork : processes;

        case "study":
        case "学習":
        case "修行":
            return processesStudy?.length ? processesStudy : processes;

        case "create":
        case "創作":
        case "秘術":
            return processesCreate?.length ? processesCreate : processes;

        case "rest":
        case "休憩":
        case "茶屋":
            return processesRest?.length ? processesRest : processes;

        case "move":
        case "移動":
        case "早馬":
            return processesMove?.length ? processesMove : processes;

        case "other":
        case "その他":
        case "不明":
            return processesOther?.length ? processesOther : processes;

        case "生活":
        case "日常":
            // 生活/日常 uses processesOther or general processes
            return processesOther?.length ? processesOther : processes;

        default:
            return processes;
    }
}

// ... (Navigation) ...

// --- Logic ---
function runGacha(entryId, dateKey, category) {
    const seedStr = entryId + dateKey;
    const seed = hashStringToInt(seedStr);

    const sceneIndex = seed % scenes.length;

    // Select Process Pool based on Category
    const pool = getProcessPoolByMode(category);

    // Use pool length for modulo
    const processIndex = (seed * 7 + 13) % pool.length;

    const sealIndex = (seed * 11 + 5) % seals.length;

    // Plan A: Extra Seeded Metadata
    const bannerIndex = (seed * 3 + 7) % raidBanners.length;
    // SFX (3 distinct)
    const sfx1 = sfxTags[(seed * 2 + 1) % sfxTags.length];
    const sfx2 = sfxTags[(seed * 5 + 3) % sfxTags.length];
    const sfx3 = sfxTags[(seed * 7 + 11) % sfxTags.length];

    // 口上（乱入の現れ方）と余韻（後味）
    const koushiouIndex = (seed * 13 + 17) % koushiou.length;
    const afterglowIndex = (seed * 19 + 23) % afterglows.length;

    return {
        scene: scenes[sceneIndex],
        process: pool[processIndex], // Use selected pool
        seal: seals[sealIndex],
        seed: seed,
        entryId: entryId,
        // New Props
        banner: raidBanners[bannerIndex],
        sfx: [sfx1, sfx2, sfx3],
        koushiou: koushiou[koushiouIndex],
        afterglow: afterglows[afterglowIndex]
    };
}

function renderProcessSteps(steps, activity) {
    const ol = document.getElementById("process-steps");
    if (!ol) return;

    ol.innerHTML = "";
    const vars = { task: activity };

    steps.slice(0, 3).forEach((s) => {
        const li = document.createElement("li");
        li.textContent = applyTemplate(s, vars);
        ol.appendChild(li);
    });
}

function renderResult(result, activity) {
    // 1. Banner
    document.getElementById('raid-banner').textContent = result.banner;

    // 2. Seal
    document.getElementById('seal-mark').textContent = result.seal;

    // 3. 口上（乱入の現れ方）のみ表示（sceneは別項目で出すか省略）
    const koushiouText = result.koushiou || "";
    document.getElementById('result-scene').textContent = koushiouText;
    document.getElementById('sfx-scene').textContent = result.sfx[0]; // SFX 1

    // 4. Steps
    renderProcessSteps(result.process.steps, activity);
    document.getElementById('sfx-process').textContent = result.sfx[1]; // SFX 2

    // 5. 余韻（後味）with template replacement
    const vars = { task: activity };
    const afterglowText = applyTemplate(result.afterglow || "", vars);
    document.getElementById('result-och').textContent = afterglowText;
    document.getElementById('sfx-ochi').textContent = result.sfx[2]; // SFX 3
}

// --- State ---
const state = {
    currentScreen: 'screen-entry',
    entryData: null, // { id, activity, category, dateKey }
    gachaResult: null, // { scene, process, seal, seed }
    userChoice: null, // 'YES' | 'NO'
    logIdToView: null // 履歴から閲覧する場合のID
};

// --- DOM Elements ---
const screens = {
    entry: document.getElementById('screen-entry'),
    result: document.getElementById('screen-result'),
    archive: document.getElementById('screen-archive')
};

// --- Init (Entry Screen) ---
function initEntryScreen() {
    // No random elements needed anymore (hero banner is static)
}
// Run on load
initEntryScreen();




// --- Navigation ---
function showScreen(screenId) {
    debugLog(`showScreen('${screenId}') CALLED`);

    Object.values(screens).forEach(el => {
        if (el) {
            el.classList.remove('active');
            el.style.display = 'none';
        }
    });

    const target = screens[screenId.replace('screen-', '')];
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';
        debugLog(`SHOW: #${target.id} (display:block)`);

        window.scrollTo(0, 0);
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
    } else {
        debugLog(`ERROR: Target not found for ${screenId}`);
        alert(`Error: Screen element not found for ${screenId}`);
    }

    state.currentScreen = screenId;
}


// --- Debug Utils ---
function debugLog(msg) {
    console.log("[DEBUG]", msg);
}




// 1. Entry -> Result (Delegated Event - The "断定テスト3")
document.body.addEventListener('click', async (e) => {
    // Find closest button if clicked inside
    const btn = e.target.closest('#btn-open-scroll');
    if (!btn) return; // Not our button

    e.preventDefault();
    debugLog("DELEGATE: Clicked #btn-open-scroll");

    // Scope Check
    const screenEntry = document.getElementById('screen-entry');
    if (!screenEntry || getComputedStyle(screenEntry).display === 'none') {
        debugLog("WARN: Clicked button but screen-entry is hidden or missing.");
    }

    // --- Validation ---
    const activityInput = document.getElementById('activity-input');
    const activity = activityInput ? activityInput.value.trim() : "";
    debugLog(`Activity: '${activity}'`);

    if (!activity) {
        debugLog("Validation: Empty. Shaking.");
        if (activityInput) {
            activityInput.classList.add('shake');
            setTimeout(() => activityInput.classList.remove('shake'), 500);
            activityInput.focus();
        }
        return;
    }

    const category = document.getElementById('category-select').value;

    // UI Feedback
    const originalText = btn.innerHTML;
    btn.textContent = "【侵入検知】現場を特定…";
    btn.disabled = true;

    // Wait
    await new Promise(r => setTimeout(r, 300));

    try {
        debugLog("Logic: Running Gacha...");
        const entryId = generateUUID();
        const dateKey = getTodayDateKey();

        state.entryData = { id: entryId, activity, category, dateKey };
        state.gachaResult = runGacha(entryId, dateKey, category);

        debugLog("Logic: Render...");
        resetResultUI();
        renderResult(state.gachaResult, activity);

        btn.innerHTML = originalText;
        btn.disabled = false;

        debugLog("Transition: Calling showScreen('screen-result')");
        showScreen('screen-result');

    } catch (err) {
        debugLog(`ERROR: ${err.message}`);
        alert("Fatal Error: " + err.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

function resetResultUI() {
    document.getElementById('judgment-area').classList.remove('hidden');
    document.getElementById('slider-area').classList.add('hidden');
    document.getElementById('saved-message').classList.add('hidden');
    document.getElementById('btn-save').disabled = false;
    document.getElementById('btn-save').textContent = "巻物に刻む";

    document.querySelectorAll('.btn-judgement').forEach(b => b.classList.remove('selected'));
    document.querySelector('.scroll-card').classList.remove('shakyo-mode');
    document.getElementById('btn-toggle-shakyo').textContent = "写経モード";

    // Reset Slider
    document.getElementById('intensity-slider').value = 50;
    updateSliderLabel(50);
    document.getElementById('result-note').value = "";
}

// 2. Judgement (YES/NO)
document.getElementById('btn-yes').addEventListener('click', () => { selectChoice('YES'); });
document.getElementById('btn-no').addEventListener('click', () => { selectChoice('NO'); });

function selectChoice(choice) {
    state.userChoice = choice;

    // Update Button Styles
    document.querySelectorAll('.btn-judgement').forEach(b => b.classList.remove('selected'));
    if (choice === 'YES') {
        document.getElementById('btn-yes').classList.add('selected');
        document.getElementById('slider-label-key').textContent = "奥義圧（盛り上がり）";
        document.getElementById('result-note').placeholder = "どこが退屈だった？（禁句OK）"; // Context: YES=Exciting, so asking "Where was boring?" is ironic/contrast or actually asking why "current activity" was boring?
        // Prompt says: YES: "どこが退屈だった？（禁句OK）" (Implying the activity was boring, so Ninja made it fun)
    } else {
        document.getElementById('btn-no').classList.add('selected');
        document.getElementById('slider-label-key').textContent = "呪い濃度（台無し度）";
        document.getElementById('result-note').placeholder = "何に没頭してた？（守りたいもの）";
    }

    // Show Slider
    document.getElementById('slider-area').classList.remove('hidden');
}

// Slider Update
document.getElementById('intensity-slider').addEventListener('input', (e) => {
    updateSliderLabel(e.target.value);
});

function updateSliderLabel(val) {
    document.getElementById('slider-value').textContent = val;
}

document.getElementById('btn-cancel-choice').addEventListener('click', () => {
    state.userChoice = null;
    document.querySelectorAll('.btn-judgement').forEach(b => b.classList.remove('selected'));
    document.getElementById('slider-area').classList.add('hidden');
});

// 3. Save
document.getElementById('btn-save').addEventListener('click', () => {
    if (!state.userChoice) return;

    const logData = {
        id: state.entryData.id,
        createdAt: new Date().toISOString(),
        dateKey: state.entryData.dateKey,
        activity: state.entryData.activity,
        category: state.entryData.category,
        sceneId: state.gachaResult.scene.id,
        processId: state.gachaResult.process.id,
        sealText: state.gachaResult.seal,
        choice: state.userChoice,
        intensity: document.getElementById('intensity-slider').value,
        note: document.getElementById('result-note').value
    };

    Storage.saveLog(logData);

    // Show completed state
    document.getElementById('judgment-area').classList.add('hidden');
    document.getElementById('saved-message').classList.remove('hidden');
});

// 4. Retry
document.getElementById('btn-retry').addEventListener('click', () => {
    showScreen('screen-entry');
    document.getElementById('activity-input').value = ""; // Clear input for fresh start
});

// 5. Archive Views
document.getElementById('btn-view-archive').addEventListener('click', () => {
    renderArchive();
    showScreen('screen-archive');
});
document.getElementById('btn-view-archive-from-entry').addEventListener('click', () => {
    renderArchive();
    showScreen('screen-archive');
});
document.getElementById('btn-back-to-entry').addEventListener('click', () => {
    showScreen('screen-entry');
});

function renderArchive() {
    const logs = Storage.getLogs();
    const listEl = document.getElementById('archive-list');
    listEl.innerHTML = '';

    if (logs.length === 0) {
        listEl.innerHTML = '<div class="empty-state">まだ巻物は存在せぬ。</div>';
        return;
    }

    // Helper: Generate rating bar (■■■□□)
    function getRatingBar(value) {
        if (value === undefined || value === null) return '—';
        const v = Math.max(1, Math.min(5, Number(value) || 0));
        const filled = '■'.repeat(v);
        const empty = '□'.repeat(5 - v);
        return filled + empty;
    }

    logs.forEach(log => {
        const hasRating = log.rating && (log.rating.hype || log.rating.ruin);
        const isSealed = hasRating;

        const el = document.createElement('div');
        el.className = `log-item ${log.choice === 'NO' ? 'sealed' : ''}`;

        // Build card HTML
        let html = `
            <div class="log-seal ${isSealed ? 'sealed' : 'unsealed'}">${isSealed ? '封印' : '未封印'}</div>
            <div class="log-activity">${log.activity || '（記録なし）'}</div>
            <div class="log-header">
                <span>${log.dateKey}</span>
                <span>${log.sealText || ''}</span>
            </div>
        `;

        // Add ratings if present
        if (hasRating) {
            html += `
                <div class="log-ratings">
                    <div class="log-rating-row">
                        <span class="log-rating-label">盛り上がり:</span>
                        <span class="log-rating-bar">${getRatingBar(log.rating.hype)}</span>
                    </div>
                    <div class="log-rating-row">
                        <span class="log-rating-label">台無し:</span>
                        <span class="log-rating-bar">${getRatingBar(log.rating.ruin)}</span>
                    </div>
                </div>
            `;
            if (log.rating.memo) {
                html += `<div class="log-memo">メモ：${log.rating.memo}</div>`;
            }
        } else {
            html += `<div class="log-empty-rating">評価未入力</div>`;
        }

        el.innerHTML = html;

        el.addEventListener('click', () => {
            // Re-render result screen in "ReadOnly" mode
            state.entryData = { id: log.id, activity: log.activity, category: log.category, dateKey: log.dateKey };
            // Re-run gacha to get texts (and banners/sfx which are deterministic)
            state.gachaResult = runGacha(log.id, log.dateKey, log.category);

            // Render
            resetResultUI();
            renderResult(state.gachaResult, log.activity);

            // Hide interaction, show saved state
            document.getElementById('judgment-area').classList.add('hidden');
            document.getElementById('saved-message').classList.remove('hidden');
            document.getElementById('raid-banner').classList.remove('hidden');

            document.getElementById('btn-retry').textContent = "戻る";
            document.getElementById('btn-retry').onclick = () => {
                showScreen('screen-archive');
                // restore handler
                document.getElementById('btn-retry').textContent = "次の乱入を召喚";
                document.getElementById('btn-retry').onclick = () => {
                    showScreen('screen-entry');
                    document.getElementById('activity-input').value = "";
                };
            };

            showScreen('screen-result');
        });
        listEl.appendChild(el);
    });
}

// 6. Shakyo Mode (Screenshot Layout)
document.getElementById('btn-toggle-shakyo').addEventListener('click', () => {
    const isShakyo = document.body.classList.toggle('shakyo-mode');
    document.getElementById('btn-toggle-shakyo').textContent = isShakyo ? "通常モードに戻す" : "写経モード";

    if (isShakyo) {
        // Set log ID if available
        const currentLogId = (state.entryData && state.entryData.id) ? state.entryData.id.substring(0, 8) : "xxxx";
        document.getElementById('shakyo-log-id').textContent = currentLogId;
    }
});



