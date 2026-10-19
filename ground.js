const palette = {stable_los: '#2563eb', stable_nlos: '#d97706', edge_transition: '#dc2626'};
const labels = {stable_los: 'Stable LoS', stable_nlos: 'Stable NLoS', edge_transition: 'Edge transition'};
const metrics = {
  correlation_median: {title: 'Channel correlation', description: 'Median normalized complex-channel correlation, relative to the prediction start.', min: 0, max: 1, ticks: [0, .25, .5, .75, 1], format: value => value.toFixed(2)},
  change_db_median: {title: 'Relative channel change', description: 'Median 10 log10(||H(t) − H(0)||² / ||H(0)||²), in dB.', min: -25, max: 10, ticks: [-20, -10, 0, 10], format: value => `${value.toFixed(0)} dB`},
  shape_error_db_median: {title: 'Channel shape error', description: 'Median shape mismatch after optimal complex-scalar alignment, in dB.', min: -40, max: 0, ticks: [-40, -30, -20, -10, 0], format: value => `${value.toFixed(0)} dB`},
};

const svgLine = (x1, y1, x2, y2, color, width = 1, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;

function evolutionSvg(rows, key) {
  const metric = metrics[key];
  const {min, max} = metric;
  const x = horizon => 55 + (horizon - 1) / 99 * 675;
  const y = value => 15 + (max - value) / (max - min) * 230;
  let body = '';
  for (const tick of metric.ticks) {
    body += svgLine(55, y(tick), 730, y(tick), '#e3e9ec');
    body += `<text x="45" y="${y(tick) + 4}" text-anchor="end" fill="#7a8d9b" font-size="11">${metric.format(tick)}</text>`;
  }
  for (const tick of [1, 20, 40, 60, 80, 100]) {
    body += svgLine(x(tick), 15, x(tick), 245, '#eff2f4');
    body += `<text x="${x(tick)}" y="270" text-anchor="middle" fill="#7a8d9b" font-size="11">${tick}</text>`;
  }
  for (const scenario of Object.keys(palette)) {
    const series = rows.filter(row => row.scenario === scenario).sort((a,b) => a.horizon_ms - b.horizon_ms);
    body += `<polyline fill="none" stroke="${palette[scenario]}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" points="${series.map(row => `${x(row.horizon_ms)},${y(row[key])}`).join(' ')}"/>`;
    for (const row of series) {
      body += `<circle cx="${x(row.horizon_ms)}" cy="${y(row[key])}" r="3.8" fill="#fff" stroke="${palette[scenario]}" stroke-width="2"><title>${labels[scenario]} · ${row.horizon_ms} ms · ${row[key].toFixed(3)}</title></circle>`;
    }
  }
  body += '<text x="730" y="292" text-anchor="end" fill="#7a8d9b" font-size="11">Prediction horizon (ms)</text>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${body}</svg>`;
}

function visibilitySvg(rows) {
  const x = value => 24 + value / 100 * 260;
  const y = value => 8 + (1 - value) * 68;
  let body = '';
  for (const tick of [0, .5, 1]) body += svgLine(24, y(tick), 284, y(tick), '#e4eaed');
  body += `<polyline fill="none" stroke="#0d9488" stroke-width="2.5" points="${rows.map(row => `${x(row.horizon_ms)},${y(row.physical_los_fraction_median)}`).join(' ')}"/>`;
  body += `<polyline fill="none" stroke="#b7c5cc" stroke-width="2" stroke-dasharray="4 3" points="${rows.map(row => `${x(row.horizon_ms)},${y(row.center_los_fraction)}`).join(' ')}"/>`;
  body += '<text x="24" y="95" fill="#81939e" font-size="9">0 ms</text><text x="284" y="95" text-anchor="end" fill="#81939e" font-size="9">100 ms</text>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 305 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${body}</svg>`;
}

async function main() {
  const response = await fetch('ground-assets/preview.json');
  if (!response.ok) throw new Error(`Preview data unavailable (${response.status})`);
  const data = await response.json();
  const metricSelect = document.getElementById('metric-select');
  const draw = () => {
    const metric = metrics[metricSelect.value];
    document.getElementById('metric-title').textContent = metric.title;
    document.getElementById('metric-description').textContent = metric.description;
    document.getElementById('evolution-chart').innerHTML = evolutionSvg(data.analysis, metricSelect.value);
  };
  metricSelect.addEventListener('change', draw);
  draw();
  const edge100 = data.analysis.find(row => row.scenario === 'edge_transition' && row.horizon_ms === 100);
  document.getElementById('edge-corr').textContent = edge100.correlation_median.toFixed(2);
  document.getElementById('visibility-chart').innerHTML = visibilitySvg(data.edge_visibility);

  const slider = document.getElementById('frame-range');
  const playButton = document.getElementById('play-button');
  let timer = null;
  slider.max = data.replay.frames.length - 1;
  const showFrame = () => {
    const frame = data.replay.frames[Number(slider.value)];
    document.getElementById('replay-image').src = `ground-assets/${frame.image}`;
    document.getElementById('replay-image').alt = `Ground-level XL-MIMO dataset edge-transition view at ${frame.horizon_ms} ms`;
    document.getElementById('frame-badge').textContent = `t = ${frame.horizon_ms} ms`;
    document.getElementById('frame-time').textContent = `${frame.horizon_ms} ms`;
  };
  const stop = () => {clearInterval(timer); timer = null; playButton.textContent = '▶'; playButton.setAttribute('aria-label', 'Play trajectory');};
  slider.addEventListener('input', showFrame);
  playButton.addEventListener('click', () => {
    if (timer) return stop();
    if (Number(slider.value) === Number(slider.max)) slider.value = 0;
    playButton.textContent = 'Ⅱ';
    playButton.setAttribute('aria-label', 'Pause trajectory');
    timer = setInterval(() => {
      if (Number(slider.value) >= Number(slider.max)) return stop();
      slider.value = Number(slider.value) + 1;
      showFrame();
    }, 650);
  });
  showFrame();
}

main().catch(error => {
  document.getElementById('evolution-chart').textContent = 'Preview data could not be loaded. Serve this repository over HTTP to view the interactive charts.';
  console.error(error);
});
