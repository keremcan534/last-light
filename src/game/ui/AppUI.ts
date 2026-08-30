import type { GameState, Level, Settings } from '../types';
import { levels } from '../levels/levels';
import { ProgressManager } from '../systems/ProgressManager';
import { AudioManager } from '../systems/AudioManager';
import { Controls } from './Controls';
import { icon } from './icons';

export type UIAction = 'play' | 'menu' | 'pause' | 'resume' | 'retry' | 'hint';
const two = (n: number) => String(n).padStart(2, '0');
export const formatTime = (n: number) => `${Math.floor(n / 60)}:${two(Math.floor(n % 60))}`;

export class AppUI {
  controls: Controls | null = null;
  action: (type: UIAction, id?: number) => void = () => {};
  screen = 'splash';
  level: Level | null = null;
  private settingsReturn: 'menu' | 'pause' = 'menu';
  private lastStatus = '';
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(readonly root: HTMLElement, readonly progress: ProgressManager, readonly audio: AudioManager) {
    root.addEventListener('click', this.click);
    root.addEventListener('keydown', this.trapModalFocus);
    this.applySettings();
  }

  private replace(html: string, screen: string) {
    this.controls?.destroy(); this.controls = null;
    clearTimeout(this.toastTimer);
    this.root.innerHTML = html;
    this.screen = screen;
    this.root.dataset.screen = screen;
  }

  private brand() { return '<div class="brand"><span class="brand-mark" aria-hidden="true"><i></i><i></i></span><span>BLACKBLUE<span class="brand-sub">STUDIOS</span></span></div>'; }
  private button(action: string, label: string, glyph = 'arrow', cls = '') { return `<button class="button ${cls}" data-action="${action}"><span>${label}</span>${icon(glyph)}</button>`; }
  private header(label: string, back: string) { return `<header class="page-header"><button class="icon-button" data-action="${back}" aria-label="Back">${icon('back')}</button><span class="eyebrow">${label}</span><span class="header-dot"></span></header>`; }

  splash() {
    this.replace(`<section class="splash">${this.brand()}<span class="splash-line"></span><p>A LITTLE LIGHT GOES A LONG WAY.</p></section>`, 'splash');
  }

  menu() {
    const unlocked = this.progress.data.unlocked;
    const completed = Object.keys(this.progress.data.completed).length;
    this.replace(`<section class="menu screen-enter">
      <header class="menu-header">${this.brand()}<button class="icon-button" data-action="sound" aria-label="${this.progress.data.settings.sound ? 'Mute' : 'Enable'} sound">${icon(this.progress.data.settings.sound ? 'sound' : 'mute')}</button></header>
      <div class="menu-title"><span class="eyebrow warm">A STEALTH PUZZLE EXPERIENCE</span><h1>LAST<br/><span>LIGHT</span><i class="title-dot"></i></h1><p>Stay hidden.<br/>See enough to survive.</p></div>
      <div class="scene-caption"><span class="tiny-line"></span><span>YOU NEED THE LIGHT.<br/>THEY DO, TOO.</span></div>
      <div class="menu-bottom">${this.button('play', completed ? 'CONTINUE' : 'PLAY', 'arrow', 'primary')}
        <div class="menu-secondary">${this.button('levels', 'LEVEL SELECT', 'grid')}${this.button('settings', 'SETTINGS', 'settings')}</div>
        <div class="menu-progress"><span>${two(completed)} / 25 ROOMS ESCAPED</span><span class="progress-track"><i style="width:${completed * 4}%"></i></span><span>${two(unlocked)}</span></div>
        <div class="headphone-note">${icon('headphones')}<span>BETTER WITH HEADPHONES. BRAVER WITHOUT.</span></div>
      </div>
    </section>`, 'menu');
  }

