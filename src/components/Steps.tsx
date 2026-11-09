import { REPO } from "../data/catalog";

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-in">
        <span>EchoX</span>
        <a href={REPO}>GitHub ↗</a>
      </div>
    </footer>
  );
}
