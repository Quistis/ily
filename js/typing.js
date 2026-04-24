export function typeText(element, text, speed = 50) {
  let i = 0;
  element.textContent = '';

  function typing() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(typing, speed);
    }
  }

  typing();
}
