// ストレージ管理
const STORAGE_KEY = "ninja_scroll_logs";

export const Storage = {
    getLogs: () => {
        try {
            const logs = localStorage.getItem(STORAGE_KEY);
            return logs ? JSON.parse(logs) : [];
        } catch (e) {
            console.error("Load failed", e);
            return [];
        }
    },

    saveLog: (logData) => {
        try {
            const logs = Storage.getLogs();
            logs.unshift(logData); // 最新を先頭に
            localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
            return true;
        } catch (e) {
            console.error("Save failed", e);
            return false;
        }
    },

    // 特定のIDのログを取得
    getLogById: (id) => {
        const logs = Storage.getLogs();
        return logs.find(log => log.id === id);
    },

    clearLogs: () => {
        localStorage.removeItem(STORAGE_KEY);
    }
};
