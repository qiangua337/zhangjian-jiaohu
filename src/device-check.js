import { version } from '../package.json';
import { CHECK_DURATION, PerformanceSample } from './performance-sample.js';
import './device-check.css';

const repeatWorlds = ['heart', 'ocean', 'flower'];
const modes = { hands: '摄像头手势', animation: '连续演绎' };
const qualities = { auto: '自动适配', high: '精致画质', low: '流畅优先' };
const inferenceModes = { worker: '后台线程', main: '主线程' };

const markup = `
  <dialog id="check-intro" class="dialog check-dialog" aria-labelledby="check-title">
    <form method="dialog"><button class="dialog-close" aria-label="关闭体验检测">×</button></form>
    <h2 id="check-title">三分钟体验检测</h2>
    <p class="dialog-description">在第 1 分钟和最后 1 分钟各做一轮握拳、张手、移动手掌和双手缩放，比较跟手感。也可以让作品自动演绎，观察连续播放。</p>
    <p class="dialog-description">检测时保持页面在前台。结果留在当前页面，可以自行复制。</p>
    <div class="dialog-actions">
      <button id="check-hands" class="primary-button" type="button">开启手势并计时</button>
      <button id="check-animation" class="secondary-button" type="button">只测连续动画</button>
    </div>
    <p id="check-intro-status" class="check-status" role="status"></p>
  </dialog>
  <div class="check-bar" id="check-bar" aria-label="体验检测进度" hidden>
    <span id="check-clock">3:00</span><button id="check-end" type="button">结束</button>
  </div>
  <dialog id="check-report" class="dialog check-dialog" aria-labelledby="check-report-title">
    <form method="dialog"><button class="dialog-close" aria-label="关闭检测报告">×</button></form>
    <h2 id="check-report-title">检测报告</h2>
    <p class="dialog-description" id="check-details"></p>
    <div id="check-table"></div>
    <p class="check-note" id="check-explain"></p>
    <div class="check-feedback">
      <label id="check-hand-label">手势感受<select id="check-hand-feel">
        <option value="">请选择</option><option>跟手</option><option>偶尔有延迟</option><option>明显滞后</option>
      </select></label>
      <label>后段动画<select id="check-motion-feel">
        <option value="">请选择</option><option>流畅</option><option>偶尔卡顿</option><option>明显变卡</option>
      </select></label>
    </div>
    <div class="dialog-actions">
      <button id="check-copy" class="primary-button" type="button">复制检测报告</button>
      <button id="check-again" class="secondary-button" type="button">再测一次</button>
    </div>
    <p id="check-copy-status" class="check-status" role="status"></p>
    <textarea id="check-report-text" class="check-report-text" aria-label="检测报告文字" readonly hidden></textarea>
  </dialog>`;

function metrics(mode) {
  const items = [
    ['fps', '平均帧率', ' 帧/秒'], ['frameP95', '帧间隔 P95', ' ms'],
    ['late', '超过 50 ms 的帧', ' 次'], ['switchMax', '换景附近最长帧', ' ms'],
  ];
  if (mode === 'hands') items.push(
    ['inferenceP95', '识别耗时 P95', ' ms'],
    ['handIntervalP95', '有手时更新间隔 P95', ' ms'],
    ['trackedPercent', '检测到手的比例', '%'],
  );
  return items;
}

function valueText(row, key, unit) {
  const value = row.fps === null ? null : row[key];
  return value === null ? '—' : (value === 1000 && key.endsWith('P95') ? '≥1000' : value) + unit;
}

function clockText(ms) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}

