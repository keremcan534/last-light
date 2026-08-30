import type Phaser from 'phaser';
import type { AppUI } from '../src/game/ui/AppUI';
import type { GameScene } from '../src/game/scenes/GameScene';
import { levels } from '../src/game/levels/levels';

/** Browser QA controls, loaded only by Vite dev at ?qa=1. Never in dist. */
export function install(game:Phaser.Game,ui:AppUI){
  const panel=document.createElement('details');
  panel.id='qa-panel';panel.open=true;
  panel.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99;width:260px;padding:12px;background:#12242bf5;border:1px solid #63838b;color:#c0d0c7;font:11px monospace;line-height:1.7;';
  panel.innerHTML='<summary style="cursor:pointer">DEV / BROWSER QA</summary><p>Separate QA save. F2: visibility overlay.</p><label>Room <select id="qa-level" aria-label="QA room">'+levels.map(l=>`<option value="${l.id}">${l.id} · ${l.name}</option>`).join('')+'</select></label><div style="display:flex;gap:4px;flex-wrap:wrap;margin:10px 0"><button data-qa="open">Open room</button><button data-qa="light">Light 3 seconds</button><button data-qa="input">Check keyboard</button><button data-qa="replay">Replay escape</button></div><output id="qa-state" style="white-space:pre-wrap;display:block"></output><p id="qa-result" role="status"></p>';
  panel.querySelectorAll('button,select').forEach(e=>(e as HTMLElement).style.cssText='border:1px solid #63838b;background:#203940;color:#eee;padding:5px;font:10px monospace');
  document.body.append(panel);
  for(const [action,label] of [['rush','Rush 2 seconds'],['walk','Walk 5 seconds']]){
    const button=document.createElement('button');button.dataset.qa=action;button.textContent=label;
    button.style.cssText='border:1px solid #63838b;background:#203940;color:#eee;padding:5px;font:10px monospace';
    panel.querySelector('div')!.append(button);
  }
  let replayTimer:ReturnType<typeof setInterval>|undefined;
  let telemetry:ReturnType<typeof setInterval>;
  let busy=false;
  let frames=0,frameSample=performance.now(),renderFps=0;
  const countFrame=()=>{frames++;};
  game.events.on('poststep',countFrame);
  const current=()=>game.scene.getScene('Game') as GameScene;
  const state=panel.querySelector<HTMLOutputElement>('#qa-state')!;
  const result=panel.querySelector<HTMLElement>('#qa-result')!;
  const key=(code:string,down:boolean)=>window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));
  const delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
  const clearReplay=()=>{clearInterval(replayTimer);replayTimer=undefined;ui.controls?.clear();};

  panel.addEventListener('click',async event=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-qa]');
    if(!button||busy)return;
    button.blur();
    switch(button.dataset.qa){
      case 'open':{
        clearReplay();
        const id=Number(panel.querySelector<HTMLSelectElement>('#qa-level')!.value);
        game.scene.stop('Menu');game.scene.stop('Game');game.scene.start('Game',{id});result.textContent='Room opened without altering campaign unlocks.';break;
      }
      case 'light':{
        if(ui.screen!=='game')return;
        key('Space',true);result.textContent='Light held by keyboard event for 3 seconds.';
        setTimeout(()=>key('Space',false),3000);break;
      }
      case 'input':{
        if(ui.screen!=='game')return;
        busy=true;const before={...current().simulation.state.player};
        key('Space',true);key('KeyD',true);await delay(180);
        const moving=current().simulation.state.player.x>before.x;
        const lit=current().simulation.state.lightOn;
        key('Space',false);await delay(70);
        const released=!current().simulation.state.lightOn;
        key('KeyD',false);ui.controls?.clear();
        result.textContent=`KEYBOARD: movement ${moving?'PASS':'FAIL'} / light ${lit?'PASS':'FAIL'} / release ${released?'PASS':'FAIL'}`;
        busy=false;break;
      }
      case 'rush':case 'walk':{
        if(ui.screen!=='game')return;
        const slow=button.dataset.qa==='walk';
        key('ShiftLeft',slow);key('ArrowUp',true);
        result.textContent=slow?'Slow keyboard approach for 5 seconds.':'Fast keyboard approach for 2 seconds.';
        setTimeout(()=>{key('ArrowUp',false);key('ShiftLeft',false);},slow?5000:2000);
        break;
      }
      case 'replay':{
        if(ui.screen!=='game')return;
        clearReplay();
        const scene=current(),route=scene.simulation.level.solution;
        let index=0,waitUntil=0,flashUntil=0,startedWait=-1,startedFlash=-1;
        const start=performance.now();
        result.textContent='Replaying real movement; enemies and hazards remain active.';
        ui.controls!.state.begin(999,'move',0,0);
        replayTimer=setInterval(()=>{
          if(!scene.scene.isActive()||scene.paused||scene.simulation.state.status!=='playing'||!ui.controls){
            result.textContent=`REPLAY ${scene.simulation.state.status.toUpperCase()} · ${scene.simulation.state.stats.time.toFixed(2)}s · ${scene.simulation.state.stats.detections} detections`;
            clearReplay();return;
          }
          if(performance.now()-start>180000){result.textContent='REPLAY TIMEOUT';clearReplay();return;}
          const target=route[index] as ({x:number;y:number;wait?:number;speed?:number;flash?:number}|undefined);
          if(!target){clearReplay();return;}
          const p=scene.simulation.state.player,dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);
          if(d<.09){
            ui.controls.state.move(999,0,0);
            if(startedFlash!==index){flashUntil=scene.simulation.state.time+(target.flash??0);startedFlash=index;}
            if(scene.simulation.state.time<flashUntil){ui.controls.state.begin(998,'light',0,0);return;}
            ui.controls.state.end(998);
            if(startedWait!==index){waitUntil=scene.simulation.state.time+(target.wait??0);startedWait=index;}
            if(scene.simulation.state.time>=waitUntil)index++;
          }else{
            const speed=target.speed??.38;
            ui.controls.state.move(999,dx/d*44*speed,dy/d*44*speed);
          }
        },16);break;
      }
    }
  });
  telemetry=setInterval(()=>{
    const now=performance.now();
    if(now-frameSample>=1000){renderFps=frames*1000/(now-frameSample);frames=0;frameSample=now;}
    if(!game.scene.isActive('Game')){state.textContent=`SCREEN ${ui.screen}`;return;}
    const s=current().simulation.state;
    state.textContent=`${s.status.toUpperCase()} | ${current().paused?'PAUSED':'LIVE'}\nplayer ${s.player.x.toFixed(2)}, ${s.player.y.toFixed(2)}\nlight ${s.lightOn?'ON':'OFF'} | energy ${(s.energy*100).toFixed(0)}%\n${s.visible?'VISIBLE':'HIDDEN'} | ${s.stats.detections} detections\n${s.enemies.map(e=>`${e.type}: ${e.state}`).join('\n')}\n${Math.round(renderFps)} RENDER FPS / ${Math.round(game.loop.actualFps)} RAF FPS`;
  },150);
  if(import.meta.hot)import.meta.hot.dispose(()=>{clearReplay();clearInterval(telemetry);game.events.off('poststep',countFrame);panel.remove();});
}
