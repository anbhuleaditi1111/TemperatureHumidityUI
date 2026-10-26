const NORMAL_TEMP_MIN = 18;
const NORMAL_TEMP_MAX = 30;
const NORMAL_HUMIDITY_MIN = 30;
const NORMAL_HUMIDITY_MAX = 70;

let readings = [];

function calculateStatus(temp, humidity) {
  return temp >= NORMAL_TEMP_MIN && temp <= NORMAL_TEMP_MAX &&
         humidity >= NORMAL_HUMIDITY_MIN && humidity <= NORMAL_HUMIDITY_MAX
         ? "Normal" : "Abnormal";
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const index = {
    timestamp: headers.indexOf("timestamp"),
    temperature: headers.indexOf("temperature_c"),
    humidity: headers.indexOf("humidity_percent"),
    status: headers.indexOf("status")
  };
  if (index.timestamp < 0 || index.temperature < 0 || index.humidity < 0) {
    throw new Error("CSV headers are missing. Required: timestamp, temperature_c, humidity_percent.");
  }
  return lines.slice(1).filter(line => line.trim()).map(line => {
    const cols = line.split(",").map(v => v.trim());
    const temperature = Number(cols[index.temperature]);
    const humidity = Number(cols[index.humidity]);
    const calculatedStatus = calculateStatus(temperature, humidity);
    return {
      timestamp: cols[index.timestamp],
      temperature,
      humidity,
      status: index.status >= 0 && cols[index.status]
        ? (cols[index.status].toLowerCase() === "normal" ? "Normal" : "Abnormal")
        : calculatedStatus
    };
  }).filter(row => row.timestamp && Number.isFinite(row.temperature) && Number.isFinite(row.humidity));
}

async function loadDataset() {
  const message = document.getElementById("load-message");
  try {
    const response = await fetch("dataset.csv");
    if (!response.ok) throw new Error("Could not load dataset.csv (HTTP " + response.status + ").");
    readings = parseCSV(await response.text());
    if (!readings.length) throw new Error("The CSV file has no valid readings.");
    updateDashboard();
    message.textContent = "";
  } catch (error) {
    message.classList.add("error");
    message.textContent = "Dataset could not be loaded. Open this project using VS Code Live Server, and make sure dataset.csv is beside index.html. Details: " + error.message;
    console.error(error);
  }
}

function updateDashboard() {
  const latest = readings[readings.length - 1];
  const abnormal = readings.filter(row => row.status === "Abnormal").length;
  document.getElementById("latest-temp").textContent = latest.temperature.toFixed(1);
  document.getElementById("latest-humidity").textContent = latest.humidity.toFixed(1);
  const badge = document.getElementById("latest-status");
  badge.textContent = latest.status;
  badge.className = "status-badge " + latest.status.toLowerCase();
  document.getElementById("latest-status-note").textContent =
    latest.status === "Normal" ? "Within configured normal range" : "Outside configured normal range";
  document.getElementById("abnormal-count").textContent = abnormal;
  document.getElementById("total-count").textContent = readings.length;
  const first = readings[0].timestamp;
  document.getElementById("dataset-range").textContent = first + " — " + latest.timestamp;
  renderTable();
  drawLineChart("temperature-chart", readings.map(r => r.temperature), "°C", "#4778ed");
  drawLineChart("humidity-chart", readings.map(r => r.humidity), "%", "#12a99a");
}

function renderTable() {
  const filter = document.getElementById("status-filter").value;
  const visible = filter === "All" ? readings : readings.filter(r => r.status === filter);
  const tbody = document.getElementById("dataset-table-body");
  tbody.innerHTML = visible.map(row => `
    <tr>
      <td>${escapeHTML(row.timestamp)}</td>
      <td>${row.temperature.toFixed(1)}</td>
      <td>${row.humidity.toFixed(1)}</td>
      <td><span class="reading-status ${row.status}">${row.status}</span></td>
    </tr>`).join("");
  document.getElementById("rows-shown").textContent = `${visible.length} reading${visible.length === 1 ? "" : "s"} shown`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function drawLineChart(canvasId, values, unit, color) {
  const canvas = document.getElementById(canvasId);
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(300, rect.width);
  const height = Math.max(180, rect.height);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const pad = {left: 39, right: 12, top: 18, bottom: 30};
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const minValue = Math.floor(Math.min(...values) - 2);
  const maxValue = Math.ceil(Math.max(...values) + 2);
  const range = Math.max(1, maxValue - minValue);
  ctx.clearRect(0, 0, width, height);
  ctx.font = "10px DM Sans, sans-serif";
  ctx.fillStyle = "#8995a7";
  ctx.strokeStyle = "#edf1f6";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + chartH * i / 4;
    const value = maxValue - range * i / 4;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
    ctx.textAlign = "right"; ctx.fillText(value.toFixed(0) + unit, pad.left - 8, y + 3);
  }
  const x = i => pad.left + (values.length === 1 ? chartW / 2 : chartW * i / (values.length - 1));
  const y = value => pad.top + chartH * (maxValue - value) / range;
  ctx.beginPath();
  values.forEach((value, i) => i === 0 ? ctx.moveTo(x(i), y(value)) : ctx.lineTo(x(i), y(value)));
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
  const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  gradient.addColorStop(0, color + "30"); gradient.addColorStop(1, color + "00");
  ctx.lineTo(x(values.length - 1), pad.top + chartH);
  ctx.lineTo(x(0), pad.top + chartH); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
  values.forEach((value, i) => {
    ctx.beginPath(); ctx.arc(x(i), y(value), 2.8, 0, Math.PI * 2);
    ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke();
  });
  const labelIndices = [...new Set([0, Math.floor((values.length - 1) / 2), values.length - 1])];
  ctx.fillStyle = "#8995a7"; ctx.textAlign = "center";
  labelIndices.forEach(i => {
    const stamp = readings[i]?.timestamp || "";
    ctx.fillText(stamp.includes(" ") ? stamp.split(" ")[1].slice(0,5) : stamp.slice(-5), x(i), height - 8);
  });
}

document.getElementById("status-filter").addEventListener("change", renderTable);
document.getElementById("download-csv").addEventListener("click", () => {
  const blob = new Blob([document.querySelector("table").outerHTML], {type: "text/html"});
  // Download the actual CSV data, including the header row.
  const csv = ["timestamp,temperature_c,humidity_percent,status",
    ...readings.map(r => [r.timestamp, r.temperature, r.humidity, r.status].join(","))].join("\n");
  const csvBlob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(csvBlob);
  const link = document.createElement("a");
  link.href = url; link.download = "temperature_humidity_dataset.csv";
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
});

window.addEventListener("resize", () => {
  if (readings.length) {
    drawLineChart("temperature-chart", readings.map(r => r.temperature), "°C", "#4778ed");
    drawLineChart("humidity-chart", readings.map(r => r.humidity), "%", "#12a99a");
  }
});

loadDataset();
