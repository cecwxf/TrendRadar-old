#!/bin/bash
# ============================================
# DHT Relay 一键部署脚本
# 在服务器上执行: bash deploy-relay.sh
# ============================================
set -e

echo "=== 安装 Node.js (如果没有) ==="
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v), npm: $(npm -v)"

echo "=== 创建 relay 目录 ==="
mkdir -p /opt/dht-relay
cd /opt/dht-relay

echo "=== 初始化项目并安装 dht-relay ==="
npm init -y
npm install @hyperswarm/dht-relay hyperdht ws graceful-goodbye

echo "=== 创建 systemd 服务 ==="
cat > /etc/systemd/system/dht-relay.service << 'EOF'
[Unit]
Description=Hyperswarm DHT Relay
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/dht-relay
ExecStart=/usr/bin/npx @hyperswarm/dht-relay --port 49443 --host 0.0.0.0
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "=== 启动服务 ==="
systemctl daemon-reload
systemctl enable dht-relay
systemctl start dht-relay

echo "=== 开放防火墙端口 ==="
if command -v ufw &> /dev/null; then
  ufw allow 49443/tcp
elif command -v firewall-cmd &> /dev/null; then
  firewall-cmd --permanent --add-port=49443/tcp
  firewall-cmd --reload
fi

sleep 2
echo ""
echo "=== 状态检查 ==="
systemctl status dht-relay --no-pager
echo ""
echo "✅ DHT Relay 已部署！"
echo "地址: ws://$(hostname -I | awk '{print $1}'):49443"
echo ""
echo "常用命令:"
echo "  查看日志: journalctl -u dht-relay -f"
echo "  重启服务: systemctl restart dht-relay"
echo "  停止服务: systemctl stop dht-relay"
