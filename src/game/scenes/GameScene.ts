import Phaser from 'phaser';
import type { Services } from '../Services';
import type { GameState, Vec } from '../types';
import { getLevel } from '../levels/levels';
import { Simulation } from '../systems/Simulation';
import { WorldRenderer } from '../systems/WorldRenderer';
import { HintService } from '../systems/HintService';

export function advanceSimulation(simulation: Simulation, input: { x: number; y: number; light: boolean }, dt: number, accumulator: number, afterStep?: () => void) {
  accumulator += dt;
  let steps = 0;
  while (accumulator >= 1 / 60 && simulation.state.status === 'playing') {
    simulation.step(input, 1 / 60);
    accumulator -= 1 / 60;
    steps++;
    afterStep?.();
  }
  return { accumulator, steps };
}

export class GameScene extends Phaser.Scene {
  simulation!:Simulation;
  paused=false;
  private worldView!:WorldRenderer;
  private services!:Services;
  private accumulator=0;
  private visualTime=0;
  private hudClock=0;
  private outcomeAt:number|null=null;
  private resultShown=false;
  private hint:Vec|null=null;
  private hintUntil=0;
  private hintService=new HintService();
  private debug=false;
  private runToken=0;
  private hitStop=0;
  private frozenSpatial: Pick<GameState, 'player' | 'enemies'> | null = null;

  constructor(){super('Game');}
  create(data:{id?:number}){
    this.services=this.registry.get('services');
    this.simulation=new Simulation(getLevel(data.id??1));
    this.worldView=new WorldRenderer(this,'game-world');
    this.paused=false;this.accumulator=0;this.visualTime=0;this.hudClock=0;
    this.outcomeAt=null;this.resultShown=false;this.hint=null;this.debug=false;this.hitStop=0;this.frozenSpatial=null;this.runToken++;
    this.services.ui.gameplay(this.simulation.level);
    this.services.audio.unlock();
    if(import.meta.env.DEV)this.input.keyboard?.on('keydown-F2',this.toggleDebug,this);
    this.events.once('shutdown',()=>{
      this.runToken++;this.worldView.destroy();
      this.input.keyboard?.off('keydown-F2',this.toggleDebug,this);
      this.services.ui.controls?.destroy();
    });
  }

  private toggleDebug(){this.debug=!this.debug;}
  setPaused(paused:boolean){this.paused=paused;this.accumulator=0;this.services.ui.controls?.clear();if(paused)this.services.audio.suspend();}
  async requestHint(){
    if(this.paused||this.simulation.state.status!=='playing')return;
    const token=this.runToken;
    const target=await this.hintService.request(this.simulation.state.player,this.simulation.level);
    if(token!==this.runToken||!this.scene.isActive()||this.paused)return;
    this.hint=target;this.hintUntil=this.visualTime+3.5;
    this.services.ui.toast(this.simulation.level.hint);
  }

  update(_time:number,delta:number){
    const dt=Math.min(delta/1000,.1);
    this.visualTime+=dt;
    const {ui,audio,progress}=this.services;
    const freezeFrame=this.hitStop>0;
    this.hitStop=Math.max(0,this.hitStop-dt);
    if(!this.paused&&this.simulation.state.status==='playing'){
      const advanced=advanceSimulation(this.simulation,ui.controls?.read()??{x:0,y:0,light:false},dt,this.accumulator,()=>{
        if(this.hitStop<=0)this.frozenSpatial = null;
        for(const event of this.simulation.state.events){
          audio.play(event);
          if(event==='alert'&&!progress.data.settings.reducedMotion){
            this.hitStop=.045;
            this.frozenSpatial={player:{...this.simulation.state.player},enemies:this.simulation.state.enemies.map(enemy=>({...enemy,lastKnown:{...enemy.lastKnown},route:enemy.route.map(point=>({...point}))}))};
          }
          if(progress.data.settings.vibration&&'vibrate' in navigator&&(event==='alert'||event==='caught'))navigator.vibrate(event==='alert'?35:[55,30,75]);
        }
        if(this.simulation.state.status!=='playing'){this.outcomeAt=this.visualTime;ui.controls?.clear();}
      });
      this.accumulator=advanced.accumulator;
    }
    const state=this.simulation.state;
    const age=this.outcomeAt===null?10:this.visualTime-this.outcomeAt;
    if(state.status!=='playing'&&!this.resultShown&&age>(state.status==='escaped'?.55:.23)){
      this.resultShown=true;
      const stars=state.status==='escaped'?progress.record(this.simulation.level.id,state.stats,this.simulation.level):0;
      ui.outcome(state,stars);
    }
    if(this.visualTime>this.hintUntil)this.hint=null;
    const tension=this.paused?0:state.enemies.some(e=>e.state==='chase')?1:state.enemies.some(e=>e.state==='alert'||e.state==='search')?.6:0;
    audio.update(dt,tension);
    this.hudClock+=dt;
    if(this.hudClock>.08){ui.update(state);this.hudClock=0;}
    const renderState = freezeFrame && this.frozenSpatial ? {...state,...this.frozenSpatial} : state;
    this.worldView.render(this.simulation.level,renderState,this.visualTime,this.hint,this.debug,progress.data.settings.reducedMotion,age);
  }
}
