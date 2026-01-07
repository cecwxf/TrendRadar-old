// 检查 Database 结构
require('dotenv').config({ path: '.env.local' });
const { Client } = require('@notionhq/client');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function checkDatabase() {
  try {
    const notion = new Client({ auth: NOTION_TOKEN });

    console.log('🔍 正在检查 Database 结构...\n');

    const db = await notion.databases.retrieve({ database_id: DATABASE_ID });

    console.log('📊 Database 名称:', db.title[0]?.plain_text || '未命名');
    console.log('\n📝 Database 属性列表：\n');

    for (const [name, prop] of Object.entries(db.properties)) {
      console.log(`- ${name} (${prop.type})`);
    }

    console.log('\n✅ 检查完成！');

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

checkDatabase();
