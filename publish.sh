#!/bin/bash

# --- HTMLからメタ情報を自動取得 ---
# jqがインストールされていない場合はエラーになる可能性があるが、Git Bash標準にはないため、
# grepとcutで代替する。

# アプリケーション名
APP_NAME=$(grep -o 'meta name="app-name" content="[^"]*"' index.html | head -n 1 | cut -d'"' -f4)
# バージョン
VERSION_STRING=$(grep -o 'meta name="version" content="v[0-9.]*"' index.html | head -n 1 | cut -d'"' -f4)
# 変更点
CHANGES_STRING=$(grep -o 'meta name="changes" content="[^"]*"' index.html | head -n 1 | cut -d'"' -f4)

# メタ情報が取得できたか確認
if [ -z "$APP_NAME" ] || [ -z "$VERSION_STRING" ] || [ -z "$CHANGES_STRING" ]; then
  echo "エラー: index.htmlからアプリケーションのメタ情報が取得できませんでした。HTMLの<meta>タグを確認してください。"
  exit 1
fi

# コミットメッセージの生成
COMMIT_MESSAGE="feat: $APP_NAME 更新 ($VERSION_STRING) - $CHANGES_STRING"

# --- Git操作 ---
echo "--- Git: 全ての変更をステージング中... ---"
git add .

echo "--- Git: 変更をコミット中... ---"
if git commit -m "$COMMIT_MESSAGE"; then
  echo "--- Git: コミット完了: '$COMMIT_MESSAGE' ---"
else
  echo "--- Git: コミットする変更がありませんでした、またはコミットに失敗しました。 ---"
fi

echo "--- Git: GitHubにプッシュ中... ---"
git push origin main

echo "--- Git: プッシュ完了 ---"
echo "GitHub Pagesの更新には数分かかる場合があります。ブラウザのキャッシュクリアが必要な場合があります。"