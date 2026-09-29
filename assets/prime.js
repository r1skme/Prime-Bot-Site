/* PRIME 6: SVG motion and progressive UI. No account, trade or storage APIs. */
(()=>{'use strict';
window.PrimePage={init(){
 document.body.classList.add('js');
 const controller=new AbortController(),signal=controller.signal;
 const on=(el,type,fn,options={})=>el?.addEventListener(type,fn,{...options,signal});
 const nav=document.getElementById('navigation'),menu=document.querySelector('.menu-button');
 const closeMenu=()=>{nav?.classList.remove('open');menu?.setAttribute('aria-expanded','false');menu?.setAttribute('aria-label','Открыть меню');};
 if(menu){menu.hidden=false;on(menu,'click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';nav?.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');});}
 on(nav,'click',e=>{if(e.target.closest('a'))closeMenu()});
 on(document,'pointerdown',e=>{if(nav?.classList.contains('open')&&!nav.contains(e.target)&&!menu?.contains(e.target))closeMenu()});
 on(document,'keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('open')){closeMenu();menu?.focus()}});
 on(window,'resize',()=>{if(innerWidth>760)closeMenu()},{passive:true});
 const header=()=>document.body.classList.toggle('scrolled',scrollY>35);header();on(window,'scroll',header,{passive:true});
 on(document.getElementById('differences'),'change',e=>document.querySelectorAll('tr[data-shared]').forEach(row=>{row.hidden=e.target.checked}));
 const search=document.getElementById('faq-search');
 on(search,'input',()=>{const q=search.value.toLocaleLowerCase('ru-RU').replace(/ё/g,'е').trim();let count=0;document.querySelectorAll('.faq').forEach(el=>{el.hidden=!el.textContent.toLocaleLowerCase('ru-RU').replace(/ё/g,'е').includes(q);if(!el.hidden)count++});const empty=document.querySelector('.empty-state');if(empty)empty.hidden=count>0;const status=document.getElementById('faq-status');if(status)status.textContent=`Найдено ответов: ${count}`;});
 let revealObserver;
 if('IntersectionObserver'in window){revealObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('entering');revealObserver.unobserve(e.target)}})},{threshold:.1});document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));}
 const svg=document.querySelector('.ribbon'),scene=svg?.closest('.ribbon-scene');
 const strands=svg?[...svg.querySelectorAll('.ribbon-strand')]:[],band=svg?.querySelector('.ribbon-band');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,active=true,disposed=false,last=0,elapsed=0,accumulator=0,visibilityObserver;
 /* Twelve smooth cubic curves, consistently ordered with at least 6 SVG units
    between neighbours. No crossings, subpixel hairline pile-up or raster canvas.
    The broad, low-opacity fill supplies body without adding more line density. */
 const geom=t=>[235+Math.sin(t*.53)*32,265+Math.sin(t*.47+1.1)*77,58+Math.sin(t*.54+2.1)*65,155+Math.sin(t*.50)*67,350+Math.sin(t*.43+1.6)*67,265+Math.sin(t*.41+2.7)*65,236+Math.sin(t*.49+1)*31];
 const curve=(g,o)=>`M -120 ${(g[0]+o).toFixed(2)} C 155 ${(g[1]+o).toFixed(2)} 260 ${(g[2]+o).toFixed(2)} 590 ${(g[3]+o).toFixed(2)} S 1040 ${(g[4]+o).toFixed(2)} 1260 ${(g[5]+o).toFixed(2)} S 1450 ${(g[6]+o).toFixed(2)} 1560 ${(g[6]+o).toFixed(2)}`;
 const draw=t=>{if(!svg)return;const g=geom(t);strands.forEach((el,i)=>el.setAttribute('d',curve(g,(i-5.5)*6.6)));if(band){const upper=curve(g,-38),o=38;/* reverse the cubic path, preserving its control points */const a=2*g[3]-g[2],b=2*g[5]-g[4];band.setAttribute('d',upper+` L 1560 ${(g[6]+o).toFixed(2)} C 1450 ${(g[6]+o).toFixed(2)} 1480 ${(b+o).toFixed(2)} 1260 ${(g[5]+o).toFixed(2)} C 1040 ${(g[4]+o).toFixed(2)} 920 ${(a+o).toFixed(2)} 590 ${(g[3]+o).toFixed(2)} C 260 ${(g[2]+o).toFixed(2)} 155 ${(g[1]+o).toFixed(2)} -120 ${(g[0]+o).toFixed(2)} Z`);}svg.classList.add('motion-ready');};
 const tick=now=>{frame=0;if(disposed||!active||document.hidden||reduced.matches){last=0;return;}if(!last)last=now;const dt=Math.min(now-last,80);last=now;elapsed+=dt/1000;accumulator+=dt;if(accumulator>=1000/60){draw(elapsed);accumulator%=1000/60;}frame=requestAnimationFrame(tick);};
 const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=0;};
 const resume=()=>{if(svg&&!disposed&&!frame&&active&&!document.hidden&&!reduced.matches){last=0;frame=requestAnimationFrame(tick)}};
 if(svg){draw(0);resume();if('IntersectionObserver'in window){visibilityObserver=new IntersectionObserver(entries=>{active=entries[0].isIntersecting;active?resume():stop()},{rootMargin:'80px'});visibilityObserver.observe(scene);}on(document,'visibilitychange',()=>{document.hidden?stop():resume()});on(reduced,'change',()=>{if(reduced.matches){stop();draw(0)}else resume()});}
 return ()=>{disposed=true;controller.abort();stop();revealObserver?.disconnect();visibilityObserver?.disconnect();};
}};
window.PrimePage.dispose=window.PrimePage.init();
})();
