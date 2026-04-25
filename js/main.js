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

/* ── ВИБРАЦИЯ ── */
function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

/* ── СМЕНА ФОНА ── */
const SCENE_GRADIENTS = [
  'radial-gradient(circle at top, #ff9a9e, #fad0c4)', // 0: подарок — розовый
  'radial-gradient(circle at top, #f9a8d4, #fbcfe8)', // 1: приветствие — нежно-розовый
  'radial-gradient(circle at top, #c4b5fd, #ddd6fe)', // 2: слова — лавандовый
  'radial-gradient(circle at top, #fda4af, #ff9a9e)', // 3: финал — тёплый коралл
];

const bgOverlay = document.getElementById('bgOverlay');

async function transitionBackground(index) {
  const next = SCENE_GRADIENTS[index] ?? SCENE_GRADIENTS[SCENE_GRADIENTS.length - 1];

  // ставим новый градиент на оверлей и делаем его видимым
  bgOverlay.style.background = next;
  bgOverlay.style.opacity    = '1';

  // ждём окончания fade-in (1.2s задан в CSS)
  await delay(1200);

  // переносим градиент на body и скрываем оверлей мгновенно
  document.body.style.background = next;
  bgOverlay.style.transition = 'none';
  bgOverlay.style.opacity    = '0';

  // возвращаем transition обратно после следующего кадра
  requestAnimationFrame(() => {
    bgOverlay.style.transition = '';
  });
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

  // лёгкая вибрация при смене сцены
  vibrate(18);

  // меняем фон параллельно (не блокируем переход)
  transitionBackground(index);

  // на последней сцене — ритмичная вибрация как сердцебиение
  const isLastScene = index === scenes.length - 1;
  if (isLastScene) startHeartbeatVibration();
  else             stopHeartbeatVibration();

  // hint скрываем на последней сцене
  const hint = next.querySelector('.hint');
  if (hint) hint.style.visibility = index === scenes.length - 1 ? 'hidden' : 'visible';

  // анимируем строки по очереди
  animateSceneMessages(next);

  // typewriter — если на сцене есть элементы с data-typewriter
  await runTypewriter(next);
}

/* ── АНИМАЦИЯ СТРОК СЦЕНЫ ── */
function animateSceneMessages(scene) {
  // исключаем smileMsg и smileBtn — у них своя логика
  const items = Array.from(scene.querySelectorAll('.scene-msg, .final-love'))
    .filter(el => !el.classList.contains('smile-msg'));
  const STEP  = 400;

  items.forEach((el, i) => {
    el.classList.remove('animate');
    el.style.animationDelay = '';
    requestAnimationFrame(() => {
      el.style.animationDelay = `${i * STEP}ms`;
      el.classList.add('animate');
    });
  });

  // кнопку улыбки показываем после всех строк
  const btn = scene.querySelector('.smile-btn');
  if (btn) {
    btn.classList.remove('animate');
    btn.style.animationDelay = '';
    requestAnimationFrame(() => {
      btn.style.animationDelay = `${items.length * STEP}ms`;
      btn.classList.add('animate');
    });
  }
}


// Использование в HTML: <p data-typewriter data-text="..." data-speed="40" data-delay="800"></p>
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

    // печатаем сами — символ за символом — чтобы спавнить искры
    await new Promise(resolve => {
      let i = 0;
      const iv = setInterval(() => {
        el.textContent += text[i];

        // искра каждые ~3 символа, не на пробелах
        if (i % 3 === 0 && text[i] !== ' ') spawnSpark(el);

        i++;
        if (i >= text.length) { clearInterval(iv); setTimeout(resolve, 100); }
      }, speed);
    });
  }
}

