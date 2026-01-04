// 修复 generateWordCloud 定义
function generateWordCloud() {
    if (posts.length === 0) return;
    const container = document.getElementById('wordCloudContainer');
    if (!container) return;
    container.innerHTML = '';

    const allText = posts.map(p => p.content).join(' ');
    const words = allText.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    const counts = {};
    words.forEach(w => {
        if (!blacklist.has(w)) counts[w] = (counts[w] || 0) + 1;
    });

    const wordEntries = Object.entries(counts)
        .map(([text, size]) => ({text, size: 12 + Math.sqrt(size) * 15}))
        .sort((a, b) => b.size - a.size).slice(0, 40);

    const layout = d3.layout.cloud()
        .size([container.offsetWidth || 500, 300])
        .words(wordEntries)
        .padding(5)
        .rotate(0)
        .fontSize(d => d.size)
        .on("end", drawCloud);

    layout.start();

    function drawCloud(words) {
        const svg = d3.select("#wordCloudContainer").append("svg")
            .attr("width", layout.size()[0])
            .attr("height", layout.size()[1])
            .append("g")
            .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")");

        svg.selectAll("text")
            .data(words)
            .enter().append("text")
            .attr("class", "word-node")
            .style("font-size", d => d.size + "px")
            .style("font-weight", "bold")
            .style("fill", () => d3.interpolateGreys(Math.random() * 0.4 + 0.3))
            .attr("text-anchor", "middle")
            .attr("transform", d => "translate(" + [d.x, d.y] + ")")
            .text(d => d.text)
            .on("click", (e, d) => {
                e.preventDefault();
                currentSelectedWord = d.text;
                const menu = document.getElementById('wordContextMenu');
                menu.style.display = 'block';
                menu.style.left = Math.min(e.clientX, window.innerWidth - 130) + 'px';
                menu.style.top = Math.min(e.clientY, window.innerHeight - 100) + 'px';
            });
    }
}

function 跳转当前词() {
    if (currentSelectedWord) {
        document.getElementById('searchInput').value = currentSelectedWord;
        handleSearch();
        toggleGistPanel();
        document.getElementById('wordContextMenu').style.display = 'none';
    }
}

function 屏蔽选中词() {
    if (currentSelectedWord) {
        blacklist.add(currentSelectedWord);
        localStorage.setItem(BLACKLIST_KEY, JSON.stringify(Array.from(blacklist)));
        renderBlacklist();
        generateWordCloud();
        document.getElementById('wordContextMenu').style.display = 'none';
    }
}

function renderBlacklist() {
    const box = document.getElementById('blackListDisplay');
    if (box) {
        box.innerHTML = Array.from(blacklist).map(word => `<span class="tag-pill" onclick="restoreWord('${word}')">${word} ↺</span>`).join('');
    }
}

function restoreWord(word) {
    blacklist.delete(word);
    localStorage.setItem(BLACKLIST_KEY, JSON.stringify(Array.from(blacklist)));
    renderBlacklist();
    generateWordCloud();
}