'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import SummaryCard from '@/components/SummaryCard';
import { getSummariesByHandle, getAccounts, getSettings } from '@/lib/storage';
import { Summary, TrackedAccount } from '@/lib/types';
import { addSummary } from '@/lib/storage';

export default function PersonPage() {
  const params = useParams();
  const handle = params.handle as string;

  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [account, setAccount] = useState<TrackedAccount | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const allAccounts = getAccounts();
    const found = allAccounts.find(
      (a) => a.handle.toLowerCase() === handle.toLowerCase()
    );
    setAccount(found || null);
    setSummaries(getSummariesByHandle(handle));
    setLoaded(true);
  }, [handle]);

  const handleRefresh = async () => {
    const settings = getSettings();
    if (!settings.claudeApiKey || !settings.xApiBearerToken) {
      alert('请先在设置页面配置 API Keys');
      return;
    }

    setRefreshing(true);
    setStatus('正在获取推文...');

    try {
      const fetchRes = await fetch('/api/fetch-tweets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle,
          bearerToken: settings.xApiBearerToken,
        }),
      });

      if (!fetchRes.ok) {
        const err = await fetchRes.json();
        setStatus(`获取失败: ${err.error}`);
        setRefreshing(false);
        return;
      }

      const { tweets } = await fetchRes.json();
      if (!tweets || tweets.length === 0) {
        setStatus('没有找到推文');
        setRefreshing(false);
        return;
      }

      setStatus('正在用 AI 分析内容...');

      const sumRes = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweets,
          authorHandle: handle,
          authorName: account?.name || handle,
          claudeApiKey: settings.claudeApiKey,
        }),
      });

      if (!sumRes.ok) {
        const err = await sumRes.json();
        setStatus(`AI 分析失败: ${err.error}`);
        setRefreshing(false);
        return;
      }

      const { summary: summaryText, keyInsights, research } = await sumRes.json();

      const dates = tweets.map((t: { createdAt: string }) =>
        new Date(t.createdAt).getTime()
      );

      const newSummary: Summary = {
        id: `${handle}-${Date.now()}`,
        authorHandle: handle,
        authorName: account?.name || handle,
        tweets,
        summary: summaryText,
        keyInsights: keyInsights || [],
        research: research || '',
        generatedAt: new Date().toISOString(),
        periodStart: new Date(Math.min(...dates)).toISOString(),
        periodEnd: new Date(Math.max(...dates)).toISOString(),
      };

      addSummary(newSummary);
      setSummaries(getSummariesByHandle(handle));
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('发生错误');
    }

    setRefreshing(false);
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
        {/* Back link */}
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
        >
          &larr; 返回信息流
        </Link>

        {/* Person header */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-xl">
                {handle[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  {account?.name || handle}
                </h1>
                <p className="text-gray-500">@{handle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://x.com/${handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                在 X 上查看
              </a>
              <button
                className="btn-primary text-sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? '分析中...' : '刷新分析'}
              </button>
            </div>
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className="card p-3 mb-4 text-sm text-blue-700 bg-blue-50 border-blue-200">
            {status}
          </div>
        )}

        {/* Summaries */}
        {summaries.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg mb-2">还没有此账户的分析内容</p>
            <p className="text-sm">点击"刷新分析"来获取最新内容</p>
          </div>
        ) : (
          <div className="space-y-4">
            {summaries.map((summary) => (
              <SummaryCard
                key={summary.id}
                summary={summary}
                showAuthor={false}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
