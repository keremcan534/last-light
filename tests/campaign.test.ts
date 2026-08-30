import { describe, expect, it } from 'vitest';
import { levels, getLevel } from '../src/game/levels/levels';
import { Simulation } from '../src/game/systems/Simulation';
import { hasLineOfSight, isWalkable } from '../src/game/systems/Geometry';

const replay=(level:typeof levels[number],options:{tolerance?:number; waits?:boolean; flashes?:boolean}={})=>{
  const {tolerance=.07,waits=true,flashes=true}=options;
  const sim=new Simulation(level);
  let minimumEnergy=sim.state.energy;
  const step=(light:boolean)=>{sim.step({x:0,y:0,light},1/60);minimumEnergy=Math.min(minimumEnergy,sim.state.energy);};
  for(const target of level.solution){
    for(let steps=0;steps<3600&&sim.state.status==='playing'&&Math.hypot(target.x-sim.state.player.x,target.y-sim.state.player.y)>tolerance;steps++){
      const dx=target.x-sim.state.player.x,dy=target.y-sim.state.player.y,len=Math.hypot(dx,dy);
      sim.step({x:dx/len*(target.speed??.38),y:dy/len*(target.speed??.38),light:false},1/60);
      minimumEnergy=Math.min(minimumEnergy,sim.state.energy);
    }
    for(let seconds=flashes?(target.flash??0):0;seconds>0&&sim.state.status==='playing';seconds-=1/60)
      step(true);
    for(let seconds=waits?(target.wait??0):0;seconds>0&&sim.state.status==='playing';seconds-=1/60)
      step(false);
  }
  return {sim,minimumEnergy};
};

