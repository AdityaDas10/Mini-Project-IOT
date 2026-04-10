// ── THINGSPEAK CONFIG ─────────────────────────
const CLASS_ID = "CSE-A"; // 👈 change per screen
const TS_CHANNEL_ID = "3332831";
const TS_READ_KEY   = "PSHTRPA2UHYDLTTY";
const TS_FIELD_MOTION = "4"; 
const USE_THINGSPEAK = false;  // ✅ turn ON


// ── 4. ANNOUNCEMENTS ──────────────────────────────────────
// Uses localStorage so posts survive page refresh
const ANN_KEY = 'sm_announcements';

let announcements = JSON.parse(localStorage.getItem(ANN_KEY) || 'null');

if (!announcements || announcements.length === 0) {
  announcements = [
    { text: '📚 Exam on Monday' },
    { text: '💡 IoT Workshop at 2 PM' },
    { text: '🎉 Holiday next Friday' },
  ];
}
// ── MOTION OVERLAY ────────────────────────────────────────
const overlay = document.createElement('div');
overlay.id = 'mirror-overlay';
Object.assign(overlay.style, {
  position:      'fixed',
  inset:         '0',
  background:    '#000',
  zIndex:        '9999',
  opacity:       '1',
  transition:    'opacity 1.5s ease',
  pointerEvents: 'none',
});
document.body.appendChild(overlay);

let displayIsOn = false;

function showDisplay() {
  if (displayIsOn) return;
  displayIsOn = true;
  overlay.style.opacity = '0';
}

function hideDisplay() {
  if (!displayIsOn) return;
  displayIsOn = false;
  overlay.style.opacity = '1';
}

// Keep display ON in simulation mode
//if (!USE_THINGSPEAK) showDisplay();
setTimeout(showDisplay, 100);

// ── 1. CLOCK ──────────────────────────────────────────────
function updateTime() {
  const now = new Date();
  document.getElementById('time').innerText =
    now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
  document.getElementById('date').innerText = now.toDateString();
}
updateTime();
setInterval(updateTime, 1000);



// ── 2. WEATHER (OpenWeatherMap) ───────────────────────────
const OWM_API_KEY = "5b146a579bcabefe2bf82ca22d301fd3";
const OWM_CITY    = "Kozhikode,IN";

const weatherIcons = {
  '01d':'☀️','01n':'🌙','02d':'⛅','02n':'⛅','03d':'☁️','03n':'☁️',
  '04d':'☁️','04n':'☁️','09d':'🌧','09n':'🌧','10d':'🌦','10n':'🌦',
  '11d':'⛈','11n':'⛈','13d':'❄️','13n':'❄️','50d':'🌫','50n':'🌫',
};

async function getWeather() {
  try {
    const res  = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${OWM_CITY}&appid=${OWM_API_KEY}&units=metric`
    );
    const data = await res.json();
    if (data.cod !== 200) throw new Error(data.message);
    const icon = weatherIcons[data.weather[0].icon] || '🌡';
    document.getElementById('weather').innerHTML =
      `${icon} ${Math.round(data.main.temp)}°C &nbsp;·&nbsp; ${data.weather[0].description}<br>
       <span style="font-size:16px;opacity:0.7">💧 ${data.main.humidity}% &nbsp;·&nbsp; 💨 ${Math.round(data.wind.speed * 3.6)} km/h</span>`;
  } catch {
    document.getElementById('weather').innerText = 'Weather unavailable';
  }
}
getWeather();
setInterval(getWeather, 10 * 60 * 1000);

// ── THINGSPEAK FETCH ─────────────────────────
async function fetchFromThingSpeak() {
  try {
   const url =
  `https://api.thingspeak.com/channels/${TS_CHANNEL_ID}/feeds.json?api_key=${TS_READ_KEY}&results=1`;

    const res   = await fetch(url);
    const data  = await res.json();
    const feeds = data.feeds || [];

    if (feeds.length === 0) {
      console.log("No data yet");
      return;
    }

    const f = feeds[0];

    // ── ANNOUNCEMENT FROM THINGSPEAK ──
const annClass = f.field5;
const annText  = f.field6;

if (annClass === CLASS_ID && annText) {

  // avoid duplicate entries
  if (!announcements.find(a => a.text === "📢 " + annText)){

    announcements.unshift({ text: "📢 " + annText });

    // keep only last 5
    if (announcements.length > 5) announcements.pop();

    localStorage.setItem(ANN_KEY, JSON.stringify(announcements));
    renderAnnouncements();
  }
}

    document.getElementById('temp').innerText = f.field1;
    document.getElementById('hum').innerText  = f.field2;
    document.getElementById('air').innerText  = f.field3;

    document.getElementById('alertBox')
      .classList.toggle('hidden', parseFloat(f.field3) < 100);

    parseInt(f.field4) === 1 ? showDisplay() : hideDisplay();

    document.getElementById('last-updated').innerText =
      new Date().toLocaleTimeString('en-IN');

  } catch (err) {
    console.log("ThingSpeak error:", err);
  }
}

// ── CHART VARIABLES ─────────────────────────
let chart;
let dataHist = { labels: [], temp: [], hum: [], aqi: [] };
let current = "temp";

