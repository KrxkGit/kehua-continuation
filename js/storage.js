const STORAGE_KEY = 'kehua_master_data',
    GIST_CONFIG_KEY = 'kehua_gist_config',
    THEME_KEY = 'kehua_theme',
    BLACKLIST_KEY = 'kehua_blacklist',
    AI_CONFIG_KEY = 'kehua_ai_config';

let posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let gistConfig = JSON.parse(localStorage.getItem(GIST_CONFIG_KEY) || '{}');
let aiConfig = JSON.parse(localStorage.getItem(AI_CONFIG_KEY) || '{"endpoint":"","key":"","model":"gpt-3.5-turbo"}');
let currentTheme = JSON.parse(localStorage.getItem(THEME_KEY) || '{"bg":"#F8FAFB","accent":"#3182CE"}');
let blacklist = new Set(JSON.parse(localStorage.getItem(BLACKLIST_KEY) || '[]'));
let searchTerm = '', html5QrCode, currentSelectedWord = null;

// 核心配置保存函数
function saveGistConfig(s) {
    gistConfig = {
        token: document.getElementById('ghToken').value.trim(),
        gistId: document.getElementById('gistId').value.trim()
    };
    aiConfig = {
        endpoint: document.getElementById('aiEndpoint').value.trim(),
        key: document.getElementById('aiKey').value.trim(),
        model: document.getElementById('aiModel').value.trim()
    };
    localStorage.setItem(GIST_CONFIG_KEY, JSON.stringify(gistConfig));
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(aiConfig));
    if (s) alert('配置已存本地');
}