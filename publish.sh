#!/bin/bash

# --- Bashのカラーコード定義 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# --- HTMLからメタ情報を自動取得 ---
# アプリケーション名
APP_NAME=$(grep -o 'meta name="app-name" content="[^"]*"' index.html | head -n 1 | cut -d'"' -f4)
# バージョン
VERSION_STRING=$(grep -o 'meta name="version" content="v[0-9.]*"' index.html | head -n 1 | cut -d'"' -f4)
# 変更点
CHANGES_STRING=$(grep -o 'meta name="changes" content="[^"]*"' index.html | head -n 1 | cut -d'"' -f4)

# メタ情報が取得できたか確認
if [ -z "$APP_NAME" ] || [ -z "$VERSION_STRING" ] || [ -z "$CHANGES_STRING" ]; then
  echo -e "${RED}エラー: index.htmlからアプリケーションのメタ情報が取得できませんでした。HTMLの<meta>タグを確認してください。${NC}"
  echo -e "${RED}現在のディレクトリ: $(pwd)${NC}"
  echo -e "${RED}index.htmlの存在確認:${NC}"
  ls -l index.html
  exit 1
fi

# コミットメッセージの生成
COMMIT_MESSAGE="feat: $APP_NAME 更新 ($VERSION_STRING) - $CHANGES_STRING"

# --- Git操作 ---
echo "--- Git: 全ての変更をステージング中... ---"
git add .

# ステージングされた変更ファイルリストを表示 (赤色で強調)
CHANGED_FILES=$(git status --short | awk '{print $2}')
if [ -n "$CHANGED_FILES" ]; then # 変更されたファイルがある場合のみ表示
  echo -e "${RED}--- 以下の変更がステージングされました --- ${NC}"
  echo -e "${RED}${CHANGED_FILES}${NC}" # ファイル名を赤色で表示
else
  echo "--- Git: ステージングする変更がありませんでした。 ---"
fi


echo "--- Git: 変更をコミット中... ---"
# コミットの成否をチェック
if git commit -m "$COMMIT_MESSAGE"; then
  echo -e "${GREEN}--- Git: コミット完了: '${COMMIT_MESSAGE}' ---${NC}"
  # コミット統計を赤色で表示 (例: 2 files changed...)
  echo -e "${RED}$(git diff --stat HEAD~1 HEAD)${NC}" # 直前のコミットの統計
else
  echo -e "${RED}--- Git: コミットする変更がありませんでした、またはコミットに失敗しました。 ---\033[0m"
fi

echo "--- Git: GitHubにプッシュ中... ---"
# プッシュの成否をチェック
if git push origin main; then
  echo -e "${GREEN}--- Git: プッシュ完了 ---\033[0m"
  echo "GitHub Pagesの更新には数分かかる場合があります。ブラウザのキャッシュクリアが必要な場合があります。"
else
  echo -e "${RED}--- Git: プッシュに失敗しました。 ---\033[0m"
  echo -e "${RED}ネットワーク接続やGitHubの認証情報を確認してください。\033[0m"
fi

echo -e "${NC}" # 確実に色をリセット