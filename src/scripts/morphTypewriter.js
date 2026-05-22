/**
 * Cycles between strings, scrambling each character through random
 * glyphs before settling on the target letter.
 */

const CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*+";

export function createMorphTypewriter({ element, words, dwellMs = 2400 }) {
  let target = words[0];
  let displayed = "";
  let timers = [];

  function randChar() {
    return CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }

  function morphTo(newWord, onDone) {
    timers.forEach(clearTimeout);
    timers = [];

    const maxLen = Math.max(displayed.length, newWord.length);
    const settled = new Array(maxLen).fill(false);
    const current = displayed.padEnd(maxLen, " ").split("");

    for (let i = 0; i < maxLen; i++) {
      const targetChar = i < newWord.length ? newWord[i] : "";
      const delay = i * 42 + Math.random() * 22;
      const scrambles = 4 + Math.floor(Math.random() * 5);

      for (let s = 0; s < scrambles; s++) {
        timers.push(
          setTimeout(() => {
            if (!settled[i]) {
              current[i] = randChar();
              element.textContent = current.join("").trimEnd();
            }
          }, delay + s * 52),
        );
      }

      timers.push(
        setTimeout(
          () => {
            settled[i] = true;
            current[i] = targetChar;
            element.textContent = current.join("").trimEnd();
            if (i === maxLen - 1) {
              displayed = newWord;
              if (onDone) onDone();
            }
          },
          delay + scrambles * 52,
        ),
      );
    }
  }

  function cycle() {
    const next = words[(words.indexOf(target) + 1) % words.length];
    morphTo(next, () => {
      target = next;
      setTimeout(cycle, dwellMs);
    });
  }

  function start() {
    morphTo(words[0], () => {
      target = words[0];
      setTimeout(cycle, dwellMs);
    });
  }

  return { start };
}
