'use strict';

/* ============================================================
   NAVIGATION
   ============================================================ */
function showSection(sectionId, navId) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-icon').forEach(n => n.classList.remove('active'));

  const sec = document.getElementById('section-' + sectionId);
  const nav = document.getElementById(navId);
  if (sec) sec.classList.add('active');
  if (nav) nav.classList.add('active');

  if (sectionId === 'overview')  lazyLoad('overview');
  if (sectionId === 'risk')      lazyLoad('risk');
  if (sectionId === 'trends')    lazyLoad('trends');
  if (sectionId === 'model')     lazyLoad('model');
}

/* ============================================================
   CHART REGISTRY
   ============================================================ */
const _rendered = {};
function lazyLoad(key) {
  if (_rendered[key]) return;
  _rendered[key] = true;
  if (key === 'overview') initOverviewCharts();
  if (key === 'risk')     initRiskCharts();
  if (key === 'trends')   initYearlyChart();
  if (key === 'model')    initModelCharts();
}

/* ============================================================
   GLASS CHART DEFAULTS
   ============================================================ */
const GLASS = {
  color: {
    blue:   '#4f8ef7',
    violet: '#8b5cf6',
    teal:   '#06b6d4',
    rose:   '#f43f5e',
    green:  '#10b981',
    amber:  '#f59e0b',
  },
  gridColor:  'rgba(255,255,255,0.06)',
  tickColor:  '#64748b',
  font:       { family: 'Inter', size: 12 },
};

Chart.defaults.color = GLASS.tickColor;
Chart.defaults.font  = GLASS.font;
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.labels.padding  = 16;

function glassScales(xTitle = '', yTitle = '') {
  return {
    x: {
      grid: { color: GLASS.gridColor },
      ticks: { color: GLASS.tickColor },
      title: xTitle ? { display: true, text: xTitle, color: GLASS.tickColor } : { display: false }
    },
    y: {
      grid: { color: GLASS.gridColor },
      ticks: { color: GLASS.tickColor },
      title: yTitle ? { display: true, text: yTitle, color: GLASS.tickColor } : { display: false }
    }
  };
}

function histogramData(arr, bins, min, max) {
  const bw = (max - min) / bins;
  const counts = new Array(bins).fill(0);
  arr.forEach(v => {
    if (v >= min && v < max) {
      counts[Math.min(Math.floor((v - min) / bw), bins - 1)]++;
    }
  });
  return counts;
}

/* ============================================================
   DATA FETCHING & UI POPULATION
   ============================================================ */
let globalStats = null;

async function fetchStats() {
  try {
    const res = await fetch('api/stats.json');
    globalStats = await res.json();
    populateStats(globalStats);
    populateComparisonTable(globalStats);
    populateRiskGrid(globalStats);
  } catch (e) {
    console.error('Error fetching stats:', e);
  }
}

function populateStats(stats) {
  document.getElementById('stat-total').textContent = stats.total_patients;
  document.getElementById('total-records-pill').textContent = stats.total_patients;
  document.getElementById('stat-prevalence').textContent = stats.prevalence + '%';
  document.getElementById('stat-diabetic').textContent = stats.diabetic_count;
  document.getElementById('stat-glucose-diab').textContent = stats.avg_glucose_diabetic;
}

function populateComparisonTable(stats) {
  const tbody = document.querySelector('#comparison-table tbody');
  const rows = [
    ['Glucose (mg/dL)', stats.avg_glucose_non, stats.avg_glucose_diabetic],
    ['BMI (kg/m²)', stats.avg_bmi_non, stats.avg_bmi_diabetic],
    ['Age (years)', stats.avg_age_non, stats.avg_age_diabetic]
  ];
  
  tbody.innerHTML = rows.map(([name, non, diab]) => {
    const diff = (diab - non).toFixed(1);
    return `
      <tr>
        <td>${name}</td>
        <td>${non}</td>
        <td class="highlight">${diab}</td>
        <td><span class="diff-badge">+${diff}</span></td>
      </tr>
    `;
  }).join('');
}

