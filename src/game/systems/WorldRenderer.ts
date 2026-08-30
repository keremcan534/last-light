import Phaser from 'phaser';
import type { Enemy, GameState, Level, Vec } from '../types';
import { hasLineOfSight, securityAngle } from './Geometry';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
function line(ctx: Ctx, points: number[], color: string, width = 1) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2) ctx.lineTo(points[i],points[i+1]);
  ctx.stroke();
}
function circle(ctx: Ctx, x: number,y: number,r: number,color: string) {
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,TAU);ctx.fill();
}
function glow(ctx: Ctx,x:number,y:number,r:number,inner:string,outer='rgba(0,0,0,0)') {
  const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,inner);g.addColorStop(1,outer);
  circle(ctx,x,y,r,g as unknown as string);
}
function canvas() { return document.createElement('canvas'); }

/** One cached room + small 2D masks. No full-scene lights or post-processing. */
export class WorldRenderer {
  private texture: Phaser.Textures.CanvasTexture;
  private image: Phaser.GameObjects.Image;
  private room=canvas();
  private world=canvas();
  private mask=canvas();
  private width=0;
  private height=0;
  private roomKey='';
  private cell=32;
  private ox=30;
  private oy=130;

  constructor(private scene: Phaser.Scene, private key:string) {
    this.texture=scene.textures.createCanvas(key,420,760)!;
    this.image=scene.add.image(0,0,key).setOrigin(0);
    this.resize();
  }

  private resize() {
    const w=Math.round(this.scene.scale.width),h=Math.round(this.scene.scale.height);
    if(w===this.width&&h===this.height)return;
    this.width=w;this.height=h;
    this.texture.setSize(w,h);
    this.image.setDisplaySize(w,h);
    for(const c of [this.room,this.world,this.mask]){c.width=w;c.height=h;}
    this.roomKey='';
  }

  private point(p:Vec):Vec{return{x:this.ox+p.x*this.cell,y:this.oy+p.y*this.cell};}

