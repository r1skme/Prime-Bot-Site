/* PRIME: real extruded polygon geometry, perspective projection and depth-sorted
   metallic surfaces on Canvas 2D. No CDN, WebGL, image sequence or font files. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const unit = a => { const n = Math.hypot(...a) || 1; return a.map(x => x / n); };
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const light = unit([-.65, .9, 1.3]);
  const outer = [[-1,-1.44],[-1,1.44],[.43,1.44],[1.03,.85],[1.03,-.12],[.48,-.66],[-.27,-.66],[-.27,-1.44]];
  const hole = [[-.27,.72],[.17,.72],[.36,.53],[.36,.24],[.17,.06],[-.27,.06]];
  function rotate([x,y,z], rx,ry,rz) {
    const a=y*Math.cos(rx)-z*Math.sin(rx),b=y*Math.sin(rx)+z*Math.cos(rx);
    const c=x*Math.cos(ry)+b*Math.sin(ry),d=-x*Math.sin(ry)+b*Math.cos(ry);
    return [c*Math.cos(rz)-a*Math.sin(rz),c*Math.sin(rz)+a*Math.cos(rz),d];
  }
  function inset(poly, amount) {
    return poly.map((p,i) => {
      const prev=poly[(i+poly.length-1)%poly.length],next=poly[(i+1)%poly.length];
      const a=unit([p[1]-prev[1],prev[0]-p[0],0]),b=unit([next[1]-p[1],p[0]-next[0],0]);
      const m=unit([a[0]+b[0],a[1]+b[1],0]),f=amount/Math.max(.15,dot(m,a));
      return [p[0]+m[0]*f,p[1]+m[1]*f];
    });
  }
  const rim=inset(outer,.095),cut=inset(hole,-.07),mesh=[];
  function sides(poly,face,inside=false) {
    for(let i=0;i<poly.length;i++) {
      const j=(i+1)%poly.length,a=poly[i],b=poly[j],ra=face[i],rb=face[j];
      const n=unit([a[1]-b[1],b[0]-a[0],0]).map(v=>inside?-v:v);
      mesh.push({v:[[...a,-.32],[...b,-.32],[...b,.28],[...a,.28]],n,kind:'side'});
      mesh.push({v:[[...a,.28],[...b,.28],[...rb,.43],[...ra,.43]],n:unit([n[0],n[1],.95]),kind:'bevel'});
      mesh.push({v:[[...a,-.32],[...b,-.32],[...rb,-.43],[...ra,-.43]],n:unit([n[0],n[1],-.95]),kind:'bevel'});
      // A narrow manufactured seam along the middle of the side wall.
      mesh.push({v:[[...a,-.055],[...b,-.055],[...b,-.075],[...a,-.075]],n,kind:'seam'});
    }
  }
  sides(outer,rim);sides(hole,cut,true);
  mesh.push({v:rim.map(p=>[...p,.43]),hole:cut.map(p=>[...p,.43]),n:[0,0,1],kind:'face'});
  mesh.push({v:rim.map(p=>[...p,-.43]),hole:cut.map(p=>[...p,-.43]),n:[0,0,-1],kind:'face'});
  // Torus surface, not a flat oval. All faces share the model's depth sorter.
  const torus=[];
  const point=(a,b)=>[(1.97+.026*Math.cos(b))*Math.cos(a),(1.97+.026*Math.cos(b))*Math.sin(a),.026*Math.sin(b)];
  for(let i=0;i<64;i++)for(let j=0;j<6;j++) {
    const a=i/64*TAU,b=j/6*TAU,da=TAU/64,db=TAU/6;
    torus.push({v:[point(a,b),point(a+da,b),point(a+da,b+db),point(a,b+db)],n:unit([Math.cos(a+da/2)*Math.cos(b+db/2),Math.sin(a+da/2)*Math.cos(b+db/2),Math.sin(b+db/2)]),kind:'ring'});
  }
  class PrimeScene {
    constructor(element) {
      this.element=element;this.canvas=element.querySelector('canvas');this.ctx=null;
      this.width=0;this.height=0;this.frames=0;this.phase=0;this.x=0;this.y=0;this.visible=false;this.disabled=false;
      try { this.ctx=this.canvas.getContext('2d',{alpha:true}); } catch (_) { /* Static vector remains. */ }
      if(!this.ctx){this.disabled=true;return;}
      this.resize();
    }
    resize() {
      if(this.disabled)return;
      const rect=this.element.getBoundingClientRect();
      this.width=Math.max(1,rect.width);this.height=Math.max(1,rect.height);
      this.dpr=Math.min(window.devicePixelRatio||1,1.6);
      this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);
      this.scale=Math.min(this.width/4.5,this.height/4.6);
      this.draw();
    }
    project(p) {
      const k=7.5/(7.5-p[2]);
      return [this.width*.51+p[0]*this.scale*k,this.height*.49-p[1]*this.scale*k];
    }
    path(vertices) {
      vertices.forEach((p,i)=>{const q=this.project(p);if(i)this.ctx.lineTo(...q);else this.ctx.moveTo(...q);});this.ctx.closePath();
    }
    surface(face) {
      const c=this.ctx,points=face.v.map(p=>this.project(p)),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
      const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
      const g=c.createLinearGradient(left,top,right+1,bottom+1),lambert=Math.max(0,dot(face.n,light));
      if(face.kind==='face') {
        const shift=Math.sin(this.phase*.13)*.035+this.x*.012;
        [[0,'#c4d0cb'],[.13,'#4f5d57'],[.24+shift,'#83938a'],[.32+shift,'#e1eee6'],[.338+shift,'#2b3830'],[.49,'#142219'],[.65,'#586a5d'],[.78,'#afc6b7'],[.803,'#728c7b'],[1,'#233d2d']].forEach(s=>g.addColorStop(...s));
      } else if(face.kind==='seam') {
        g.addColorStop(0,'#91b5a1');g.addColorStop(1,'#18291e');
      } else if(face.kind==='ring') {
        const v=Math.round(34+lambert*112);g.addColorStop(0,`rgb(${v-8},${v+15},${v})`);g.addColorStop(.4,'#203126');g.addColorStop(1,`rgb(${v},${v+22},${v+8})`);
      } else {
        const v=Math.round((face.kind==='bevel'?64:22)+lambert*(face.kind==='bevel'?160:58));
        g.addColorStop(0,`rgb(${v-5},${v+11},${v})`);g.addColorStop(.48,`rgb(${Math.round(v*.32)},${Math.round(v*.43)},${Math.round(v*.36)})`);g.addColorStop(1,`rgb(${Math.round(v*.63)},${Math.round(v*.78)},${Math.round(v*.68)})`);
      }
      c.beginPath();this.path(face.v);if(face.hole)this.path(face.hole);c.fillStyle=g;c.fill('evenodd');
      if(face.kind!=='ring') {
        c.strokeStyle=face.kind==='face'?'rgba(209,235,220,.45)':'rgba(127,174,145,.23)';c.lineWidth=.65;c.stroke();
      }
      if(face.kind==='face') {
        c.save();c.clip('evenodd');c.strokeStyle='rgba(213,240,224,.025)';c.lineWidth=.5;
        // Subtle machined grain; fixed lines, no random or animated noise.
        for(let y=top;y<bottom;y+=3.8){c.beginPath();c.moveTo(left,y);c.lineTo(right,y-15);c.stroke();}
        c.restore();
      }
    }
    draw(dt=0,pointer={x:0,y:0}) {
      if(this.disabled||!this.width)return;
      this.phase+=dt;this.x+=(pointer.x-this.x)*.08;this.y+=(pointer.y-this.y)*.08;
      const c=this.ctx,w=this.width,h=this.height,t=this.phase;
      c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,w,h);
      // Elliptical contact light; the surrounding page stays neutral black.
      c.save();c.translate(w*.5,h*.8);c.scale(1,.22);
      const shadow=c.createRadialGradient(0,0,0,0,0,w*.33);shadow.addColorStop(0,'rgba(95,200,133,.105)');shadow.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=shadow;c.fillRect(-w,-h,w*2,h*2);c.restore();
      const rx=-.19+this.y*.13,ry=-.5+Math.sin(t*.19)*.13+this.x*.27,rz=-.18+Math.sin(t*.13)*.025;
      let faces=mesh.map(f=>({v:f.v.map(p=>rotate(p,rx,ry,rz)),hole:f.hole?.map(p=>rotate(p,rx,ry,rz)),n:rotate(f.n,rx,ry,rz),kind:f.kind}));
      faces=faces.concat(torus.map(f=>({v:f.v.map(p=>rotate(p,1.08,-.17,.36)),n:rotate(f.n,1.08,-.17,.36),kind:f.kind})));
      faces.filter(f=>f.n[2]>-.01).map(f=>{f.depth=f.v.reduce((a,p)=>a+p[2],0)/f.v.length;return f;}).sort((a,b)=>a.depth-b.depth).forEach(f=>this.surface(f));
      // Precise orbit ticks. No particles, random counters or simulated live data.
      for(let i=0;i<40;i++) {
        const a=i/40*TAU,p=rotate([2.16*Math.cos(a),2.16*Math.sin(a),0],1.08,-.17,.36),q=rotate([2.19*Math.cos(a),2.19*Math.sin(a),0],1.08,-.17,.36);
        c.beginPath();c.moveTo(...this.project(p));c.lineTo(...this.project(q));c.strokeStyle=i%5===0?'#526a5b':'#2b4032';c.lineWidth=.6;c.stroke();
      }
      const a=t*.2+.72,p=rotate([1.97*Math.cos(a),1.97*Math.sin(a),0],1.08,-.17,.36);
      if(p[2]>0){c.beginPath();c.arc(...this.project(p),2.4,0,TAU);c.fillStyle='#a4ffd0';c.fill();}
      this.frames++;this.element.dataset.frames=String(this.frames);this.element.classList.add('scene-ready');
    }
  }
  window.PrimeScene=PrimeScene;
})();
