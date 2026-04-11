// display.js — Smart Campus Display Panel

// ── Firebase init ─────────────────────────────────────────
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ── ThingSpeak config ─────────────────────────────────────
const TS_CHANNEL_ID = "3332831";
const TS_READ_KEY   = "PSHTRPA2UHYDLTTY";

// ── OpenWeatherMap ────────────────────────────────────────
const OWM_API_KEY = "5b146a579bcabefe2bf82ca22d301fd3";
const OWM_CITY    = "Kozhikode,IN";

// ── State ─────────────────────────────────────────────────
let knownKeys      = new Set();   // track announcement IDs already shown
let isFirstLoad    = true;        // skip voice on initial page load
const CHIME_URL    = null;        // set to an audio file URL if you have one

// ═══════════════════════════════════════════════════════════
// 1. CLOCK
// ═══════════════════════════════════════════════════════════
function updateClock() {
  const now = new Date();
  document.getElementById('time').innerText =
    now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
  document.getElementById('date').innerText = now.toDateString();
}
updateClock();
setInterval(updateClock, 1000);


// ═══════════════════════════════════════════════════════════
// 2. WEATHER
// ═══════════════════════════════════════════════════════════
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
    if (data.cod !== 200) throw new Error();
    const icon = weatherIcons[data.weather[0].icon] || '🌡';
    document.getElementById('weather').innerHTML =
      `${icon} ${Math.round(data.main.temp)}°C &nbsp;·&nbsp; ${data.weather[0].description}<br>
       <span style="font-size:13px;opacity:0.7">
         💧${data.main.humidity}% &nbsp; 💨${Math.round(data.wind.speed*3.6)}km/h
       </span>`;
  } catch {
    document.getElementById('weather').innerText = 'Weather unavailable';
  }
}
getWeather();
setInterval(getWeather, 10 * 60 * 1000);


// ═══════════════════════════════════════════════════════════
// 3. FIREBASE — ANNOUNCEMENTS (real-time listener)
// ═══════════════════════════════════════════════════════════
function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs/24)}d ago`;
}

function renderAnnouncements(data) {
  const list = document.getElementById('announce-list');
  const count = document.getElementById('announce-count');

  if (!data) {
    list.innerHTML = '<div class="empty-msg">No announcements yet</div>';
    count.textContent = '0';
    return;
  }

  // Convert to array sorted newest first
  const items = Object.entries(data)
    .map(([key, val]) => ({ key, ...val }))
    .sort((a, b) => b.timestamp - a.timestamp);

  count.textContent = items.length;

  list.innerHTML = items.map(item => `
    <div class="announce-item ${!knownKeys.has(item.key) && !isFirstLoad ? 'new' : ''}">
      <div class="announce-text">${item.text}</div>
      <div class="announce-meta">
        Posted by ${item.author || 'Admin'} &nbsp;·&nbsp; ${timeAgo(item.timestamp)}
      </div>
    </div>
  `).join('');

  // Voice + chime for new announcements
  if (!isFirstLoad) {
    items.forEach(item => {
      if (!knownKeys.has(item.key)) {
        speakAnnouncement(item.text);
      }
    });
  }

  // Update known keys
  items.forEach(item => knownKeys.add(item.key));
  isFirstLoad = false;
}

// Listen for any change in announcements
db.ref('announcements').on('value', snap => {
  renderAnnouncements(snap.val());
});


// ═══════════════════════════════════════════════════════════
// 4. VOICE NOTIFICATION
// ═══════════════════════════════════════════════════════════
function speakAnnouncement(text) {
  const indicator = document.getElementById('voice-indicator');

  // Play chime sound first if available
  if (CHIME_URL) {
    const audio = new Audio(CHIME_URL);
    audio.play().catch(() => {});
  }

  // Show indicator
  indicator.classList.remove('hidden');

  // Text-to-speech
  const utterance = new SpeechSynthesisUtterance(
    'New announcement: ' + text.replace(/[^\w\s.,!?]/g, '') // strip emojis for cleaner TTS
  );
  utterance.rate   = 0.9;
  utterance.pitch  = 1;
  utterance.volume = 1;
  utterance.lang   = 'en-IN';

  utterance.onend = () => {
    indicator.classList.add('hidden');
  };

  // Cancel any ongoing speech then speak
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}


// ═══════════════════════════════════════════════════════════
// 5. THINGSPEAK — SENSOR DATA
// ═══════════════════════════════════════════════════════════
function getStatusInfo(type, val) {
  val = parseFloat(val);
  if (type === 'temp') {
    if (val < 18) return ['s-warn', 'Too Cold'];
    if (val > 35) return ['s-bad',  'Too Hot'];
    return ['s-good', 'Comfortable'];
  }
  if (type === 'hum') {
    if (val < 30) return ['s-warn', 'Low'];
    if (val > 70) return ['s-bad',  'High'];
    return ['s-good', 'Normal'];
  }
  if (type === 'aqi') {
    if (val < 50)  return ['s-good', 'Good'];
    if (val < 100) return ['s-warn', 'Moderate'];
    return ['s-bad', 'Unhealthy'];
  }
  return ['s-good', ''];
}

function updateSensorCard(id, value, type) {
  const el  = document.getElementById(id);
  const sta = document.getElementById(id + '-status');
  if (!el) return;
  el.innerText = parseFloat(value).toFixed(type === 'aqi' ? 0 : 1);
  const [cls, label] = getStatusInfo(type, value);
  sta.className  = 'sensor-status ' + cls;
  sta.innerText  = label;
}

async function fetchSensorData() {
  try {
    const url =
      `https://api.thingspeak.com/channels/${TS_CHANNEL_ID}/feeds.json` +
      `?api_key=${TS_READ_KEY}&results=1`;
    const res   = await fetch(url);
    const data  = await res.json();
    const feeds = data.feeds || [];
    if (feeds.length === 0) return;

    const f = feeds[feeds.length - 1];
    updateSensorCard('temp', f.field1 || 0, 'temp');
    updateSensorCard('hum',  f.field2 || 0, 'hum');
    updateSensorCard('air',  f.field3 || 0, 'aqi');

    document.getElementById('alertBox')
      .classList.toggle('hidden', parseFloat(f.field3) < 100);

    document.getElementById('last-updated').innerText =
      new Date(f.created_at).toLocaleTimeString('en-IN', {
        hour:'2-digit', minute:'2-digit', hour12:true,
      });
  } catch (err) {
    console.error('ThingSpeak error:', err);
  }
}

fetchSensorData();
setInterval(fetchSensorData, 15000);


// ═══════════════════════════════════════════════════════════
// 6. TIMETABLE
// ═══════════════════════════════════════════════════════════
const timetable = [
  '9:00 AM  — Embedded Systems',
  '11:00 AM — IoT Lab',
  '2:00 PM  — VLSI Design',
];

document.getElementById('timetable').innerHTML =
  timetable.map(t => `<li>${t}</li>`).join('');


// ═══════════════════════════════════════════════════════════
// 7. PARTICLE BACKGROUND
// ═══════════════════════════════════════════════════════════
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
  speedX: (Math.random() - 0.5) * 0.6,
  speedY: (Math.random() - 0.5) * 0.6,
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