  menu(time:number,reduced=false) {
    this.resize();
    const c=this.texture.context,w=this.width,h=this.height,s=w/420;
    const t=reduced?1:time;
    c.clearRect(0,0,w,h);c.fillStyle='#0b141a';c.fillRect(0,0,w,h);
    const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#112027');bg.addColorStop(.5,'#0d191f');bg.addColorStop(1,'#091115');c.fillStyle=bg;c.fillRect(0,0,w,h);
    const cx=w*.65,cy=h*.425;
    glow(c,cx,cy,240*s,'rgba(79,106,101,.11)');
    // Perspective architecture is deliberately quiet beneath the typography.
    const vx=w*.65,vy=h*.47;
    for(let i=-4;i<=7;i++)line(c,[vx,vy,w*.5+i*w*.24,h*.91],'rgba(91,121,125,.07)');
    for(let i=0;i<7;i++){
      const yy=vy+Math.pow((i+1)/7,2)*(h*.38);
      line(c,[0,yy,w,yy],'rgba(101,126,125,.045)');
    }
    c.fillStyle='#0b151b';c.beginPath();c.moveTo(w*.43,h*.32);c.lineTo(w*.90,h*.30);c.lineTo(w*.90,h*.61);c.lineTo(w*.43,h*.60);c.fill();
    line(c,[w*.43,h*.32,w*.9,h*.3,w*.9,h*.61],'#34414655');
    const doorW=43*s,doorH=h*.169,dx=cx-doorW/2,dy=cy-doorH*.38;
    const cycle=(t%12)/12;
    const light=reduced?.65:cycle<.38?.85:cycle<.68?.2:.7;
    glow(c,cx,dy+doorH*.63,95*s,`rgba(193,171,112,${.13+light*.09})`);
    glow(c,cx,dy+doorH*.8,43*s,'rgba(228,204,143,.13)');
    c.fillStyle='#02090e';c.fillRect(dx-6*s,dy-6*s,doorW+12*s,doorH+9*s);
    line(c,[dx-8*s,dy+doorH+5*s,dx-8*s,dy-9*s,dx+doorW+8*s,dy-9*s,dx+doorW+8*s,dy+doorH+5*s],'#61747766',1.2);
    const dg=c.createLinearGradient(dx,dy,dx+doorW,dy);dg.addColorStop(0,'#7c806950');dg.addColorStop(.2,'#bbb28a28');dg.addColorStop(.9,'#e0ca8b0a');dg.addColorStop(1,'#f0d99b99');c.fillStyle=dg;c.fillRect(dx,dy,doorW,doorH);
    line(c,[dx,dy+doorH,dx,dy,dx+doorW,dy,dx+doorW,dy+doorH],'#c4c6a690',1.1);
    line(c,[dx+doorW-2*s,dy+2*s,dx+doorW-2*s,dy+doorH],'#f0e1b9',1.3*s);
    const floor=c.createLinearGradient(0,dy+doorH,0,h*.72);floor.addColorStop(0,'#d4c69728');floor.addColorStop(1,'#d4c69700');
    c.fillStyle=floor;c.beginPath();c.moveTo(dx,dy+doorH);c.lineTo(dx+doorW,dy+doorH);c.lineTo(cx+75*s,h*.73);c.lineTo(cx-120*s,h*.73);c.fill();
    line(c,[dx-12*s,dy+doorH+5*s,dx+doorW+12*s,dy+doorH+5*s],'#bac4a45c');
    // A twelve-second vignette: light, a watching shadow, darkness, an open door.
    const escapeProgress=reduced?0:Math.min(1,Math.max(0,(cycle-.68)/.24));
    const px=cx-34*s*(1-escapeProgress),py=dy+doorH+55*s-escapeProgress*(55*s+doorH*.38);
    glow(c,px,py,95*s,`rgba(209,191,139,${light*.13})`);
    c.save();c.globalAlpha=1-escapeProgress*.85;c.translate(px,py);c.scale(s,s);this.figure(c,0,0,15,false,t);c.restore();
    if(escapeProgress>.75)glow(c,cx,dy+doorH*.65,80*s,`rgba(147,205,201,${(escapeProgress-.75)*.5})`);
    if(!reduced&&cycle>.17&&cycle<.48){
      const a=Math.sin((cycle-.17)/.31*Math.PI)*.5;
      c.save();c.globalAlpha=a;c.translate(w*.89,h*.59);c.scale(s,s);this.figure(c,0,0,19,true,t);c.restore();
      if(cycle<.3){c.fillStyle=`rgba(205,143,107,${a})`;c.font='10px monospace';c.textAlign='center';c.fillText('!',w*.89,h*.59-19*s);}
    }
    // Tiny suspended dust, deterministically placed and slowly drifting.
    for(let i=0;i<43;i++){
      const x=((i*73.7)%w)+Math.sin(t*.16+i)*5;
      const y=h*.27+((i*43.17)%(h*.43))+Math.cos(t*.1+i)*4;
      const near=Math.max(0,1-Math.hypot(x-cx,y-(dy+doorH)) / (160*s));
      circle(c,x,y,i%4===0?1:.5,`rgba(203,202,165,${near*.34})`);
    }
    const veil=c.createLinearGradient(0,0,0,h);veil.addColorStop(0,'#0a131833');veil.addColorStop(.18,'#0a131800');veil.addColorStop(.62,'#09111500');veil.addColorStop(.78,'#091115d9');veil.addColorStop(1,'#091115');c.fillStyle=veil;c.fillRect(0,0,w,h);
    this.vignette(c);
  }

  private layout(level:Level) {
    const top=this.height<640?110:136,bottom=this.height-(this.height<640?143:173);
    this.cell=Math.min((this.width-42)/level.map.width,(bottom-top)/level.map.height);
    this.ox=(this.width-level.map.width*this.cell)/2;
    this.oy=top+(bottom-top-level.map.height*this.cell)/2;
  }

