import { typeText } from './typing.js';

/* ── DOM ── */
const heartsContainer = document.getElementById('hearts');
const giftBox         = document.getElementById('giftBox');
const bgMusic         = document.getElementById('bgMusic');
const openSound       = document.getElementById('openSound');
const musicToggle     = document.getElementById('musicToggle');

// Все сцены собираем из DOM — порядок определяется порядком в HTML
const scenes = Array.from(document.querySelectorAll('.scene'));

let currentScene = 0;
let transitioning = false;
let giftOpened    = false;

/* ── УТИЛИТЫ ── */
const delay = ms => new Promise(r => setTimeout(r, ms));

function fadeVolume(target, duration = 500) {
  const step = (target - bgMusic.volume) / (duration / 50);
  const iv = setInterval(() => {
    let v = bgMusic.volume + step;
    if ((step > 0 && v >= target) || (step < 0 && v <= target)) {
      bgMusic.volume = target; clearInterval(iv);
    } else { bgMusic.volume = v; }
  }, 50);
}

/* ── ПЕРЕКЛЮЧЕНИЕ СЦЕН ── */
async function goToScene(index) {
  if (transitioning || index >= scenes.length || index < 0) return;
  transitioning = true;

  const current = scenes[currentScene];
  const next    = scenes[index];

  // fade out текущей
  current.style.opacity = '0';
  await delay(500);
  current.classList.remove('active');
  current.style.opacity = '';

  currentScene = index;

  // показываем следующую с opacity 0, затем плавно в 1
  next.style.opacity = '0';
  next.classList.add('active');
  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => requestAnimationFrame(r));
  next.style.opacity = '1';
  await delay(500);
  next.style.opacity = '';

  transitioning = false;

  // hint скрываем на последней сцене
  const hint = next.querySelector('.hint');
  if (hint) hint.style.visibility = index === scenes.length - 1 ? 'hidden' : 'visible';

  // анимируем строки по очереди
  animateSceneMessages(next);

  // typewriter — если на сцене есть элементы с data-typewriter
  await runTypewriter(next);
}

/* ── АНИМАЦИЯ СТРОК СЦЕНЫ ── */
// Каждая .scene-msg и .final-love получает свой animation-delay по порядку
function animateSceneMessages(scene) {
  const items = scene.querySelectorAll('.scene-msg, .final-love');
  const STEP  = 400; // мс между появлением каждой строки

  items.forEach((el, i) => {
    el.classList.remove('animate');
    el.style.animationDelay = '';
    // один rAF чтобы сброс применился до повторного добавления класса
    requestAnimationFrame(() => {
      el.style.animationDelay = `${i * STEP}ms`;
      el.classList.add('animate');
    });
  });
}


// Использование в HTML: <p data-typewriter data-speed="40">Текст здесь</p>
// data-speed — необязателен, по умолчанию 45мс на символ
// data-delay — задержка перед стартом этого элемента (мс), по умолчанию 0
async function runTypewriter(scene) {
  const els = scene.querySelectorAll('[data-typewriter]');
  if (!els.length) return;

  for (const el of els) {
    const text  = el.dataset.text;
    if (!text) continue;
    const speed = parseInt(el.dataset.speed) || 45;
    const pause = parseInt(el.dataset.delay) || 0;

    el.textContent = '';
    if (pause) await delay(pause);
    await new Promise(resolve => {
      typeText(el, text, speed);
      setTimeout(resolve, text.length * speed + 100);
    });
  }
}

/* ── ОТКРЫТИЕ ПОДАРКА ── */
giftBox.addEventListener('click', async e => {
  e.stopPropagation();
  if (giftOpened) return;
  giftOpened = true;

  openSound.currentTime = 0;
  openSound.play().catch(() => {});

  bgMusic.volume = 0.1;
  bgMusic.currentTime = 0;
  bgMusic.play().catch(() => {});

  await goToScene(1);
  fadeVolume(0.3, 800);
});

/* ── ГЛОБАЛЬНЫЙ КЛИК / СВАЙП (только после открытия подарка) ── */
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', e => {
  if (!giftOpened || currentScene === 0) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  // считаем свайпом если смещение < 10px (по сути тап) или горизонт. свайп влево
  if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) goToScene(currentScene + 1); // свайп влево — вперёд
    // свайп вправо не делаем назад, это поздравление :)
  } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
    goToScene(currentScene + 1);
  }
});

document.addEventListener('click', e => {
  if (!giftOpened || currentScene === 0) return;
  // игнорируем кнопку музыки
  if (e.target.closest('.music-btn')) return;
  goToScene(currentScene + 1);
});

/* ── МУЗЫКА ── */
let isPlaying = true;
bgMusic.volume = 0.2;

musicToggle.addEventListener('click', () => {
  if (isPlaying) { bgMusic.pause(); musicToggle.textContent = '🔇'; }
  else           { bgMusic.play();  musicToggle.textContent = '🔊'; }
  isPlaying = !isPlaying;
});

/* ── СЕРДЕЧКИ ── */
function createHeart() {
  const heart = document.createElement('div');
  heart.classList.add('heart');
  heart.innerHTML = '💖';
  heart.style.left              = Math.random() * 100 + 'vw';
  heart.style.fontSize          = Math.random() * 20 + 15 + 'px';
  heart.style.animationDuration = (Math.random() * 3 + 5) + 's';
  heartsContainer.appendChild(heart);

  setTimeout(() => {
    requestAnimationFrame(() => heart.classList.add('fade-out'));
    setTimeout(() => heart.remove(), 1200);
  }, 6000);
}

setInterval(createHeart, 300);
