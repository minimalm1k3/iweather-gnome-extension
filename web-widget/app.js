const ASSET_ROOT = './assets/weather-icons-figma/';

const weatherIcons = {
  clear: 'clear.png',
  partly: 'partly.png',
  cloudy: 'cloudy.png',
  rain: 'rain.png',
  storm: 'storm.png',
  snow: 'snow.png',
  fog: 'fog.png',
};

const hourlyForecast = [
  {time: 'Сейчас', temp: 20, condition: 'Пасмурно', icon: 'cloudy', wind: '2 м/с', uv: 4, rain: 45},
  {time: '13:00', temp: 20, condition: 'Пасмурно', icon: 'cloudy', wind: '1 м/с', uv: 3, rain: 50},
  {time: '14:00', temp: 20, condition: 'Пасмурно', icon: 'cloudy', wind: '1 м/с', uv: 3, rain: 45},
  {time: '15:00', temp: 19, condition: 'Гроза', icon: 'storm', wind: '1 м/с', uv: 3, rain: 40},
  {time: '16:00', temp: 18, condition: 'Гроза', icon: 'storm', wind: '1 м/с', uv: 2, rain: 45},
  {time: '17:00', temp: 18, condition: 'Пасмурно', icon: 'cloudy', wind: '1 м/с', uv: 1, rain: 33},
  {time: '18:00', temp: 17, condition: 'Дождь', icon: 'rain', wind: '1 м/с', uv: 1, rain: 28},
  {time: '19:00', temp: 16, condition: 'Дождь', icon: 'rain', wind: '1 м/с', uv: 0, rain: 18},
];

const dailyForecast = [
  {label: 'Сегодня', date: '4 сент.', condition: 'Гроза', icon: 'storm', low: 12, high: 20},
  {label: 'сб', date: '5 сент.', condition: 'Дождь', icon: 'rain', low: 14, high: 20},
  {label: 'вс', date: '6 сент.', condition: 'Пасмурно', icon: 'cloudy', low: 11, high: 18},
  {label: 'пн', date: '7 сент.', condition: 'Пасмурно', icon: 'cloudy', low: 9, high: 15},
  {label: 'вт', date: '8 сент.', condition: 'Пасмурно', icon: 'cloudy', low: 5, high: 12},
  {label: 'ср', date: '9 сент.', condition: 'Морось', icon: 'rain', low: 7, high: 13},
  {label: 'чт', date: '10 сент.', condition: 'Ясно', icon: 'clear', low: 8, high: 16},
  {label: 'пт', date: '11 сент.', condition: 'Ясно', icon: 'clear', low: 10, high: 18},
  {label: 'сб', date: '12 сент.', condition: 'Пасмурно', icon: 'partly', low: 11, high: 17},
  {label: 'вс', date: '13 сент.', condition: 'Дождь', icon: 'rain', low: 9, high: 14},
];

const walletOptions = [
  {id: 'usdt-erc20', label: 'USDT ERC20', icon: 'usdt.svg', address: '0x7Cd7E61342709759603fc23E9AE557bFeF48c0B4'},
  {id: 'usdt-tron', label: 'USDT Tron', icon: 'usdt.svg', address: 'TSXup7mXvWVZVKNkrnJRkpzpjGe3nZFks1'},
  {id: 'usdt-ton', label: 'USDT Ton', icon: 'usdt.svg', address: 'UQAcNYp_AAGerGRnNTUINWTCfSoQMYVVWqka-jVkowHsSn8j'},
  {id: 'eth', label: 'ETH', icon: 'eth.svg', address: '0x7Cd7E61342709759603fc23E9AE557bFeF48c0B4'},
  {id: 'btc', label: 'BTC', icon: 'btc.svg', address: 'bc1qz4y9uxs0gm50t0sy3jv2846j3s03g99p89h9cl'},
  {id: 'tron', label: 'TRON', icon: 'tron.svg', address: 'TSXup7mXvWVZVKNkrnJRkpzpjGe3nZFks1'},
  {id: 'gram', label: 'GRAM', icon: 'gram.svg', address: 'UQAcNYp_AAGerGRnNTUINWTCfSoQMYVVWqka-jVkowHsSn8j'},
  {id: 'solana', label: 'Solana', icon: 'solana.svg', address: '4W6rpXy5N4a8SotLuNsbLqy47RQXdg569B7eANMv4JrE'},
];

const state = {hourOffset: 0, selectedHour: 0, refreshedAt: null};
const visibleHours = 5;

const elements = {
  hourlyTrack: document.querySelector('#hourly-track'),
  hourlyPrev: document.querySelector('#hourly-prev'),
  hourlyNext: document.querySelector('#hourly-next'),
  dailyList: document.querySelector('#daily-list'),
  refreshButton: document.querySelector('#refresh-button'),
  walletButton: document.querySelector('#wallet-button'),
  walletPanel: document.querySelector('#wallet-panel'),
  walletList: document.querySelector('#wallet-list'),
  settingsButton: document.querySelector('#settings-button'),
  settingsHint: document.querySelector('#settings-hint'),
  status: document.querySelector('#widget-status'),
};

function iconPath(name) {
  return `${ASSET_ROOT}${weatherIcons[name] ?? weatherIcons.cloudy}`;
}

function renderWallet() {
  elements.walletList.replaceChildren();
  walletOptions.forEach((option) => {
    const item = document.createElement('details');
    item.className = 'wallet-item';
    item.innerHTML = `
      <summary>
        <img class="wallet-coin-icon" src="./assets/wallet/${option.icon}" alt="" />
        <span>${option.label}</span>
        <svg class="wallet-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m7 4 6 6-6 6" /></svg>
      </summary>
      <button class="wallet-address" type="button" data-wallet-id="${option.id}" aria-label="Скопировать адрес ${option.label}">
        <code>${option.address}</code>
        <svg class="copy-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="6.5" y="6.5" width="9" height="9" rx="1.5"/><path d="M4.5 13.5h-1v-9h9v1"/></svg>
        <span>Копировать</span>
      </button>
    `;
    elements.walletList.append(item);
  });
}

