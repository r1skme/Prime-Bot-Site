/* PRIME interactive product tour. Local state only. Never connects to a market,
   Telegram, payment service or account. Monetary values are integer kopecks. */
(() => {
  'use strict';
  const root = document.getElementById('market-app');
  if (!root) return;
  const storageKey = 'prime.workspace.v4';
  const snapshot = '2026-09-22T13:30:00+03:00';
  const money = n => (n / 100).toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' ₽';
  const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clock = ts => new Date(ts).toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'});
  const paths = {
    home:'M3 10 12 3l9 7v11H3Z M9 21V12h6v9', box:'m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 4 9-4m-9 4v10M7 5l10 4',
    swap:'M3 7h17m-5-5 5 5-5 5M21 17H4m5-5-5 5 5 5', chart:'M4 20V4m0 16h17M8 16v-5m5 5V8m5 8V5',
    settings:'M3 7h18M3 17h18M8 4v6m8 4v6', search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    refresh:'M20 7A8 8 0 0 0 6 5L3 8m0-5v5h5m-4 9a8 8 0 0 0 14 2l3-3m0 5v-5h-5', sun:'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    info:'M12 11v6m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', expand:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5', close:'m6 6 12 12M6 18 18 6',
    arrow:'M5 12h14m-6-6 6 6-6 6', download:'M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6', bell:'M5 16V9a7 7 0 0 1 14 0v7l2 3H3Zm5 6h4', shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Zm-4 9 3 3 5-6', reset:'M3 10a9 9 0 1 1 3 9M3 3v7h7', check:'m5 12 4 4L19 6', user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M3 21v-3c0-7 18-7 18 0v3'
  };
  const icon = name => `<svg class="mc-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name] || paths.arrow}"/></svg>`;
  let weaponSeq=0;
  const weapon = (color='gold') => {const uid='rifle-'+(++weaponSeq);return `<svg class="weapon-art ${color}" viewBox="0 0 520 145" aria-hidden="true"><defs><linearGradient id="${uid}" x2="0.6" y2="1"><stop stop-color="#737c7d"/><stop offset=".28" stop-color="#373d3e"/><stop offset="1" stop-color="#111718"/></linearGradient><linearGradient id="${uid}-metal" x2="0" y2="1"><stop stop-color="#8d9597"/><stop offset=".4" stop-color="#41494c"/><stop offset=".7" stop-color="#121718"/><stop offset="1" stop-color="#6b7678"/></linearGradient></defs><path d="M313 52h185v7H313zM493 50h17v12h-17z" fill="url(#${uid}-metal)"/><path d="m27 63 27-15 80 5 39 7h149l15 9-37 17-40 2-26-3-13 11h-33l-6-17-21 2-9 36h-15l2-42-45 6-63 27-12-5z" fill="url(#${uid})" stroke="#71807c" stroke-width="1.4"/><path d="m30 70 24-12 76 5 41 8h123l-34 10-37-5-36 11-9-13-35 0-27-2-49 10-45 16z" fill="currentColor" opacity=".45"/><path d="m74 63 18 13-30 8M126 67l-9 7 9 10m26-11 9-6m56 5 26 6 28-8" fill="none" stroke="currentColor" stroke-width="2.5" opacity=".8"/><path d="M181 54h94v7h-94M226 85h24v20h-24" fill="#282e30" stroke="#6a7777"/><rect x="190" y="25" width="83" height="14" rx="5" fill="url(#${uid}-metal)"/><path d="M190 23h12v18h-12zm73 0h15v18h-15z" fill="#464e51" stroke="#8e999c" stroke-width="1"/><path d="M211 39v17m42-17v17" stroke="#8b9495" stroke-width="5"/><path d="m308 80-16 47m17-47 26 42" fill="none" stroke="#5e696b" stroke-width="4"/><path d="m176 86-2 11h29l7-12M22 62l-6 43M283 64h11" fill="none" stroke="#161e20" stroke-width="3"/><path d="M336 53h151M193 28h68" stroke="#bec8c9" opacity=".8"/></svg>`;};
  const item = (id,skin,wear,price,floor,color) => ({id,skin,wear,price,floor,color,auto:true,history:[{price,ts:snapshot}]});
  function seed() {
    return {version:4, items:[item('001','Black Nile','Field-Tested',22944,20000,'gold'),item('002','Black Nile','Field-Tested',22944,20000,'gold'),item('003','Ice Coaled','Battle-Scarred',35479,32000,'mint'),item('004','Exothermic','Battle-Scarred',22082,20000,'purple'),item('005','Black Nile','Field-Tested',22944,20000,'gold'),item('006','Exothermic','Battle-Scarred',22082,20000,'purple')],
      trades:[{id:'S01',skin:'Exothermic',amount:22082,received:20977,ts:'2026-09-22T13:43:00+03:00',type:'sale'},{id:'S02',skin:'Ice Coaled',amount:35479,received:33705,ts:'2026-09-22T13:36:00+03:00',type:'sale'},{id:'S03',skin:'Exothermic',amount:22082,received:20977,ts:'2026-09-22T13:31:00+03:00',type:'sale'},{id:'S04',skin:'Ice Coaled',amount:35479,received:33705,ts:'2026-09-22T13:31:00+03:00',type:'sale'}],
      logs:[],preferences:{theme:'dark',name:'Трейдер',autoPricing:true,notifications:true,interval:15}};
  }
  // Stored content is untrusted. Validate values instead of injecting stored HTML.
  function restore() {
    const fresh = seed();
    try {
      const saved=JSON.parse(sessionStorage.getItem(storageKey));
      if (!saved || saved.version!==4 || !Array.isArray(saved.items)) return fresh;
      fresh.items=fresh.items.map(i=>{
        const s=saved.items.find(x=>x&&x.id===i.id);
        if(!s||!Number.isInteger(s.price)||!Number.isInteger(s.floor)||s.floor<1||s.floor>s.price||s.price>100000000) return i;
        const history=Array.isArray(s.history)?s.history.filter(h=>h&&Number.isInteger(h.price)&&h.price>0&&h.price<=100000000&&Number.isFinite(Date.parse(h.ts))).slice(-120):[];
        return {...i,price:s.price,floor:s.floor,auto:typeof s.auto==='boolean'?s.auto:true,history:history.length?history:[{price:s.price,ts:snapshot}]};
      });
      const p=saved.preferences||{};
      fresh.preferences={theme:p.theme==='light'?'light':'dark',name:typeof p.name==='string'?p.name.trim().slice(0,24)||'Трейдер':'Трейдер',autoPricing:p.autoPricing!==false,notifications:p.notifications!==false,interval:[15,30,60].includes(p.interval)?p.interval:15};
      fresh.logs=Array.isArray(saved.logs)?saved.logs.filter(l=>l&&typeof l.text==='string'&&Number.isFinite(Date.parse(l.ts))).slice(0,100).map(l=>({text:l.text.slice(0,160),ts:l.ts})):[];
    } catch (_) { /* Private mode or invalid state: use in-memory defaults. */ }
    return fresh;
  }
  let state=restore(),view='overview',selected='001',query='',sort='name',step=1,pricePeriod='all',tradeType='all',tradeQuery='',analyticsTab='stats',analyticsPeriod=7,chartMetric='count',expanded=false;
  let toastTimer,modalReturnFocus;
  const views={overview:['Обзор','home'],products:['Товары','box'],trades:['Сделки','swap'],analytics:['Аналитика','chart'],settings:['Настройки','settings']};
  const persist=()=>{try{sessionStorage.setItem(storageKey,JSON.stringify(state));}catch(_){/* No network fallback. */}};
  const addLog=text=>{state.logs.unshift({text,ts:new Date().toISOString()});state.logs=state.logs.slice(0,100);persist();};
  const getItem=()=>state.items.find(i=>i.id===selected)||state.items[0];
  const total=(rows,key)=>rows.reduce((n,r)=>n+r[key],0);
  const action=(name,label,extra='')=>`<button class="mc-icon-button" type="button" data-action="${name}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${icon(name)}</button>`;
  const toggle=(key,value,label,itemSpecific=false)=>`<button class="mc-switch" type="button" role="switch" aria-checked="${value}" aria-label="${esc(label)}" ${itemSpecific?'data-item-toggle':'data-setting="'+key+'"'}><span></span></button>`;
  function shell() {
    root.innerHTML=`<div class="mc-topbar"><span class="mc-title">Market Center</span><button class="mc-mode" type="button" data-action="info">В браузере ${icon('info')}</button><div class="mc-window-actions">${action('expand','Развернуть приложение')}${action('close','Закрыть приложение')}</div></div><div class="mc-layout"><aside class="mc-sidebar"><button class="mc-logo" data-view="overview" type="button" aria-label="Главная PRIME">PR<span>I</span>ME</button><nav class="mc-nav" aria-label="Разделы приложения">${Object.entries(views).map(([id,[label,ico]])=>`<button type="button" data-view="${id}">${icon(ico)}<span>${label}</span></button>`).join('')}</nav><button type="button" class="mc-profile" data-view="settings"><span class="mc-avatar"></span><strong></strong>${icon('settings')}</button></aside><section class="mc-main" aria-label="Рабочая область"></section></div><div class="mc-toast" role="status" aria-live="polite" hidden></div>`;
  }
  function toolbar(extra='') {
    return `<div class="mc-page-heading"><h3 id="mc-heading" tabindex="-1">${views[view][0]}</h3><div class="mc-toolbar">${extra}${action('refresh','Обновить локальные данные')}${action('sun','Сменить тему')}</div></div>`;
  }
  function metrics(rows) {return `<div class="mc-metrics">${rows.map(([label,value,sub])=>`<div><span>${label}</span><strong>${value}</strong>${sub?`<small>${sub}</small>`:''}</div>`).join('')}</div>`;}
  function saleRow(t) {
    return `<div class="mc-event"><span class="mc-event-icon">${icon('swap')}</span><div><strong>Предмет продан</strong><p>AWP | ${esc(t.skin)}</p></div><div class="mc-event-end"><b>${money(t.amount)}</b><time datetime="${t.ts}">${clock(t.ts)}</time></div></div>`;
  }
  function renderOverview() {
    return toolbar()+metrics([['Товары',state.items.length],['Продажи',state.trades.length],['Получено',money(total(state.trades,'received'))],['Покупки','0']])+`<div class="mc-overview-panels"><div class="mc-panel"><div class="mc-panel-head"><h4>Последние события</h4><button class="mc-text-button" type="button" data-view="trades">Все сделки ${icon('arrow')}</button></div>${state.logs.slice(0,1).map(l=>`<div class="mc-event"><span class="mc-event-icon purple">${icon('settings')}</span><div><strong>${esc(l.text)}</strong><p>Сохранено в браузере</p></div><time>${clock(l.ts)}</time></div>`).join('')}${state.trades.map(saleRow).join('')}</div><div class="mc-panel mc-control-panel"><div class="mc-panel-head"><h4>Твои правила</h4>${icon('shield')}</div><div class="mc-setting-row"><span>Автоцена</span>${toggle('autoPricing',state.preferences.autoPricing,'Автоцена')}</div><div class="mc-setting-row"><span>Уведомления</span>${toggle('notifications',state.preferences.notifications,'Уведомления')}</div><div class="mc-setting-row"><span>Интервал</span><b>${state.preferences.interval} сек.</b></div><button class="mc-button mc-primary mc-wide" data-view="products" type="button">К товарам ${icon('arrow')}</button></div></div><div class="mc-bottom-note">Данные экрана от 22 сентября <button type="button" data-action="reset">Сбросить изменения</button></div>`;
  }
  function filteredItems() {
    const q=query.trim().toLocaleLowerCase('ru');
    return state.items.filter(i=>('AWP '+i.skin+' '+i.wear+' '+i.id).toLocaleLowerCase('ru').includes(q)).sort((a,b)=>sort==='low'?a.price-b.price:sort==='high'?b.price-a.price:a.skin.localeCompare(b.skin)||a.id.localeCompare(b.id));
  }
  function itemList() {
    const items=filteredItems();
    return items.length?items.map(i=>`<button class="mc-item ${i.id===selected?'selected':''}" data-select="${i.id}" type="button" aria-pressed="${i.id===selected}"><span class="mc-skin ${i.color}">${weapon(i.color)}</span><span class="mc-item-copy"><strong>AWP | ${esc(i.skin)}</strong><small>${esc(i.wear)} <span>/ ${i.id}</span></small><b>${money(i.price)}</b></span></button>`).join(''):`<div class="mc-empty">Ничего не найдено.<button class="mc-text-button" type="button" data-action="clear">Очистить поиск</button></div>`;
  }
  function chartHistory(i) {
    const h=pricePeriod==='all'?i.history:i.history.filter(h=>Date.parse(h.ts)>=Date.now()-Number(pricePeriod)*3600000);
    if(!h.length) return `<div class="mc-chart-empty">За этот период изменений нет.</div>`;
    const lo=Math.min(i.floor,...h.map(h=>h.price))*.96,hi=Math.max(...h.map(h=>h.price))*1.04;
    const y=p=>140-(p-lo)/(hi-lo||1)*112;
    const points=h.map((point,n)=>`${h.length===1?8:8+n/(h.length-1)*384},${y(point.price).toFixed(2)}`);
    if(h.length===1) points.push(`392,${y(h[0].price).toFixed(2)}`);
    const floor=y(i.floor).toFixed(2);
    return `<svg class="mc-price-chart" viewBox="0 0 400 165" preserveAspectRatio="none" role="img" aria-label="История цены, ${h.length} записей. Последняя цена ${money(i.price)}"><path d="M8 32H392M8 85H392M8 138H392" class="mc-chart-grid"/><path d="M8 ${floor}H392" class="mc-chart-floor"/><polyline points="${points.join(' ')}" class="mc-chart-line"/><circle cx="392" cy="${y(h[h.length-1].price)}" r="3.5" fill="currentColor"/></svg><div class="mc-chart-caption"><span>${h.length===1?'Цена не менялась':h.length+' записей'}</span><span>Минимум ${money(i.floor)}</span></div>`;
  }
  function detail() {
    const i=getItem();
    return `<div class="mc-detail-heading"><div><h4>AWP | ${esc(i.skin)}</h4><span>${esc(i.wear)} / ${i.id}</span></div><button type="button" class="mc-button mc-primary" data-action="price">Изменить цену</button></div><div class="mc-item-hero ${i.color}">${weapon(i.color)}</div><div class="mc-item-stats"><div><span>Твоя цена</span><strong>${money(i.price)}</strong></div><div><span>Нижняя граница</span><button class="mc-price-floor" data-action="floor" type="button" aria-label="Изменить минимальную цену">${money(i.floor)} <span>↗</span></button></div><div><span>Автоцена</span>${toggle('',i.auto,'Автоцена предмета',true)}</div></div><div class="mc-step-row"><span>Шаг цены</span><div class="mc-segments" role="group" aria-label="Шаг цены">${[1,5,50].map(n=>`<button type="button" data-step="${n}" aria-pressed="${step===n}">${(n/100).toLocaleString('ru-RU')}</button>`).join('')}</div><div class="mc-step-buttons"><button type="button" data-adjust="-1" aria-label="Уменьшить цену на выбранный шаг">−</button><button type="button" data-adjust="1" aria-label="Увеличить цену на выбранный шаг">+</button></div></div><div class="mc-history-head"><h4>История цены</h4><div class="mc-segments" role="group" aria-label="Период истории">${[['1','1 ч'],['6','6 ч'],['24','24 ч'],['168','7 д'],['all','Всё']].map(([n,label])=>`<button type="button" data-price-period="${n}" aria-pressed="${pricePeriod===n}">${label}</button>`).join('')}</div></div>${chartHistory(i)}`;
  }
  function renderProducts() {
    return toolbar()+`<div class="mc-products"><div class="mc-product-list"><div class="mc-list-title"><h4>Твои товары</h4><span id="mc-item-count">${filteredItems().length}</span></div><label class="mc-search">${icon('search')}<input type="search" id="mc-search" aria-label="Найти товар" placeholder="Найти товар" value="${esc(query)}" autocomplete="off"></label><select id="mc-sort" aria-label="Порядок товаров"><option value="name" ${sort==='name'?'selected':''}>По названию</option><option value="low" ${sort==='low'?'selected':''}>Сначала дешевле</option><option value="high" ${sort==='high'?'selected':''}>Сначала дороже</option></select><div id="mc-items">${itemList()}</div></div><div class="mc-detail">${detail()}</div></div>`;
  }
  function filteredTrades() {
    return state.trades.filter(t=>(tradeType==='all'||t.type===tradeType)&&('AWP '+t.skin).toLowerCase().includes(tradeQuery.trim().toLowerCase()));
  }
  function tradesContent() {
    const rows=filteredTrades();
    return `<div class="mc-table-scroll"><table><thead><tr><th scope="col">Предмет</th><th scope="col">Событие</th><th scope="col">Сумма</th><th scope="col">Получено</th><th scope="col">Время</th></tr></thead><tbody>${rows.map(t=>`<tr><td><strong>AWP | ${esc(t.skin)}</strong><small>Battle-Scarred</small></td><td><span class="mc-sale-tag">Продажа</span></td><td>${money(t.amount)}</td><td>${money(t.received)}</td><td>22.09, ${clock(t.ts)}</td></tr>`).join('')}</tbody></table></div>${!rows.length?'<div class="mc-empty">Сделок по этим условиям нет.</div>':''}<div class="mc-table-total"><span>${rows.length} сделки</span><span>Получено <b>${money(total(rows,'received'))}</b></span></div>`;
  }
  function renderTrades() {
    return toolbar(`<button class="mc-button" type="button" data-action="download">${icon('download')} CSV</button>`)+`<div class="mc-list-tools"><div class="mc-segments" role="group" aria-label="Тип сделки">${[['all','Все'],['sale','Продажи'],['purchase','Покупки']].map(([id,label])=>`<button type="button" data-trade-type="${id}" aria-pressed="${tradeType===id}">${label}</button>`).join('')}</div><label class="mc-search">${icon('search')}<input type="search" id="mc-trade-search" aria-label="Найти сделку" placeholder="Найти сделку" value="${esc(tradeQuery)}"></label></div><div class="mc-panel" id="mc-trade-table">${tradesContent()}</div>`;
  }
  function periodTrades() {
    // Periods belong to the dated screenshot, not live account statistics.
    const end=Date.parse('2026-09-23T00:00:00+03:00');
    return state.trades.filter(t=>Date.parse(t.ts)>=end-analyticsPeriod*86400000&&Date.parse(t.ts)<end);
  }
  function analyticsChart(rows) {
    const groups={};rows.forEach(t=>{groups[t.skin]=(groups[t.skin]||0)+(chartMetric==='count'?1:t.amount);});
    const max=Math.max(1,...Object.values(groups));
    return `<div class="mc-operation-bars" role="img" aria-label="${esc(Object.entries(groups).map(([k,v])=>k+': '+(chartMetric==='count'?v:money(v))).join(', '))}">${Object.entries(groups).map(([k,v])=>`<div><span>${chartMetric==='count'?v:money(v)}</span><i style="--bar:${Math.max(3,v/max*100)}%"></i><small>${esc(k)}</small></div>`).join('')}</div>`;
  }
  function renderAnalytics() {
    const rows=periodTrades();
    const logRows=state.logs.map(l=>`<div class="mc-log-row">${icon('settings')}<span>${esc(l.text)}</span><time>${clock(l.ts)}</time></div>`).join('');
    return toolbar()+`<div class="mc-list-tools"><div class="mc-segments" role="group" aria-label="Раздел аналитики">${[['stats','Статистика'],['logs','Журнал']].map(([id,label])=>`<button type="button" data-analytics-tab="${id}" aria-pressed="${analyticsTab===id}">${label}</button>`).join('')}</div><div class="mc-segments" role="group" aria-label="Период аналитики">${[[1,'Сегодня'],[7,'7 дней'],[30,'30 дней']].map(([id,label])=>`<button type="button" data-period="${id}" aria-pressed="${analyticsPeriod===id}">${label}</button>`).join('')}</div></div>${analyticsTab==='logs'?`<div class="mc-panel mc-log-panel"><h4>Действия в этом просмотре</h4>${logRows||'<div class="mc-empty">Здесь появятся твои изменения цен и настроек.</div>'}</div>`:metrics([['Продажи',rows.length],['Оборот',money(total(rows,'amount'))],['Получено',money(total(rows,'received'))],['Покупки','0']])+`<div class="mc-overview-panels"><div class="mc-panel"><div class="mc-panel-head"><h4>По предметам</h4><select id="mc-chart-metric" aria-label="Метрика графика"><option value="count" ${chartMetric==='count'?'selected':''}>Количество</option><option value="amount" ${chartMetric==='amount'?'selected':''}>Сумма</option></select></div>${analyticsChart(rows)}</div><div class="mc-panel mc-analytics-summary"><h4>Сводка</h4><div class="mc-summary-row"><span>Средняя продажа</span><b>${money(rows.length?Math.round(total(rows,'amount')/rows.length):0)}</b></div><div class="mc-summary-row"><span>Разница сумм</span><b>${money(total(rows,'amount')-total(rows,'received'))}</b></div><div class="mc-summary-row"><span>Предметов продано</span><b>${rows.length}</b></div><button class="mc-button mc-wide" type="button" data-action="download">${icon('download')} Скачать сделки</button></div></div><div class="mc-bottom-note">Период заканчивается 22 сентября. Показатели рассчитаны по сделкам в просмотре.</div>`}`;
  }
  function renderSettings() {
    const p=state.preferences;
    return toolbar()+`<div class="mc-settings-grid"><div class="mc-panel mc-settings-card"><h4>Профиль</h4><form id="mc-profile-form"><label for="mc-name">Как к тебе обращаться</label><div class="mc-inline-form"><input id="mc-name" name="name" value="${esc(p.name)}" maxlength="24" required autocomplete="off"><button class="mc-button" type="submit">Сохранить</button></div></form><div class="mc-setting-row"><span>Тема</span><div class="mc-segments" role="group" aria-label="Тема приложения"><button type="button" data-theme="dark" aria-pressed="${p.theme==='dark'}">Тёмная</button><button type="button" data-theme="light" aria-pressed="${p.theme==='light'}">Светлая</button></div></div></div><div class="mc-panel mc-settings-card"><h4>Автоматизация</h4><div class="mc-setting-row"><span>Автоцена</span>${toggle('autoPricing',p.autoPricing,'Автоцена')}</div><label class="mc-setting-row" for="mc-interval"><span>Интервал проверки</span><select id="mc-interval">${[[15,'15 секунд'],[30,'30 секунд'],[60,'1 минута']].map(([n,label])=>`<option value="${n}" ${p.interval===n?'selected':''}>${label}</option>`).join('')}</select></label></div><div class="mc-panel mc-settings-card"><h4>Уведомления</h4><div class="mc-setting-row"><span>Уведомления о событиях</span>${toggle('notifications',p.notifications,'Уведомления о событиях')}</div><button class="mc-button mc-wide" type="button" data-action="bell" ${p.notifications?'':'disabled'}>${icon('bell')} Посмотреть уведомление</button></div><div class="mc-panel mc-settings-card"><h4>Этот просмотр</h4><p>Цены и настройки остаются в этой вкладке. Аккаунт и рынок не подключены.</p><button class="mc-button mc-wide" type="button" data-action="reset">${icon('reset')} Сбросить изменения</button></div></div>`;
  }
  function render(focusHeading=false) {
    root.dataset.theme=state.preferences.theme;
    root.querySelector('.mc-main').innerHTML=({overview:renderOverview,products:renderProducts,trades:renderTrades,analytics:renderAnalytics,settings:renderSettings}[view])();
    root.querySelectorAll('.mc-nav [data-view]').forEach(b=>{if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    root.querySelector('.mc-profile strong').textContent=state.preferences.name;
    root.querySelector('.mc-avatar').textContent=Array.from(state.preferences.name)[0].toUpperCase();
    root.querySelector('[data-action="expand"]').hidden=expanded;
    root.querySelector('[data-action="close"]').hidden=!expanded;
    if(focusHeading)root.querySelector('#mc-heading').focus({preventScroll:true});
  }
  function navigate(next,focus=true) {
    if(!Object.hasOwn(views,next))return;
    view=next;render(focus);root.querySelector('.mc-main').scrollTop=0;
    root.dispatchEvent(new CustomEvent('prime:view',{bubbles:true,detail:{view}}));
  }
  function toast(text) {
    const el=root.querySelector('.mc-toast');clearTimeout(toastTimer);el.textContent=text;el.hidden=false;
    toastTimer=setTimeout(()=>{el.hidden=true;},4200);
  }
  const modal=document.getElementById('workspace-dialog');
  function closeModal() {if(modal.open)modal.close();}
  modal.addEventListener('close',()=>{if(modalReturnFocus&&modalReturnFocus.isConnected)modalReturnFocus.focus({preventScroll:true});else root.querySelector('#mc-heading')?.focus({preventScroll:true});});
  modal.addEventListener('click',e=>{if(e.target.closest('[data-modal-close]'))closeModal();else if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
  function showModal(title,body) {
    modalReturnFocus=document.activeElement;
    document.getElementById('workspace-dialog-content').innerHTML=`<div class="workspace-dialog-content"><div class="dialog-head"><h2 id="workspace-dialog-title">${title}</h2><button class="icon-button" type="button" aria-label="Закрыть" data-modal-close>${icon('close')}</button></div>${body}</div>`;
    modal.showModal();
  }
  function parsePrice(raw) {
    const s=String(raw).trim().replace(/\s/g,'').replace(',','.');
    if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(s))return null;
    const [whole,frac='']=s.split('.'),cents=Number(whole)*100+Number(frac.padEnd(2,'0'));
    return cents>=1&&cents<=100000000?cents:null;
  }
  function setPrice(i,value) {
    if(!Number.isInteger(value)||value<i.floor||value>100000000){toast('Цена должна быть не ниже '+money(i.floor));return false;}
    if(i.price===value){toast('Цена не изменилась');return true;}
    const old=i.price;i.price=value;i.history.push({price:value,ts:new Date().toISOString()});i.history=i.history.slice(-120);
    addLog(`AWP | ${i.skin}: ${money(old)} → ${money(value)}`);persist();render();toast('Цена сохранена в браузере');return true;
  }
  function priceModal(isFloor=false) {
    const i=getItem();
    showModal(isFloor?'Нижняя граница':'Изменить цену',`<p class="dialog-item">AWP | ${esc(i.skin)} / ${i.id}</p><form id="mc-price-form"><label for="mc-price-input">${isFloor?'Минимальная цена':'Новая цена'}, ₽</label><input id="mc-price-input" name="price" inputmode="decimal" autocomplete="off" required value="${((isFloor?i.floor:i.price)/100).toFixed(2)}" aria-describedby="mc-price-error"><p id="mc-price-error" class="field-error" role="alert"></p><p class="dialog-muted">${isFloor?'Не выше текущей цены '+money(i.price):'Не ниже '+money(i.floor)}. Изменение только в этом просмотре.</p><div class="dialog-actions"><button class="mc-button" type="button" data-modal-close>Отмена</button><button class="mc-button mc-primary" type="submit">Сохранить</button></div></form>`);
    const input=modal.querySelector('input');input.focus();input.select();
    modal.querySelector('form').addEventListener('submit',e=>{
      e.preventDefault();const n=parsePrice(input.value),error=modal.querySelector('#mc-price-error');
      if(n===null){error.textContent='Введи сумму от 0,01 до 1 000 000 ₽, не больше двух знаков после запятой.';input.setAttribute('aria-invalid','true');return;}
      if(isFloor?n>i.price:n<i.floor){error.textContent=isFloor?'Минимум не может быть выше текущей цены.':'Цена ниже твоей границы: '+money(i.floor);input.setAttribute('aria-invalid','true');return;}
      if(isFloor){i.floor=n;addLog(`Нижняя граница AWP | ${i.skin}: ${money(n)}`);persist();render();toast('Нижняя граница сохранена');}else setPrice(i,n);
      closeModal();
    });
  }
  function exportCSV() {
    const rows=view==='analytics'?periodTrades():view==='trades'?filteredTrades():state.trades;
    const cell=v=>'"'+String(v).replace(/"/g,'""')+'"';
    const lines=[['Дата','Предмет','Тип','Сумма, ₽','Получено, ₽'],...rows.map(t=>[t.ts,'AWP | '+t.skin,'Продажа',(t.amount/100).toFixed(2),(t.received/100).toFixed(2)])];
    const blob=new Blob(['\uFEFF'+lines.map(row=>row.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='PRIME-trades.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);toast('CSV подготовлен: '+rows.length+' сделки');
  }
  function resetModal() {
    showModal('Начать заново?',`<p class="dialog-text">Вернуть исходные цены, профиль и настройки этого просмотра? Реальные аккаунты это не затронет.</p><div class="dialog-actions"><button class="mc-button" data-modal-close type="button">Отмена</button><button class="mc-button mc-primary" id="mc-confirm-reset" type="button">Сбросить</button></div>`);
    modal.querySelector('#mc-confirm-reset').addEventListener('click',()=>{state=seed();selected='001';query='';sort='name';tradeQuery='';tradeType='all';step=1;pricePeriod='all';analyticsTab='stats';analyticsPeriod=7;chartMetric='count';persist();render();closeModal();toast('Исходные данные восстановлены');});
  }
  root.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.view)return navigate(b.dataset.view);
    if(b.dataset.select){selected=b.dataset.select;render();if(root.clientWidth<640)root.querySelector('.mc-detail').scrollIntoView({block:'nearest',behavior:'auto'});return;}
    if(b.dataset.setting){const k=b.dataset.setting;if(!['autoPricing','notifications'].includes(k))return;state.preferences[k]=!state.preferences[k];addLog((k==='autoPricing'?'Автоцена':'Уведомления')+(state.preferences[k]?' включены':' отключены'));render();return;}
    if(b.hasAttribute('data-item-toggle')){const i=getItem();i.auto=!i.auto;addLog(`Автоцена AWP | ${i.skin}: ${i.auto?'включена':'отключена'}`);render();return;}
    if(b.dataset.step){step=Number(b.dataset.step);render();return;}
    if(b.dataset.adjust){setPrice(getItem(),getItem().price+Number(b.dataset.adjust)*step);return;}
    if(b.dataset.pricePeriod){pricePeriod=b.dataset.pricePeriod;render();return;}
    if(b.dataset.tradeType){tradeType=b.dataset.tradeType;render();return;}
    if(b.dataset.analyticsTab){analyticsTab=b.dataset.analyticsTab;render();return;}
    if(b.dataset.period){analyticsPeriod=Number(b.dataset.period);render();return;}
    if(b.dataset.theme){state.preferences.theme=b.dataset.theme;persist();render();return;}
    const a=b.dataset.action;
    if(a==='price')priceModal();
    else if(a==='floor')priceModal(true);
    else if(a==='expand')root.dispatchEvent(new CustomEvent('prime:expand',{bubbles:true}));
    else if(a==='close')root.dispatchEvent(new CustomEvent('prime:close',{bubbles:true}));
    else if(a==='sun'){state.preferences.theme=state.preferences.theme==='dark'?'light':'dark';persist();render();}
    else if(a==='refresh'){render();toast('Локальные данные обновлены');}
    else if(a==='download')exportCSV();
    else if(a==='reset')resetModal();
    else if(a==='clear'){query='';render();root.querySelector('#mc-search').focus();}
    else if(a==='bell'){toast('Предмет продан / AWP | Ice Coaled / 354,79 ₽');}
    else if(a==='info')showModal('PRIME в браузере',`<p class="dialog-text">Это интерактивный просмотр приложения. Исходные названия и суммы взяты из предоставленных экранов PRIME; набор товаров сокращён для знакомства с интерфейсом.</p><p class="dialog-text" style="margin-top:16px">Цены, история и настройки меняются только в этой вкладке. Нет входа в аккаунт, запросов к торговой площадке и отправки сообщений в Telegram. Кнопка сброса возвращает исходные данные.</p><div class="dialog-actions"><button class="mc-button mc-primary" type="button" data-modal-close>Понятно</button></div>`);
  });
  root.addEventListener('input',e=>{
    if(e.target.id==='mc-search'){query=e.target.value;root.querySelector('#mc-items').innerHTML=itemList();root.querySelector('#mc-item-count').textContent=filteredItems().length;}
    else if(e.target.id==='mc-trade-search'){tradeQuery=e.target.value;root.querySelector('#mc-trade-table').innerHTML=tradesContent();}
  });
  root.addEventListener('change',e=>{
    if(e.target.id==='mc-sort'){sort=e.target.value;root.querySelector('#mc-items').innerHTML=itemList();}
    else if(e.target.id==='mc-chart-metric'){chartMetric=e.target.value;render();}
    else if(e.target.id==='mc-interval'){state.preferences.interval=Number(e.target.value);addLog('Интервал: '+state.preferences.interval+' сек.');toast('Настройка сохранена в браузере');}
  });
  root.addEventListener('submit',e=>{
    if(e.target.id!=='mc-profile-form')return;e.preventDefault();
    const input=e.target.querySelector('input'),name=input.value.trim();
    if(!name){input.setCustomValidity('Введи имя');input.reportValidity();input.setCustomValidity('');return;}
    state.preferences.name=Array.from(name).slice(0,24).join('');persist();render();toast('Профиль сохранён в браузере');
  });
  shell();render();
  window.PrimeWorkspace={navigate,setExpanded(value){expanded=Boolean(value);render();},getView:()=>view};
})();
