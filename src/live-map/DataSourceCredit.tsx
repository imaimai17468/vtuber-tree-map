/**
 * The Holodex API terms oblige anyone giving public access to their material to
 * identify Holodex, and to publish a privacy policy covering its use.
 */
export function DataSourceCredit() {
  return (
    <footer className="credit">
      配信データ提供:{" "}
      <a href="https://holodex.net" target="_blank" rel="noreferrer">
        Holodex
      </a>
      <span className="credit-note">
        （本サイトは Holodex とは無関係の非公式なものです）
      </span>
      <a href="/privacy.html">プライバシーポリシー</a>
    </footer>
  );
}
