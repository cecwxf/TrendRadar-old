// 测试 Notion API 连接
const { Client } = require('@notionhq/client');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

console.log('Token 前缀:', NOTION_TOKEN?.substring(0, 10) + '...');
console.log('Database ID:', DATABASE_ID);

async function testNotion() {
  try {
    console.log('\n🔍 正在初始化 Notion 客户端...');
    const notion = new Client({ auth: NOTION_TOKEN });

    console.log('✅ Notion 客户端初始化成功');
    console.log('📝 Client 对象:', Object.keys(notion));
    console.log('📊 databases 对象:', Object.keys(notion.databases));

    console.log('\n🔍 正在查询 Database...');
    console.log('尝试方法 1: notion.databases.query');
    try {
      const response = await notion.databases.query({
        database_id: DATABASE_ID,
        page_size: 1,
      });
      console.log('✅ query 方法有效');
    } catch (e) {
      console.log('❌ query 方法无效:', e.message);
    }

    console.log('\n尝试方法 2: notion.databases.retrieve');
    try {
      const response = await notion.databases.retrieve({
        database_id: DATABASE_ID,
      });
      console.log('✅ retrieve 方法有效');
      console.log('Database 标题:', response.title);
    } catch (e) {
      console.log('❌ retrieve 方法失败:', e.message);
    }

    // 检查是否有其他查询方法
    console.log('\n🔍 检查 notion 对象的所有方法...');
    console.log('pages 方法:', Object.keys(notion.pages));

    console.log('\n尝试方法 3: 降级到 v2 API');
    const response = await notion.request({
      path: 'databases/' + DATABASE_ID + '/query',
      method: 'POST',
      body: { page_size: 1 },
    });

    console.log('✅ 查询成功！');
    console.log('📄 结果数量:', response.results.length);

    if (response.results.length > 0) {
      const page = response.results[0];
      console.log('\n第一条记录:');
      console.log('- ID:', page.id);
      console.log('- 属性:', Object.keys(page.properties));
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error('错误代码:', error.code);
    console.error('详细信息:', error);
  }
}

testNotion();
