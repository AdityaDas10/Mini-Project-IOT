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

simulateSensorData();
setInterval(simulateSensorData, 5000);


// ── 4. ANNOUNCEMENTS ──────────────────────────────────────
// Uses localStorage so posts survive page refresh
const ANN_KEY = 'sm_announcements';

let announcements = JSON.parse(localStorage.getItem(ANN_KEY) || 'null');

// Default items if nothing saved yet
if (!announcements) {
  announcements = [
    { text: '📚 Exam on Monday' },
    { text: '💡 IoT Workshop at 2 PM' },
    { text: '🎉 Holiday next Friday' },
  ];
}

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
function addAnnouncement() {
  const inp  = document.getElementById('ann-input');
  const text = inp.value.trim();
  if (!text) return;                          // ignore empty input
  announcements.unshift({ text });            // add to top
  localStorage.setItem(ANN_KEY, JSON.stringify(announcements));
  inp.value = '';
  renderAnnouncements();
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
