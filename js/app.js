window.onload = () => {
    initInputs();
    render();
    setTheme(currentTheme.bg, currentTheme.accent);
    document.getElementById('qrFileInput').addEventListener('change', e => {
        const f = e.target.files[0];
        if (!f) return;
        new Html5Qrcode("reader").scanFile(f, true).then(res => handleQRResult(res));
    });
};

function initInputs() {
    if (gistConfig.token) document.getElementById('ghToken').value = gistConfig.token;
    if (gistConfig.gistId) document.getElementById('gistId').value = gistConfig.gistId;
    if (aiConfig.endpoint) document.getElementById('aiEndpoint').value = aiConfig.endpoint;
    if (aiConfig.key) document.getElementById('aiKey').value = aiConfig.key;
    if (aiConfig.model) document.getElementById('aiModel').value = aiConfig.model;
}

function render() {
    const list = document.getElementById('postList');
    const filtered = posts.filter(p => p.content.toLowerCase().includes(searchTerm));

    if (filtered.length === 0) {
        list.innerHTML = `<div class="text-center py-40 text-gray-300">End of Memories</div>`;
        document.getElementById('timelineNav').innerHTML = "";
        return;
    }

    filtered.sort((a, b) => b.timestamp - a.timestamp);
    let html = "", timelineData = {};

    filtered.forEach((p, i) => {
        const m = p.date.match(/(\d{4})年(\d{2})月(\d{2})日/);
        const [y, mo, d] = m ? [m[1], m[2], m[3]] : ['?', '?', '?'];
        const aid = `moment-${i}`;

        if (!timelineData[y]) timelineData[y] = {};
        if (!timelineData[y][mo]) timelineData[y][mo] = {};
        if (!timelineData[y][mo][d]) timelineData[y][mo][d] = aid;

        // 搜索高亮逻辑
        let txt = p.content;
        if (searchTerm) {
            const safeSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            txt = txt.replace(new RegExp(`(${safeSearch})`, 'gi'), '<mark>$1</mark>');
        }

        html += `<div id="${aid}" data-year="${y}" data-month="${mo}" data-day="${d}" class="moment-node kehua-card">
            <div class="text-[17px] leading-[1.9] text-gray-700 whitespace-pre-wrap">${txt}</div>
            <div class="flex justify-between items-center mt-10">
                <span class="text-[10px] text-gray-300 tracking-widest font-semibold uppercase">${p.date}</span>
                <button onclick="deletePost(${i})" class="text-red-100 hover:text-red-400 text-[10px] font-bold">DELETE</button>
            </div>
        </div>`;
    });

    list.innerHTML = html;
    buildTimeline(timelineData);
    setupObserver();
}

function addPost() {
    const input = document.getElementById('postInput');
    if (!input.value.trim()) return;
    const now = new Date(),
        ds = `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    posts.unshift({content: input.value, date: ds, timestamp: now.getTime()});
    input.value = '';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    render();
}

function deletePost(i) {
    if (confirm('确认删除？')) {
        posts.splice(i, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
        render();
    }
}