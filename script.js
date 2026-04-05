// ===============================
// ⏰ TIME + DATE
// ===============================
function updateTime() {
  const now = new Date();

  document.getElementById("time").innerText =
    now.toLocaleTimeString();

  document.getElementById("date").innerText =
    now.toDateString();
}

updateTime();
setInterval(updateTime, 1000);


// ===============================
// 🌦️ WEATHER (OpenWeather API)
// ===============================
const apiKey = "5b146a579bcabefe2bf82ca22d301fd3"; // 👈 replace this
const city = "Kozhikode,IN";

async function getWeather() {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
    );

    const data = await res.json();

    console.log(data); // debug

    if (data.cod !== 200) {
      throw new Error(data.message);
    }

    document.getElementById("weather").innerText =
      `${data.main.temp}°C | ${data.weather[0].main}`;

  } catch (err) {
    console.log("Weather error:", err);
    document.getElementById("weather").innerText = "Weather unavailable";
  }
}
getWeather();              // 👈 run once
setInterval(getWeather, 600000);  // 👈 refresh every 10 min

// ===============================
// 📡 SENSOR DATA (MOCK FOR NOW)
// ===============================
function sensorData() {
  let temp = (25 + Math.random() * 5).toFixed(1);
  let hum = (60 + Math.random() * 10).toFixed(1);

  // Simulate air quality
  let airQuality = Math.random() > 0.6 ? "Poor" : "Good";

  document.getElementById("temp").innerText = temp;
  document.getElementById("hum").innerText = hum;
  document.getElementById("air").innerText = airQuality;

  // 🔔 ALERT SYSTEM
  const alertBox = document.getElementById("alertBox");

  if (airQuality === "Poor") {
    alertBox.classList.remove("hidden");
  } else {
    alertBox.classList.add("hidden");
  }
}

sensorData(); // run once
setInterval(sensorData, 3000);


// ===============================
// 📢 ANNOUNCEMENTS
// ===============================
const announcements = [
  "📚 Exam on Monday",
  "💡 IoT Workshop at 2 PM",
  "🎉 Holiday next Friday"
];

function loadAnnouncements() {
  const list = document.getElementById("announcements");
  list.innerHTML = ""; // clear before adding

  announcements.forEach(item => {
    let li = document.createElement("li");
    li.innerText = item;
    list.appendChild(li);
  });
}

loadAnnouncements();


// ===============================
// 📅 TIMETABLE
// ===============================
const timetable = [
  "9:00 AM - Embedded Systems",
  "11:00 AM - IoT Lab",
  "2:00 PM - VLSI Design"
];

function loadTimetable() {
  const list = document.getElementById("timetable");
  list.innerHTML = "";

  timetable.forEach(item => {
    let li = document.createElement("li");
    li.innerText = item;
    list.appendChild(li);
  });
}

loadTimetable();

// ===============================
// 🌌 PARTICLE BACKGROUND
// ===============================
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

let particles = [];

for (let i = 0; i < 80; i++) {
  particles.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2,
    speedX: (Math.random() - 0.5),
    speedY: (Math.random() - 0.5)
  });
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#00eaff";

  particles.forEach(p => {
    p.x += p.speedX;
    p.y += p.speedY;

    if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
    if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(animateParticles);
}

animateParticles();


// ===============================
// 🌙 OPTIONAL: MANUAL DARK TOGGLE (for demo)
// ===============================
document.addEventListener("keydown", function(e) {
  if (e.key === "d") {
    document.body.classList.toggle("dark");
  }
});