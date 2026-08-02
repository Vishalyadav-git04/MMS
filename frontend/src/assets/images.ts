/**
 * Bundled assets — imported so Vite hashes them (air-gapped / no runtime CDN).
 */
import favicon from "./favicon.svg?url";
import armyBackdrop from "./media/army-backdrop.jpg";
import armyBg from "./media/army-bg.jpg";
import armyWinter from "./media/army-winter.jpg";
import armyFormation from "./media/army-formation.jpg";

export const ASSETS = {
  favicon,
  pageBackdrop: armyBackdrop,
  /** Subject-centred hero for LiveHero pin mask (convoy / formation works well). */
  heroPinned: armyFormation,
  loginSlides: [armyBg, armyWinter, armyFormation, armyBackdrop] as string[],
  loginHero: armyBg,
} as const;
