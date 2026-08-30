import Phaser from 'phaser';
import type { Services } from '../Services';
import { WorldRenderer } from '../systems/WorldRenderer';

export class MenuScene extends Phaser.Scene {
  private worldView!:WorldRenderer;
  private services!:Services;
  private elapsed=0;
  constructor(){super('Menu');}
  create(){
    this.services=this.registry.get('services');
    this.worldView=new WorldRenderer(this,'menu-world');
    if(this.services.ui.screen==='splash')this.services.ui.menu();
    this.events.once('shutdown',()=>this.worldView.destroy());
  }
  update(_time:number,delta:number){
    this.elapsed+=Math.min(delta/1000,.1);
    this.worldView.menu(this.elapsed,this.services.progress.data.settings.reducedMotion);
    this.services.audio.update(delta/1000,0);
  }
}