  levelSelect() {
    const { unlocked, completed } = this.progress.data;
    let groups = '';
    const chapterNames = ['THE AWAKENING', 'WATCHFUL SHADOWS', 'OUT OF SIGHT', 'A FADING SIGNAL', 'THE LAST WAY OUT'];
    for (let chapter = 0; chapter < 5; chapter++) {
      groups += `<section class="chapter"><div class="chapter-label"><span>0${chapter + 1}</span>${chapterNames[chapter]}</div><div class="level-grid">`;
      for (const level of levels.slice(chapter * 5, chapter * 5 + 5)) {
        const record = completed[level.id];
        const locked = level.id > unlocked;
        groups += `<button class="level-cell ${locked ? 'locked' : ''} ${record ? 'completed' : ''} ${level.id === unlocked ? 'current' : ''}" data-action="level" data-level="${level.id}" ${locked ? 'disabled' : ''} aria-label="Level ${level.id}: ${level.name}${locked ? ', locked' : record ? `, ${record.stars} stars, best ${formatTime(record.bestTime)}` : ''}">
          <span>${locked ? icon('lock') : two(level.id)}</span><small>${record ? '★'.repeat(record.stars) + '·'.repeat(3 - record.stars) : locked ? '·' : '—'}</small></button>`;
      }
      groups += '</div></section>';
    }
    this.replace(`<section class="page level-page screen-enter">${this.header('THE DESCENT', 'menu')}<div class="page-title"><span class="eyebrow warm">ONE ROOM AT A TIME</span><h2>Find your<br/> way out.</h2><p>25 rooms. One fragile light.</p></div><div class="chapter-list">${groups}</div><footer class="page-footer"><span class="cyan-dot"></span>${Object.keys(completed).length} ROOMS ESCAPED<span class="footer-end">${Object.values(completed).reduce((s,r) => s+r.stars,0)} / 75 ★</span></footer></section>`, 'levels');
  }

  settings(from: 'menu' | 'pause' = 'menu') {
    this.settingsReturn = from;
    const s = this.progress.data.settings;
    const toggle = (key: keyof Settings, title: string, description: string) => `<button class="setting" data-action="setting" data-key="${key}" role="switch" aria-checked="${s[key]}"><span><strong>${title}</strong><small>${description}</small></span><span class="toggle ${s[key] ? 'on' : ''}"><i></i></span></button>`;
    this.replace(`<section class="page settings-page screen-enter">${this.header('MAKE YOURSELF AT HOME', 'settings-back')}<div class="page-title"><span class="eyebrow warm">YOUR EXPERIENCE</span><h2>A quieter<br/> kind of fear.</h2></div>
      <div class="settings-list">${toggle('sound','Sound','Atmosphere, footsteps & warning sounds')}${toggle('vibration','Haptics','A gentle warning, if your device supports it')}${toggle('reducedMotion','Reduced motion','Less shake, pulsing & ambient movement')}</div>
      <section class="control-guide"><span class="eyebrow">FIND YOUR FOOTING</span><div><span class="guide-symbol">↔</span><p><strong>Left side · Move</strong><small>Drag gently to walk. Further to run.</small></p></div><div>${icon('light')}<p><strong>Right side · Hold to see</strong><small>Release to disappear into the dark.</small></p></div><p class="keyboard-guide">Keyboard: WASD / arrows · Space for light<br/>Shift to walk softly · Esc to pause · R to retry</p></section>
      <div class="settings-meta"><p>Progress is saved on this device.<br/>No accounts. Just you and the dark.</p><button class="text-button danger-text" data-action="reset-confirm">RESET PROGRESS</button></div><footer class="page-footer">BLACKBLUE STUDIOS<span class="footer-end">LAST LIGHT · 1.0</span></footer></section>`, 'settings');
  }

  gameplay(level: Level) {
    this.level = level; this.lastStatus = '';
    this.replace(`<section class="gameplay"><header class="hud"><div class="level-info"><span class="eyebrow">ROOM ${two(level.id)} <span>/ 25</span></span><h2>${level.name}</h2></div><button class="icon-button" data-action="retry" aria-label="Restart level">${icon('retry')}</button><button class="icon-button" data-action="pause" aria-label="Pause game">${icon('pause')}</button></header>
      <div class="game-status"><span class="status-dot"></span><span id="status-text">HIDDEN IN THE DARK</span></div>
      ${level.lightEnergyEnabled ? '<div class="energy" aria-label="Light energy"><span>LIGHT</span><div class="energy-track"><i id="energy-fill"></i></div><span id="energy-value">100</span></div>' : ''}
      <div id="touch-surface" class="touch-surface" aria-label="Left side drag to move. Hold the right side to light."><div class="joystick"><div class="joystick-nub"></div></div><div class="light-pad">${icon('light')}<span class="light-pad-ring"></span></div><div class="control-label move-label">DRAG TO MOVE</div><div class="control-label light-label">HOLD TO SEE</div></div>
      <div id="tutorial" class="tutorial">${level.id === 1 ? 'HOLD TO SEE' : level.id === 4 ? 'THEY SEE THE LIGHT TOO' : ''}</div>
      <footer class="game-footer"><span>STAY HIDDEN. KEEP MOVING.</span><button class="hint-button" data-action="hint" aria-label="Show a safe direction">${icon('light')} HINT</button></footer><div id="toast" class="toast" role="status"></div>
    </section>`, 'game');
    this.attachControls();
  }

