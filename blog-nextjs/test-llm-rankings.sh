#!/bin/bash

# LLM 排行榜功能测试脚本

echo "🚀 开始测试 LLM 排行榜功能..."
echo ""

# 进入项目目录
cd "$(dirname "$0")"

# 检查 Node.js
echo "1️⃣ 检查 Node.js 版本..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi
node --version
echo "✅ Node.js 已安装"
echo ""

# 检查依赖
echo "2️⃣ 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi
echo "✅ 依赖已安装"
echo ""

# TypeScript 类型检查
echo "3️⃣ TypeScript 类型检查..."
npx tsc --noEmit --skipLibCheck
if [ $? -eq 0 ]; then
    echo "✅ TypeScript 类型检查通过"
else
    echo "❌ TypeScript 类型检查失败"
    exit 1
fi
echo ""

# 构建测试
echo "4️⃣ 构建测试..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 构建成功"
else
    echo "❌ 构建失败"
    exit 1
fi
echo ""

# 检查生成的文件
echo "5️⃣ 检查生成的文件..."
files=(
    "src/types/llm.ts"
    "src/lib/llm/mock-data.ts"
    "src/app/api/llm/leaderboard/route.ts"
    "src/components/llm/RankingTable.tsx"
    "src/components/llm/UsageTrendsChart.tsx"
    "src/components/llm/MarketShareChart.tsx"
    "src/components/llm/CategoryRankings.tsx"
    "src/app/llm/page.tsx"
)

all_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file 不存在"
        all_exist=false
    fi
done

if [ "$all_exist" = false ]; then
    echo "❌ 部分文件缺失"
    exit 1
fi
echo ""

# 测试 API 路由（需要启动服务器）
echo "6️⃣ 测试 API 路由..."
echo "⚠️  需要手动启动开发服务器后测试："
echo "   npm run dev"
echo "   然后访问: http://localhost:3000/api/llm/leaderboard"
echo ""

# 测试页面路由
echo "7️⃣ 测试页面路由..."
echo "⚠️  需要手动启动开发服务器后测试："
echo "   npm run dev"
echo "   然后访问: http://localhost:3000/llm"
echo ""

# 总结
echo "✅ 所有自动化测试通过！"
echo ""
echo "📝 下一步："
echo "   1. 运行 'npm run dev' 启动开发服务器"
echo "   2. 访问 http://localhost:3000/llm 查看排行榜"
echo "   3. 测试所有交互功能"
echo "   4. 检查移动端响应式"
echo "   5. 测试暗色模式"
echo ""
echo "📚 文档："
echo "   - LLM_RANKINGS_README.md - 完整技术文档"
echo "   - LLM_RANKINGS_QUICKSTART.md - 快速开始指南"
echo "   - LLM_RANKINGS_SUMMARY.md - 实现总结"
echo ""
echo "🎉 LLM 排行榜功能已就绪！"
