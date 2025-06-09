#!/bin/bash

# --- Bashのカラーコード定義 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m' # 警告用
NC='\033[0m' # No Color

# --- jqコマンドの存在確認 ---
if ! command -v jq &> /dev/null
then
    echo -e "${RED}エラー: 'jq' コマンドが見つかりません。JSONファイルの解析には 'jq' が必要です。\033[0m"
    echo -e "${RED}インストールするには: sudo apt-get install jq (Linux) または brew install jq (macOS) または choco install jq (Windows/Chocolatey) を実行してください。\033[0m"
    exit 1
fi

# --- version.jsonから情報を自動取得 ---
VERSION_FILE="version.json"

if [ ! -f "$VERSION_FILE" ]; then
  echo -e "${RED}エラー: ${VERSION_FILE} が見つかりません。プロジェクトのルートディレクトリに存在するか確認してください。${NC}"
  exit 1
fi

APP_VERSION_MAIN=$(jq -r '.appVersion' "$VERSION_FILE")
APP_CHANGES_MAIN=$(jq -r '.appChanges' "$VERSION_FILE")
FILE_VERSION_HTML=$(jq -r '.fileVersions."index.html"' "$VERSION_FILE")
FILE_VERSION_JS=$(jq -r '.fileVersions."app.js"' "$VERSION_FILE")
FILE_VERSION_PUBLISH_SH=$(jq -r '.fileVersions."publish.sh"' "$VERSION_FILE") # 追加
FILE_VERSION_VERSION_JSON=$(jq -r '.fileVersions."version.json"' "$VERSION_FILE") # 追加

# バージョン情報が取得できたか確認
if [ -z "$APP_VERSION_MAIN" ] || \
   [ -z "$APP_CHANGES_MAIN" ] || \
   [ -z "$FILE_VERSION_HTML" ] || \
   [ -z "$FILE_VERSION_JS" ] || \
   [ -z "$FILE_VERSION_PUBLISH_SH" ] || \
   [ -z "$FILE_VERSION_VERSION_JSON" ]; then
  echo -e "${RED}エラー: ${VERSION_FILE}から必要なバージョン情報が取得できませんでした。${VERSION_FILE}の形式を確認してください。${NC}"
  exit 1
fi

# アプリケーション名 (現在は使用していないが、metaタグから取得する代わりに直接定義することも可能)
# APP_NAME="カメラで幾ら？" # 必要であればここで定義

# コミットメッセージの生成
# publish.shの実行時にコマンドライン引数として渡された任意のメッセージを先頭に付与
CUSTOM_MESSAGE=""
if [ -n "$1" ]; then # コマンドライン引数 ($1) があればそれをカスタムメッセージとする
  CUSTOM_MESSAGE="$1 - "
fi

# 新しいコミットメッセージフォーマット
COMMIT_MESSAGE="${CUSTOM_MESSAGE}feat: カメラで幾ら？ ${APP_VERSION_MAIN} (HTML: ${FILE_VERSION_HTML}, JS: ${FILE_VERSION_JS}, publish.sh: ${FILE_VERSION_PUBLISH_SH}, version.json: ${FILE_VERSION_VERSION_JSON}) - ${APP_CHANGES_MAIN}"


# --- Git操作 ---
echo "--- Git: 全ての変更をステージング中... ---"
git add .

# ステージングされた変更ファイルリストを表示 (赤色で強調)
CHANGED_FILES=$(git status --short | awk '{print $2}')
if [ -n "$CHANGED_FILES" ]; then # 変更されたファイルがある場合のみ表示
  echo -e "${YELLOW}--- 以下の変更がステージングされました --- ${NC}" # 黄色に変更
  echo -e "${YELLOW}${CHANGED_FILES}${NC}" # ファイル名を黄色で表示
else
  echo -e "${YELLOW}--- Git: ステージングする変更がありませんでした。 ---${NC}" # 黄色に変更
fi


echo "--- Git: 変更をコミット中... ---"
# コミットの成否をチェック
if git commit -m "$COMMIT_MESSAGE"; then
  echo -e "${GREEN}--- Git: コミット完了: '${COMMIT_MESSAGE}' ---${NC}"
  # コミット統計を緑色で表示 (例: 2 files changed...)
  echo -e "${GREEN}$(git diff --stat HEAD~1 HEAD)${NC}" # 直前のコミットの統計
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