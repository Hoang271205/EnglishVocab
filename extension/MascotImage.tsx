export default function MascotImage() {
  return (
    <img
      className="mascot-img"
      src={chrome.runtime.getURL('images/mascot/englishvocab-mascot.png')}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
