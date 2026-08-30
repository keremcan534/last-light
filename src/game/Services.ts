import type { AppUI } from './ui/AppUI';
import type { AudioManager } from './systems/AudioManager';
import type { ProgressManager } from './systems/ProgressManager';

export interface Services { ui:AppUI; audio:AudioManager; progress:ProgressManager }