// ── INIT CHART ─────────────────────────
function initChart() {
  const ctx = document.getElementById("histChart");

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Sensor Data",
        data: [],
        borderColor: "#00eaff",
        backgroundColor: "rgba(0,234,255,0.1)",
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: "#00eaff" } },
        y: { ticks: { color: "#00eaff" } }
      }
    }
  });
}

// ── UPDATE CHART ─────────────────────────
function updateChart() {
  chart.data.labels = dataHist.labels;
  chart.data.datasets[0].data = dataHist[current];
  chart.update();
}

// ── SWITCH TABS ─────────────────────────
function switchChart(type, el) {
  current = type;

  document.querySelectorAll(".ctab").forEach(btn =>
    btn.classList.remove("active")
  );

  el.classList.add("active");

  updateChart();
}

// ── THINGSPEAK HISTORY FOR CHART ─────────────────────────
async function fetchChartData() {
  try {
    const url =
      `https://api.thingspeak.com/channels/${TS_CHANNEL_ID}/feeds.json?api_key=${TS_READ_KEY}&results=10`;

    const res = await fetch(url);
    const data = await res.json();
    const feeds = data.feeds || [];

    if (feeds.length === 0) return;

    // Clear old data
    dataHist.labels = [];
    dataHist.temp = [];
    dataHist.hum = [];
    dataHist.aqi = [];

    feeds.forEach(f => {
      dataHist.labels.push(new Date(f.created_at).toLocaleTimeString());

      dataHist.temp.push(parseFloat(f.field1));
      dataHist.hum.push(parseFloat(f.field2));
      dataHist.aqi.push(parseFloat(f.field3));
    });

    updateChart();

  } catch (err) {
    console.log("Chart fetch error:", err);
  }
}

// ── 3. SENSOR DATA (Simulated — replace with ESP32 later) ──
function simulateSensorData() {
  const temp = (25 + Math.random() * 10).toFixed(1);
  const hum  = (55 + Math.random() * 20).toFixed(1);
  const aqi  = (30 + Math.random() * 90).toFixed(0);
  const now  = new Date();

  document.getElementById('temp').innerText = temp;
  document.getElementById('hum').innerText  = hum;
  document.getElementById('air').innerText  = aqi;

  // Show alert if AQI is bad
  document.getElementById('alertBox')
    .classList.toggle('hidden', parseFloat(aqi) < 100);

  // Last updated timestamp
  document.getElementById('last-updated').innerText =
    now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true });
}

if (USE_THINGSPEAK) {
  fetchFromThingSpeak();
  setInterval(fetchFromThingSpeak, 15000);
} else {
  simulateSensorData();
  setInterval(simulateSensorData, 5000);
}
// ── CHART INITIALIZATION ─────────────────────────
initChart();
fetchChartData();
setInterval(fetchChartData, 20000);


function renderAnnouncements() {
  const list = document.getElementById('announcements');
  if (announcements.length === 0) {
    list.innerHTML = '<li style="opacity:0.5;justify-content:center">No announcements</li>';
    return;
  }
  list.innerHTML = announcements
    .map((a, i) => `
      <li>
        <span>${a.text}</span>
        <button class="li-del" onclick="deleteAnnouncement(${i})">✕</button>
      </li>`)
    .join('');
}

// Called by the Post button and Enter key
function sendAnnouncement() {
  const text = document.getElementById("ann-input").value.trim();
  const cls  = document.getElementById("class-select").value;

  if (!text) return;

  // 🔥 show instantly in UI
  announcements.unshift({ text: "📢 " + text });
  if (announcements.length > 5) announcements.pop();

  // ✅ ADD THIS
  localStorage.setItem(ANN_KEY, JSON.stringify(announcements));

  renderAnnouncements();

  fetch(`https://api.thingspeak.com/update?api_key=GI5RCJKSOJA0Q31X&field5=${cls}&field6=${encodeURIComponent(text)}`)
    .then(() => {
      console.log("Announcement sent");
      document.getElementById("ann-input").value = "";
    })
    .catch(err => console.log("Error:", err));
}

function deleteAnnouncement(i) {
  announcements.splice(i, 1);
  localStorage.setItem(ANN_KEY, JSON.stringify(announcements));
  renderAnnouncements();
}

renderAnnouncements();


// ── 5. TIMETABLE ──────────────────────────────────────────
const timetable = [
  '9:00 AM  — Embedded Systems',
  '11:00 AM — IoT Lab',
  '2:00 PM  — VLSI Design',
];

function loadTimetable() {
  document.getElementById('timetable').innerHTML =
    timetable.map(item => `<li><span>${item}</span></li>`).join('');
}
loadTimetable();


// ── 6. PARTICLE BACKGROUND ────────────────────────────────
const canvas = document.getElementById('particles');
const pctx   = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const particles = Array.from({ length: 80 }, () => ({
  x:      Math.random() * canvas.width,
  y:      Math.random() * canvas.height,
  size:   Math.random() * 2,
  speedX: (Math.random() - 0.5) * 0.8,
  speedY: (Math.random() - 0.5) * 0.8,
}));

function animateParticles() {
  pctx.clearRect(0, 0, canvas.width, canvas.height);
  pctx.fillStyle = '#00eaff';

  particles.forEach(p => {
    p.x += p.speedX;
    p.y += p.speedY;
    if (p.x < 0 || p.x > canvas.width)  p.speedX *= -1;
    if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

    pctx.beginPath();
    pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    pctx.fill();
  });

  requestAnimationFrame(animateParticles);
}
animateParticles();
