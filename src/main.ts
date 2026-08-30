import Phaser from 'phaser';
import './style.css';
import { BootScene } from './game/scenes/BootScene';
import { MenuScene } from './game/scenes/MenuScene';
import { GameScene } from './game/scenes/GameScene';
import { ProgressManager } from './game/systems/ProgressManager';
import { AudioManager } from './game/systems/AudioManager';
import { AppUI } from './game/ui/AppUI';
import type { Services } from './game/Services';

const qaMode=import.meta.env.DEV&&new URLSearchParams(location.search).has('qa');
const progress=new ProgressManager(qaMode?{
  getItem:key=>localStorage.getItem(`qa:${key}`),
  setItem:(key,value)=>localStorage.setItem(`qa:${key}`,value),
}:undefined);
const audio=new AudioManager();
if(!progress.data.settings.sound)audio.setEnabled(false);
const ui=new AppUI(document.querySelector('#ui')!,progress,audio);
const services:Services={ui,audio,progress};
const game=new Phaser.Game({
  type:Phaser.CANVAS,parent:'game',backgroundColor:'#090f14',
  width:420,height:760,
  scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},
  render:{antialias:true,roundPixels:false},
  fps:{target:60,smoothStep:true},
  audio:{noAudio:true},
  input:{activePointers:3},
  scene:[BootScene,MenuScene,GameScene],
  callbacks:{preBoot:g=>g.registry.set('services',services)},
});

const currentGame=()=>game.scene.getScene('Game') as GameScene;
ui.action=(action,id)=>{
  const active=game.scene.isActive('Game');
  switch(action){
    case 'play':
      if(!id||id<1||id>progress.data.unlocked)return;
      game.scene.stop('Menu');game.scene.stop('Game');game.scene.start('Game',{id});break;
    case 'menu':game.scene.stop('Game');if(!game.scene.isActive('Menu'))game.scene.start('Menu');ui.menu();break;
    case 'pause':if(active&&ui.screen==='game'&&currentGame().simulation.state.status==='playing'){currentGame().setPaused(true);ui.pause();}break;
    case 'resume':if(active&&ui.screen==='pause'){currentGame().setPaused(false);ui.resume();audio.unlock();}break;
    case 'retry':if(active){const levelId=currentGame().simulation.level.id;game.scene.stop('Game');game.scene.start('Game',{id:levelId});}break;
    case 'hint':if(active)void currentGame().requestHint();break;
  }
};

function loseFocus(){
  if(ui.screen==='game')ui.action('pause');
  ui.controls?.clear();audio.suspend();
}
window.addEventListener('blur',loseFocus);
document.addEventListener('visibilitychange',()=>{if(document.hidden)loseFocus();});
window.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&ui.screen==='pause'){e.preventDefault();ui.action('resume');}
});
document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('gesturestart',e=>e.preventDefault());

if(import.meta.hot)import.meta.hot.dispose(()=>{ui.controls?.destroy();game.destroy(true);});

if(import.meta.env.DEV&&qaMode)void import('../tests/browser-harness').then(m=>m.install(game,ui));
