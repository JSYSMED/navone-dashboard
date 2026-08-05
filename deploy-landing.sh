#!/bin/bash
# ============================================================
# CommerOne 랜딩 배포 스크립트 (deploy-landing.sh)
# 로컬에서 실행 → dist 업로드 → VPS 웹루트 교체 → nginx reload
#
# 사용법:
#   bash deploy-landing.sh "/Users/yonseimed/Downloads/dist 2"
#   (dist 폴더 경로를 인자로. 안 주면 아래 DIST_DIR 기본값 사용)
# ============================================================

set -e  # 에러 나면 즉시 중단

# ---- 설정 (한 번만 맞춰두면 됨) ----
VPS="root@1.234.91.111"
WEBROOT="/var/www/commerone-landing"
TMP="/tmp/landing-new"
DIST_DIR="${1:-$HOME/Downloads/dist}"   # 인자로 받거나 기본값

# ---- 0. dist 폴더 확인 ----
if [ ! -f "$DIST_DIR/index.html" ]; then
  echo "❌ '$DIST_DIR/index.html' 없음. dist 폴더 경로를 인자로 주세요."
  echo "   예: bash deploy-landing.sh \"/Users/yonseimed/Downloads/dist 2\""
  exit 1
fi
echo "📦 배포할 폴더: $DIST_DIR"
ls "$DIST_DIR"/*.html

# ---- 1. VPS 임시폴더 초기화 + 업로드 ----
echo ""
echo "⬆️  업로드 중... (VPS 비밀번호 입력)"
ssh "$VPS" "rm -rf $TMP && mkdir -p $TMP"
scp -O "$DIST_DIR"/*.html "$VPS:$TMP/"

# ---- 2. VPS에서 교체 + 권한 + nginx reload (한 번에) ----
echo ""
echo "🔄 웹루트 교체 + nginx reload... (VPS 비밀번호 다시 입력)"
ssh "$VPS" bash -s <<ENDSSH
  set -e
  STAMP=\$(date +%Y%m%d-%H%M%S)
  # 기존 백업 (최근 3개만 유지)
  if [ -d "$WEBROOT" ]; then
    mv "$WEBROOT" "${WEBROOT}.bak.\$STAMP"
  fi
  ls -dt ${WEBROOT}.bak.* 2>/dev/null | tail -n +4 | xargs -r rm -rf
  # 새 폴더 구성
  mkdir -p "$WEBROOT"
  cp $TMP/*.html "$WEBROOT/"
  chown -R www-data:www-data "$WEBROOT"
  # nginx 검사 후 reload
  nginx -t && systemctl reload nginx
  echo "✅ VPS 반영 완료:"
  ls -la "$WEBROOT/"
ENDSSH

echo ""
echo "🎉 배포 완료 — https://commerone.store (Cmd+Shift+R 로 강력 새로고침)"
