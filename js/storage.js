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

// --- 可话数据导入逻辑 ---

function triggerKehuaImport() {
    // 触发隐藏的文件夹选择框
    document.getElementById('kehuaImportInput').click();
}

async function handleKehuaImport(files) {
    if (!files.length) return;

    const confirmImport = confirm(`选中了 ${files.length} 个文件/文件夹，是否开始扫描并导入“动态内容.txt”？`);
    if (!confirmImport) {
        document.getElementById('kehuaImportInput').value = ''; // 清空选择
        return;
    }

    let newPosts = [];
    let fileCount = 0;

    // 1. 遍历文件，只处理文件名以 "-动态内容.txt" 结尾的文件
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith('-动态内容.txt')) {
            try {
                const text = await readFileAsync(file);
                const extracted = parseKehuaContent(text);
                newPosts = newPosts.concat(extracted);
                fileCount++;
            } catch (e) {
                console.error("读取文件失败:", file.name, e);
            }
        }
    }

    if (newPosts.length === 0) {
        alert("未在所选文件夹中找到有效的动态内容文件。请确保选择了包含 '动态内容.txt' 的文件夹（如：'我的动态'）。");
        return;
    }

    // 2. 数据合并与去重
    const initialCount = posts.length;
    const existingTimestamps = new Set(posts.map(p => p.timestamp));
    let addedCount = 0;

    newPosts.forEach(p => {
        // 使用时间戳作为去重依据（由于可话精确到秒，这很有效）
        // 如果现有数据没有这个时间戳，则添加
        if (!existingTimestamps.has(p.timestamp)) {
            posts.push(p);
            existingTimestamps.add(p.timestamp);
            addedCount++;
        }
    });

    // 3. 收尾工作
    if (addedCount > 0) {
        // 按时间倒序重新排序
        posts.sort((a, b) => b.timestamp - a.timestamp);
        // 保存到 LocalStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
        // 刷新 UI (调用 app.js 中的 render)
        if (typeof render === 'function') render();
        // 刷新词云 (调用 visual.js)
        if (typeof generateWordCloud === 'function') generateWordCloud();

        alert(`导入完成！\n扫描文件：${fileCount} 个\n新增动态：${addedCount} 条\n重复跳过：${newPosts.length - addedCount} 条`);
    } else {
        alert("未发现新内容，所有动态均已存在。");
    }

    // 清空 input 防止无法重复选择同一文件夹
    document.getElementById('kehuaImportInput').value = '';
}

// 辅助：Promise 封装 FileReader
function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file); // 默认 UTF-8
    });
}

// 核心：解析可话文本格式
function parseKehuaContent(text) {
    const lines = text.split('\n');
    const results = [];
    let currentBlock = { dateStr: '', lines: [] };

    // 正则匹配日期行，例如：2023年11月06日 15:52:19
    // 注意：可话导出包含秒，我们主要用来生成 timestamp，展示时可以去掉秒
    const dateLineRegex = /^(\d{4}年\d{2}月\d{2}日 \d{2}:\d{2}:\d{2})\s*$/;

    lines.forEach(line => {
        const cleanLine = line.trim();

        if (dateLineRegex.test(cleanLine)) {
            // 遇到新日期，先保存上一条（如果存在）
            if (currentBlock.dateStr) {
                results.push(buildPostObject(currentBlock.dateStr, currentBlock.lines));
            }
            // 重置当前块
            currentBlock = { dateStr: cleanLine, lines: [] };
        } else {
            // 只要已经开始记录日期，内容行就加入
            // 空行也暂时加入，最后 join 时会保留格式，但头部空行会被 trim
            if (currentBlock.dateStr) {
                currentBlock.lines.push(line);
            }
        }
    });

    // 保存最后一条
    if (currentBlock.dateStr) {
        results.push(buildPostObject(currentBlock.dateStr, currentBlock.lines));
    }

    return results;
}

// 辅助：构建符合“时刻”数据结构的对象
function buildPostObject(dateStr, contentLines) {
    // 1. 处理内容
    // 去除首尾空行，保留中间换行
    let content = contentLines.join('\n').trim();

    // 可选：处理 [图片：xxx] 标签
    // 由于是纯文本本地存储，无法直接存图片文件。
    // 这里选择保留文字标记，让用户知道这里曾有一张图。

    // 2. 解析时间
    // dateStr 格式: 2023年11月06日 15:52:19
    const m = dateStr.match(/(\d{4})年(\d{2})月(\d{2})日 (\d{2}):(\d{2}):(\d{2})/);
    let timestamp = Date.now();
    let displayDate = dateStr;

    if (m) {
        const year = parseInt(m[1]), month = parseInt(m[2]) - 1, day = parseInt(m[3]);
        const hour = parseInt(m[4]), minute = parseInt(m[5]), second = parseInt(m[6]);

        const dt = new Date(year, month, day, hour, minute, second);
        timestamp = dt.getTime();

        // 格式化为“时刻”应用风格：YYYY年MM月DD日 HH:mm (去掉秒)
        displayDate = `${m[1]}年${m[2]}月${m[3]}日 ${m[4]}:${m[5]}`;
    }

    return {
        content: content,
        date: displayDate,
        timestamp: timestamp
    };
}
