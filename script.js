let tempChart, linearChart;

function calculate() {
  const d = parseFloat(document.getElementById("diameter").value) / 1000; // м
  const L = parseFloat(document.getElementById("length").value) / 1000; // м
  const P = parseFloat(document.getElementById("power").value); // Вт
  const T0 = parseFloat(document.getElementById("ambientTemp").value); // °C

  const T_form = 400; // °C
  const T_restore = 40; // °C
  const rho = 6450; // кг/м³
  const c = 830; // Дж/(кг·К)
  const lambda = 18; // Вт/(м·К)
  const h = 10; // Вт/(м²·К)
  const latentHeat = 24000; // Дж/кг

  const V = Math.PI * (d / 2) ** 2 * L;
  const m = rho * V;
  const A = Math.PI * d * L;

  const dx = L / 100;
  const dt = 0.01;
  const alpha = lambda / (rho * c);
  let T = new Array(101).fill(T0);
  let t_heat = 0,
    t_cool = 0;
  let heating = true;
  let tempProfile = [];
  let linearData = [];

  const totalEnergy = m * c * (T_form - T0) + m * latentHeat;
  const heatTimeSteps = Math.ceil(totalEnergy / (P * dt));

  for (let t = 0; t < heatTimeSteps + 10000; t++) {
    let T_new = T.slice();
    let avgT = T.reduce((a, b) => a + b) / T.length;

    if (heating) {
      const dQ = P * dt;
      let dT = dQ / (m * c);
      if (avgT >= 30 && avgT < 40) dT = dQ / (m * (c + latentHeat / 10));

      for (let i = 1; i < T.length - 1; i++) {
        T_new[i] +=
          (alpha * dt * (T[i + 1] - 2 * T[i] + T[i - 1])) / (dx * dx) + dT;
      }

      T = T_new.slice();
      t_heat += dt;
      if (avgT >= T_form) heating = false;
    } else {
      for (let i = 1; i < T.length - 1; i++) {
        T_new[i] =
          T[i] +
          (alpha * dt * (T[i + 1] - 2 * T[i] + T[i - 1])) / (dx * dx) -
          (h * A * dt * (T[i] - T0)) / (m * c);
      }

      T = T_new.slice();
      t_cool += dt;
      if (avgT <= T0 + 5) break;
    }

    if (t % 100 === 0) {
      tempProfile.push({ time: t * dt, avgT });
    }
  }

  // Генерация данных для линейного графика
  const k = 0.1; // Коэффициент линейного роста температуры
  const maxLinearTime = heatTimeSteps * dt; // Максимальное время для линейного графика
  const linearStep = maxLinearTime / 100; // Шаг для генерации точек

  for (let t = 0; t <= maxLinearTime; t += linearStep) {
    const linearT = T0 + k * t; // Линейная зависимость
    if (linearT >= T0 && linearT <= T_form) {
      // Ограничиваем температуру разумными пределами
      linearData.push({ position: t, value: linearT });
    }
  }

  const t_restore = (m * c * (40 - T0) + m * latentHeat) / P;

  document.getElementById("results").innerHTML = `
          Время нагрева до фиксации формы (400°C): ${t_heat.toFixed(2)} с<br>
          Время остывания до ${T0 + 5}°C: ${t_cool.toFixed(2)} с<br>
          Время нагрева до восстановления формы (40°C): ${t_restore.toFixed(
            2
          )} с
        `;

  renderCharts(tempProfile, linearData);
}

function renderCharts(tempProfile, linearData) {
  const ctxTemp = document.getElementById("tempChart").getContext("2d");
  const ctxLinear = document.getElementById("linearChart").getContext("2d");

  if (tempChart) tempChart.destroy();
  if (linearChart) linearChart.destroy();

  tempChart = new Chart(ctxTemp, {
    type: "line",
    data: {
      labels: tempProfile.map((p) => p.time.toFixed(2)),
      datasets: [
        {
          label: "Средняя температура (°C)",
          data: tempProfile.map((p) => p.avgT),
          borderColor: "rgba(75, 192, 192, 1)",
          fill: false,
        },
      ],
    },
    options: {
      scales: {
        x: { title: { display: true, text: "Время (с)" } },
        y: { title: { display: true, text: "Температура (°C)" } },
      },
    },
  });

  linearChart = new Chart(ctxLinear, {
    type: "line",
    data: {
      labels: linearData.map((p) => p.position.toFixed(2)),
      datasets: [
        {
          label: "Линейная зависимость",
          data: linearData.map((p) => p.value),
          borderColor: "rgba(255, 99, 132, 1)",
          fill: false,
        },
      ],
    },
    options: {
      scales: {
        x: { title: { display: true, text: "Время (с)" } },
        y: { title: { display: true, text: "Значение (°C)" } },
      },
    },
  });
}
