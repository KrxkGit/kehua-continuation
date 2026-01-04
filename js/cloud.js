async function generateGlobalAISummary() {
    if (posts.length === 0) return alert("暂无内容");
    const btn = document.getElementById('aiSumBtn'), box = document.getElementById('globalAiDisplay');
    saveGistConfig(false);
    if (!aiConfig.key || !aiConfig.endpoint) return alert("请先配置 AI API");
    btn.innerText = "生成中...";
    btn.disabled = true;
    box.style.display = 'block';
    box.innerText = "AI 正在梳理时光...";
    const content = posts.slice(0, 50).map(p => p.content).join('\n---\n');
    try {
        const res = await fetch(`${aiConfig.endpoint.replace(/\/+$/, '')}/chat/completions`, {
            method: 'POST', headers: {'Authorization': `Bearer ${aiConfig.key}`, 'Content-Type': 'application/json'},
            body: JSON.stringify({
                model: aiConfig.model,
                messages: [{role: "system", content: "你是一个回忆记录者，150字内。"}, {role: "user", content}]
            })
        });
        const data = await res.json();
        box.innerText = data.choices[0].message.content;
    } catch (e) {
        box.innerText = "总结失败";
    } finally {
        btn.innerText = "AI 全量总结";
        btn.disabled = false;
    }
}

/** --- 导出与配置逻辑 --- **/
// 修复 exportJSON 定义
function exportJSON() {
    const dataToExport = {posts, aiConfig};
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kehua_archive_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/** --- 扫码与二维码核心逻辑 (严禁改动数据结构) --- **/
async function showCameraScanner() {
    document.getElementById('configForm').classList.add('hidden');
    document.getElementById('cameraScannerSection').classList.remove('hidden');
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({facingMode: "environment"}, {fps: 10, qrbox: 250}, (text) => handleQRResult(text));
}

function hideCameraScanner() {
    if (html5QrCode) {
        html5QrCode.stop().finally(() => {
            document.getElementById('cameraScannerSection').classList.add('hidden');
            document.getElementById('configForm').classList.remove('hidden');
        });
    }
}

function handleQRResult(text) {
    try {
        const d = JSON.parse(atob(text)); // 兼容原始 {t, g} 结构
        document.getElementById('ghToken').value = d.t || '';
        document.getElementById('gistId').value = d.g || '';
        saveGistConfig(false);
        alert("配置导入成功");
        hideCameraScanner();
    } catch (e) {
        alert("识别失败");
    }
}

function generateConfigQR() {
    const t = document.getElementById('ghToken').value.trim();
    const g = document.getElementById('gistId').value.trim();
    if (!t || !g) return alert('请先填写 Token 和 Gist ID');
    const data = btoa(JSON.stringify({t, g}));
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
        text: data,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    document.getElementById('configForm').classList.add('hidden');
    document.getElementById('qrDisplay').classList.remove('hidden');
}

function hideQRCode() {
    document.getElementById('qrDisplay').classList.add('hidden');
    document.getElementById('configForm').classList.remove('hidden');
}

/** --- 记忆下载与备份更新逻辑 --- **/
async function pullFromCloud() {
    const gid = document.getElementById('gistId').value.trim();
    const key = document.getElementById('syncKey').value;
    const tk = document.getElementById('ghToken').value.trim();
    if (!key) return alert("请输入加密密码");
    try {
        const res = await fetch(`https://api.github.com/gists/${gid}`, {headers: {'Authorization': `token ${tk}`}});
        const data = await res.json();
        const decrypted = CryptoJS.AES.decrypt(data.files['kehua_encrypted.json'].content, key).toString(CryptoJS.enc.Utf8);
        const cloudData = JSON.parse(decrypted);

        // 更新内存变量
        posts = cloudData.posts || [];
        if (cloudData.aiConfig) aiConfig = cloudData.aiConfig;

        // 持久化存储
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
        localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(aiConfig));

        // 关键：触发 UI 全量更新
        initInputs();
        render();
        alert('下载成功，记忆已更新');
    } catch (e) {
        alert('同步失败：密码错误或网络异常');
    }
}

async function pushToCloud() {
    saveGistConfig(false);
    const gid = document.getElementById('gistId').value.trim();
    const key = document.getElementById('syncKey').value;
    const tk = document.getElementById('ghToken').value.trim();
    if (!key) return alert("请输入加密密码");
    try {
        const cipher = CryptoJS.AES.encrypt(JSON.stringify({
            posts,
            theme: currentTheme,
            blacklist: Array.from(blacklist),
            aiConfig
        }), key).toString();
        await fetch(`https://api.github.com/gists/${gid}`, {
            method: 'PATCH',
            headers: {'Authorization': `token ${tk}`, 'Content-Type': 'application/json'},
            body: JSON.stringify({files: {"kehua_encrypted.json": {content: cipher}}})
        });
        alert('推送备份成功');
    } catch (e) {
        alert('同步失败');
    }
}