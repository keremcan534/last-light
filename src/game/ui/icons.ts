const paths: Record<string, string> = {
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  back: '<path d="m14 5-7 7 7 7"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  settings: '<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  retry: '<path d="M4 9a8 8 0 1 1 1 8M4 3v6h6"/>',
  sound: '<path d="m11 4-5 5H3v6h3l5 5zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 4-5 5H3v6h3l5 5zM16 9l5 6m0-6-5 6"/>',
  headphones: '<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/>',
  light: '<path d="M9 17h6m-5 4h4M8 14a6 6 0 1 1 8 0l-1 3H9zM12 1v2M2 10h2M20 10h2"/>',
  lock: '<rect x="6" y="10" width="12" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  exit: '<path d="M10 4H4v16h6m3-13 5 5-5 5m-5-5h13"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
};
export const icon = (name: string, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.light}</svg>`;
