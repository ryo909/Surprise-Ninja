import { seals, scenes, processes, raidBanners, fieldMantras, sfxTags, activityPlaceholders, sealsInput, sealsResultExtra } from './deck.js';
import { Storage } from './storage.js';

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

// --- Init (Plan B) ---
function initEntryScreen() {
    // 1. Random Mantra
    const randomMantra = fieldMantras[Math.floor(Math.random() * fieldMantras.length)];
    document.getElementById('intro-mantra').textContent = randomMantra;

    // 2. Random Placeholder
    const randomPlaceholder = activityPlaceholders[Math.floor(Math.random() * activityPlaceholders.length)];
    document.getElementById('activity-input').placeholder = randomPlaceholder;

    // 3. Random Seal
    const randomSeal = sealsInput[Math.floor(Math.random() * sealsInput.length)];
    document.getElementById('seal-input').textContent = randomSeal;
}
// Run on load
initEntryScreen();


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

// --- Navigation ---
function showScreen(screenId) {
    Object.values(screens).forEach(el => el.classList.remove('active'));
    screens[screenId.replace('screen-', '')].classList.add('active');
    state.currentScreen = screenId;
    window.scrollTo(0, 0);
}

// --- Logic ---
function runGacha(entryId, dateKey) {
    const seedStr = entryId + dateKey;
    const seed = hashStringToInt(seedStr);

    const sceneIndex = seed % scenes.length;
    // processIndexは少しずらす
    const processIndex = (seed * 7 + 13) % processes.length;
    const sealIndex = (seed * 11 + 5) % seals.length;

    // Plan A: Extra Seeded Metadata
    const bannerIndex = (seed * 3 + 7) % raidBanners.length;
    // SFX (3 distinct)
    const sfx1 = sfxTags[(seed * 2 + 1) % sfxTags.length];
    const sfx2 = sfxTags[(seed * 5 + 3) % sfxTags.length];
    const sfx3 = sfxTags[(seed * 7 + 11) % sfxTags.length];

    return {
        scene: scenes[sceneIndex],
        process: processes[processIndex],
        seal: seals[sealIndex],
        seed: seed,
        // New Props
        banner: raidBanners[bannerIndex],
        sfx: [sfx1, sfx2, sfx3]
    };
}

function renderResult(result) {
    // 1. Banner
    document.getElementById('raid-banner').textContent = result.banner;

    // 2. Seal
    document.getElementById('seal-mark').textContent = result.seal;

    // 3. Scene (with prefix)
    document.getElementById('result-scene').textContent = "【乱入】" + result.scene.text;
    document.getElementById('sfx-scene').textContent = result.sfx[0]; // SFX 1

    // 4. Steps
    const stepsList = document.getElementById('result-steps');
    stepsList.innerHTML = '';
    result.process.steps.forEach(step => {
        const li = document.createElement('li');
        li.textContent = step;
        stepsList.appendChild(li);
    });
    document.getElementById('sfx-process').textContent = result.sfx[1]; // SFX 2

    // 5. Ochi (Placeholder logic as consistent with previous step)
    document.getElementById('result-och').textContent = "――此度もまた、記録に残らぬ戦いであった。";
    document.getElementById('sfx-ochi').textContent = result.sfx[2]; // SFX 3
}

// --- UI Actions ---

// 1. Entry -> Result
document.getElementById('btn-open-scroll').addEventListener('click', async (e) => {
    e.preventDefault();
    console.log("Button clicked: btn-open-scroll");

    try {
        const activityInput = document.getElementById('activity-input');
        const activity = activityInput.value.trim();

        console.log("Activity value:", activity);

        if (!activity) {
            console.warn("Validation failed: Empty activity");
            // UI Error Feedback
            activityInput.style.borderColor = "#db3b3b";
            activityInput.style.backgroundColor = "rgba(219, 59, 59, 0.1)";
            activityInput.focus();

            // Shake effect (simple CSS class toggle)
            activityInput.classList.add('shake');
            setTimeout(() => activityInput.classList.remove('shake'), 500);
            return;
        } else {
            // Reset style
            activityInput.style.borderColor = "#555";
            activityInput.style.backgroundColor = "#333";
        }

        const category = document.getElementById('category-select').value;

        // Button text change for feedback
        const btn = document.getElementById('btn-open-scroll');
        const originalText = btn.innerHTML;
        btn.textContent = "【侵入検知】現場を特定…"; // Simple text replace for now
        btn.disabled = true;

        console.log("Starting transition timer...");

        // Delay for effect
        await new Promise(resolve => setTimeout(resolve, 400));

        console.log("Executing Gacha...");

        btn.innerHTML = originalText;
        btn.disabled = false;

        // Generate new entry
        const entryId = generateUUID();
        const dateKey = getTodayDateKey();

        state.entryData = { id: entryId, activity, category, dateKey };
        state.gachaResult = runGacha(entryId, dateKey);
        state.userChoice = null;

        console.log("Gacha Result:", state.gachaResult);

        // Reset UI
        resetResultUI();
        renderResult(state.gachaResult);

        console.log("Showing Result Screen");
        showScreen('screen-result');

    } catch (err) {
        console.error("Error in btn-open-scroll handler:", err);
        alert("エラーが発生しました: " + err.message);
        // Recovery
        const btn = document.getElementById('btn-open-scroll');
        if (btn) btn.disabled = false;
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

    logs.forEach(log => {
        // Find Scene Text (fallback if id changed, though simple look up for now)
        const scene = scenes.find(s => s.id === log.sceneId) || { text: "（消滅した記録）" };

        const el = document.createElement('div');
        el.className = `log-item ${log.choice === 'NO' ? 'sealed' : ''}`;
        el.innerHTML = `
            <div class="log-header">
                <span>${log.dateKey}</span>
                <span>${log.sealText}</span>
            </div>
            <div class="log-body">${scene.text}</div>
        `;
        el.addEventListener('click', () => {
            // Re-render result screen in "ReadOnly" mode
            state.entryData = { id: log.id, activity: log.activity, category: log.category, dateKey: log.dateKey };
            // Re-run gacha to get texts (and banners/sfx which are deterministic)
            state.gachaResult = runGacha(log.id, log.dateKey);

            // Render
            resetResultUI();
            renderResult(state.gachaResult);

            // Hide interaction, show saved state
            document.getElementById('judgment-area').classList.add('hidden');
            document.getElementById('saved-message').classList.remove('hidden');
            document.getElementById('raid-banner').classList.add('hidden'); // Archive view might not need "Abnormal" alert or keep it? 
            // User didn't specify, but "Notification Bar" makes sense for "Fresh" intrusion. 
            // For archive, maybe keep it or hide? 
            // "【記録】忍者乱入ログ" is one of the banners. 
            // Let's show it, it adds flavor. Actually, let's just show it.
            document.getElementById('raid-banner').classList.remove('hidden'); // Ensure shown

            document.getElementById('btn-retry').textContent = "戻る";
            document.getElementById('btn-retry').onclick = () => {
                showScreen('screen-archive');
                // restore handler
                document.getElementById('btn-retry').textContent = "次の乱入を召喚";
                document.getElementById('btn-retry').onclick = () => {
                    // Need to re-init entry screen texts?
                    initEntryScreen();
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