/* ── ИСКРЫ ПРИ ПЕЧАТИ ── */
function spawnSpark(el) {
  const rect = el.getBoundingClientRect();
  // позиция — правый край текста, середина по высоте
  const x = rect.right;
  const y = rect.top + rect.height / 2;

  const sparks = ['✨', '💫', '⭐'];
  const spark  = document.createElement('div');
  spark.classList.add('typewriter-spark');
  spark.textContent = sparks[Math.floor(Math.random() * sparks.length)];
  spark.style.left = `${x}px`;
  spark.style.top  = `${y}px`;

  // небольшой разброс по направлению
  const tx = (Math.random() - 0.5) * 40;
  const ty = -(10 + Math.random() * 25);
  spark.style.setProperty('--tx', `${tx}px`);
  spark.style.setProperty('--ty', `${ty}px`);

  document.body.appendChild(spark);
  setTimeout(() => spark.remove(), 700);
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

let kissCount = 0;

document.addEventListener('click', e => {
  if (!giftOpened || currentScene === 0) return;
  if (e.target.closest('.music-btn')) return;
  // smile-btn блокируем только пока он ещё не стал сердечком
  if (e.target.closest('.smile-btn') && !e.target.closest('.smile-btn').classList.contains('heart-pulse')) return;

  // повторные нажатия на сердечко после трансформации — burst + счётчик
  if (e.target.closest('#smileBtn')?.classList.contains('heart-pulse')) {
    kissCount++;
    heartBurst();
    spawnKissCount(kissCount);
    const container = e.target.closest('.container');
    container.classList.add('shake');
    setTimeout(() => container.classList.remove('shake'), 600);
    return;
  }

  goToScene(currentScene + 1);
});

/* ── КНОПКА УЛЫБКИ ── */
const smileBtn = document.getElementById('smileBtn');

smileBtn.addEventListener('click', async () => {
  const finalContent = smileBtn.closest('.container').querySelector('#finalContent');
  const smileResult  = smileBtn.closest('.container').querySelector('#smileResult');
  const smileMsg = smileBtn.closest('.container').querySelector('#smileMsg');
  const container    = smileBtn.closest('.container');

  finalContent.classList.add('content-out');
  await delay(450);
  finalContent.style.display = 'none';

  heartBurst();
  container.classList.add('shake');
  setTimeout(() => container.classList.remove('shake'), 600);

  smileResult.classList.add('smile-result--show');
  smileBtn.textContent = '💖';
  // smileBtn.style.border = 'none';
  // smileBtn.style.backgroundColor = 'transparent';
  // smileBtn.style.backdropFilter = 'none';
  // smileBtn.style.fontSize = '2.95rem';
  smileMsg.style.opacity = '1';

  smileBtn.classList.remove('animate');
  smileBtn.classList.add('heart-pulse');

  // Проверяем, нет ли уже подсказки
  const existingHint = smileResult.querySelector('.hint');
  if (!existingHint) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'нажимай чтобы сердечки взрывались ✨';
    smileResult.appendChild(hint);
  }
});



/* ── РИТМИЧНАЯ ВИБРАЦИЯ СЕРДЦА ── */
// паттерн: удар — пауза — удар — длинная пауза (как настоящий пульс)
let heartbeatInterval = null;

function startHeartbeatVibration() {
  if (!navigator.vibrate) return;
  stopHeartbeatVibration(); // сбрасываем если уже шла

  function beat() {
    navigator.vibrate([40, 100, 40]); // тум-тум ... тум-тум
  }

  beat(); // первый удар сразу
  heartbeatInterval = setInterval(beat, 900); // ~67 bpm
}

function stopHeartbeatVibration() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (navigator.vibrate) navigator.vibrate(0); // сбросить активную вибрацию
}

/* ── СЧЁТЧИК ПОЦЕЛУЕВ ── */
function spawnKissCount(count) {
  const el = document.createElement('div');
  el.classList.add('kiss-count');
  el.textContent = `+${count} 💋`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

/* ── BURST СЕРДЕЧЕК ── */
function heartBurst() {
  const emojis = ['💖', '💕', '✨', '💗', '🌸'];
  const COUNT  = 50;

  for (let i = 0; i < COUNT; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.classList.add('burst-heart');
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];

      // стартуем из центра экрана
      el.style.left     = '50vw';
      el.style.top      = '50vh';
      el.style.fontSize = `${Math.random() * 18 + 14}px`;

      // разлёт в единицах vw/vh — гарантированно выходит за карточку
      const angle  = Math.random() * 360;
      const dist   = 25 + Math.random() * 45; // 25–70vw/vh
      const tx = Math.cos(angle * Math.PI / 180) * dist;
      const ty = Math.sin(angle * Math.PI / 180) * dist;
      el.style.setProperty('--tx', `${tx}vw`);
      el.style.setProperty('--ty', `${ty}vh`);

      heartsContainer.appendChild(el);
      setTimeout(() => el.remove(), 1400);
    }, i * 30);
  }
}

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

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopHeartbeatVibration();
});
