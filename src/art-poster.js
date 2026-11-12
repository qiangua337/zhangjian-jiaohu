export const POSTER_SIZE = { width: 1200, height: 1600 };
const art = { x: 66, y: 252, width: 1068, height: 1000 };
const sans = '"PingFang SC", "Microsoft YaHei", sans-serif';
const serif = '"Songti SC", "STSong", "SimSun", serif';

export function posterImageBox(width, height) {
  const scale = Math.min(art.width / width, art.height / height);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  return {
    x: Math.round(art.x + (art.width - w) / 2),
    y: Math.round(art.y + (art.height - h) / 2),
    width: w,
    height: h,
  };
}

// The visible stage is a useful crop when there are no user photos to preserve.
export function posterSourceBox(width, height, stage) {
  if (!stage) return { x: 0, y: 0, width, height };
  const x = Math.max(0, Math.floor(stage.left * width));
  const y = Math.max(0, Math.floor(stage.top * height));
  const right = Math.min(width, Math.ceil(stage.right * width));
  const bottom = Math.min(height, Math.ceil(stage.bottom * height));
  if (!(right > x && bottom > y)) return { x: 0, y: 0, width, height };
  return { x, y, width: right - x, height: bottom - y };
}

export function artworkPoster(image, { name, title, number, color, url, posterStage }) {
  const canvas = document.createElement('canvas');
  const { width, height } = POSTER_SIZE;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#090b13';
  ctx.fillRect(0, 0, width, height);

  const ambient = ctx.createRadialGradient(950, 85, 0, 950, 85, 900);
  ambient.addColorStop(0, color + '23');
  ambient.addColorStop(1, color + '00');
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#ffffff30';
  ctx.strokeRect(36.5, 36.5, width - 73, height - 73);

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(87, 89, 21, 9, -.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(87, 89, 9, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f1eaf0';
  ctx.font = '500 34px ' + sans;
  ctx.fillText('掌间交互', 121, 89);
  ctx.textAlign = 'right';
  ctx.font = '25px ' + sans;
  ctx.fillStyle = '#c6bfce';
  ctx.fillText('互动数字艺术展', 1134, 89);

  ctx.fillStyle = '#ffffff33';
  ctx.fillRect(66, 130, 1068, 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f5eef3';
  ctx.font = '66px ' + serif;
  ctx.fillText(name, 66, 197);
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.font = '26px ' + sans;
  ctx.fillText('作品 ' + number + ' / 05', 1134, 200);

  const source = posterSourceBox(image.naturalWidth, image.naturalHeight, posterStage);
  const box = posterImageBox(source.width, source.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, source.x, source.y, source.width, source.height, box.x, box.y, box.width, box.height);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#ffffff28';
  ctx.strokeRect(box.x - .5, box.y - .5, box.width + 1, box.height + 1);

  ctx.fillStyle = '#ffffff33';
  ctx.fillRect(66, 1308, 1068, 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ede6ef';
  ctx.font = '38px ' + serif;
  ctx.fillText(title.replace(/\s+/g, ''), 66, 1381);
  ctx.font = '24px ' + sans;
  ctx.fillStyle = '#b6afbf';
  ctx.fillText('用触屏、鼠标或手势体验', 66, 1481);
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.fillText(new URL(url).hostname, 1134, 1481);
  return canvas;
}
