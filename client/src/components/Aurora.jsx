// Fond aurore : 3 blobs flous dont la teinte suit la variable --h (change en mode « série en feu »)
export default function Aurora() {
  return (
    <div className="aurora" aria-hidden="true">
      <span className="blob b1" />
      <span className="blob b2" />
      <span className="blob b3" />
      <span className="grain" />
    </div>
  );
}