  private attachControls() {
    const surface = this.root.querySelector<HTMLElement>('#touch-surface');
    if (surface) this.controls = new Controls(surface, action => this.action(action as UIAction));
  }

  update(state: GameState) {
    if (this.screen !== 'game') return;
    const aware = state.enemies.some(e => ['alert','chase','search'].includes(e.state));
    const listenerAware = state.enemies.some(e => e.type === 'listener' && ['alert','chase','search'].includes(e.state));
    const status = listenerAware && !state.visible ? 'THE LISTENER HEARS YOU. WALK SLOWLY.' : aware ? (state.visible ? 'THEY CAN SEE YOU' : 'THEY REMEMBER. KEEP MOVING.') : state.securityExposed ? 'EXPOSED IN THE BEAM' : state.exhausted ? 'LIGHT RECOVERING' : state.lightOn ? 'VISIBLE IN THE LIGHT' : 'HIDDEN IN THE DARK';
    if (status !== this.lastStatus) {
      this.lastStatus = status;
      const label = this.root.querySelector('#status-text');
      if (label) label.textContent = status;
      this.root.querySelector('.game-status')?.classList.toggle('danger', aware || state.securityExposed);
      this.root.querySelector('.game-status')?.classList.toggle('lit', state.lightOn);
    }
    const meter = this.root.querySelector<HTMLElement>('#energy-fill');
    if (meter) { meter.style.transform = `scaleX(${state.energy})`; meter.classList.toggle('low', state.energy < .25); }
    const energy = this.root.querySelector('#energy-value');
    if (energy) energy.textContent = String(Math.ceil(state.energy * 100));
    const tutorial = this.root.querySelector<HTMLElement>('#tutorial');
    if (tutorial) tutorial.style.opacity = state.time > 6 ? '0' : '1';
  }

  pause() {
    if (!this.level) return;
    this.controls?.destroy(); this.controls = null;
    this.screen = 'pause';
    const gameplay = this.root.querySelector<HTMLElement>('.gameplay');
    if (gameplay) gameplay.inert = true;
    this.root.querySelector('.modal')?.remove();
    this.root.insertAdjacentHTML('beforeend', `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="pause-title"><div class="modal-content screen-enter"><span class="eyebrow warm">TAKE A BREATH</span><h2 id="pause-title">The dark<br/>can wait.</h2><p>Room ${two(this.level.id)} · ${this.level.name}</p><div class="modal-actions">${this.button('resume','RESUME','arrow','primary')}${this.button('retry','RESTART ROOM','retry')}${this.button('pause-settings','SETTINGS','settings')}${this.button('menu','MAIN MENU','exit')}</div></div></section>`);
    this.focusPrimary();
  }

  resume() { this.root.querySelector('.modal')?.remove(); const gameplay = this.root.querySelector<HTMLElement>('.gameplay'); if (gameplay) gameplay.inert = false; this.screen = 'game'; this.attachControls(); }

