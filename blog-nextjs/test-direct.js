// 直接测试 token
require('dotenv').config({ path: '.env.local' });
const { Client } = require('@notionhq/client');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function test() {
  console.log('Token:', NOTION_TOKEN);
  console.log('Database ID:', DATABASE_ID);

  try {
    const notion = new Client({ auth: NOTION_TOKEN });
    console.log('\n✅ Client 初始化成功');

    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      page_size: 1,
    });

    console.log('✅ 查询成功！');
    console.log('结果数量:', response.results.length);
  } catch (error) {
    console.log('\n❌ 错误:', error.message);
    console.log('错误代码:', error.code);

    if (error.code === 'unauthorized') {
      console.log('\n⚠️  Token 无效！');
      console.log('这个 ntn_ 开头的 token 不被 Notion API 接受。');
      console.log('');
      console.log('请访问: https://www.notion.so/my-integrations');
      console.log('找到你的 Integration，应该有一个 secret_ 开头的 token。');
    }
  }
}

test();