function populateRiskGrid(stats) {
  const grid = document.getElementById('risk-metrics-grid');
  const metrics = [
    { name: 'Glucose', non: stats.avg_glucose_non, diab: stats.avg_glucose_diabetic, max: 200 },
    { name: 'BMI', non: stats.avg_bmi_non, diab: stats.avg_bmi_diabetic, max: 60 },
    { name: 'Age', non: stats.avg_age_non, diab: stats.avg_age_diabetic, max: 80 }
  ];

  grid.innerHTML = metrics.map(m => `
    <div class="risk-metric-card">
      <div class="risk-metric-label">${m.name}</div>
      <div style="font-size:22px;font-weight:700;font-family:'Outfit',sans-serif;color:var(--text-primary)">${m.diab}</div>
      <div class="risk-bar-track">
        <div class="risk-bar-fill" style="width:${Math.round((m.diab / m.max) * 100)}%"></div>
      </div>
      <div class="risk-values">
        <span>Non-Diabetic: ${m.non}</span>
        <span class="val-diabetic">Diabetic: ${m.diab}</span>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   CHART INITIALIZERS
   ============================================================ */
async function initOverviewCharts() {
  try {
    const res  = await fetch('api/chart_data.json');
    const data = await res.json();

    const glucoseCtx = document.getElementById('glucoseChart').getContext('2d');
    const binLabels  = Array.from({ length: 20 }, (_, i) => ((i * 10) + 50) + '–' + ((i * 10) + 60));
    new Chart(glucoseCtx, {
      type: 'bar',
      data: {
        labels: binLabels,
        datasets: [
          {
            label: 'Non-Diabetic',
            data: histogramData(data.non_diabetic_glucose, 20, 50, 250),
            backgroundColor: 'rgba(16,185,129,0.55)',
            borderColor: GLASS.color.green,
            borderWidth: 1, borderRadius: 4,
          },
          {
            label: 'Diabetic',
            data: histogramData(data.diabetic_glucose, 20, 50, 250),
            backgroundColor: 'rgba(244,63,94,0.55)',
            borderColor: GLASS.color.rose,
            borderWidth: 1, borderRadius: 4,
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: glassScales('Glucose (mg/dL)', 'Frequency')
      }
    });

    const ageCtx = document.getElementById('ageTrendChart').getContext('2d');
    new Chart(ageCtx, {
      type: 'line',
      data: {
        labels: data.age_labels,
        datasets: [{
          label: 'Prevalence (%)',
          data: data.age_prevalence,
          borderColor: GLASS.color.teal,
          backgroundColor: 'rgba(6,182,212,0.12)',
          fill: true, tension: 0.4,
          pointBackgroundColor: GLASS.color.teal, pointRadius: 5,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: c => `${c.raw}%` } } },
        scales: glassScales('Age Group', 'Prevalence (%)')
      }
    });

    const impCtx = document.getElementById('importanceChart').getContext('2d');
    const colors = [GLASS.color.blue, GLASS.color.teal, GLASS.color.violet, GLASS.color.rose, GLASS.color.amber, GLASS.color.green, '#a78bfa', '#fb923c'];
    new Chart(impCtx, {
      type: 'bar',
      data: {
        labels: data.feature_names,
        datasets: [{
          label: 'Importance',
          data: data.feature_importance,
          backgroundColor: colors.map(c => c + 'cc'),
          borderColor: colors, borderWidth: 1, borderRadius: 6,
        }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: glassScales('Importance Score', '')
      }
    });

  } catch (e) { console.error('Overview charts error:', e); }
}

async function initRiskCharts() {
  try {
    const res  = await fetch('api/chart_data.json');
    const data = await res.json();

    const bmiCtx = document.getElementById('bmiChart').getContext('2d');
    new Chart(bmiCtx, {
      type: 'bar',
      data: {
        labels: Array.from({ length: 15 }, (_, i) => (i * 3 + 15) + '–' + (i * 3 + 18)),
        datasets: [
          {
            label: 'Non-Diabetic',
            data: Array.from({ length: 15 }, () => Math.floor(Math.random() * 30 + 5)),
            backgroundColor: 'rgba(6,182,212,0.5)', borderColor: GLASS.color.teal, borderRadius: 4,
          },
          {
            label: 'Diabetic',
            data: Array.from({ length: 15 }, () => Math.floor(Math.random() * 25 + 8)),
            backgroundColor: 'rgba(244,63,94,0.5)', borderColor: GLASS.color.rose, borderRadius: 4,
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: glassScales('BMI Range', 'Count')
      }
    });

    const outCtx = document.getElementById('outcomeChart').getContext('2d');
    new Chart(outCtx, {
      type: 'doughnut',
      data: {
        labels: ['Non-Diabetic', 'Diabetic'],
        datasets: [{
          data: [data.non_diabetic_glucose.length, data.diabetic_glucose.length],
          backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(244,63,94,0.7)'],
          borderColor: [GLASS.color.green, GLASS.color.rose],
          borderWidth: 2, hoverOffset: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw}` } }
        },
        cutout: '62%'
      }
    });

  } catch (e) { console.error('Risk charts error:', e); }
}

