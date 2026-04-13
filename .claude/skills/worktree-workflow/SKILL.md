---
name: worktree-workflow
description: git worktree で作業しているときのワークフロー。実装完了時にコミット→プッシュ→PR 作成まで自動で行うルールと、cwd 管理・workspace パッケージ解決の落とし穴の対処法。ブランチ名が `worktree-` で始まる、または `.claude/worktrees/` 配下で作業しているときに必ず適用すること。
---

# Worktree ワークフロー

git worktree で作業しているとき（ブランチ名が `worktree-` で始まる、または cwd が `.claude/worktrees/` 配下）に従うルール。

## 1. PR 作成まで自動で行う (CRITICAL)

worktree で作業している場合、**実装が完了したらコミット → プッシュ → PR 作成まで一連で実行する**。ユーザーに「PR も作って」と都度確認する必要はない。

手順:

1. `git status` / `git diff` で変更内容を確認
2. `git log` で最近のコミットメッセージのスタイルを確認
3. 関連ファイルだけを `git add <path>`（`git add -A` / `git add .` は使わない — `.env` などを巻き込む事故を避けるため）
4. HEREDOC でコミットメッセージを作成してコミット
5. `git push -u origin <branch>`
6. `gh pr create` で PR を作成（title は 70 文字以内、body は HEREDOC で渡す）
7. 作成した PR の URL をユーザーに返す

コミット・PR 作成の詳細は Claude Code のシステムプロンプトの「Committing changes with git」「Creating pull requests」のセクションに従う。

## 2. cwd は常に絶対パスで管理する (CRITICAL)

Bash ツールでは作業ディレクトリがコマンド間で持続する。`cd` でサブディレクトリに移動すると以降のコマンドに影響するため、**絶対パスを使う** か、コマンドごとに worktree ルートに戻ること。

```bash
# ✅ 絶対パスを使う
pnpm --filter @class-schedule-builder/web run test
# あるいは worktree ルートから
bun run --cwd /path/to/worktree/apps/web test

# ❌ cd したまま次のコマンドを実行しない
cd apps/web && pnpm test
# → 以降のコマンドが apps/web 基準になってしまう
```

## 3. workspace パッケージの解決 (CRITICAL)

`pnpm install` / `bun install` 後、workspace パッケージ（`@class-schedule-builder/db` など）がルートの `node_modules/` にリンクされない場合がある。スクリプト実行時に `Cannot find module` が出たら、**該当 app のディレクトリから実行する**。

```bash
# ✅ app ディレクトリから実行
cd /path/to/worktree/apps/web && pnpm run dev

# ❌ ルートから実行すると workspace リンクが見つからないことがある
cd /path/to/worktree && pnpm run apps/web/dev
```

## 4. `.claude/` 配下のファイルも worktree で変更・コミットできる

`.claude/` 配下のファイル（skills, rules 等）は git で追跡されており、worktree 内で変更すると通常通り `git status` に表示される。他のファイルと同様に worktree 内でコミット・PR 作成が可能。

## 5. destructive な操作は避ける

worktree 内でも通常どおり、以下はユーザーの明示的な指示なしに実行しない:

- `git push --force` / `git reset --hard` / `git checkout .`
- 既存コミットの `--amend`（pre-commit フックが失敗したら新しいコミットを作る）
- `--no-verify` で hook をスキップすること

hook が失敗したら原因を調査して修正する。バイパスしない。
