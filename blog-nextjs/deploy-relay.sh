#!/bin/bash
# ============================================
# DHT Relay + Caddy WSS 反代 一键部署脚本
# 用法: bash deploy-relay.sh <域名>
# 例如: bash deploy-relay.sh relay.example.com
# ============================================
set -e

DOMAIN="${1:?用法: bash deploy-relay.sh <域名>}"

echo "=== 安装 Node.js (如果没有) ==="
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v), npm: $(npm -v)"

echo "=== 安装 Caddy ==="
if ! command -v caddy &> /dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi
echo "Caddy: $(caddy version)"

echo "=== 创建 relay 目录 ==="
mkdir -p /opt/dht-relay
cd /opt/dht-relay

echo "=== 初始化项目并安装 dht-relay ==="
npm init -y
npm install @hyperswarm/dht-relay hyperdht ws graceful-goodbye

echo "=== 创建 DHT Relay systemd 服务 ==="
cat > /etc/systemd/system/dht-relay.service << 'EOF'
[Unit]
Description=Hyperswarm DHT Relay
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/dht-relay
ExecStart=/usr/bin/npx @hyperswarm/dht-relay --port 49443 --host 127.0.0.1
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "=== 配置 Caddy 反代 (自动 HTTPS) ==="
cat > /etc/caddy/Caddyfile << EOF
${DOMAIN} {
    reverse_proxy localhost:49443
}
EOF

echo "=== 启动服务 ==="
systemctl daemon-reload
systemctl enable dht-relay caddy
systemctl restart dht-relay
systemctl restart caddy

echo "=== 开放防火墙端口 ==="
if command -v ufw &> /dev/null; then
  ufw allow 80/tcp
  ufw allow 443/tcp
elif command -v firewall-cmd &> /dev/null; then
  firewall-cmd --permanent --add-port=80/tcp
  firewall-cmd --permanent --add-port=443/tcp
  firewall-cmd --reload
fi

sleep 3
echo ""
echo "=== 状态检查 ==="
systemctl status dht-relay --no-pager || true
echo ""
systemctl status caddy --no-pager || true
echo ""
echo "✅ DHT Relay + WSS 已部署！"
echo "地址: wss://${DOMAIN}"
echo ""
echo "部署完成后，在 Vercel 环境变量中设置:"
echo "  NEXT_PUBLIC_DHT_RELAY_URL=wss://${DOMAIN}"
echo ""
echo "常用命令:"
echo "  查看 relay 日志: journalctl -u dht-relay -f"
echo "  查看 caddy 日志: journalctl -u caddy -f"
echo "  重启服务: systemctl restart dht-relay caddy"
echo "  停止服务: systemctl stop dht-relay caddy"
