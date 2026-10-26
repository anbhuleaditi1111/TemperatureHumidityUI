const tempEl = document.getElementById("temp");
const humidityEl = document.getElementById("humidity");
const tempMeter = document.getElementById("temp-meter");
const humidityMeter = document.getElementById("humidity-meter");
const environmentEl = document.getElementById("environment");
const updatedEl = document.getElementById("updated");

function updateReadings() {
  // Simulated demo values. Replace this function with real sensor data later.
  const temperature = Number((22 + Math.random() * 14).toFixed(1));
  const humidity = Math.floor(35 + Math.random() * 51);

  tempEl.innerHTML = `${temperature.toFixed(1)} <small>°C</small>`;
  humidityEl.innerHTML = `${humidity} <small>%</small>`;
  tempMeter.style.width = `${Math.min(100, (temperature / 40) * 100)}%`;
  humidityMeter.style.width = `${humidity}%`;

  if (temperature >= 32) {
    environmentEl.textContent = "High temperature detected in this demo reading.";
  } else if (humidity >= 70) {
    environmentEl.textContent = "High humidity detected in this demo reading.";
  } else {
    environmentEl.textContent = "Temperature and humidity are within the demo range.";
  }

  updatedEl.textContent = new Date().toLocaleTimeString();
}

document.getElementById("refresh").addEventListener("click", updateReadings);
