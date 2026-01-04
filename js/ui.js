// --- 1. 主题设置 (解决 setTheme 报错) ---
function setTheme(bg, accent, el) {
    currentTheme = {bg, accent};
    document.documentElement.style.setProperty('--kehua-bg', bg);
    document.documentElement.style.setProperty('--accent-color', accent);
    document.body.style.color = bg === '#2D3748' ? '#E2E8F0' : '#333';
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    if (el) el.classList.add('active');
    localStorage.setItem(THEME_KEY, JSON.stringify(currentTheme));
}

// --- 2. 搜索与高亮入口 ---
function handleSearch() {
    const input = document.getElementById('searchInput');
    searchTerm = input ? input.value.trim().toLowerCase() : '';
    if (typeof render === "function") render();
}

// --- 3. 时间轴双向联动：滚动与观察 ---
function scrollToId(id) {
    const target = document.getElementById(id);
    if (target) window.scrollTo({top: target.offsetTop - 40, behavior: 'smooth'});
    if (window.innerWidth < 1024) toggleMobileNav(false);
}

function setupObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const {year, month, day} = entry.target.dataset;
                document.querySelectorAll('.year-wrapper, .month-wrapper, .day-item').forEach(el => el.classList.remove('active-year', 'active-month', 'active-day'));
                const nodes = {
                    y: document.getElementById(`nav-y-${year}`),
                    m: document.getElementById(`nav-m-${year}-${month}`),
                    d: document.getElementById(`nav-d-${year}-${month}-${day}`)
                };
                if (nodes.y) nodes.y.classList.add('active-year');
                if (nodes.m) nodes.m.classList.add('active-month');
                if (nodes.d) {
                    nodes.d.classList.add('active-day');
                    nodes.d.scrollIntoView({behavior: 'smooth', block: 'nearest'});
                }
            }
        });
    }, {rootMargin: '-15% 0px -80% 0px'});
    document.querySelectorAll('.moment-node').forEach(node => observer.observe(node));
}

function buildTimeline(data) {
    const nav = document.getElementById('timelineNav');
    let h = "";
    Object.keys(data).sort((a, b) => b - a).forEach(y => {
        h += `<div class="year-wrapper open" id="nav-y-${y}"><div class="year-label" onclick="toggleLayer('nav-y-${y}')">${y}</div><div class="month-group">`;
        Object.keys(data[y]).sort((a, b) => b - a).forEach(m => {
            h += `<div class="month-wrapper open" id="nav-m-${y}-${m}"><div class="month-label" onclick="toggleLayer('nav-m-${y}-${m}')">${m}月</div><div class="day-group">`;
            Object.keys(data[y][m]).sort((a, b) => b - a).forEach(d => {
                h += `<div class="day-item" id="nav-d-${y}-${m}-${d}" onclick="scrollToId('${data[y][m][d]}')">${d}</div>`;
            });
            h += `</div></div>`;
        });
        h += `</div></div>`;
    });
    nav.innerHTML = h;
}

// --- 4. 其它 UI 控制 ---
window.onscroll = () => {
    const btn = document.getElementById('backToTop');
    if (btn) {
        if (document.documentElement.scrollTop > 400) btn.classList.add('show');
        else btn.classList.remove('show');
    }
};

function toggleLayer(id) {
    document.getElementById(id).classList.toggle('open');
}

function toggleGistPanel() {
    document.getElementById('syncPanel').classList.toggle('open');
}

function toggleMobileNav(f) {
    const n = document.getElementById('timelineNav'), o = document.getElementById('navOverlay');
    const s = typeof f === 'boolean' ? f : !n.classList.contains('show');
    n.classList.toggle('show', s);
    o.classList.toggle('show', s);
    o.classList.toggle('hidden', !s);
}