async function copyWalletAddress(button, option) {
  try {
    await navigator.clipboard.writeText(option.address);
  } catch {
    const input = document.createElement('textarea');
    input.value = option.address;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.append(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
  const label = button.querySelector('span');
  const previous = label.textContent;
  button.classList.add('is-copied');
  label.textContent = 'Скопировано';
  announce(`${option.label}: адрес скопирован`);
  window.setTimeout(() => {
    button.classList.remove('is-copied');
    label.textContent = previous;
  }, 1600);
}

function renderHourly() {
  elements.hourlyTrack.replaceChildren();
  hourlyForecast.forEach((hour, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `hour-card${index === state.selectedHour ? ' is-selected' : ''}`;
    button.setAttribute('aria-pressed', String(index === state.selectedHour));
    button.setAttribute('aria-label', `${hour.time}, ${hour.temp} градусов, ${hour.condition}`);
    button.innerHTML = `
      <span class="hour-time">${hour.time}</span>
      <img class="hour-icon" src="${iconPath(hour.icon)}" alt="" />
      <span class="hour-temperature">${hour.temp}°</span>
      <span class="hour-condition">${hour.condition}</span>
      <span class="hour-metric"><span class="metric-icon" aria-hidden="true">≋</span>${hour.wind}</span>
      <span class="hour-metric uv"><span class="metric-icon" aria-hidden="true">☼</span>УФ ${hour.uv}</span>
      <span class="hour-metric rain"><span class="metric-icon" aria-hidden="true">♧</span>${hour.rain}%</span>
    `;
    button.addEventListener('click', () => {
      state.selectedHour = index;
      renderHourly();
      announce(`Выбрано: ${hour.time}, ${hour.temp} градусов, ${hour.condition}`);
    });
    elements.hourlyTrack.append(button);
  });

  const cardPitch = 75;
  elements.hourlyTrack.style.transform = `translateX(-${state.hourOffset * cardPitch}px)`;
  elements.hourlyPrev.disabled = state.hourOffset === 0;
  elements.hourlyNext.disabled = state.hourOffset >= hourlyForecast.length - visibleHours;
}

function renderDaily() {
  const lows = dailyForecast.map((day) => day.low);
  const highs = dailyForecast.map((day) => day.high);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const span = Math.max(1, max - min);

  elements.dailyList.replaceChildren();
  const list = document.createElement('div');
  list.className = 'daily-list';

  dailyForecast.forEach((day, index) => {
    const start = ((day.low - min) / span) * 100;
    const end = ((day.high - min) / span) * 100;
    const row = document.createElement('article');
    row.className = 'day-row';
    row.innerHTML = `
      <div class="day-copy"><div class="day-label">${day.label}</div><div class="day-date">${day.date}</div></div>
      <img class="day-icon" src="${iconPath(day.icon)}" alt="${day.condition}" />
      <div class="day-condition">${day.condition}</div>
      <div class="day-range" aria-label="от ${day.low} до ${day.high} градусов">
        <span class="day-low">${day.low}°</span>
        <span class="range-track"><span class="range-fill" style="left:${start}%; right:${100 - end}%"></span><span class="range-point" style="left:${end}%"></span></span>
        <span class="day-high">${day.high}°</span>
      </div>
    `;
    if (index === 0) row.dataset.today = 'true';
    list.append(row);
  });

  elements.dailyList.append(list);
}

function announce(message) {
  elements.status.textContent = message;
}

elements.hourlyPrev.addEventListener('click', () => {
  state.hourOffset = Math.max(0, state.hourOffset - 1);
  renderHourly();
  announce('Показаны предыдущие часы');
});

elements.hourlyNext.addEventListener('click', () => {
  state.hourOffset = Math.min(hourlyForecast.length - visibleHours, state.hourOffset + 1);
  renderHourly();
  announce('Показаны следующие часы');
});

elements.refreshButton.addEventListener('click', () => {
  elements.refreshButton.disabled = true;
  announce('Прогноз обновляется');
  window.setTimeout(() => {
    state.refreshedAt = new Date();
    elements.refreshButton.disabled = false;
    announce(`Прогноз обновлён в ${state.refreshedAt.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}`);
  }, 700);
});

elements.settingsButton.addEventListener('click', () => {
  const isHidden = elements.settingsHint.hidden;
  elements.settingsHint.hidden = !isHidden;
  elements.settingsButton.setAttribute('aria-expanded', String(isHidden));
  announce(isHidden ? 'Подсказка по настройке виджета открыта' : 'Подсказка по настройке виджета закрыта');
});

elements.walletButton.addEventListener('click', () => {
  const opening = elements.walletPanel.hidden;
  elements.walletPanel.hidden = !opening;
  elements.walletButton.classList.toggle('is-active', opening);
  elements.walletButton.setAttribute('aria-expanded', String(opening));
  document.querySelectorAll('.current-weather, .forecast-section').forEach((section) => {
    section.hidden = opening;
  });
  announce(opening ? 'Кошелёк открыт' : 'Кошелёк закрыт');
});

elements.walletList.addEventListener('click', (event) => {
  const button = event.target.closest('.wallet-address');
  if (!button) return;
  const option = walletOptions.find((candidate) => candidate.id === button.dataset.walletId);
  if (option) void copyWalletAddress(button, option);
});

renderWallet();
renderHourly();
renderDaily();