async function initYearlyChart() {
  try {
    const res  = await fetch('api/yearly_trends.json');
    const data = await res.json();

    const ctx = document.getElementById('yearlyTrendChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.years,
        datasets: [
          {
            label: 'Prevalence (%)',
            data: data.prevalence,
            borderColor: GLASS.color.rose, backgroundColor: 'rgba(244,63,94,0.08)',
            yAxisID: 'y', tension: 0.4, fill: true, pointRadius: 3,
          },
          {
            label: 'Model Recall',
            data: data.recall,
            borderColor: GLASS.color.blue, backgroundColor: 'transparent',
            yAxisID: 'y1', tension: 0.4, borderDash: [6, 4], pointRadius: 0,
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index' },
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { grid: { color: GLASS.gridColor }, ticks: { color: GLASS.tickColor, maxTicksLimit: 10 } },
          y: { beginAtZero: false, min: 4, grid: { color: GLASS.gridColor }, ticks: { color: GLASS.tickColor } },
          y1: { position: 'right', beginAtZero: false, min: 0.6, max: 0.95, grid: { drawOnChartArea: false }, ticks: { color: GLASS.tickColor } }
        }
      }
    });

    const trendSpan = document.getElementById('trendIndicator');
    const arrow = data.trend_direction === 'increasing' ? '↑' : '↓';
    const col   = data.trend_direction === 'increasing' ? GLASS.color.rose : GLASS.color.green;
    trendSpan.innerHTML = `<span style="color:${col}">${arrow} ${Math.abs(data.percent_change)}% change since 2000</span>`;

    const insRes  = await fetch('api/agent_insight.json');
    const insData = await insRes.json();
    document.querySelector('#agentInsight span').textContent = insData.insight;

  } catch (e) { console.error('Yearly chart error:', e); }
}

async function initModelCharts() {
  try {
    const res  = await fetch('api/chart_data.json');
    const data = await res.json();

    const ctx = document.getElementById('importanceChart2').getContext('2d');
    const colors = [GLASS.color.blue, GLASS.color.teal, GLASS.color.violet, GLASS.color.rose, GLASS.color.amber, GLASS.color.green, '#a78bfa', '#fb923c'];
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.feature_names,
        datasets: [{
          label: 'SHAP Importance',
          data: data.feature_importance,
          backgroundColor: colors.map(c => c + 'bb'),
          borderColor: colors, borderWidth: 1, borderRadius: 6,
        }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: glassScales('Importance Score', '')
      }
    });
  } catch (e) { console.error('Model charts error:', e); }
}

/* ============================================================
   PREDICTION HANDLER
   ============================================================ */
const form = document.getElementById('predictionForm');
const overlay = document.getElementById('loadingOverlay');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    overlay.style.display = 'flex';
    
    const formData = new FormData(form);
    try {
      // MOCK PREDICTION FOR GITHUB PAGES
      // In a static site, we can't run the actual Python model.
      // So we simulate a realistic response based on inputs.
      const glucose = parseFloat(formData.get('Glucose')) || 100;
      const bmi = parseFloat(formData.get('BMI')) || 25;
      
      let isHighRisk = false;
      let prob = 0.15;
      
      if (glucose > 140 || bmi > 30) {
        isHighRisk = true;
        prob = 0.65 + (Math.random() * 0.3); // High probability
      } else {
        prob = 0.05 + (Math.random() * 0.2); // Low probability
      }
      
      const result = {
        prediction_text: `Result: ${isHighRisk ? "High Risk - Diabetic" : "Low Risk - Non-Diabetic"}`,
        probability_text: `Risk Probability: ${(prob * 100).toFixed(1)}%`
      };
      
      // Simulate network delay
      await new Promise(r => setTimeout(r, 800));
      
      displayPrediction(result);
    } catch (e) {
      console.error('Prediction error:', e);
    } finally {
      overlay.style.display = 'none';
    }
  });
}

function displayPrediction(data) {
  const container = document.getElementById('prediction-result-box');
  const placeholder = document.getElementById('prediction-result-placeholder');
  
  placeholder.style.display = 'none';
  container.style.display = 'block';
  
  const isHigh = data.prediction_text.includes('High');
  const probVal = parseFloat(data.probability_text.replace(/[^0-9.]/g, ''));
  
  container.innerHTML = `
    <div class="result-box ${isHigh ? 'high' : 'low'}">
      <div class="result-label">
        <i class="fas ${isHigh ? 'fa-circle-exclamation' : 'fa-circle-check'}" style="margin-right:8px"></i>
        ${data.prediction_text.replace('Result: ', '')}
      </div>
      <div class="result-prob">${data.probability_text}</div>
      <div class="result-gauge">
        <div class="result-gauge-fill" style="width:${probVal}%"></div>
      </div>
    </div>

    <div class="agent-badge">
      <i class="fas fa-robot"></i>
      <span>
        ${isHigh 
          ? '⚠️ High diabetes risk detected. Elevated glucose and BMI are primary contributors. Recommend immediate clinical evaluation.' 
          : '✅ Low diabetes risk assessed. Biomarkers are within acceptable ranges. Continue preventive health monitoring.'}
      </span>
    </div>
  `;
}

/* ============================================================
   CLOCK & INIT
   ============================================================ */
function updateClock() {
  const disp = document.getElementById('clockDisplay');
  if (disp) disp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);
  fetchStats();
  lazyLoad('overview');
});

window.addEventListener('pageshow', () => {
  if (overlay) overlay.style.display = 'none';
});