  private cacheRoom(level:Level) {
    this.layout(level);
    const key=`${level.id}:${this.width}:${this.height}`;
    if(this.roomKey===key)return;
    this.roomKey=key;
    const c=this.room.getContext('2d')!,u=this.cell;
    c.clearRect(0,0,this.width,this.height);
    c.fillStyle='#233139';c.fillRect(this.ox,this.oy,level.map.width*u,level.map.height*u);
    for(let y=0;y<level.map.height;y++)for(let x=0;x<level.map.width;x++){
      const p=this.point({x,y});
      c.fillStyle=['#26353b','#28373c','#25343b','#29373d'][(x*7+y*3)%4];
      c.fillRect(p.x+.8,p.y+.8,u-1.6,u-1.6);
      if((x*3+y*11)%7===0){
        line(c,[p.x+u*.2,p.y+u*.7,p.x+u*.4,p.y+u*.56,p.x+u*.57,p.y+u*.64],'#11232d50',.7);
      }
      if((x*17+y*7)%13===0)circle(c,p.x+u*.7,p.y+u*.25,.7,'#7f969129');
    }
    c.strokeStyle='#607479';c.lineWidth=1;c.strokeRect(this.ox,this.oy,level.map.width*u,level.map.height*u);
    for(const wall of level.walls){
      const p=this.point(wall),w=wall.w*u,h=wall.h*u;
      c.fillStyle='#070e15a0';c.fillRect(p.x+3,p.y+5,w,h);
      c.fillStyle='#16222c';c.fillRect(p.x,p.y,w,h);
      c.fillStyle='#39464d';c.fillRect(p.x,p.y,w,Math.min(4,h));
      line(c,[p.x,p.y,p.x+w,p.y,p.x+w,p.y+h],'#6c7d814d');
      line(c,[p.x+1,p.y+4,p.x+1,p.y+h-1],'#4a5b653b');
      if(w>u*1.3)line(c,[p.x+u*.5,p.y+h*.5,p.x+w-u*.5,p.y+h*.5],'#26333c',2);
    }
    for(const trap of level.traps){
      const p=this.point(trap);
      circle(c,p.x,p.y,u*.37,'#0c141b');
      for(let i=0;i<5;i++){
        const a=i*TAU/5;c.fillStyle='#53616a';c.beginPath();c.moveTo(p.x+Math.cos(a)*u*.36,p.y+Math.sin(a)*u*.36);c.lineTo(p.x+Math.cos(a+.4)*u*.27,p.y+Math.sin(a+.4)*u*.27);c.lineTo(p.x+Math.cos(a+.2)*u*.14,p.y+Math.sin(a+.2)*u*.14);c.fill();
      }
      line(c,[p.x-u*.3,p.y+u*.4,p.x+u*.3,p.y+u*.4],'#9e8162',1.2);
    }
    const ep=this.point(level.exit);
    glow(c,ep.x,ep.y,u*1.1,'#92c9bc45');
    c.fillStyle='#0b202b';c.fillRect(ep.x-u*.3,ep.y-u*.36,u*.6,u*.72);
    c.strokeStyle='#9ccfc7';c.lineWidth=1.5;c.strokeRect(ep.x-u*.3,ep.y-u*.36,u*.6,u*.72);
    line(c,[ep.x-u*.16,ep.y+u*.23,ep.x-u*.16,ep.y-u*.23,ep.x+u*.16,ep.y-u*.23,ep.x+u*.16,ep.y+u*.23],'#527e83');
    line(c,[ep.x-u*.18,ep.y+u*.48,ep.x+u*.18,ep.y+u*.48],'#aedbd3',1.7);
    c.fillStyle='#b4d8c9';c.font=`${Math.max(5,u*.16)}px monospace`;c.textAlign='center';c.fillText('EXIT',ep.x,ep.y-u*.52);
  }

