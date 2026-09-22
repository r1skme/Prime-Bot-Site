/* Landing navigation, motion and a single persistent interactive workspace. */
(() => {
 'use strict';
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const app=$('#market-app'),dialog=$('#app-dialog'),holder=$('#app-holder'),embed=$('#embed-slot');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let paused=reduced.matches,returnFocus=null,closingFromHash=false;
 const workspace=()=>window.PrimeWorkspace;
 function openApp(view) {
   if(!workspace())return;
   if(!dialog.open){returnFocus=document.activeElement;holder.append(app);document.body.classList.add('app-open');dialog.showModal();workspace().setExpanded(true);}
   if(view)workspace().navigate(view);else app.querySelector('#mc-heading').focus({preventScroll:true});
   // replaceState prevents dozens of history entries while exploring the product.
   try{history.replaceState(null,'','#app/'+workspace().getView());}catch(_){}
 }
 function closeApp(){if(dialog.open)dialog.close();}
 dialog.addEventListener('close',()=>{
   embed.append(app);document.body.classList.remove('app-open');workspace()?.setExpanded(false);
   if(!closingFromHash){try{history.replaceState(null,'','#product');}catch(_){}}
   closingFromHash=false;syncMotion();
   if(returnFocus&&returnFocus.isConnected)returnFocus.focus({preventScroll:true});
 });
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeApp();});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-open-app]');if(b)openApp(b.dataset.openApp);});
 document.addEventListener('prime:expand',()=>openApp());document.addEventListener('prime:close',closeApp);
 document.addEventListener('prime:view',e=>{if(dialog.open){try{history.replaceState(null,'','#app/'+e.detail.view);}catch(_){}}});
 function readHash(){const m=location.hash.match(/^#app\/(overview|products|trades|analytics|settings)$/);if(m)openApp(m[1]);else if(dialog.open){closingFromHash=true;closeApp();}}
 window.addEventListener('hashchange',readHash);
 if(workspace()){$$('[data-open-app]').forEach(b=>b.hidden=false);readHash();}
 const menu=$('.menu-toggle'),nav=$('.site-nav');
 function setMenu(open){nav.classList.toggle('is-open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');menu.textContent=open?'×':'☰';}
 menu.hidden=false;menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
 nav.addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus();}});
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('.site-header'))setMenu(false);});
 matchMedia('(min-width:761px)').addEventListener('change',e=>{if(e.matches)setMenu(false);});
 const features={products:{title:'Цена меняется.<br>Контроль остаётся.',description:'Лимиты и история для каждого предмета.',action:'Открыть товары',art:$('#feature-art').innerHTML},analytics:{title:'Вся история.<br>Без догадок.',description:'Сделки, суммы и события на одном экране.',action:'Посмотреть аналитику',art:'<div class="visual-price"><span>Твои сделки</span><strong>Вся картина.</strong><div class="feature-bars"><i style="--height:35%"></i><i style="--height:63%"></i><i style="--height:46%"></i><i style="--height:85%"></i><i style="--height:70%"></i><i style="--height:100%"></i></div><span class="visual-limit"><span>Сделки / события / история</span><b>В одном месте</b></span></div>'},settings:{title:'Настрой один раз.<br>Управляй в моменте.',description:'Уведомления, интервалы и твои правила.',action:'Открыть настройки',art:'<div class="visual-price"><span>Твои настройки</span><strong>По-твоему.</strong><div class="feature-settings-row"><span>Автоцена</span><i class="switch-art"></i></div><div class="feature-settings-row"><span>Уведомления</span><i class="switch-art"></i></div><div class="feature-settings-row"><span>Интервал</span><b>15 сек.</b></div></div>'}};
 const tabs=$$('[data-feature]');
 function setFeature(tab,focus=false){const data=features[tab.dataset.feature];tabs.forEach(b=>{const active=b===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});$('#feature-panel').setAttribute('aria-labelledby',tab.id);$('#feature-title').innerHTML=data.title;$('#feature-description').textContent=data.description;$('#feature-art').innerHTML=data.art;const button=$('#feature-open');button.dataset.openApp=tab.dataset.feature;button.innerHTML=data.action+' <span aria-hidden="true">↗</span>';if(focus)tab.focus();}
 tabs.forEach((b,i)=>{b.addEventListener('click',()=>setFeature(b));b.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%tabs.length;if(e.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;if(e.key==='Home')n=0;if(e.key==='End')n=tabs.length-1;if(n!==undefined){e.preventDefault();setFeature(tabs[n],true);}});});
 const motion=$('.motion-control'),scenes=[];let frame=0,last=0,pointer={x:0,y:0};
 if(window.PrimeScene){$$('.object-scene').forEach(el=>{const scene=new window.PrimeScene(el);if(!scene.disabled)scenes.push(scene);});}
 function syncMotion(){document.documentElement.classList.toggle('motion-paused',paused);document.documentElement.classList.toggle('no-motion',reduced.matches);motion.setAttribute('aria-pressed',String(paused));motion.setAttribute('aria-label',paused?'Включить анимации':'Остановить анимации');motion.textContent=paused?'▷':'Ⅱ';if(paused||document.hidden){cancelAnimationFrame(frame);frame=0;scenes.forEach(s=>s.draw(0,{x:0,y:0}));}else start();}
 function visible(){return scenes.some(s=>s.visible);}
 function tick(now){frame=0;if(paused||document.hidden||dialog.open||!visible())return;const dt=Math.min((now-last)/1000,.06);if(now-last>32){last=now;scenes.filter(s=>s.visible).forEach(s=>s.draw(dt,pointer));}frame=requestAnimationFrame(tick);}
 function start(){if(!frame&&!paused&&!document.hidden&&!dialog.open&&visible()){last=performance.now();frame=requestAnimationFrame(tick);}}
 if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{const s=scenes.find(s=>s.element===e.target);if(s)s.visible=e.isIntersecting;});if(!visible()){cancelAnimationFrame(frame);frame=0;}else start();},{rootMargin:'70px'});scenes.forEach(s=>observer.observe(s.element));}else{scenes.forEach(s=>s.visible=true);}
 let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>scenes.forEach(s=>s.resize()),140);},{passive:true});
 document.addEventListener('pointermove',e=>{if(paused||e.pointerType==='touch')return;pointer={x:(e.clientX/innerWidth-.5)*.7,y:(e.clientY/innerHeight-.5)*.7};},{passive:true});
 document.addEventListener('visibilitychange',syncMotion);motion.addEventListener('click',()=>{paused=!paused;syncMotion();});reduced.addEventListener('change',()=>{paused=reduced.matches;syncMotion();});motion.hidden=scenes.length===0;syncMotion();
 // Content is visible before JavaScript and if observers are unavailable.
 if('IntersectionObserver'in window&&!reduced.matches){const ob=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('reveal-ready');ob.unobserve(e.target);}}),{threshold:.12});$$('.section-heading,.spotlight,.telegram-copy,.message-stack,.footer-top').forEach(el=>ob.observe(el));}
})();
