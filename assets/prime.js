/* PRIME Flow 5. No network requests, storage, credentials or trading operations.
   The only price movement below belongs to an explicitly labelled illustration. */
(() => {
  'use strict';
  window.PrimePage = {
    init() {
      document.body.classList.add('js');
      const controller = new AbortController();
      const signal = controller.signal;
      const on = (target, type, handler, options = {}) => target?.addEventListener(type, handler, {...options, signal});
      const reduced = matchMedia('(prefers-reduced-motion: reduce)');
      const nav = document.querySelector('#navigation');
      const menu = document.querySelector('.menu-button');
      const closeMenu = () => {
        nav?.classList.remove('open');
        menu?.setAttribute('aria-expanded', 'false');
        menu?.setAttribute('aria-label', 'Открыть меню');
      };
      if (menu) {
        menu.hidden = false;
        on(menu, 'click', () => {
          const open = menu.getAttribute('aria-expanded') !== 'true';
          nav?.classList.toggle('open', open);
          menu.setAttribute('aria-expanded', String(open));
          menu.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
        });
      }
      on(nav, 'click', e => { if (e.target.closest('a')) closeMenu(); });
      on(document, 'pointerdown', e => {
        if (nav?.classList.contains('open') && !nav.contains(e.target) && !menu?.contains(e.target)) closeMenu();
      });
      on(document, 'keydown', e => {
        if (e.key === 'Escape' && nav?.classList.contains('open')) { closeMenu(); menu?.focus(); }
      });
      const header = () => document.body.classList.toggle('scrolled', scrollY > 35);
      on(window, 'scroll', header, {passive:true});
      on(window, 'resize', () => { if (innerWidth > 760) closeMenu(); }, {passive:true});
      header();
      // Hover illumination is an enhancement, never a gate for animation.
      document.querySelectorAll('.scene-card,.tier').forEach(card => {
        on(card, 'pointermove', e => {
          if (e.pointerType === 'touch') return;
          const r=card.getBoundingClientRect();
          card.style.setProperty('--mx', `${e.clientX-r.left}px`);
          card.style.setProperty('--my', `${e.clientY-r.top}px`);
        }, {passive:true});
      });
      document.querySelectorAll('[data-auto-toggle]').forEach(input => on(input, 'change', () => {
        input.closest('[data-explainer]').classList.toggle('auto-off', !input.checked);
      }));
      on(document.querySelector('#differences'), 'change', e => {
        document.querySelectorAll('tr[data-shared]').forEach(row => { row.hidden=e.target.checked; });
      });
      // Grid-row accordion adapted from the owner's tree reference. Without JS,
      // every answer is expanded and remains readable.
      const faqs=[...document.querySelectorAll('.faq')];
      faqs.forEach(faq => {
        const button=faq.querySelector('.faq-question');
        faq.classList.add('faq-closed');
        button.setAttribute('aria-expanded','false');
        faq.querySelector('.faq-collapse').setAttribute('inert','');
        on(button,'click',()=>{
          const open=button.getAttribute('aria-expanded')!=='true';
          button.setAttribute('aria-expanded',String(open));
          faq.classList.toggle('faq-closed',!open);
          faq.querySelector('.faq-collapse').toggleAttribute('inert',!open);
        });
      });
      const search=document.querySelector('#faq-search');
      const filters=[...document.querySelectorAll('[data-filter]')];
      let category='all';
      const normalize=value=>value.toLocaleLowerCase('ru-RU').replace(/ё/g,'е').trim();
      const filter=()=>{
        const query=normalize(search?.value||'');
        let count=0;
        faqs.forEach(faq=>{
          const show=(category==='all'||faq.dataset.category===category)&&normalize(faq.textContent).includes(query);
          faq.hidden=!show;
          if(show) count++;
        });
        const empty=document.querySelector('.empty-state');
        if(empty) empty.hidden=count!==0;
        const counter=document.querySelector('.faq-count');
        if(counter) counter.textContent=`Найдено вопросов: ${count}`;
      };
      on(search,'input',filter);
      filters.forEach(button=>on(button,'click',()=>{
        category=button.dataset.filter;
        filters.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
        filter();
      }));
      if(faqs.length) filter();
      let revealObserver;
      if('IntersectionObserver' in window){
        revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
          if(entry.isIntersecting){entry.target.classList.add('entering');revealObserver.unobserve(entry.target);}
        }),{threshold:.09});
        document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));
      }
      // Actual continuous geometry, no SMIL parser dependency. CSS SVG underneath
      // is retained as the moving fallback if Canvas/JS cannot run.
      const canvas=document.querySelector('.ribbon-canvas');
      const scene=canvas?.closest('.ribbon-scene');
      let frame=0, resizeObserver, visibilityObserver, active=true, disposed=false;
      let width=1,height=1,dpr=1,last=0,elapsed=0,lastFrame=0,gradient;
      const ctx=canvas?.getContext('2d',{alpha:true});
      const resize=()=>{
        if(!ctx||!scene) return;
        const bounds=scene.getBoundingClientRect();
        width=Math.max(1,bounds.width);height=Math.max(1,bounds.height);
        dpr=Math.min(devicePixelRatio||1,1.6);
        canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
        ctx.setTransform(dpr,0,0,dpr,0,0);
        gradient=ctx.createLinearGradient(0,0,width,0);
        gradient.addColorStop(0,'rgba(110,211,156,0)');
        gradient.addColorStop(.14,'rgba(119,213,163,.38)');
        gradient.addColorStop(.43,'rgba(174,249,207,.85)');
        gradient.addColorStop(.61,'rgba(184,254,223,.94)');
        gradient.addColorStop(.88,'rgba(124,207,163,.4)');
        gradient.addColorStop(1,'rgba(110,211,156,0)');
      };
      function point(x,u,time){
        // Smooth spatial waves; continuously travelling, not a single static
        // arc moved a few pixels. End coordinates extend beyond the viewport.
        const slow=reduced.matches ? .54 : 1;
        const t=time*slow;
        const amplitude=reduced.matches ? .18 : .245;
        const envelope=.65+.35*Math.sin(Math.PI*Math.max(0,Math.min(1,x)));
        const center=.52+Math.sin(x*5.35-t*.8)*amplitude+Math.sin(x*9.4+t*.37)*.053;
        const twist=Math.cos(x*6.5-t*.6)*.103+Math.sin(x*4+t*.75)*.043;
        return center+u*twist*envelope;
      }
      function draw(time){
        if(!ctx) return;
        ctx.clearRect(0,0,width,height);
        const n=innerWidth<761?28:38, samples=115;
        ctx.strokeStyle=gradient;ctx.lineWidth=.8;ctx.lineCap='round';
        for(let i=0;i<n;i++){
          const u=(i/(n-1)-.5)*2;
          ctx.globalAlpha=.38+.44*(1-Math.abs(u));
          ctx.beginPath();
          for(let j=0;j<=samples;j++){
            const x=-.05+j/samples*1.1;
            const y=point(x,u,time)*height;
            if(j===0) ctx.moveTo(x*width,y);else ctx.lineTo(x*width,y);
          }
          ctx.stroke();
        }
        // One soft travelling highlight runs through the existing strands.
        // It never introduces a bright box, spark burst or separate orbit.
        const head=(time*.115)%1.22-.11;
        for(let k=-2;k<=2;k++){
          const u=k*.28;
          ctx.beginPath();
          for(let j=0;j<=30;j++){
            const x=head-.075+j*.005;
            const y=point(x,u,time)*height;
            if(j===0)ctx.moveTo(x*width,y);else ctx.lineTo(x*width,y);
          }
          const glow=ctx.createLinearGradient((head-.075)*width,0,(head+.075)*width,0);
          glow.addColorStop(0,'rgba(185,255,218,0)');
          glow.addColorStop(.5,'rgba(215,255,235,.85)');
          glow.addColorStop(1,'rgba(185,255,218,0)');
          ctx.strokeStyle=glow;ctx.globalAlpha=.6;ctx.lineWidth=1.5;ctx.stroke();
        }
        ctx.globalAlpha=1;
        scene.classList.add('canvas-ready');
      }
      const tick=now=>{
        frame=0;
        if(disposed||!ctx||document.hidden||!active){last=0;return;}
        if(!last)last=now;
        elapsed+=Math.min((now-last)/1000,.08);last=now;
        // Bound work on high-refresh displays instead of rendering at 300 Hz.
        if(now-lastFrame>=1000/40){draw(elapsed);lastFrame=now;}
        frame=requestAnimationFrame(tick);
      };
      const resume=()=>{if(ctx&&!frame&&!disposed&&!document.hidden&&active){last=0;frame=requestAnimationFrame(tick);}};
      if(ctx){
        resize();draw(0);resume();
        if('ResizeObserver'in window){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(scene);}else on(window,'resize',resize,{passive:true});
        if('IntersectionObserver'in window){
          visibilityObserver=new IntersectionObserver(entries=>{
            active=entries[0].isIntersecting;
            if(active)resume();else if(frame){cancelAnimationFrame(frame);frame=0;last=0;}
          },{rootMargin:'100px'});
          visibilityObserver.observe(scene);
        }
        on(document,'visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}else resume();});
      }
      return ()=>{
        disposed=true;controller.abort();revealObserver?.disconnect();resizeObserver?.disconnect();visibilityObserver?.disconnect();
        if(frame)cancelAnimationFrame(frame);
      };
    }
  };
  window.PrimePage.dispose=window.PrimePage.init();
})();