  render(level:Level,state:GameState,time:number,hint:Vec|null,debug=false,reduced=false,effectAge=10) {
    this.resize();this.cacheRoom(level);
    const c=this.texture.context,wc=this.world.getContext('2d')!,mc=this.mask.getContext('2d')!;
    const w=this.width,h=this.height,u=this.cell,p=this.point(state.player);
    const t=reduced?0:time;
    c.clearRect(0,0,w,h);c.fillStyle='#080f15';c.fillRect(0,0,w,h);
    glow(c,w*.5,h*.45,w,'#1632401a');
    // Barely perceptible room boundaries provide orientation, never a readable map.
    c.globalAlpha=.045;c.drawImage(this.room,0,0);c.globalAlpha=1;
    wc.clearRect(0,0,w,h);wc.drawImage(this.room,0,0);
    const radius=state.status==='escaped'?u*(3.5+effectAge*18):state.lightOn?u*(3.4+Math.sin(t*2.3)*.035):u*.88;
    glow(wc,p.x,p.y,radius,state.lightOn?'#d8c99022':'#6b9eac0a');
    for(let i=0;i<34;i++){
      const x=this.ox+((i*29.17)%(level.map.width*u)),y=this.oy+((i*47.73)%(level.map.height*u));
      circle(wc,x+Math.sin(t*.15+i)*2,y+Math.cos(t*.12+i)*2,i%7===0?.85:.45,'#c4d6c266');
    }
    for(const enemy of state.enemies){
      const ep=this.point(enemy);
      if(enemy.type==='listener'){
        wc.strokeStyle='#af927851';wc.lineWidth=.8;
        for(const r of [u*.45,u*.65]){wc.beginPath();wc.arc(ep.x,ep.y,r,-.6,.6);wc.stroke();wc.beginPath();wc.arc(ep.x,ep.y,r,Math.PI-.6,Math.PI+.6);wc.stroke();}
      }
      this.figure(wc,ep.x,ep.y,u*.42,true,t,enemy);
    }
    this.figure(wc,p.x,p.y,u*.37,false,t);
    if(state.lightOn){
      glow(wc,p.x+u*.16,p.y-u*.11,u*.37,'#ffda8766');
      circle(wc,p.x+u*.16,p.y-u*.11,1.8,'#f2e6b5');
    }
    mc.clearRect(0,0,w,h);
    const light=mc.createRadialGradient(p.x,p.y,Math.min(u*.32,radius*.2),p.x,p.y,radius);
    light.addColorStop(0,'rgba(255,255,255,1)');light.addColorStop(.36,state.lightOn?'rgba(255,255,255,.95)':'rgba(255,255,255,.45)');light.addColorStop(.7,'rgba(255,255,255,.5)');light.addColorStop(1,'rgba(255,255,255,0)');
    circle(mc,p.x,p.y,radius,light as unknown as string);
    for(const beam of level.securityLights){
      const origin=this.point(beam),angle=securityAngle(beam,state.time);
      const points:Vec[]=[origin];
      for(let ray=0;ray<=20;ray++){
        const a=angle-.26+ray*.52/20;let r=.08;
        while(r<beam.radius&&hasLineOfSight(beam,{x:beam.x+Math.cos(a)*r,y:beam.y+Math.sin(a)*r},level.walls))r+=.08;
        points.push(this.point({x:beam.x+Math.cos(a)*Math.min(r,beam.radius),y:beam.y+Math.sin(a)*Math.min(r,beam.radius)}));
      }
      for(const [ctx,alpha] of [[wc,.27],[mc,.62]] as [Ctx,number][]){
        const bg=ctx.createRadialGradient(origin.x,origin.y,0,origin.x,origin.y,beam.radius*u);bg.addColorStop(0,`rgba(174,204,200,${alpha})`);bg.addColorStop(.8,`rgba(174,204,200,${alpha*.65})`);bg.addColorStop(1,'rgba(174,204,200,0)');
        ctx.fillStyle=bg;ctx.beginPath();ctx.moveTo(origin.x,origin.y);for(const q of points)ctx.lineTo(q.x,q.y);ctx.closePath();ctx.fill();
      }
      circle(wc,origin.x,origin.y,3,'#c1d8c9');circle(mc,origin.x,origin.y,5,'#fff');
    }
    wc.globalCompositeOperation='destination-in';wc.drawImage(this.mask,0,0);wc.globalCompositeOperation='source-over';
    c.save();
    if(!reduced){
      const cameraX=(level.map.width*.5-state.player.x)*.18,cameraY=(level.map.height*.5-state.player.y)*.1;
      c.translate(cameraX,cameraY);
      if(state.status==='caught'&&effectAge<.25)c.translate(Math.sin(effectAge*170)*3*(1-effectAge*4),Math.cos(effectAge*145)*2);
    }
    c.drawImage(this.world,0,0);
    // The silhouette stays legible within its tiny halo, even when not lighting.
    circle(c,p.x,p.y-u*.16,1.2,state.lightOn?'#e9dfb3':'#9db8b855');
    for(const enemy of state.enemies) if(enemy.state==='alert'){
      const ep=this.point(enemy);const bounce=reduced?0:Math.sin(time*30)*1.3;
      circle(c,ep.x,ep.y-u*.7+bounce,6,'#b16c50');c.fillStyle='#fff2c2';c.textAlign='center';c.font='bold 9px monospace';c.fillText('!',ep.x,ep.y-u*.7+bounce+3);
    }
    if(hint){
      const hp=this.point(hint);const a=Math.atan2(hp.y-p.y,hp.x-p.x);const length=Math.min(u*1.7,Math.hypot(hp.x-p.x,hp.y-p.y));
      const end={x:p.x+Math.cos(a)*length,y:p.y+Math.sin(a)*length};
      c.setLineDash([2,5]);line(c,[p.x,p.y,end.x,end.y],'#98cbb4a0',1);c.setLineDash([]);
      glow(c,end.x,end.y,15,'#b8d7bd35');
      line(c,[end.x-Math.cos(a-.5)*8,end.y-Math.sin(a-.5)*8,end.x,end.y,end.x-Math.cos(a+.5)*8,end.y-Math.sin(a+.5)*8],'#b6d3b9',1.3);
    }
    if(import.meta.env.DEV&&debug)this.debug(c,level,state);
    c.restore();
    this.vignette(c);
    if(state.status==='caught'&&effectAge<.3){c.fillStyle=`rgba(137,49,34,${.17*(1-effectAge/.3)})`;c.fillRect(0,0,w,h);}
    if(state.status==='escaped'&&effectAge<.6){c.fillStyle=`rgba(199,221,194,${Math.sin(effectAge/.6*Math.PI)*.28})`;c.fillRect(0,0,w,h);}
  }

