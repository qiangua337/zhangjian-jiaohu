import './studio.css';
import { LOOKS } from './presentation.js';
import { WORLD_STAGES } from './scene-layout.js';

const panes = { shape: '形态', light: '光影', gesture: '手势' };

export function studioMarkup(worlds, icon) {
  return `<section id="studio" class="studio" aria-label="光影创作台" hidden>
    <button id="studio-exit" class="studio-exit" type="button">${icon('arrow')}返回展厅</button>
    <div class="studio-caption">
      <h2 id="studio-world-name"></h2>
      <p>拖动旋转 · 轻触唤起光波</p>
    </div>
    <aside class="studio-panel" aria-label="创作设置">
      <h2 class="studio-panel-title">光影创作台</h2>
      <div class="studio-worlds" role="group" aria-label="创作台作品">
        ${worlds.map(world => `<button type="button" data-studio-world="${world.id}" aria-pressed="false">
          <img src="/previews/${world.id}-v4.webp" alt="" decoding="async">
          <span>${world.name}</span>
        </button>`).join('')}
      </div>
      <div class="studio-tabs" role="group" aria-label="创作工具">
        ${Object.entries(panes).map(([id, label]) => `<button type="button" data-studio-tab="${id}" aria-pressed="${id === 'shape'}" aria-controls="studio-${id}">${label}</button>`).join('')}
      </div>
      <div class="studio-content">
        <section id="studio-shape" aria-label="调节形态">
          <div class="studio-range-label"><label for="studio-range">聚散程度</label><output id="studio-amount" for="studio-range" aria-live="off">0%</output></div>
          <input id="studio-range" type="range" min="0" max="100" value="0">
          <div id="studio-stages" class="studio-stages" role="group" aria-label="形态预设"></div>
        </section>
        <section id="studio-light" aria-label="调节光影" hidden>
          <div class="studio-looks" role="group" aria-label="光影风格">
            ${Object.entries(LOOKS).map(([id, look]) => `<button type="button" data-studio-look="${id}" aria-pressed="false"><i class="look-orb look-${id}"></i>${look.name}</button>`).join('')}
          </div>
          <div class="studio-look-details"><p id="studio-look-note" class="studio-note"></p><button id="studio-settings" type="button">画质设置</button></div>
        </section>
        <section id="studio-gesture" aria-label="摄像头手势" hidden>
          <div class="studio-gesture-row">
            <button id="studio-camera" class="studio-gesture-button" type="button">${icon('camera')}<span>开启手势</span></button>
            <button id="studio-guide" type="button">${icon('help')}手势说明</button>
          </div>
          <div class="studio-gesture-status">
            <div><strong id="studio-gesture-title">手势尚未开启</strong><p id="studio-gesture-hint" class="studio-note">照片与摄像头画面仅在本机处理</p></div>
            <span id="studio-confirmation" class="confirmation-progress" aria-hidden="true" hidden></span>
          </div>
          <progress id="studio-progress" max="1" aria-label="手势模型下载进度" hidden></progress>
        </section>
      </div>
      <div class="studio-actions">
        <button id="studio-freeze" type="button" aria-pressed="false">${icon('pause')}<span>定格</span></button>
        <button id="studio-reset" type="button" aria-label="恢复默认视角">${icon('refresh')}<span>复位</span></button>
        <button id="studio-save" type="button">${icon('download')}<span>保存与分享</span></button>
      </div>
    </aside>
  </section>`;
}

