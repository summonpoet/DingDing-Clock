'use client';

import { useState } from 'react';
import { parseXHandle } from '@/lib/storage';

interface AddAccountModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (handle: string) => void;
}

export default function AddAccountModal({
  open,
  onClose,
  onAdd,
}: AddAccountModalProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Support multiple lines / comma-separated
    const inputs = input
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (inputs.length === 0) {
      setError('请输入至少一个 X 账户链接或用户名');
      return;
    }

    for (const raw of inputs) {
      const handle = parseXHandle(raw);
      if (!handle) {
        setError(`无法解析: "${raw}"`);
        return;
      }
      onAdd(handle);
    }

    setInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-lg font-bold mb-1">添加关注账户</h2>
        <p className="text-sm text-gray-500 mb-4">
          输入 X 账户链接或用户名，支持多个（每行一个或用逗号分隔）
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            className="input min-h-[120px] resize-y"
            placeholder={`例如:\nhttps://x.com/reinerpope\n@elonmusk\nOpenAI`}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError('');
            }}
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-primary">
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