export function setupDeviceCheck({ root, experience, camera, startHands, openStudio }) {
  root.insertAdjacentHTML('beforeend', markup);
  const $ = selector => root.querySelector(selector);
  const intro = $('#check-intro');
  const report = $('#check-report');
  const bar = $('#check-bar');
  const clock = $('#check-clock');
  const end = $('#check-end');
  let pending = null;
  let run = null;
  let completed = null;

  function setClock(text) {
    if (clock.textContent !== text) clock.textContent = text;
  }

  function playSegment() {
    const segment = Math.floor(run.sample.elapsed / 20_000);
    if (segment === run.segment && experience.demo) return;
    run.segment = segment;
    const world = repeatWorlds[segment % repeatWorlds.length];
    if (experience.current.id !== world) {
      experience.setWorld(world);
      experience.setDemo(true);
    } else if (!experience.demo) {
      experience.setDemo(true);
    }
    experience.prepareWorldSoon(repeatWorlds[(segment + 1) % repeatWorlds.length]);
  }

  function finish(done) {
    if (!run) return;
    completed = run;
    run = null;
    experience.onFrame = null;
    camera.onMeasure = null;
    bar.hidden = true;
    if (completed.mode === 'animation') experience.setDemo(false);
    if (completed.mode === 'hands' && camera.running) camera.stop();
    const { sample, mode, width, height, quality } = completed;
    const seconds = Math.min(180, Math.floor(sample.elapsed / 1000));
    $('#check-details').textContent = (done ? '已完成' : '已结束') + ' ' + seconds + ' 秒 · ' + modes[mode] + ' · ' + width + ' × ' + height + ' · ' + qualities[quality];
    const rows = sample.summary();
    const body = metrics(mode).map(([key, label, unit]) =>
      `<tr><th scope="row">${label}</th>${rows.map(row => '<td>' + valueText(row,key,unit) + '</td>').join('')}</tr>`
    ).join('');
    $('#check-table').innerHTML = '<table><thead><tr><th scope="col">指标</th><th scope="col">第 1 分钟</th><th scope="col">第 2 分钟</th><th scope="col">第 3 分钟</th></tr></thead><tbody>' + body + '</tbody></table>';
    $('#check-explain').textContent =
      'P95 表示 95% 的样本在该数值以内。换景数据包含切换时和随后半秒的帧。' +
      (mode === 'hands' ? '手势更新间隔按识别结果送达的时间统计。跟手感请按实际动作填写。' : '同一组场景每分钟重复播放。');
    $('#check-hand-label').hidden = mode !== 'hands';
    $('#check-hand-feel').value = '';
    $('#check-motion-feel').value = '';
    $('#check-copy-status').textContent = '';
    $('#check-report-text').hidden = true;
    report.showModal();
  }

  function frame(detail) {
    if (!run) return;
    if (document.hidden || root.querySelector('dialog[open]') || (run.mode === 'hands' && !camera.running)) {
      run.sample.pause();
      setClock('计时暂停');
      return;
    }
    if (run.sample.frame(detail)) {
      finish(true);
      return;
    }
    setClock(clockText(CHECK_DURATION - run.sample.elapsed));
    if (run.mode === 'animation') playSegment();
  }

  async function start(mode) {
    if (run || pending) return;
    intro.close();
    bar.hidden = false;
    end.textContent = '结束';
    if (mode === 'hands' && !camera.running) {
      const attempt = {};
      pending = attempt;
      setClock('准备手势');
      end.textContent = '取消';
      try { await startHands(); } catch { /* The camera status provides recovery guidance. */ }
      if (pending !== attempt) return;
      pending = null;
      end.textContent = '结束';
      if (!camera.running) {
        bar.hidden = true;
        $('#check-intro-status').textContent = '摄像头暂未开启，可以重试或先测动画。';
        intro.showModal();
        return;
      }
    }
    if (mode === 'animation') {
      if (camera.running || camera.starting) camera.stop();
      openStudio();
    }
    run = { mode, sample: new PerformanceSample(), width: experience.width, height: experience.height, quality: experience.qualityMode };
    setClock('3:00');
    if (mode === 'animation') playSegment();
    experience.onFrame = frame;
    if (mode === 'hands') {
      camera.onMeasure = detail => {
        if (run && !document.hidden && !root.querySelector('dialog[open]')) run.sample.inference(detail);
      };
    }
  }

  function reportText() {
    const { sample, mode, width, height, quality } = completed;
    const seconds = Math.min(180, Math.floor(sample.elapsed / 1000));
    const lines = [
      '掌间交互 ' + version + ' · ' + modes[mode] + ' · ' + seconds + ' 秒',
      width + ' × ' + height + ' · ' + qualities[quality] + ' · 目标帧率 ' + ([...sample.rates].join('/') || '—'),
    ];
    if (mode === 'hands' && sample.inferenceModes.size) {
      lines.push('识别方式 ' + [...sample.inferenceModes].map(key => inferenceModes[key]).join(' → '));
    }
    if (quality === 'auto') lines.push('自动画质调整 ' + sample.qualityChanges + ' 次');
    for (const [i, row] of sample.summary().entries()) {
      if (row.fps === null) continue;
      lines.push('第 ' + (i + 1) + ' 分钟｜' + metrics(mode).map(([key,label,unit]) => label + ' ' + valueText(row,key,unit)).join('，'));
    }
    const handFeel = $('#check-hand-feel').value;
    const motionFeel = $('#check-motion-feel').value;
    if (mode === 'hands' && handFeel) lines.push('手势感受 ' + handFeel);
    if (motionFeel) lines.push('后段动画 ' + motionFeel);
    return lines.join('\n');
  }

  $('#check-hands').addEventListener('click', () => { void start('hands'); });
  $('#check-animation').addEventListener('click', () => { void start('animation'); });
  $('#check-again').addEventListener('click', () => {
    report.close();
    $('#check-intro-status').textContent = '';
    intro.showModal();
  });
  end.addEventListener('click', () => {
    if (pending) {
      pending = null;
      camera.stop();
      bar.hidden = true;
      intro.showModal();
    } else {
      finish(false);
    }
  });
  $('#check-copy').addEventListener('click', async () => {
    const text = reportText();
    const field = $('#check-report-text');
    field.hidden = false;
    field.value = text;
    try {
      await navigator.clipboard.writeText(text);
      $('#check-copy-status').textContent = '报告已复制，可以粘贴发送。';
    } catch {
      field.focus();
      field.select();
      $('#check-copy-status').textContent = '可以长按下方文字复制报告。';
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!run) return;
    run.sample.pause();
    if (document.hidden) setClock('计时暂停');
  });
  intro.showModal();
}
