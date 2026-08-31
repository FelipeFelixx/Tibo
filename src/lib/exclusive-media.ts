const EVENT = "tibo:media-play";

export function registerExclusiveMedia(element: HTMLMediaElement) {
  const onOtherPlay = (event: Event) => {
    const other = (event as CustomEvent<HTMLMediaElement>).detail;
    if (other && other !== element) element.pause();
  };
  window.addEventListener(EVENT, onOtherPlay);
  const notify = () => window.dispatchEvent(new CustomEvent(EVENT, { detail: element }));
  element.addEventListener("play", notify);
  return () => {
    element.removeEventListener("play", notify);
    window.removeEventListener(EVENT, onOtherPlay);
  };
}
