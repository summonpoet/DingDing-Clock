'use client';

import { Summary } from '@/lib/types';
import Link from 'next/link';
import { useState } from 'react';

interface SummaryCardProps {
  summary: Summary;
  showAuthor?: boolean;
}

export default function SummaryCard({
  summary,
  showAuthor = true,
}: SummaryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const timeAgo = getTimeAgo(summary.generatedAt);

  return (
    <div className="card p-5">
      {showAuthor && (
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-sm">
            {summary.authorHandle[0]?.toUpperCase()}
          </div>
          <div>
            <Link
              href={`/person/${summary.authorHandle}`}
              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              {summary.authorName || summary.authorHandle}
            </Link>
            <p className="text-xs text-gray-500">
              @{summary.authorHandle} · {timeAgo}
            </p>
          </div>
        </div>
      )}

      {!showAuthor && (
        <p className="text-xs text-gray-500 mb-2">{timeAgo}</p>
      )}

      <div className="mb-3">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
          {summary.summary}
        </p>
      </div>

      {summary.keyInsights.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            核心观点
          </h4>
          <ul className="space-y-1">
            {summary.keyInsights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.research && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-2"
          >
            {expanded ? '收起扩展研究' : '查看扩展研究'}
          </button>
          {expanded && (
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {summary.research}
            </div>
          )}
        </div>
      )}

      {summary.tweets.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => {
              const el = document.getElementById(`tweets-${summary.id}`);
              if (el) el.classList.toggle('hidden');
            }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            查看原始推文 ({summary.tweets.length})
          </button>
          <div id={`tweets-${summary.id}`} className="hidden mt-2 space-y-2">
            {summary.tweets.map((tweet) => (
              <div
                key={tweet.id}
                className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600"
              >
                <p className="whitespace-pre-wrap">{tweet.text}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{new Date(tweet.createdAt).toLocaleString('zh-CN')}</span>
                  <a
                    href={tweet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    查看原文
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}
