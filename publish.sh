#!/bin/bash

# --- HTMLからメタ情報を自動取得 ---
# アプリケーション名
APP_NAME=$(grep -o 'meta name="app-name" content="[^"]*"' index.html | head -n 1 | cut -d'"' -f4)
# バージョン
VERSION_STRING=$(grep -o 'meta name="version" content="v[0-9.]*"' index.html | head -n 1 | cut -d'"' -f4)
# 変更点
CHANGES_STRING=$(grep -o 'meta name="changes" content="[^"]*"' index.html | head -n 1 | cut -d'"' -f4)

# メタ情報が取得できたか確認
if [ -z "$APP_NAME" ] || [ -z "$VERSION_STRING" ] || [ -z "$CHANGES_STRING" ]; then
  echo -e "\033[0;31mエラー: index.htmlからアプリケーションのメタ情報が取得できませんでした。HTMLの<meta>タグを確認してください。\033[0m" # 赤色出力
  echo -e "\033[0;31m現在のディレクトリ: $(pwd)\033[0m" # 現在のディレクトリを表示
  echo -e "\033[0;31mindex.htmlの存在確認:\033[0m"
  ls -l index.html # index.htmlの存在とパーミッションを確認
  exit 1
fi

# コミットメッセージの生成
COMMIT_MESSAGE="feat: $APP_NAME 更新 ($VERSION_STRING) - $CHANGES_STRING"

# --- Git操作 ---
echo "--- Git: 全ての変更をステージング中... ---"
git add .

# ステージングされた変更を表示 (赤色で)
echo -e "\033[0;31m--- 以下の変更がステージングされました: --- \033[0m" # 赤色出力
git status --short # 簡潔な形式で表示
echo -e "\033[0m" # 色をリセット

echo "--- Git: 変更をコミット中... ---"
# コミットの成否をチェック
if git commit -m "$COMMIT_MESSAGE"; then
  echo -e "\033[0;32m--- Git: コミット完了: '$COMMIT_MESSAGE' ---\033[0m" # 緑色出力
else
  echo -e "\033[0;31m--- Git: コミットする変更がありませんでした、またはコミットに失敗しました。 ---\033[0m" # 赤色出力
fi

echo "--- Git: GitHubにプッシュ中... ---"
# プッシュの成否をチェック
if git push origin main; then
  echo -e "\033[0;32m--- Git: プッシュ完了 ---\033[0m" # 緑色出力
  echo "GitHub Pagesの更新には数分かかる場合があります。ブラウザのキャッシュクリアが必要な場合があります。"
else
  echo -e "\033[0;31m--- Git: プッシュに失敗しました。 ---\033[0m" # 赤色出力
  echo -e "\033[0;31mネットワーク接続やGitHubの認証情報を確認してください。\033[0m" # 赤色出力
fi

echo -e "\033[0m" # 確実に色をリセッ