export function setupStudioUI({ root, experience, icon, onMorph, onWorld, onLook, onCamera, onGuide, onSettings, onFreeze, onReset, onCapture }) {
  const $ = selector => root.querySelector(selector);
  const panel = $('#studio');
  const exit = $('#studio-exit');
  const range = $('#studio-range');
  const amount = $('#studio-amount');
  const stages = $('#studio-stages');
  const tabs = [...panel.querySelectorAll('[data-studio-tab]')];
  const worlds = [...panel.querySelectorAll('[data-studio-world]')];
  const looks = [...panel.querySelectorAll('[data-studio-look]')];
  const camera = $('#studio-camera');
  const cameraLabel = camera.querySelector('span');
  const gestureTitle = $('#studio-gesture-title');
  const gestureHint = $('#studio-gesture-hint');
  const progress = $('#studio-progress');
  const confirmation = $('#studio-confirmation');
  const freeze = $('#studio-freeze');
  let lastMorph = -1;
  let lastFrozen = false;
  let opener;

  function selectPane(id) {
    for (const tab of tabs) {
      const selected = tab.dataset.studioTab === id;
      tab.setAttribute('aria-pressed', String(selected));
      $('#studio-' + tab.dataset.studioTab).hidden = !selected;
    }
  }

  function renderMorph(value) {
    if (panel.hidden || value === lastMorph) return;
    lastMorph = value;
    range.value = value;
    range.style.setProperty('--fill', value + '%');
    range.setAttribute('aria-valuetext', value + '%');
    amount.textContent = value + '%';
    for (const button of stages.children) {
      const selected = Math.abs(Number(button.dataset.studioStage) * 100 - value) < 7;
      button.setAttribute('aria-pressed', String(selected));
    }
  }

  function close({ restoreFocus = true } = {}) {
    if (panel.hidden) return;
    panel.hidden = true;
    root.dataset.studio = 'no';
    experience.setStudio(false);
    if (restoreFocus) (opener || $('#explore-button')).focus({ preventScroll: true });
    opener = null;
  }

  function open({ gesture = false, trigger } = {}) {
    if (panel.hidden) {
      opener = trigger;
      root.dataset.studio = 'yes';
      panel.hidden = false;
      experience.setStudio(true);
      lastMorph = -1;
      renderMorph(Math.round(experience.controlFraction * 100));
    }
    selectPane(gesture ? 'gesture' : 'shape');
    (gesture ? camera : exit).focus({ preventScroll: true });
  }

  exit.addEventListener('click', () => close());
  tabs.forEach(tab => tab.addEventListener('click', () => selectPane(tab.dataset.studioTab)));
  worlds.forEach(button => button.addEventListener('click', () => onWorld(button.dataset.studioWorld)));
  looks.forEach(button => button.addEventListener('click', () => onLook(button.dataset.studioLook)));
  stages.addEventListener('click', event => {
    const button = event.target.closest('[data-studio-stage]');
    if (button) onMorph(Number(button.dataset.studioStage), true);
  });
  range.addEventListener('input', () => onMorph(Number(range.value) / 100, false));
  camera.addEventListener('click', onCamera);
  $('#studio-guide').addEventListener('click', onGuide);
  $('#studio-settings').addEventListener('click', onSettings);
  freeze.addEventListener('click', onFreeze);
  $('#studio-reset').addEventListener('click', onReset);
  $('#studio-save').addEventListener('click', onCapture);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented || panel.hidden || experience.focused ||
        !$('#recovery-panel').hidden || root.querySelector('dialog[open]')) return;
    event.preventDefault();
    close();
  });

  return {
    open,
    close,
    renderMorph,
    renderWorld(world) {
      $('#studio-world-name').textContent = world.name;
      worlds.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.studioWorld === world.id)));
      stages.innerHTML = WORLD_STAGES[world.id].map(([name, value]) =>
        `<button type="button" data-studio-stage="${value}" aria-pressed="false">${name}</button>`
      ).join('');
      lastMorph = -1;
    },
    renderLook(id) {
      looks.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.studioLook === id)));
      $('#studio-look-note').textContent = LOOKS[id].description;
    },
    renderCamera({ state, label, title, hint, modelProgress, hold }) {
      if (cameraLabel.textContent !== label) cameraLabel.textContent = label;
      camera.classList.toggle('is-active', state === 'ready');
      if (gestureTitle.textContent !== title) gestureTitle.textContent = title;
      if (gestureHint.textContent !== hint) gestureHint.textContent = hint;
      progress.hidden = modelProgress === undefined;
      if (modelProgress === null) progress.removeAttribute('value');
      else if (modelProgress !== undefined) progress.value = modelProgress;
      confirmation.hidden = !hold;
      if (hold) confirmation.style.setProperty('--progress', hold);
    },
    renderFreeze(frozen) {
      if (lastFrozen === frozen) return;
      lastFrozen = frozen;
      freeze.setAttribute('aria-pressed', String(frozen));
      freeze.innerHTML = icon(frozen ? 'play' : 'pause') + `<span>${frozen ? '继续' : '定格'}</span>`;
    },
  };
}
