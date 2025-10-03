export const SAFARI_GIFS: string[] = [
  // Publicly hosted kid-friendly safari animal GIFs
  "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif", // confetti
  "https://media.giphy.com/media/l3vR9O2r0b8bTQZSU/giphy.gif", // lion dance
  "https://media.giphy.com/media/l46CkhJ7u7U6EIvsk/giphy.gif", // giraffe
  "https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif", // elephant celebrate
  "https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif", // zebra
  "https://media.giphy.com/media/l0HU20BZ6LbSEITza/giphy.gif", // stars
];

export function pickRandomGif() {
  const i = Math.floor(Math.random() * SAFARI_GIFS.length);
  return SAFARI_GIFS[i];
}
