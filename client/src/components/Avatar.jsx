// Avatar généré de façon déterministe à partir du pseudo
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function Avatar({ name = '', size = 40 }) {
  const n = name.trim() || '?';
  const h = hash(n.toLowerCase());
  const a = h % 360;
  const b = (a + 60 + (h % 80)) % 360;
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        background: `linear-gradient(135deg, hsl(${a} 85% 60%), hsl(${b} 85% 55%))`,
      }}
      aria-hidden="true"
    >
      {n[0].toUpperCase()}
    </span>
  );
}
