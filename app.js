/* PRIME. All interaction is local. No API calls, credentials, or trade execution. */
(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionButton = document.querySelector('.motion-button');
  let savedMotion = null;
  try { savedMotion = localStorage.getItem('prime-motion'); } catch (_) { /* Storage is optional. */ }
  let paused = reduced.matches || savedMotion === 'paused';
  let renderScene = () => {};

  function updateMotion() {
    root.classList.toggle('motion-paused', paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    const label = paused ? 'Включить анимацию' : 'Остановить анимацию';
    motionButton.setAttribute('aria-label', label);
    motionButton.title = label;
    motionButton.querySelector('use').setAttribute('href', paused ? '#play' : '#pause');
    document.querySelectorAll('.reveal').forEach(el => {
      if (paused) el.classList.remove('is-waiting');
    });
    renderScene();
  }
  motionButton.addEventListener('click', () => {
    paused = !paused;
    try { localStorage.setItem('prime-motion', paused ? 'paused' : 'running'); } catch (_) {}
    updateMotion();
  });
  reduced.addEventListener('change', () => { paused = reduced.matches; updateMotion(); });
  updateMotion();

  // Disclosure navigation: native links remain usable without JavaScript.
  const menuButton = document.querySelector('.menu-button');
  const navigation = document.querySelector('.navigation');
  const mobile = window.matchMedia('(max-width: 700px)');
  function closeMenu(restoreFocus = false) {
    const wasOpen = menuButton.getAttribute('aria-expanded') === 'true';
    navigation.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Открыть меню');
    if (wasOpen && restoreFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    navigation.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    if (open) navigation.querySelector('a').focus();
  });
  navigation.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(true); });
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav-wrap')) closeMenu();
  });
  mobile.addEventListener('change', () => { if (!mobile.matches) closeMenu(); });

  // Native modal provides focus trapping, Escape, and screen-reader semantics.
  const dialog = document.querySelector('.interface-dialog');
  const expand = document.querySelector('.expand-button');
  const appWindow = document.querySelector('#app-window');
  if (typeof dialog.showModal === 'function') {
    expand.hidden = false;
    expand.addEventListener('click', () => {
      const content = dialog.querySelector('.dialog-content');
      content.replaceChildren();
      const clone = appWindow.cloneNode(true);
      clone.removeAttribute('id');
      clone.removeAttribute('style');
      content.append(clone);
      dialog.showModal();
      document.body.classList.add('modal-open');
      dialog.querySelector('.close-dialog').focus();
    });
    dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      dialog.querySelector('.dialog-content').replaceChildren();
      expand.focus({ preventScroll: true });
    });
  }
  const stage = document.querySelector('.product-stage');
  stage.addEventListener('pointermove', e => {
    if (paused || !finePointer.matches) return;
    const r = stage.getBoundingClientRect();
    appWindow.style.setProperty('--tilt-y', `${((e.clientX - r.left) / r.width - .5) * 3}deg`);
    appWindow.style.setProperty('--tilt-x', `${-((e.clientY - r.top) / r.height - .5) * 2}deg`);
  }, { passive: true });
  stage.addEventListener('pointerleave', () => {
    appWindow.style.setProperty('--tilt-x', '0deg');
    appWindow.style.setProperty('--tilt-y', '0deg');
  });

  if ('IntersectionObserver' in window && !paused) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.remove('is-waiting');
        observer.unobserve(entry.target);
      }
    }, { threshold: .06 });
    document.querySelectorAll('.reveal').forEach(el => {
      if (el.getBoundingClientRect().top > innerHeight) el.classList.add('is-waiting');
      observer.observe(el);
    });
  }

  /* Small CPU 3D renderer: a beveled, extruded P mesh, physically ordered faces,
     perspective projection, metallic face shading, orbit geometry, and satellites.
     Canvas 2D avoids WebGL/CDN failures; this is geometry, not a moving PNG. */
  const canvas = document.getElementById('prime-scene');
  const art = document.querySelector('.hero-art');
  let ctx;
  try { ctx = canvas.getContext('2d', { alpha: true }); } catch (_) { return; }
  if (!ctx) return; // The CSS extruded letter stays visible.
  let width = 0, height = 0, scale = 1, dpr = 1;
  let visible = true, frame = 0, last = 0, phase = 0;
  let pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
  const outer = [[-1,-1.43],[-1,1.43],[.43,1.43],[1.02,.86],[1.02,-.12],[.48,-.65],[-.26,-.65],[-.26,-1.43]];
  const hole = [[-.26,.72],[.17,.72],[.34,.55],[.34,.24],[.17,.07],[-.26,.07]];
  const unit = v => { const n = Math.hypot(...v) || 1; return v.map(x => x / n); };
  const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const light = unit([-.6, .9, 1.2]);
  function rotate(p, rx, ry, rz) {
    const [x,y,z] = p;
    const y1 = y*Math.cos(rx)-z*Math.sin(rx), z1=y*Math.sin(rx)+z*Math.cos(rx);
    const x2=x*Math.cos(ry)+z1*Math.sin(ry), z2=-x*Math.sin(ry)+z1*Math.cos(ry);
    return [x2*Math.cos(rz)-y1*Math.sin(rz), x2*Math.sin(rz)+y1*Math.cos(rz), z2];
  }
  function project(v) {
    const perspective = 7 / (7 - v[2]);
    return [width*.53 + v[0]*scale*perspective, height*.49-v[1]*scale*perspective];
  }
  function inset(poly, amount) {
    return poly.map((p,i) => {
      const prev=poly[(i+poly.length-1)%poly.length], next=poly[(i+1)%poly.length];
      const a=unit([p[1]-prev[1],prev[0]-p[0],0]);
      const b=unit([next[1]-p[1],p[0]-next[0],0]);
      const m=unit([a[0]+b[0],a[1]+b[1],0]);
      const factor=amount/Math.max(.15,dot(m,a));
      return [p[0]+m[0]*factor,p[1]+m[1]*factor];
    });
  }
  const frontOuter=inset(outer,.07), frontHole=inset(hole,-.055);
  const mesh=[];
  function buildSides(poly, rim, inside=false) {
    for (let i=0;i<poly.length;i++) {
      const j=(i+1)%poly.length, a=poly[i],b=poly[j],ra=rim[i],rb=rim[j];
      const n=unit([-(b[1]-a[1]),b[0]-a[0],0]).map(v=>inside?-v:v);
      mesh.push({points:[[...a,-.35],[...b,-.35],[...b,.3],[...a,.3]],normal:n,kind:'side'});
      mesh.push({points:[[...a,.3],[...b,.3],[...rb,.4],[...ra,.4]],normal:unit([n[0],n[1],.95]),kind:'bevel'});
      mesh.push({points:[[...a,-.35],[...b,-.35],[...b,-.38],[...a,-.38]],normal:unit([n[0],n[1],-.2]),kind:'edge'});
    }
  }
  buildSides(outer,frontOuter);buildSides(hole,frontHole,true);
  mesh.push({points:frontOuter.map(p=>[...p,.4]),hole:frontHole.map(p=>[...p,.4]),normal:[0,0,1],kind:'front'});
  const cubeFaces=[
    {v:[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],n:[0,0,1]},
    {v:[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]],n:[0,0,-1]},
    {v:[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]],n:[0,1,0]},
    {v:[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]],n:[0,-1,0]},
    {v:[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]],n:[1,0,0]},
    {v:[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]],n:[-1,0,0]}
  ];
  function path(points) {
    points.forEach((p,i)=>{ const q=project(p); if(i===0)ctx.moveTo(...q);else ctx.lineTo(...q); });ctx.closePath();
  }
  function shadeFace(face) {
    const points=face.points.map(project),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const g=ctx.createLinearGradient(minX,minY,maxX+1,maxY+1);
    const lighting=Math.max(0,dot(face.normal,light));
    if(face.kind==='front') {
      [[0,'#f2fff7'],[.19,'#acbeb2'],[.38,'#d9e5de'],[.405,'#667b6d'],[.51,'#34483b'],[.68,'#8ca697'],[.86,'#deebe3'],[1,'#9dbbac']].forEach(s=>g.addColorStop(...s));
    } else if(face.kind==='bevel') {
      const v=Math.round(75+lighting*155);
      g.addColorStop(0,`rgb(${v-8},${Math.min(255,v+15)},${v})`);
      g.addColorStop(.48,`rgb(${Math.round(v*.4)},${Math.round(v*.54)},${Math.round(v*.44)})`);
      g.addColorStop(1,`rgb(${v-30},${Math.min(255,v+8)},${v-14})`);
    } else {
      const v=Math.round(21+lighting*65);
      g.addColorStop(0,`rgb(${v},${v+15},${v+6})`);g.addColorStop(.45,'#0e1c13');g.addColorStop(1,`rgb(${v+4},${v+23},${v+10})`);
    }
    ctx.fillStyle=g;ctx.beginPath();path(face.points);if(face.hole)path(face.hole);ctx.fill('evenodd');
    ctx.strokeStyle=face.kind==='front'?'rgba(230,255,239,.48)':'rgba(190,235,207,.2)';ctx.lineWidth=.7;ctx.stroke();
  }
  function drawRing(front,time) {
    for(let layer=0;layer<2;layer++) {
      const radius=layer===0?2.12:2.33;
      for(let i=0;i<120;i++) {
        const t=i/120*Math.PI*2, t2=(i+1)/120*Math.PI*2;
        const point=a=>rotate([Math.cos(a)*radius,Math.sin(a)*radius,0],1.1,-.25,.31);
        const a=point(t),b=point(t2);
        if ((a[2]>0)!==front)continue;
        const bright=layer===0 && Math.sin(t-time*.16)>.68;
        ctx.beginPath();ctx.moveTo(...project(a));ctx.lineTo(...project(b));
        ctx.strokeStyle=bright?'rgba(143,255,189,.66)':layer===0?'rgba(124,185,146,.23)':'rgba(145,192,160,.1)';
        ctx.lineWidth=bright?1.3:.7;ctx.stroke();
      }
    }
    const t=time*.15+.8;
    const p=rotate([Math.cos(t)*2.12,Math.sin(t)*2.12,0],1.1,-.25,.31);
    if((p[2]>0)===front) {
      const q=project(p);ctx.shadowColor='#8dffc0';ctx.shadowBlur=15;ctx.fillStyle='#c3ffdc';ctx.beginPath();ctx.arc(...q,2.2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    }
  }
  function drawCube(position,size,rx,ry,rz) {
    cubeFaces.map(f=>({points:f.v.map(v=>rotate(v.map(x=>x*size),rx,ry,rz).map((x,i)=>x+position[i])),normal:rotate(f.n,rx,ry,rz),kind:'bevel'}))
      .filter(f=>f.normal[2]>0).sort((a,b)=>a.points.reduce((s,p)=>s+p[2],0)-b.points.reduce((s,p)=>s+p[2],0)).forEach(shadeFace);
  }
  function draw() {
    if(!width||!height)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const t=phase;
    const rx=-.13+eased.y*.13+Math.sin(t*.3)*.035, ry=-.5+eased.x*.25+Math.sin(t*.23)*.07,rz=-.16+Math.sin(t*.2)*.025;
    const shadow=ctx.createRadialGradient(width*.52,height*.85,0,width*.52,height*.85,width*.3);
    shadow.addColorStop(0,'rgba(86,200,133,.10)');shadow.addColorStop(1,'rgba(9,23,13,0)');ctx.fillStyle=shadow;ctx.fillRect(0,0,width,height);
    // Fixed deterministic glints; no particle simulation or unbounded allocation.
    for(let i=0;i<19;i++) {
      const x=(Math.sin(i*127.1)*.5+.5)*width,y=(Math.sin(i*93.7+1)*.5+.5)*height;
      ctx.fillStyle=`rgba(162,220,182,${.08+(i%3)*.06})`;ctx.fillRect(x,y,i%4===0?2:1,1);
    }
    drawRing(false,t);drawCube([-1.73,.93,-.25],.12,.4+t*.12,.6+t*.14,.2);
    mesh.map(f=>({kind:f.kind,points:f.points.map(p=>rotate(p,rx,ry,rz)),hole:f.hole?.map(p=>rotate(p,rx,ry,rz)),normal:rotate(f.normal,rx,ry,rz)}))
      .filter(f=>f.normal[2]>-.01).sort((a,b)=>a.points.reduce((s,p)=>s+p[2],0)/a.points.length-b.points.reduce((s,p)=>s+p[2],0)/b.points.length).forEach(shadeFace);
    drawRing(true,t);drawCube([1.65,-.85,.45],.17,.4-t*.1,.5+t*.14,.35);
  }
  function schedule() {
    if(!frame&&!paused&&visible&&!document.hidden)frame=requestAnimationFrame(tick);
  }
  function tick(now) {
    frame=0;
    if(paused||!visible||document.hidden){last=0;return;}
    if(!last||now-last>=1000/30) {
      const delta=last?Math.min((now-last)/1000,.06):0;phase+=delta;last=now;
      eased.x+=(pointer.x-eased.x)*.08;eased.y+=(pointer.y-eased.y)*.08;draw();
    }
    schedule();
  }
  function resize() {
    const r=art.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);scale=Math.min(width/4.65,height/4.65);
    draw();
  }
  renderScene=() => {
    if(frame)cancelAnimationFrame(frame);frame=0;last=0;
    if(paused){pointer={x:0,y:0};eased={x:0,y:0};}
    draw();schedule();
  };
  art.addEventListener('pointermove',e=>{
    if(paused||!finePointer.matches)return;
    const r=art.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width-.5,y:(e.clientY-r.top)/r.height-.5};
  },{passive:true});
  art.addEventListener('pointerleave',()=>{pointer={x:0,y:0};});
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(art);
  else window.addEventListener('resize',resize,{passive:true});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(!visible&&frame){cancelAnimationFrame(frame);frame=0;last=0;}
    else schedule();
  },{rootMargin:'80px'}).observe(art);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;last=0;}
    else schedule();
  });
  resize();art.classList.add('scene-ready');schedule();
})();
