/** Rough US–Mexico border. Points clearly south of it are out of scope. */
const BORDER = [
  [-117.13, 32.53],
  [-114.72, 32.49],
  [-111.07, 31.33],
  [-108.21, 31.33],
  [-106.53, 31.78],
  [-103.4, 29.05],
  [-101.0, 29.35],
  [-99.2, 27.6],
  [-97.4, 25.95],
  [-97.14, 25.84],
];

export function inMexico(lat, lng) {
  if (lat > 32.75 || lat < 14.4 || lng < -118.45 || lng > -86.6) return false;
  if (lng <= -109.35 && lat < 32.52) return true;
  if (lng > -97.14) return lat < 25.7;
  let borderLat = 25.84;
  for (let i = 0; i < BORDER.length - 1; i += 1) {
    const [x1, y1] = BORDER[i];
    const [x2, y2] = BORDER[i + 1];
    const lo = Math.min(x1, x2);
    const hi = Math.max(x1, x2);
    if (lng >= lo && lng <= hi && x2 !== x1) {
      const t = (lng - x1) / (x2 - x1);
      borderLat = y1 + t * (y2 - y1);
      break;
    }
  }
  return lat < borderLat - 0.06;
}

/** North of the 49th parallel only. Southern Ontario is not guessed from a box. */
export function inCanadaRough(lat, lng) {
  if (inMexico(lat, lng)) return false;
  if (lat < 49.15 || lat > 83.2 || lng < -141.05 || lng > -52.6) return false;
  return true;
}
