/* PRIME / page choreography. No market connection or requests from the page. */
(() => {
  'use strict';
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const mobile=matchMedia('(max-width: 700px)');
  const pointerFine=matchMedia('(hover:hover) and (pointer:fine)');
  const motion=document.querySelector('.motion-button');
  const header=document.querySelector('.header');
  const menu=document.querySelector('.menu-button');
  const nav=document.querySelector('.navigation');
  const hero=document.querySelector('.hero');
  const heroCopy=document.querySelector('.hero-copy');
  const heroScene=document.querySelector('.hero-scene');
  const showcase=document.querySelector('.showcase');
  const app=document.getElementById('app-window');
  const stage=document.querySelector('.product-stage');
  const scenes=typeof window.PrimeScene==='function'?[...document.querySelectorAll('[data-scene]')].map(el=>new window.PrimeScene(el)):[];
  let paused=reduced.matches;
  let frame=0,last=0,dirty=true,mouse={x:0,y:0};
  const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
  // Install all essential controls before hiding the non-JS presentation.
  motion.hidden=false;menu.hidden=false;
  function updateMotion() {
    root.classList.toggle('motion-paused',paused);
    motion.setAttribute('aria-pressed',String(paused));
    motion.setAttribute('aria-label',paused?'Включить анимацию':'Остановить анимацию');
    motion.title=motion.getAttribute('aria-label');
    motion.querySelector('use').setAttribute('href',paused?'#play':'#pause');
    if(paused){mouse={x:0,y:0};document.querySelectorAll('.is-waiting').forEach(el=>el.classList.remove('is-waiting'));stopSignal();signalStatus.textContent='Рынок / Правила / Уведомление';}
    dirty=true;request();
  }
  motion.addEventListener('click',()=>{paused=!paused;updateMotion();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;updateMotion();});
  function closeMenu(focus=false) {
    const open=menu.getAttribute('aria-expanded')==='true';
    nav.classList.remove('is-open');root.classList.remove('menu-open');
    menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Открыть меню');
    if(open&&focus)menu.focus();
  }
  menu.addEventListener('click',()=>{
    if(menu.getAttribute('aria-expanded')==='true'){closeMenu(true);return;}
    nav.classList.add('is-open');root.classList.add('menu-open');
    menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label','Закрыть меню');nav.querySelector('a').focus();
  });
  nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu(true);});
  document.addEventListener('click',e=>{if(!e.target.closest('.header'))closeMenu();});
  document.addEventListener('focusin',e=>{if(!e.target.closest('.header')&&menu.getAttribute('aria-expanded')==='true')closeMenu();});
  mobile.addEventListener('change',()=>{closeMenu();resize();});

  const tabs=[...document.querySelectorAll('.feature-tab')];
  const panels=[...document.querySelectorAll('.feature-panel')];
  function selectTab(index,focus=false) {
    tabs.forEach((tab,i)=>{
      const active=i===index;
      tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
      panels[i].classList.toggle('active',active);panels[i].hidden=!active;
    });
    if(focus)tabs[index].focus();
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>selectTab(index));
    tab.addEventListener('keydown',e=>{
      let next=index;
      if(['ArrowDown','ArrowRight'].includes(e.key))next=(index+1)%tabs.length;
      else if(['ArrowUp','ArrowLeft'].includes(e.key))next=(index+tabs.length-1)%tabs.length;
      else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;
      e.preventDefault();selectTab(next,true);
    });
  });
  selectTab(0);
  function setOrientation(){document.querySelector('.feature-tabs').setAttribute('aria-orientation',mobile.matches?'horizontal':'vertical');}
  mobile.addEventListener('change',setOrientation);setOrientation();

  const dialog=document.querySelector('.interface-dialog');
  const expand=document.querySelector('.expand-button');
  const slot=dialog.querySelector('.dialog-content');
  if(typeof dialog.showModal==='function') {
    expand.hidden=false;
    expand.addEventListener('click',()=>{
      // Move one real node instead of cloning IDs and controls.
      slot.append(app);dialog.showModal();document.body.classList.add('modal-open');
      dialog.querySelector('.close-dialog').focus();dirty=true;request();
    });
    dialog.querySelector('.close-dialog').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('keydown',e=>{
      if(e.key!=='Tab')return;
      const items=[...dialog.querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);
      const first=items[0],last=items[items.length-1];
      if(!first)return;
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
    dialog.addEventListener('click',e=>{
      const r=dialog.getBoundingClientRect();
      if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();
    });
    dialog.addEventListener('close',()=>{
      stage.append(app);document.body.classList.remove('modal-open');expand.focus({preventScroll:true});dirty=true;request();
    });
  }

  const signalButton=document.querySelector('.signal-button'),engine=document.querySelector('.engine'),signalStatus=document.getElementById('signal-status');
  let signalTimers=[];
  function stopSignal(){signalTimers.forEach(clearTimeout);signalTimers=[];engine.dataset.step='0';signalButton.disabled=false;}
  signalButton.hidden=false;
  signalButton.addEventListener('click',()=>{
    stopSignal();
    if(paused){signalStatus.textContent='Рынок / Правила PRIME / Уведомление в Telegram';return;}
    signalButton.disabled=true;
    const steps=[['1','01 / Изменение на рынке'],['2','02 / Обработка по твоим правилам'],['3','03 / Уведомление в Telegram']];
    steps.forEach(([step,text],i)=>signalTimers.push(setTimeout(()=>{engine.dataset.step=step;signalStatus.textContent=text;},i*800)));
    signalTimers.push(setTimeout(()=>{stopSignal();signalStatus.textContent='Рынок / Правила / Уведомление';},3000));
  });
  motion.addEventListener('click',()=>{if(paused){stopSignal();signalStatus.textContent='Рынок / Правила / Уведомление';}});

  let regions=[];
  function resize() {
    scenes.forEach(s=>s.resize());
    regions=[hero,showcase].map(el=>({top:el.offsetTop,height:el.offsetHeight}));
    dirty=true;request();
  }
  // Scroll values are read once per frame; no layout thrash inside the 3D loop.
  function choreograph() {
    const y=scrollY,vh=innerHeight;
    header.classList.toggle('scrolled',y>12);
    const [h,s]=regions;
    if(!h||!s)return;
    if(paused||mobile.matches) {
      heroCopy.style.transform='';heroCopy.style.opacity='';heroScene.style.transform='';app.style.transform='';
    } else {
      const progress=clamp((y-h.top)/Math.max(1,h.height-vh));
      heroCopy.style.transform=`translate3d(0,${-progress*70}px,0)`;
      heroCopy.style.opacity=String(1-progress*.8);
      heroScene.style.transform=`translate3d(${-progress*35}px,${progress*68}px,0) scale(${1-progress*.16}) rotate(${-progress*8}deg)`;
      const reveal=clamp((y+vh*.78-s.top)/(vh*.62));
      if(!dialog.open)app.style.transform=`rotateX(${(1-reveal)*10}deg) scale(${.93+reveal*.07})`;
    }
  }
  function request(){if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
  function tick(now) {
    frame=0;
    if(document.hidden){last=0;return;}
    if(dirty){choreograph();dirty=false;}
    const active=scenes.filter(s=>s.visible&&!s.disabled);
    if(!paused&&active.length) {
      const interval=mobile.matches?1000/24:1000/30;
      if(!last||now-last>=interval){const dt=last?Math.min((now-last)/1000,.06):0;last=now;active.forEach(s=>s.draw(dt,mouse));}
      request();
    } else last=0;
  }
  if('IntersectionObserver' in window) {
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        const scene=scenes.find(s=>s.element===entry.target);if(scene)scene.visible=entry.isIntersecting;
      });request();
    },{rootMargin:'30px'});
    scenes.forEach(scene=>observer.observe(scene.element));
    const reveal=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.remove('is-waiting');reveal.unobserve(e.target);}});},{threshold:.06});
    document.querySelectorAll('.reveal').forEach(el=>{if(!paused&&el.getBoundingClientRect().top>innerHeight)el.classList.add('is-waiting');reveal.observe(el);});
  } else scenes.forEach(s=>s.visible=true);
  addEventListener('scroll',()=>{dirty=true;request();},{passive:true});
  let resizeFrame=0;
  addEventListener('resize',()=>{if(!resizeFrame)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;resize();});},{passive:true});
  document.addEventListener('pointermove',e=>{
    if(paused||!pointerFine.matches)return;mouse={x:(e.clientX/innerWidth-.5)*2,y:(e.clientY/innerHeight-.5)*2};
  },{passive:true});
  document.addEventListener('pointerleave',()=>{mouse={x:0,y:0};});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;stopSignal();}
    else {dirty=true;request();}
  });
  addEventListener('pagehide',()=>{cancelAnimationFrame(frame);stopSignal();});
  addEventListener('pageshow',()=>{dirty=true;request();});
  root.classList.add('js');resize();updateMotion();
})();
