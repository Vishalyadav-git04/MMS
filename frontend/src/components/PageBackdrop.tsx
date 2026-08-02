import { ASSETS } from "@/assets/images";

/** Washed photographic backdrop — Register A page paper over imagery. */
export function PageBackdrop() {
  return (
    <div aria-hidden className="mms-pagebg">
      <img src={ASSETS.pageBackdrop} alt="" className="mms-pagebg__img" />
    </div>
  );
}
