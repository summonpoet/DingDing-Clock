'use client';

import { TrackedAccount } from '@/lib/types';
import Link from 'next/link';

interface AccountListProps {
  accounts: TrackedAccount[];
  onRemove: (handle: string) => void;
}

export default function AccountList({ accounts, onRemove }: AccountListProps) {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-lg mb-1">还没有关注任何账户</p>
        <p className="text-sm">点击上方按钮添加你想要追踪的 X 账户</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {accounts.map((account) => (
        <div
          key={account.handle}
          className="card p-4 flex items-center justify-between"
        >
          <Link
            href={`/person/${account.handle}`}
            className="flex items-center gap-3 min-w-0 flex-1"
          >
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">
              {account.handle[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {account.name || account.handle}
              </p>
              <p className="text-sm text-gray-500 truncate">
                @{account.handle}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <a
              href={`https://x.com/${account.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title="在 X 上查看"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <button
              onClick={() => onRemove(account.handle)}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="取消关注"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
