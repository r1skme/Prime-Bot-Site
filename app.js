/* PRIME / Only progressive enhancement and a local, deterministic simulation.
   No backend calls, tracking, key inputs, dependencies or persistent storage. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.getElementById('main-nav');
  if (menuButton && nav) {
    const closeMenu = (restoreFocus = false) => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Открыть меню');
      nav.classList.remove('is-open');
      if (restoreFocus) menuButton.focus();
    };
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      nav.classList.toggle('is-open', open);
    });
    nav.addEventListener('click', event => {
      if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
    document.addEventListener('click', event => {
      if (!nav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
    });
    const desktopQuery = window.matchMedia('(min-width: 621px)');
    desktopQuery.addEventListener('change', event => { if (event.matches) closeMenu(); });
  }

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  const slider = document.getElementById('price-floor');
  const price = document.getElementById('demo-price');
  const output = document.getElementById('floor-output');
  const pill = document.getElementById('state-pill');
  const explainer = document.getElementById('demo-explainer');
  const buttons = [...document.querySelectorAll('[data-scenario]')];
  if (!slider || !price || !output || !pill || !explainer) return;

  // Illustrative, immutable inputs. These are NOT market quotes or bot results.
  const scenarios = Object.freeze({normal: {competitor: 1280}, dump: {competitor: 890}, rise: {competitor: 1590}});
  const previousPrice = 1480;
  const step = 1;
  const rubles = new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 0});
  const money = value => `${rubles.format(value)} ₽`;
  const chartY = value => Math.max(8, Math.min(103, 103 - (value - 700) / 10));
  let scenario = 'normal';

  function render() {
    const minimum = Math.min(1450, Math.max(900, Number(slider.value) || 1100));
    const competitor = scenarios[scenario].competitor;
    const candidate = competitor - step;
    // A below-minimum offer never drags the example's existing price down.
    const blocked = candidate < minimum;
    const result = blocked ? previousPrice : candidate;
    output.textContent = money(minimum);
    slider.setAttribute('aria-valuetext', money(minimum));
    price.replaceChildren(document.createTextNode(`${rubles.format(result)} `));
    const currency = document.createElement('span');
    currency.textContent = '₽';
    price.append(currency);
    pill.classList.toggle('is-protected', blocked);
    pill.textContent = blocked ? 'Лимит защищён ↗' : 'В рамках лимита ↗';
    explainer.textContent = blocked
      ? `Конкурент: ${money(competitor)}. Ниже твоего минимума. Сохраняем предыдущую цену ${money(previousPrice)}.`
      : `Конкурент: ${money(competitor)}. Ставим на ${money(step)} ниже, не нарушая твой минимум.`;
    buttons.forEach(button => {
      const active = button.dataset.scenario === scenario;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('active', active);
    });
    // Shared history, with a deliberately illustrative final market event.
    const history = 'M0 30 45 26 90 36 135 21 180 31 225 22 270 34';
    const line = `${history} 325 ${chartY(result)} 380 ${chartY(result)} 440 ${chartY(result)}`;
    document.getElementById('price-line')?.setAttribute('d', line);
    document.getElementById('chart-area')?.setAttribute('d', `${line}V112H0Z`);
    document.getElementById('market-line')?.setAttribute('d', `M0 41 45 31 90 43 135 28 180 43 225 30 270 36 325 ${chartY(competitor)} 380 ${chartY(competitor)} 440 ${chartY(competitor)}`);
    document.getElementById('price-point')?.setAttribute('cy', String(chartY(result)));
    const floorLine = document.getElementById('floor-line');
    floorLine?.setAttribute('y1', String(chartY(minimum)));
    floorLine?.setAttribute('y2', String(chartY(minimum)));
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    if (Object.hasOwn(scenarios, button.dataset.scenario)) {
      scenario = button.dataset.scenario;
      render();
    }
  }));
  slider.disabled = false;
  buttons.forEach(button => { button.disabled = false; });
  slider.addEventListener('input', render);
  render();
})();
