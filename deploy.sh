#!/bin/bash
npm run build && \
scp -r dist/* root@1.234.91.111:/var/www/commerone/dist/ && \
ssh root@1.234.91.111 "chown -R www-data:www-data /var/www/commerone/dist" && \
echo "✅ 배포 완료 — commerone.store 강력새로고침(Cmd+Shift+R)"
