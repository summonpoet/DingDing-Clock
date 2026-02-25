'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { getSettings, saveSettings } from '@/lib/storage';
import { AppSettings } from '@/lib/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    claudeApiKey: '',
    xApiBearerToken: '',
  });
  const [saved, setSaved] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showXToken, setShowXToken] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
    setLoaded(true);
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!loaded) {
    return (
      <>
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <div className="text-center text-gray-400 py-20">加载中...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-2xl font-bold mb-6">设置</h1>

        <div className="space-y-6">
          {/* Claude API Key */}
          <div className="card p-5">
            <h2 className="font-semibold mb-1">Claude API Key</h2>
            <p className="text-sm text-gray-500 mb-3">
              用于 AI 内容总结和扩展研究。从{' '}
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Anthropic Console
              </a>{' '}
              获取。
            </p>
            <div className="relative">
              <input
                type={showClaudeKey ? 'text' : 'password'}
                className="input pr-20"
                placeholder="sk-ant-..."
                value={settings.claudeApiKey}
                onChange={(e) =>
                  setSettings({ ...settings, claudeApiKey: e.target.value })
                }
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                onClick={() => setShowClaudeKey(!showClaudeKey)}
              >
                {showClaudeKey ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          {/* X API Bearer Token */}
          <div className="card p-5">
            <h2 className="font-semibold mb-1">X API Bearer Token</h2>
            <p className="text-sm text-gray-500 mb-3">
              用于获取 X 上的推文内容。从{' '}
              <a
                href="https://developer.twitter.com/en/portal/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                X Developer Portal
              </a>{' '}
              获取。需要申请 X API 的访问权限。
            </p>
            <div className="relative">
              <input
                type={showXToken ? 'text' : 'password'}
                className="input pr-20"
                placeholder="AAAA..."
                value={settings.xApiBearerToken}
                onChange={(e) =>
                  setSettings({ ...settings, xApiBearerToken: e.target.value })
                }
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                onClick={() => setShowXToken(!showXToken)}
              >
                {showXToken ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="card p-5 bg-amber-50 border-amber-200">
            <h2 className="font-semibold text-amber-800 mb-1">安全说明</h2>
            <p className="text-sm text-amber-700">
              你的 API Key 存储在浏览器的 localStorage 中，不会上传到任何服务器。
              API Key 仅在你点击"刷新"时通过 API 路由传递到对应的服务端。
              建议使用有限额的 API Key。
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <button className="btn-primary" onClick={handleSave}>
              保存设置
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">
                已保存
              </span>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