describe('hand-authored campaign', () => {
  it('provides all 25 sequential rooms with distinct layouts', () => {
    expect(levels.map(l=>l.id)).toEqual(Array.from({length:25},(_,i)=>i+1));
    expect(new Set(levels.map(l=>JSON.stringify(l.walls))).size).toBe(25);
    expect(()=>getLevel(0)).toThrow();
  });
  it('teaches the mechanics in the requested order', () => {
    for(const l of levels){
      if(l.id<=3)expect(l.enemies).toHaveLength(0);
      if(l.id>=4&&l.id<=6){expect(l.enemies).toHaveLength(1);expect(l.enemies[0].route).toHaveLength(1);}
      if(l.id>=7&&l.id<=9)expect(l.enemies.some(e=>e.route.length>1)).toBe(true);
      if(l.id>=13&&l.id<=15)expect(l.enemies.length).toBeGreaterThan(1);
      if(l.id>=16)expect(l.lightEnergyEnabled).toBe(true);
      if(l.id>=19&&l.id<=21)expect(l.enemies.some(e=>e.type==='listener')).toBe(true);
      if(l.id>=22)expect(l.securityLights.length).toBeGreaterThan(0);
      if(l.id>=24){expect(l.enemies.some(e=>e.type==='listener')).toBe(true);expect(l.enemies.some(e=>e.type==='watcher'&&e.route.length>1)).toBe(true);}
    }
  });
  it('keeps authored room geometry, hazards, and patrol routes valid', () => {
    for(const level of levels){
      expect(level.name).not.toBe('');
      expect(level.hint).not.toBe('');
      expect(level.map).toEqual({width:10,height:14});
      expect(isWalkable(level.player,level)).toBe(true);
      expect(isWalkable(level.exit,level)).toBe(true);
      for(const enemy of level.enemies){
        expect(isWalkable(enemy,level)).toBe(true);
        expect(enemy.route.length).toBeGreaterThan(0);
        expect(enemy.route.every(point=>isWalkable(point,level))).toBe(true);
      }
      for(const trap of level.traps){
        expect(isWalkable(trap,level)).toBe(true);
        expect(Math.hypot(trap.x-level.player.x,trap.y-level.player.y)).toBeGreaterThan(.3);
        expect(Math.hypot(trap.x-level.exit.x,trap.y-level.exit.y)).toBeGreaterThan(.3);
      }
    }
  });
  it('places every new watcher or listener where the authored route enters its conservative risk area', () => {
    for(const level of levels.filter(level=>level.id>=4)) for(const enemy of level.enemies){
      const range=enemy.type==='watcher'?3.6:1.8;
      const riskPoints=[level.player,...level.solution];
      expect(riskPoints.some(point=>enemy.route.some(routePoint=>
        Math.hypot(point.x-routePoint.x,point.y-routePoint.y)<range && hasLineOfSight(point,routePoint,level.walls),
      )),`room ${level.id} ${enemy.type} is isolated from its route`).toBe(true);
    }
  });
  it('makes a mistimed searchlight crossing visibly alert its room watcher', () => {
    const level=getLevel(22);
    const sim=new Simulation({...level,player:{x:6,y:8}});
    sim.state.time=7.68;
    sim.step({x:0,y:0,light:false},1/60);
    expect(sim.state.securityExposed).toBe(true);
    expect(sim.state.enemies[0].state).toBe('alert');
    expect(sim.state.stats.detections).toBe(1);
  });
  it('detects the same level 22 route when its authored gate wait is skipped', () => {
    const level=getLevel(22);
    const sim=new Simulation(level);
    for(const target of level.solution){
      for(let steps=0;steps<3600&&sim.state.status==='playing'&&Math.hypot(target.x-sim.state.player.x,target.y-sim.state.player.y)>.07;steps++){
        const dx=target.x-sim.state.player.x,dy=target.y-sim.state.player.y,len=Math.hypot(dx,dy);
        sim.step({x:dx/len*(target.speed??.38),y:dy/len*(target.speed??.38),light:false},1/60);
      }
    }
    expect(sim.state.stats.detections).toBeGreaterThan(0);
  });
  it('requires the late sweep waits on the same real route', () => {
    for(const level of levels.filter(level=>level.id>=23)){
      const sim=new Simulation(level);
      for(const target of level.solution){
        for(let steps=0;steps<3600&&sim.state.status==='playing'&&Math.hypot(target.x-sim.state.player.x,target.y-sim.state.player.y)>.07;steps++){
          const dx=target.x-sim.state.player.x,dy=target.y-sim.state.player.y,len=Math.hypot(dx,dy);
          sim.step({x:dx/len*(target.speed??.38),y:dy/len*(target.speed??.38),light:false},1/60);
        }
      }
      expect(sim.state.stats.detections,`room ${level.id} did not constrain its un-timed route`).toBeGreaterThan(0);
    }
  });
  it('uses short authored flashes within every limited-light room budget', () => {
    for(const level of levels.filter(level=>level.id>=16)){
      expect(level.solution.some(point=>point.flash&&point.flash>0),`room ${level.id} needs an authored flash`).toBe(true);
      const {sim,minimumEnergy}=replay(level,{flashes:true});
      expect(sim.state.status,`room ${level.id} flash route`).toBe('escaped');
      expect(sim.state.stats.detections,`room ${level.id} flash route`).toBe(0);
      expect(sim.state.stats.lightTime).toBeGreaterThan(0);
      expect(sim.state.stats.lightTime).toBeLessThanOrEqual(level.lightBudget);
      expect(minimumEnergy,`room ${level.id} never consumed light energy`).toBeLessThan(1);
      expect(sim.state.energy,`room ${level.id} never recovered after its flash`).toBeGreaterThan(minimumEnergy);
    }
  });
  it('keeps the late sweep routes safe at the browser endpoint tolerance', () => {
    for(const level of levels.filter(level=>level.id>=22)){
      const sim=new Simulation(level);
      for(const target of level.solution){
        for(let steps=0;steps<3600&&sim.state.status==='playing'&&Math.hypot(target.x-sim.state.player.x,target.y-sim.state.player.y)>.09;steps++){
          const dx=target.x-sim.state.player.x,dy=target.y-sim.state.player.y,len=Math.hypot(dx,dy);
          sim.step({x:dx/len*(target.speed??.38),y:dy/len*(target.speed??.38),light:false},1/60);
        }
        for(let seconds=target.wait??0;seconds>0&&sim.state.status==='playing';seconds-=1/60)
          sim.step({x:0,y:0,light:false},1/60);
      }
      expect(sim.state.status,`room ${level.id} with .09 tolerance`).toBe('escaped');
      expect(sim.state.stats.detections,`room ${level.id} with .09 tolerance`).toBe(0);
    }
  });
  for(const level of levels){
    it(`room ${level.id}: authored route is collision-safe and escapes the real simulation`, () => {
      expect(isWalkable(level.player,level)).toBe(true);
      expect(isWalkable(level.exit,level)).toBe(true);
      const sim=new Simulation(level);
      let firstDetection:number|undefined;
      for(const target of level.solution){
        expect(isWalkable(target,level)).toBe(true);
        let steps=0;
        while(Math.hypot(target.x-sim.state.player.x,target.y-sim.state.player.y)>.07&&sim.state.status==='playing'&&steps<3600){
          const dx=target.x-sim.state.player.x,dy=target.y-sim.state.player.y,len=Math.hypot(dx,dy);
          const speed=target.speed??.38;
          sim.step({x:dx/len*speed,y:dy/len*speed,light:false},1/60);
          firstDetection??=sim.state.stats.detections?sim.state.time:undefined;
          steps++;
        }
        expect(steps,`stuck before ${JSON.stringify(target)}`).toBeLessThan(3600);
        for(let seconds=target.wait??0;seconds>0&&sim.state.status==='playing';seconds-=1/60)
          sim.step({x:0,y:0,light:false},1/60);
        firstDetection??=sim.state.stats.detections?sim.state.time:undefined;
      }
      expect(sim.state.status,`room ${level.id} at ${sim.state.time.toFixed(2)}s, ${JSON.stringify(sim.state.player)}`).toBe('escaped');
      if(level.id>=22)expect(sim.state.stats.detections,`room ${level.id} crossed a sweep unsafely at ${firstDetection?.toFixed(2)}s`).toBe(0);
    });
  }
});
