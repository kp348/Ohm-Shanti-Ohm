document.addEventListener('DOMContentLoaded', () => {
    // Simulated Sensor Data
    const dataSequence = {
        mq2: [[40,38], [150,145], [300,290], [42,40]],
        mq7: [[15,14], [25,24], [50,48], [15,15]],
        mq135: [[80,78], [120,118], [210,208], [80,80]],
        dust: [[20,19], [45,43], [110,108], [22,22]]
    };

    // CPCB India Breakpoint Table
    const bpTable = {
        pm25: [0, 30, 60, 90, 120, 250, 380],
        co:   [0, 1, 2, 10, 17, 34, 50],
        aqi:  [0, 50, 100, 200, 300, 400, 500]
    };

    function calculateSubIndex(conc, pollutant) {
        const bp = bpTable[pollutant];
        const aqi = bpTable.aqi;
        for (let i = 1; i < bp.length; i++) {
            if (conc <= bp[i]) {
                return ((aqi[i] - aqi[i-1]) / (bp[i] - bp[i-1])) * (conc - bp[i-1]) + aqi[i-1];
            }
        }
        return 500;
    }

    let step = 0;
    let purifierActive = false;
    const maxDataPoints = 15;

    const commonOpts = {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { grid: { color: '#1e293b' }, ticks: { color: '#475569', font: {size: 9} } }, x: { display: false } },
        plugins: { legend: { display: false } }
    };

    // Initialize Charts
    const charts = {
        mq2: new Chart(document.getElementById('mq2Chart'), { type: 'line', data: { labels: [], datasets: [{ borderColor: '#38bdf8', borderWidth: 2, pointRadius: 0, data: [] }]}, options: commonOpts }),
        mq7: new Chart(document.getElementById('mq7Chart'), { type: 'line', data: { labels: [], datasets: [{ borderColor: '#f43f5e', borderWidth: 2, pointRadius: 0, data: [] }]}, options: commonOpts }),
        mq135: new Chart(document.getElementById('mq135Chart'), { type: 'line', data: { labels: [], datasets: [{ borderColor: '#fbbf24', borderWidth: 2, pointRadius: 0, data: [] }]}, options: commonOpts }),
        dust: new Chart(document.getElementById('dustChart'), { type: 'line', data: { labels: [], datasets: [{ borderColor: '#10b981', borderWidth: 2, pointRadius: 0, data: [] }]}, options: commonOpts }),
        safety: new Chart(document.getElementById('safetyScoreChart'), { type: 'line', data: { labels: [], datasets: [{ borderColor: '#38bdf8', fill: true, backgroundColor: 'rgba(56,189,248,0.05)', borderWidth: 2, pointRadius: 0, data: [] }]}, options: commonOpts }),
        cpcb: new Chart(document.getElementById('cpcbAqiChart'), { type: 'line', data: { labels: [], datasets: [{ borderColor: '#f59e0b', fill: true, backgroundColor: 'rgba(245,158,11,0.05)', borderWidth: 2, pointRadius: 0, data: [] }]}, options: commonOpts })
    };

    function addLog(action, score) {
        const logSheet = document.getElementById('audit-log');
        const time = new Date().toLocaleTimeString();
        const txId = 'TX-' + Math.random().toString(16).slice(2, 8).toUpperCase();
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <span style="color:#94a3b8;">${time}</span>
                <span class="bc-badge">VERIFIED: ${txId}</span>
            </div>
            <div style="font-weight:bold; color:#38bdf8;">${action}</div>
            <div style="font-size:10px; color:#475569;">Safety Index: ${score} | Auth: Sepolia_Ledger</div>
        `;
        logSheet.prepend(entry);
    }

    function update() {
        const i = step % 4;
        const time = new Date().toLocaleTimeString();
        let totalPollution = 0;

        ['mq2', 'mq7', 'mq135', 'dust'].forEach(key => {
            const [s1, s2] = dataSequence[key][i];
            totalPollution += s1;
            document.getElementById(`${key}-s1`).innerText = s1;
            document.getElementById(`${key}-s2`).innerText = s2;
            const delta = Math.abs(((s1 - s2) / s1) * 100).toFixed(1);
            document.getElementById(`${key}-delta`).innerText = `Δ ${delta}%`;

            const chart = charts[key];
            if (chart.data.labels.length >= maxDataPoints) { chart.data.labels.shift(); chart.data.datasets[0].data.shift(); }
            chart.data.labels.push(time);
            chart.data.datasets[0].data.push(s1);
            chart.update('none');
        });

        const score = Math.max(0, 100 - Math.round(totalPollution / 8));
        const cpcbAqi = Math.round(Math.max(calculateSubIndex(dataSequence.dust[i][0], 'pm25'), calculateSubIndex(dataSequence.mq7[i][0]/10, 'co')));
        
        document.getElementById('safety-score-val').innerText = score;

        [charts.safety, charts.cpcb].forEach((c, idx) => {
            const val = idx === 0 ? score : cpcbAqi;
            if (c.data.labels.length >= maxDataPoints) { c.data.labels.shift(); c.data.datasets[0].data.shift(); }
            c.data.labels.push(time);
            c.data.datasets[0].data.push(val);
            c.update('none');
        });

        const status = document.getElementById('status-text');
        if (score < 80 && !purifierActive) {
            purifierActive = true; status.innerText = "ACTIVE"; status.className = "status-on";
            addLog("PURIFIER SYSTEM ENGAGED", score);
        } else if (score >= 80 && purifierActive) {
            purifierActive = false; status.innerText = "STANDBY"; status.className = "status-off";
            addLog("ATMOSPHERE COMPLIANT", score);
        }
        step++;
    }

    setInterval(update, 2000);
    update();
});