  private figure(c:Ctx,x:number,y:number,size:number,enemy:boolean,time:number,actor?:Enemy) {
    const bob=Math.sin(time*3+x)*.4;
    c.save();c.translate(x,y);
    c.fillStyle='#03090dc0';c.beginPath();c.ellipse(1,size*.35,size*.6,size*.24,0,0,TAU);c.fill();
    c.fillStyle=enemy?'#151c24':'#17252c';c.beginPath();c.moveTo(-size*.23,-size*.24+bob);c.quadraticCurveTo(-size*.6,size*.12,-size*.42,size*.53);c.lineTo(size*.39,size*.53);c.quadraticCurveTo(size*.5,size*.03,size*.2,-size*.26+bob);c.closePath();c.fill();
    c.strokeStyle=enemy?'#49313c':'#7d898065';c.lineWidth=.8;c.stroke();
    circle(c,0,-size*.37+bob,size*.25,enemy?'#161921':'#49524b');
    circle(c,0,-size*.33+bob,size*.18,'#0d171d');
    line(c,[-size*.18,size*.5,-size*.2,size*.68],'#070e13',2);
    line(c,[size*.19,size*.5,size*.22,size*.68],'#070e13',2);
    if(enemy){
      const eye=actor?.type==='listener'?'#b49874':'#bd6f69';
      glow(c,0,-size*.31,size*.45,actor?.state==='chase'?'#d06b4244':'#c750421b');
      circle(c,-size*.08,-size*.32+bob,.85,eye);circle(c,size*.08,-size*.32+bob,.85,eye);
    }else line(c,[-size*.25,-size*.04,size*.17,size*.11],'#b3b09970',1.2);
    c.restore();
  }

  private vignette(c:Ctx) {
    const g=c.createRadialGradient(this.width/2,this.height*.45,this.width*.3,this.width/2,this.height*.48,this.height*.7);
    g.addColorStop(0,'#02090d00');g.addColorStop(1,'#02090d88');c.fillStyle=g;c.fillRect(0,0,this.width,this.height);
  }

  private debug(c:Ctx,level:Level,state:GameState) {
    if(!import.meta.env.DEV)return;
    c.save();c.globalAlpha=.8;c.drawImage(this.room,0,0);c.globalAlpha=1;
    const p=this.point(state.player);
    for(const enemy of state.enemies){
      const e=this.point(enemy);c.strokeStyle='#cf6c714d';c.beginPath();c.arc(e.x,e.y,this.cell*(enemy.type==='watcher'?3.6:1.8),0,TAU);c.stroke();
      line(c,[e.x,e.y,p.x,p.y],hasLineOfSight(enemy,state.player,level.walls)?'#a9cb7f':'#e07777');
      const pts=enemy.route.flatMap(q=>{const r=this.point(q);return[r.x,r.y];});if(pts.length>=4)line(c,pts,'#67c0ca',1);
      c.fillStyle='#fff';c.font='9px monospace';c.textAlign='center';c.fillText(`${enemy.type}: ${enemy.state}`,e.x,e.y-12);
    }
    c.strokeStyle='#f0d770';c.beginPath();c.arc(p.x,p.y,state.noiseRadius*this.cell,0,TAU);c.stroke();
    circle(c,p.x,p.y,4,'#fff');c.fillStyle='#fff';c.font='9px monospace';c.textAlign='left';c.fillText(`DEV • ${state.visible?'VISIBLE':'HIDDEN'} • F2 to close`,this.ox,this.oy-10);c.restore();
  }

  destroy(){this.image.destroy();this.scene.textures.remove(this.key);}
}
