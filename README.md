# VTuber Tree Map

いま YouTube で配信中の VTuber を、事務所ごとに一目で見るための画面です。

- **事務所の Treemap** — 面積は配信中のライバー数、色の濃さは事務所の合計視聴者数
- **クリックで所属ライバー一覧** — 視聴者数の多い順、クリックで YouTube へ
- **個人勢** — ひとつの受け皿として右端にまとめて表示
- 視聴者が 0 人の配信は除外しています（長時間ループや限定公開が大半のため）

## 構成

React 19 + Vite の SPA を、Cloudflare Worker が配信します。同じ Worker が
`/api` を提供し、Cron Trigger で配信状況のスナップショットを更新します。

```
Cron (毎分) ──> Holodex API ──> 集計 ──> KV
                                          │
ブラウザ ──> Worker ──> /api/agencies ─────┘
                        /api/agencies/:id/streams
```

**ブラウザは上流 API を一切叩きません。** 全訪問者が同じスナップショットから
配信されるため、上流への負荷はアクセス数に依存しません。エンドポイントは画面の
遷移に合わせて 2 つに分かれており、Treemap の初期表示に必要なのは 2 KB 未満です。

上流は `src/worker/upstream/types.ts` のインタフェースで区切ってあります。
Holodex はその実装のひとつで、別のデータ源を足す場合もこの型を満たすモジュールを
追加するだけで済みます。

| ディレクトリ | 役割 |
| --- | --- |
| `src/worker/` | Worker の入口、集計、KV、上流アダプタ |
| `src/live-map/` | 画面（Treemap のレイアウト計算、一覧、ポーリング） |
| `src/api.ts` | Worker とブラウザが共有するレスポンス契約（zod スキーマから型を導出） |

## 開発

ツールのバージョンは `mise.toml` に固定しています。

```sh
mise install
bun install
```

Holodex の API キーが必要です。[holodex.net](https://holodex.net) のアカウント設定
から発行し、`.dev.vars` に置いてください（`.dev.vars.example` を複製）。

```sh
bun run dev
```

`vite dev` はローカルの KV をシミュレートしますが、起動直後はスナップショットが
空なので API は 503 を返します。Cron ハンドラを一度叩くと埋まります。

```sh
curl http://localhost:5173/cdn-cgi/handler/scheduled
```

## スクリプト

| コマンド | 内容 |
| --- | --- |
| `bun run dev` | 開発サーバー |
| `bun run build` | 本番ビルド |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run check` | oxlint（type-aware）+ oxfmt |
| `bun run check:fix` | 上記を自動修正 |
| `bun run test` | vitest |
| `bun run cf-typegen` | `wrangler types`（`worker-configuration.d.ts` は未コミット） |
| `bun run deploy` | ビルドして Cloudflare へデプロイ |

クローン直後は `bun run cf-typegen` を実行してください。生成物である
`worker-configuration.d.ts` はコミットしていないため、無いと `typecheck` が
`CloudflareEnv` を解決できません。

品質ゲートは 3 か所にあり、それぞれ 1 ファイルに定義されています。

- `lefthook.yml` — pre-commit（staged ファイルの lint / format）と pre-push
- `.claude/hooks/stop-gate.sh` — エージェントのターン終了時
- `.oxlintrc.json` — ルールセット本体（`.oxlintrc.react-doctor.json` を継承）

## デプロイ

`wrangler.toml` の `account_id` と KV namespace の id はこのリポジトリの運用先を
指しています。フォークする場合は自分のものに差し替えてください。

```sh
bunx wrangler kv namespace create SNAPSHOT   # id を wrangler.toml に反映
bunx wrangler secret put HOLODEX_API_KEY
bun run deploy
```

## データ提供元

配信データは [Holodex](https://holodex.net) から取得しています。YouTube の生データ
には「VTuber かどうか」も「どの事務所か」も存在せず、その対応付けは Holodex が
提供しているものです。

Holodex API の利用条件は [Holodex API の規約](https://docs.holodex.net/) に従います。
規約が求める表示と注記の所在は次のとおりです。

- 画面上の出典表示 — `src/live-map/DataSourceCredit.tsx`（全ビューに表示）
- ソース中の注記（規約が指すパブリックライセンスおよび無保証条項への言及） —
  `src/worker/upstream/holodex.ts` 冒頭
- プライバシーポリシー — `public/privacy.html`

本プロジェクトは非公式であり、Holodex、および各 VTuber・運営企業とは一切関係が
ありません。

## ライセンス

このリポジトリのコードは [MIT License](./LICENSE) です。

配信データそのものは対象外です。本サイトが表示している配信情報は Holodex API を
通じて取得したもので、その利用条件は Holodex 側の規約に従います。MIT はこの
リポジトリのソースコードにのみ適用されます。

## エージェント向けの指示

`AGENTS.md` に集約しています。`CLAUDE.md` はそこへの参照です。