  outcome(state: GameState, stars: number) {
    this.controls?.destroy(); this.controls = null;
    this.screen = 'result';
    const gameplay = this.root.querySelector<HTMLElement>('.gameplay');
    if (gameplay) gameplay.inert = true;
    this.root.querySelector('.modal')?.remove();
    const win = state.status === 'escaped';
    const last = this.level!.id === 25;
    this.root.insertAdjacentHTML('beforeend', `<section class="modal result-modal ${win ? 'victory' : 'caught'}" role="dialog" aria-modal="true" aria-labelledby="result-title"><div class="modal-content screen-enter"><div class="result-symbol">${icon(win ? 'exit' : 'eye')}</div><span class="eyebrow ${win ? 'warm' : 'danger-text'}">${win ? (last ? 'YOU FOUND THE LAST LIGHT' : 'ONE STEP CLOSER') : 'THE DARK WAS SAFER'}</span><h2 id="result-title">${win ? 'ESCAPED' : state.cause === 'trap' ? 'LOST IN<br/>THE DARK' : 'CAUGHT IN<br/> THE LIGHT'}</h2>
      <p>${win ? (last ? 'Every room behind you. The dawn ahead.' : 'A little further from the shadows.') : state.cause === 'trap' ? 'A broken floor. Briefly light the way ahead.' : state.enemies.some(enemy => enemy.type === 'listener' && ['alert','chase','search'].includes(enemy.state)) ? 'A Listener heard you. Slow down and move quietly.' : 'Let the light go. Leave your last position.'}</p>
      ${win ? `<div class="stars" aria-label="${stars} out of 3 stars">${[1,2,3].map(n=>`<span class="${n<=stars?'earned':''}">★</span>`).join('')}</div><div class="run-stats"><div><strong>${formatTime(state.stats.time)}</strong><span>TIME</span></div><div><strong>${state.stats.lightTime.toFixed(1)}s</strong><span>LIGHT USED</span></div><div><strong>${state.stats.detections}</strong><span>DETECTIONS</span></div></div><p class="star-note">${stars===3?'Quiet. Quick. Almost invisible.':stars===2?'Three stars: stay unseen, beat the room par and use less light.':'You were seen. You escaped anyway.'}</p><p class="par-note">PAR ${formatTime(this.level!.parTime)} · LIGHT ${this.level!.lightBudget}s</p>` : ''}
      <div class="modal-actions">${win ? this.button(last?'menu':'next',last?'BACK TO THE LIGHT':'NEXT LEVEL','arrow','primary') : this.button('retry','RETRY','retry','primary')}${win ? this.button('retry','RETRY','retry') : ''}${this.button('levels','LEVEL SELECT','grid')}</div>
    </div></section>`);
    this.focusPrimary();
  }

  toast(message: string) {
    const el = this.root.querySelector<HTMLElement>('#toast');
    if (!el) return;
    el.textContent = message; el.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('visible'), 3500);
  }

  private focusPrimary() { this.root.querySelector<HTMLButtonElement>('.modal .primary')?.focus({preventScroll:true}); }
  private trapModalFocus = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const modal = this.root.querySelector<HTMLElement>('.modal');
    if (!modal) return;
    const buttons = [...modal.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
    if (!buttons.length) return;
    const first = buttons[0], last = buttons.at(-1)!;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  private applySettings() { document.documentElement.classList.toggle('reduced-motion', this.progress.data.settings.reducedMotion); }

  private click = (e: MouseEvent) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (!button || button.disabled) return;
    const modal = this.root.querySelector('.modal');
    if (modal && !modal.contains(button)) return;
    const action = button.dataset.action!;
    const canWakeAudio = this.screen !== 'pause' && this.screen !== 'result' && !(this.screen === 'settings' && this.settingsReturn === 'pause');
    if (canWakeAudio) this.audio.unlock();
    this.audio.play('ui');
    switch (action) {
      case 'play': this.action('play', this.progress.data.unlocked); break;
      case 'level': this.action('play', Number(button.dataset.level)); break;
      case 'next': this.action('play', this.level!.id + 1); break;
      case 'levels': this.action('menu'); this.levelSelect(); break;
      case 'menu': this.action('menu'); break;
      case 'settings': this.settings('menu'); break;
      case 'pause-settings': this.settings('pause'); break;
      case 'settings-back':
        if (this.settingsReturn === 'pause' && this.level) { this.gameplay(this.level); this.pause(); }
        else this.menu();
        break;
      case 'setting': {
        const key = button.dataset.key as keyof Settings;
        this.progress.updateSettings({[key]: !this.progress.data.settings[key]});
        this.audio.setEnabled(this.progress.data.settings.sound);
        if (key === 'sound' && this.progress.data.settings.sound && canWakeAudio) this.audio.unlock();
        this.applySettings(); this.settings(this.settingsReturn); break;
      }
      case 'sound': this.progress.updateSettings({sound:!this.progress.data.settings.sound}); this.audio.setEnabled(this.progress.data.settings.sound); if(this.progress.data.settings.sound)this.audio.unlock(); this.menu(); break;
      case 'reset-confirm': button.dataset.action = 'reset'; button.textContent = 'TAP AGAIN TO RESET ALL PROGRESS'; break;
      case 'reset': this.progress.reset(); this.settings(this.settingsReturn); break;
      default: this.action(action as UIAction);
    }
    button.blur();
  };
}
