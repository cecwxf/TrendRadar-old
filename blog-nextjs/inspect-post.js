// 检查实际的文章数据
require('dotenv').config({ path: '.env.local' });
const { Client } = require('@notionhq/client');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function inspectPost() {
  try {
    const notion = new Client({ auth: NOTION_TOKEN });

    console.log('🔍 正在获取文章数据...\n');

    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        property: "Published",
        checkbox: { equals: true },
      },
      page_size: 1,
    });

    if (response.results.length === 0) {
      console.log('❌ 没有找到已发布的文章');
      return;
    }

    const page = response.results[0];
    const properties = page.properties;

    console.log('📝 所有属性值：\n');
    for (const [key, value] of Object.entries(properties)) {
      console.log(`${key}:`, JSON.stringify(value, null, 2));
      console.log('---');
    }

    console.log('\n✅ 检查完成！');

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

inspectPost();
