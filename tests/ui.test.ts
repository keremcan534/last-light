// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { AppUI } from '../src/game/ui/AppUI';
import { Controls } from '../src/game/ui/Controls';
import { ProgressManager } from '../src/game/systems/ProgressManager';
import { AudioManager } from '../src/game/systems/AudioManager';
import { getLevel } from '../src/game/levels/levels';
import { Simulation } from '../src/game/systems/Simulation';

let cleanup:()=>void=()=>{};
afterEach(()=>{cleanup();document.body.innerHTML='';});
function createUI(){
  document.body.innerHTML='<div id="ui"></div>';
  const store=new Map<string,string>();
  const storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);}};
  const progress=new ProgressManager(storage);progress.updateSettings({sound:false});
  const audio=new AudioManager();audio.setEnabled(false);
  const ui=new AppUI(document.querySelector('#ui')!,progress,audio);
  cleanup=()=>ui.controls?.destroy();
  return {ui,progress,storage};
}
const clickButton=(action:string)=>document.querySelector<HTMLButtonElement>(`button[data-action="${action}"]`)!.click();

describe('menus and progress UI',()=>{
  it('keeps locked rooms disabled and exposes the next room after completion',()=>{
    const {ui,progress}=createUI();ui.levelSelect();
    expect(document.querySelector<HTMLButtonElement>('[data-level="1"]')!.disabled).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('[data-level="2"]')!.disabled).toBe(true);
    progress.record(1,{time:12,lightTime:2,detections:0},getLevel(1));
    ui.levelSelect();
    expect(document.querySelector<HTMLButtonElement>('[data-level="2"]')!.disabled).toBe(false);
    expect(document.querySelector('[data-level="1"]')!.getAttribute('aria-label')).toContain('3 stars');
  });
  it('updates and persists settings through the actual buttons',()=>{
    const {ui,progress,storage}=createUI();ui.settings();
    document.querySelector<HTMLButtonElement>('[data-key="vibration"]')!.click();
    expect(progress.data.settings.vibration).toBe(true);
    expect(document.querySelector('[data-key="vibration"]')!.getAttribute('aria-checked')).toBe('true');
    expect(new ProgressManager(storage).data.settings.vibration).toBe(true);
  });
  it('destroys held input on pause, then restores functional controls on resume',()=>{
    const {ui}=createUI();ui.gameplay(getLevel(1));
    window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));
    expect(ui.controls!.read().light).toBe(true);
    ui.pause();expect(ui.controls).toBeNull();
    ui.resume();expect(ui.controls!.read().light).toBe(false);
    expect(document.querySelector('.modal')).toBeNull();
    window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}));
    expect(ui.controls!.read().y).toBe(-1);
  });
  it('shows win actions, run stars and actual recorded light usage',()=>{
    const {ui}=createUI();const level=getLevel(1);ui.gameplay(level);
    const sim=new Simulation(level);sim.state.status='escaped';sim.state.stats={time:15,lightTime:4.2,detections:0};
    ui.outcome(sim.state,3);
    expect(document.querySelector('#result-title')!.textContent).toBe('ESCAPED');
    expect(document.querySelector('[data-action="next"]')).not.toBeNull();
    expect(document.querySelector('.run-stats')!.textContent).toContain('4.2s');
    expect(ui.controls).toBeNull();
  });
  it('replaces an existing result dialog instead of stacking modals',()=>{
    const {ui}=createUI();const level=getLevel(1);ui.gameplay(level);
    const sim=new Simulation(level);sim.state.status='caught';sim.state.cause='enemy';
    ui.outcome(sim.state,0);ui.outcome(sim.state,0);
    expect(document.querySelectorAll('.modal')).toHaveLength(1);
  });
  it('switches back from pause settings without resuming gameplay',()=>{
    const {ui}=createUI();ui.gameplay(getLevel(1));ui.pause();clickButton('pause-settings');
    expect(ui.screen).toBe('settings');clickButton('settings-back');
    expect(ui.screen).toBe('pause');expect(ui.controls).toBeNull();
  });
  it('keeps gameplay inert and wraps focus inside a pause dialog',()=>{
    const {ui}=createUI();ui.gameplay(getLevel(1));
    let actions:string[]=[];ui.action=action=>actions.push(action);
    ui.pause();ui.pause();
    expect(document.querySelectorAll('.modal')).toHaveLength(1);
    expect(document.querySelector<HTMLElement>('.gameplay')!.inert).toBe(true);
    document.querySelector<HTMLButtonElement>('.hud [data-action="retry"]')!.click();
    expect(actions).toEqual([]);
    const buttons=[...document.querySelectorAll<HTMLButtonElement>('.modal button')];
    buttons.at(-1)!.focus();
    document.querySelector('.modal')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}));
    expect(document.activeElement).toBe(buttons[0]);
    buttons[0].focus();
    document.querySelector('.modal')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true}));
    expect(document.activeElement).toBe(buttons.at(-1));
    ui.resume();
    expect(document.querySelector<HTMLElement>('.gameplay')!.inert).toBe(false);
  });
  it('uses listener-specific hearing guidance in the HUD and result dialog',()=>{
    const {ui}=createUI();ui.gameplay(getLevel(1));
    const state=new Simulation(getLevel(1)).state;
    state.enemies=[{x:2,y:2,type:'listener',state:'chase',route:[],routeIndex:0,timer:0,memory:0,lastKnown:{x:1,y:1},angle:0,speed:1}];
    state.cause='enemy';state.status='caught';state.visible=false;
    ui.update(state);
    expect(document.querySelector('#status-text')!.textContent).toContain('HEARS YOU');
    ui.outcome(state,0);
    expect(document.querySelector('#result-title')!.textContent).toBe('CAUGHT IN THE LIGHT');
    expect(document.querySelector('.caught .modal-content>p')!.textContent).toContain('Slow down');
  });
  it('keeps words separated when compact layout hides heading breaks',()=>{
    const {ui}=createUI();ui.levelSelect();
    expect(document.querySelector('.page-title h2')!.textContent).toBe('Find your way out.');
    ui.settings();
    expect(document.querySelector('.page-title h2')!.textContent).toBe('A quieter kind of fear.');
  });
});

