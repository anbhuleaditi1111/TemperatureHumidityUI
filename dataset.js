/* Temperature & Humidity dataset display.
   Loads dataset.csv, shows a table, and draws two charts.
   Sample values are for demonstration, not real sensor readings. */
(() => {
  const root = document.getElementById("dataset-dashboard");
  if (!root) return;

  const tableBody = root.querySelector("#dataset-table-body");
  const status = root.querySelector("#dataset-status");
  const latestTemp = root.querySelector("#dataset-latest-temp");
  const latestHumidity = root.querySelector("#dataset-latest-humidity");
  const tempCanvas = root.querySelector("#temperature-chart");
  const humidityCanvas = root.querySelector("#humidity-chart");

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines.shift().split(",").map(x => x.trim());
    return lines.filter(Boolean).map(line => {
      const cols = line.split(",").map(x => x.trim());
      const row = {};
      headers.forEach((header, i) => row[header] = cols[i]);
      return row;
    });
  }

  function drawLineChart(canvas, labels, values, label, color, unit) {
    const ctx = canvas.getContext("2d");
    const width = canvas.width = Math.max(320, canvas.clientWidth * 2);
    const height = canvas.height = 360;
    ctx.clearRect(0, 0, width, height);

    const pad = { left: 55, right: 20, top: 25, bottom: 48 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;
    const minVal = Math.floor(Math.min(...values) - 2);
    const maxVal = Math.ceil(Math.max(...values) + 2);
    const x = i => pad.left + (values.length <= 1 ? 0 : i * chartW / (values.length - 1));
    const y = v => pad.top + (maxVal - v) * chartH / (maxVal - minVal);

    ctx.font = "22px Arial";
    ctx.strokeStyle = "#e5e7eb";
    ctx.fillStyle = "#4b5563";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const val = minVal + (maxVal - minVal) * i / 4;
      const yy = y(val);
      ctx.beginPath(); ctx.moveTo(pad.left, yy); ctx.lineTo(width-pad.right, yy); ctx.stroke();
      ctx.fillText(val.toFixed(0) + unit, 5, yy + 7);
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    values.forEach((v, i) => i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v)));
    ctx.stroke();

    ctx.fillStyle = color;
    values.forEach((v, i) => {
      ctx.beginPath(); ctx.arc(x(i), y(v), 4, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = "#4b5563";
    ctx.font = "20px Arial";
    const step = Math.max(1, Math.ceil(labels.length / 6));
    labels.forEach((labelText, i) => {
      if (i % step === 0 || i === labels.length - 1) {
        ctx.save();
        ctx.translate(x(i), height - 12);
        ctx.rotate(-0.35);
        ctx.fillText(labelText, -12, 0);
        ctx.restore();
      }
    });
    ctx.fillStyle = "#111827";
    ctx.font = "bold 24px Arial";
    ctx.fillText(label, pad.left, 18);
  }

  fetch("./dataset.csv")
    .then(response => {
      if (!response.ok) throw new Error("Could not load dataset.csv");
      return response.text();
    })
    .then(csvText => {
      const rows = parseCSV(csvText).filter(row =>
        row.timestamp && Number.isFinite(Number(row.temperature_c)) &&
        Number.isFinite(Number(row.humidity_percent))
      );
      if (!rows.length) throw new Error("The CSV file has no valid readings.");

      const labels = rows.map(row => row.timestamp.slice(11, 16));
      const temperatures = rows.map(row => Number(row.temperature_c));
      const humidities = rows.map(row => Number(row.humidity_percent));

      latestTemp.textContent = temperatures[temperatures.length - 1].toFixed(1) + " °C";
      latestHumidity.textContent = humidities[humidities.length - 1].toFixed(0) + " %";

      tableBody.innerHTML = rows.slice().reverse().map(row => `
        <tr>
          <td>${row.timestamp}</td>
          <td>${Number(row.temperature_c).toFixed(1)} °C</td>
          <td>${Number(row.humidity_percent).toFixed(0)} %</td>
        </tr>`).join("");

      drawLineChart(tempCanvas, labels, temperatures, "Temperature", "#dc2626", "°");
      drawLineChart(humidityCanvas, labels, humidities, "Humidity", "#2563eb", "%");
      status.textContent = `Loaded ${rows.length} sample readings. Demonstration data only.`;
    })
    .catch(error => {
      status.textContent = error.message + ". Check that dataset.csv is in the same folder as index.html.";
      status.style.color = "#b91c1c";
    });
})();
