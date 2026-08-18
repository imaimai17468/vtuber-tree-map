/**
 * Required, not decorative: the Holodex API terms oblige anyone giving public
 * access to Holodex material to identify Holodex, or link to it wherever
 * possible. It therefore renders on every view, including the error and empty
 * states — those still reached the API.
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
    </footer>
  );
}