describe('DOM input lifecycle',()=>{
  it('handles two simultaneous touch pointers, immediate light release and cancellation',()=>{
    document.body.innerHTML='<div id="surface"><div class="joystick"><div class="joystick-nub"></div></div></div>';
    const surface=document.querySelector<HTMLElement>('#surface')!;
    surface.getBoundingClientRect=()=>new DOMRect(0,0,400,600);
    const c=new Controls(surface,()=>{});cleanup=()=>c.destroy();
    const touch=(type:string,id:number,x:number,y:number)=>surface.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,button:0,bubbles:true}));
    touch('pointerdown',1,100,500);touch('pointermove',1,144,500);touch('pointerdown',2,300,500);
    expect(c.read()).toMatchObject({x:1,light:true});
    touch('pointerup',2,300,500);
    expect(c.read()).toMatchObject({x:1,light:false});
    touch('pointercancel',1,144,500);
    expect(c.read()).toMatchObject({x:0,light:false});
    expect(surface.querySelector('.floating')).toBeNull();
  });
  it('binds and removes keyboard input and clears on blur',()=>{
    document.body.innerHTML='<div id="surface"><div class="joystick"><div class="joystick-nub"></div></div></div>';
    const c=new Controls(document.querySelector('#surface')!,()=>{});cleanup=()=>c.destroy();
    window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD'}));
    window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));
    expect(c.read()).toMatchObject({x:1,light:true});
    window.dispatchEvent(new Event('blur'));
    expect(c.read()).toMatchObject({x:0,light:false});
    c.destroy();window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD'}));
    expect(c.read().x).toBe(0);
  });
});
