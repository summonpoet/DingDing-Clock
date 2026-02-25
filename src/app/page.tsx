'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import SummaryCard from '@/components/SummaryCard';
import AddAccountModal from '@/components/AddAccountModal';
import AccountList from '@/components/AccountList';
import {
  getAccounts,
  addAccount,
  removeAccount,
  getSummaries,
  addSummary,
  getSettings,
  saveSummaries,
} from '@/lib/storage';
import { TrackedAccount, Summary } from '@/lib/types';

type ViewMode = 'feed' | 'accounts';

export default function HomePage() {
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('feed');
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAccounts(getAccounts());
    setSummaries(getSummaries());
    setLoaded(true);
  }, []);

  const handleAddAccount = useCallback((handle: string) => {
    const newAccount: TrackedAccount = {
      handle,
      name: handle,
      addedAt: new Date().toISOString(),
    };
    const updated = addAccount(newAccount);
    setAccounts([...updated]);
  }, []);

  const handleRemoveAccount = useCallback((handle: string) => {
    const updated = removeAccount(handle);
    setAccounts([...updated]);
  }, []);

  const handleRefresh = async () => {
    const settings = getSettings();
    if (!settings.claudeApiKey) {
      alert('请先在设置页面配置 Claude API Key');
      return;
    }
    if (!settings.xApiBearerToken) {
      alert('请先在设置页面配置 X API Bearer Token');
      return;
    }
    if (accounts.length === 0) {
      alert('请先添加要追踪的 X 账户');
      return;
    }

    setRefreshing(true);
    const currentAccounts = getAccounts();

    for (const account of currentAccounts) {
      try {
        setRefreshStatus(`正在获取 @${account.handle} 的推文...`);

        // Fetch tweets
        const fetchRes = await fetch('/api/fetch-tweets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            handle: account.handle,
            bearerToken: settings.xApiBearerToken,
          }),
        });

        if (!fetchRes.ok) {
          const err = await fetchRes.json();
          console.error(`获取 @${account.handle} 推文失败:`, err);
          setRefreshStatus(`@${account.handle} 获取失败，跳过...`);
          continue;
        }

        const { tweets, user } = await fetchRes.json();
        if (!tweets || tweets.length === 0) {
          setRefreshStatus(`@${account.handle} 没有新推文，跳过...`);
          continue;
        }

        // Update account info
        if (user) {
          account.name = user.name || account.handle;
          account.xUserId = user.id;
          account.profileImageUrl = user.profileImageUrl;
        }

        // Summarize with Claude
        setRefreshStatus(`正在用 AI 分析 @${account.handle} 的内容...`);

        const sumRes = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tweets,
            authorHandle: account.handle,
            authorName: account.name,
            claudeApiKey: settings.claudeApiKey,
          }),
        });

        if (!sumRes.ok) {
          const err = await sumRes.json();
          console.error(`总结 @${account.handle} 失败:`, err);
          setRefreshStatus(`@${account.handle} AI 分析失败，跳过...`);
          continue;
        }

        const { summary: summaryText, keyInsights, research } = await sumRes.json();

        const dates = tweets.map((t: { createdAt: string }) =>
          new Date(t.createdAt).getTime()
        );

        const newSummary: Summary = {
          id: `${account.handle}-${Date.now()}`,
          authorHandle: account.handle,
          authorName: account.name || account.handle,
          tweets,
          summary: summaryText,
          keyInsights: keyInsights || [],
          research: research || '',
          generatedAt: new Date().toISOString(),
          periodStart: new Date(Math.min(...dates)).toISOString(),
          periodEnd: new Date(Math.max(...dates)).toISOString(),
        };

        const updated = addSummary(newSummary);
        setSummaries([...updated]);
      } catch (err) {
        console.error(`处理 @${account.handle} 时出错:`, err);
        setRefreshStatus(`@${account.handle} 处理出错，跳过...`);
      }
    }

    // Save updated account info
    const { saveAccounts } = await import('@/lib/storage');
    saveAccounts(currentAccounts);
    setAccounts([...currentAccounts]);

    setRefreshing(false);
    setRefreshStatus('');
  };

  const handleClearSummaries = () => {
    if (confirm('确定要清除所有摘要吗？')) {
      saveSummaries([]);
      setSummaries([]);
    }
  };

  if (!loaded) {
    return (
      <>
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="text-center text-gray-400 py-20">加载中...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'feed'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600'
              }`}
              onClick={() => setViewMode('feed')}
            >
              信息流
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'accounts'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600'
              }`}
              onClick={() => setViewMode('accounts')}
            >
              关注列表 ({accounts.length})
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              className="btn-primary text-sm"
              onClick={() => setShowAddModal(true)}
            >
              + 添加账户
            </button>
            <button
              className="btn-secondary text-sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? '刷新中...' : '刷新'}
            </button>
            {summaries.length > 0 && (
              <button
                className="btn-danger text-sm"
                onClick={handleClearSummaries}
              >
                清除摘要
              </button>
            )}
          </div>
        </div>

        {/* Status */}
        {refreshStatus && (
          <div className="card p-3 mb-4 text-sm text-blue-700 bg-blue-50 border-blue-200">
            {refreshStatus}
          </div>
        )}

        {/* Views */}
        {viewMode === 'feed' && (
          <div>
            {summaries.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <div className="text-4xl mb-4">
                  <svg
                    className="w-16 h-16 mx-auto text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                </div>
                <p className="text-lg mb-2">还没有内容摘要</p>
                <p className="text-sm">
                  {accounts.length === 0
                    ? '先添加一些 X 账户，然后点击"刷新"来获取内容'
                    : '点击"刷新"按钮来获取最新内容和 AI 摘要'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {summaries.map((summary) => (
                  <SummaryCard key={summary.id} summary={summary} />
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode === 'accounts' && (
          <AccountList
            accounts={accounts}
            onRemove={handleRemoveAccount}
          />
        )}

        {/* Add Account Modal */}
        <AddAccountModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddAccount}
        />
      </main>
    </>
  );
}
