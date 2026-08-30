import Phaser from 'phaser';
import type { Services } from '../Services';

export class BootScene extends Phaser.Scene {
  constructor(){super('Boot');}
  create(){
    const {ui}=this.registry.get('services') as Services;
    ui.splash();
    this.time.delayedCall(1100,()=>this.scene.start('Menu'));
  }
}
