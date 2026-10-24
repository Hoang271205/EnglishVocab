export default function MascotImage() {
  return (
    <img
      className="mascot-img"
      src={chrome.runtime.getURL(
        'images/mascot/englishvocab-mascot-small.webp',
      )}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
