const path = require('path');
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const baseUrl = process.env.AGENT_MART_BASE_URL || 'http://127.0.0.1:3000';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const useHeaderMode = process.env.AGENT_MART_E2E_USE_HEADER === 'true';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

if (!useHeaderMode && !anonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local for bearer mode');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const anonClient = !useHeaderMode
  ? createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

let buyerId = null;
let agentId = null;
let buyerAuthId = null;
let agentAuthId = null;
let buyerToken = null;
let agentToken = null;

const created = {
  taskId: null,
  applicationId: null,
  deliveryIds: [],
  verificationIds: [],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(label, fn, retries = 3) {
  let lastError = null;

  for (let i = 1; i <= retries; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLast = i === retries;
      if (isLast) break;

      const waitMs = 800 * i;
      console.warn(`${label} failed (attempt ${i}/${retries}): ${error.message || error}. retry in ${waitMs}ms`);
      await sleep(waitMs);
    }
  }

  throw lastError;
}

function authHeaders(userId, token) {
  if (useHeaderMode) {
    return {
      'content-type': 'application/json',
      'x-user-id': userId,
    };
  }

  if (!token) {
    throw new Error('missing access token for bearer mode');
  }

  return {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
  };
}

async function api(method, endpoint, userId, token, body) {
  return withRetry(`${method} ${endpoint}`, async () => {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: authHeaders(userId, token),
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    if (!res.ok || !json.success) {
      throw new Error(`${method} ${endpoint} failed (${res.status}): ${JSON.stringify(json)}`);
    }

    return json.data;
  });
}

async function createTempUsers() {
  const suffix = Date.now();
  const buyerEmail = `agent-mart-v02-buyer-${suffix}@example.com`;
  const agentEmail = `agent-mart-v02-agent-${suffix}@example.com`;
  const password = `Tmp#${randomUUID()}Aa1`;

  const buyerRes = await withRetry('create buyer user', () =>
    admin.auth.admin.createUser({
      email: buyerEmail,
      password,
      email_confirm: true,
      user_metadata: { source: 'agent_mart_v02_e2e', role: 'buyer' },
    })
  );

  if (buyerRes.error || !buyerRes.data.user?.id) {
    throw new Error(`create buyer user failed: ${buyerRes.error?.message || 'unknown'}`);
  }

  const agentRes = await withRetry('create agent user', () =>
    admin.auth.admin.createUser({
      email: agentEmail,
      password,
      email_confirm: true,
      user_metadata: { source: 'agent_mart_v02_e2e', role: 'agent' },
    })
  );

  if (agentRes.error || !agentRes.data.user?.id) {
    throw new Error(`create agent user failed: ${agentRes.error?.message || 'unknown'}`);
  }

  buyerId = buyerRes.data.user.id;
  agentId = agentRes.data.user.id;
  buyerAuthId = buyerRes.data.user.id;
  agentAuthId = agentRes.data.user.id;

  if (!useHeaderMode) {
    const buyerSignIn = await withRetry('sign in buyer', () =>
      anonClient.auth.signInWithPassword({ email: buyerEmail, password })
    );
    if (buyerSignIn.error || !buyerSignIn.data.session?.access_token) {
      throw new Error(`sign in buyer failed: ${buyerSignIn.error?.message || 'unknown'}`);
    }
    buyerToken = buyerSignIn.data.session.access_token;

    const agentSignIn = await withRetry('sign in agent', () =>
      anonClient.auth.signInWithPassword({ email: agentEmail, password })
    );
    if (agentSignIn.error || !agentSignIn.data.session?.access_token) {
      throw new Error(`sign in agent failed: ${agentSignIn.error?.message || 'unknown'}`);
    }
    agentToken = agentSignIn.data.session.access_token;
  }
}

async function cleanup() {
  for (const id of created.verificationIds) {
    await admin.from('task_verifications').delete().eq('id', id);
  }
  for (const id of created.deliveryIds) {
    await admin.from('task_deliveries').delete().eq('id', id);
  }

  if (created.applicationId) {
    await admin.from('task_applications').delete().eq('id', created.applicationId);
  }
  if (created.taskId) {
    await admin.from('mart_tasks').delete().eq('id', created.taskId);
  }

  if (agentId) {
    await admin.from('agent_profiles').delete().eq('user_id', agentId);
  }

  const userIds = [buyerId, agentId].filter(Boolean);
  if (userIds.length > 0) {
    await admin.from('mart_users').delete().in('id', userIds);
    await admin.from('mart_audit_logs').delete().in('actor_user_id', userIds);
  }

  const entityIds = [
    created.taskId,
    created.applicationId,
    ...created.deliveryIds,
    ...created.verificationIds,
  ].filter(Boolean);
  if (entityIds.length > 0) {
    await admin.from('mart_audit_logs').delete().in('entity_id', entityIds);
  }

  if (buyerAuthId) {
    await admin.auth.admin.deleteUser(buyerAuthId);
  }
  if (agentAuthId) {
    await admin.auth.admin.deleteUser(agentAuthId);
  }
}

(async () => {
  console.log('Agent Mart V0.2 E2E start');
  console.log(`mode=${useHeaderMode ? 'header' : 'bearer'} baseUrl=${baseUrl}`);

  await createTempUsers();
  console.log('buyerId', buyerId);
  console.log('agentId', agentId);

  try {
    await api('POST', '/api/agent-mart/users/role', buyerId, buyerToken, {
      role: 'buyer',
      displayName: 'Buyer V02 E2E',
    });
    await api('POST', '/api/agent-mart/users/role', agentId, agentToken, {
      role: 'agent',
      displayName: 'Agent V02 E2E',
    });

    await api('POST', '/api/agent-mart/agents/profile', agentId, agentToken, {
      headline: 'V0.2 Agent',
      skills: ['nextjs', 'supabase', 'typescript'],
      tools: ['openclaw', 'git', 'gh'],
      bio: 'verify v0.2 workflow',
    });

    const task = await api('POST', '/api/agent-mart/tasks', buyerId, buyerToken, {
      title: `V02 E2E ${Date.now()}`,
      description: 'Verify reject checklist + redelivery + reputation',
      budgetMin: 100,
      budgetMax: 260,
      currency: 'USD',
      etaDays: 2,
      techStack: ['nextjs', 'supabase'],
    });
    created.taskId = task.id;

    const application = await api('POST', `/api/agent-mart/tasks/${task.id}/apply`, agentId, agentToken, {
      bidAmount: 180,
      etaDays: 2,
      plan: 'First pass, receive feedback, second pass finalize',
      confidence: 0.82,
    });
    created.applicationId = application.id;

    await api('POST', `/api/agent-mart/applications/${application.id}/accept`, buyerId, buyerToken, {});

    const firstDelivery = await api('POST', '/api/agent-mart/deliveries', agentId, agentToken, {
      taskId: task.id,
      evidence: {
        pr_url: 'https://github.com/example/repo/pull/701',
        repo_full_name: 'example/repo',
        pr_number: 701,
        commit_sha: 'v02firstpass001',
        self_check: 'npm run lint => PASS',
      },
    });
    created.deliveryIds.push(firstDelivery.id);

    const firstReject = await api('POST', `/api/agent-mart/deliveries/${firstDelivery.id}/reject`, buyerId, buyerToken, {
      rejectReason: 'Need stronger test coverage and edge cases',
      changeRequests: [
        'Add unit tests for payload parser',
        'Handle empty and null inputs',
        'Update PR description with risk notes',
      ],
      comment: 'Please address each item and resubmit',
    });
    created.verificationIds.push(firstReject.id);

    if (!Array.isArray(firstReject.change_requests) || firstReject.change_requests.length < 3) {
      throw new Error(`reject checklist write failed: ${JSON.stringify(firstReject)}`);
    }

    const secondDelivery = await api('POST', '/api/agent-mart/deliveries', agentId, agentToken, {
      taskId: task.id,
      evidence: {
        pr_url: 'https://github.com/example/repo/pull/701',
        repo_full_name: 'example/repo',
        pr_number: 701,
        commit_sha: 'v02secondpass002',
        self_check: 'npm run lint && npm run build => PASS',
      },
    });
    created.deliveryIds.push(secondDelivery.id);

    const secondApprove = await api('POST', `/api/agent-mart/deliveries/${secondDelivery.id}/approve`, buyerId, buyerToken, {
      comment: 'Approved after fixes',
    });
    created.verificationIds.push(secondApprove.id);

    const deliveriesMine = await api('GET', '/api/agent-mart/deliveries/mine', agentId, agentToken);
    const chain = deliveriesMine.filter((row) => row.delivery.task_id === task.id);
    if (chain.length !== 2) {
      throw new Error(`delivery chain verify failed: expected 2, got ${chain.length}`);
    }

    const reputation = await api('GET', '/api/agent-mart/agents/reputation', agentId, agentToken);
    const summary = reputation.summary;
    if (!summary) {
      throw new Error('missing reputation summary');
    }

    if (summary.total_deliveries < 2 || summary.rejected_deliveries < 1 || summary.approved_deliveries < 1) {
      throw new Error(`unexpected reputation summary: ${JSON.stringify(summary)}`);
    }

    const checklistTracked = summary.recent_records.some(
      (record) =>
        Array.isArray(record.change_requests) &&
        record.change_requests.includes('Add unit tests for payload parser')
    );

    if (!checklistTracked) {
      throw new Error('reputation recent records missing reject checklist history');
    }

    const buyerTasks = await api('GET', '/api/agent-mart/tasks/mine', buyerId, buyerToken);
    const closedTask = buyerTasks.find((row) => row.id === task.id);
    if (!closedTask || closedTask.status !== 'CLOSED') {
      throw new Error(`task final status verify failed: ${closedTask?.status || 'missing'}`);
    }

    console.log('Agent Mart V0.2 E2E success');
    console.log(
      JSON.stringify(
        {
          taskId: task.id,
          deliveryCount: chain.length,
          passRate: summary.pass_rate,
          rejectedDeliveries: summary.rejected_deliveries,
          approvedDeliveries: summary.approved_deliveries,
          avgReworkCount: summary.avg_rework_count,
          avgDeliveryHours: summary.avg_delivery_hours,
        },
        null,
        2
      )
    );
  } finally {
    await cleanup().catch((error) => {
      console.error('cleanup warning:', error.message || error);
    });
  }
})().catch((error) => {
  console.error('Agent Mart V0.2 E2E failed:', error.message || error);
  process.exit(1);
});
