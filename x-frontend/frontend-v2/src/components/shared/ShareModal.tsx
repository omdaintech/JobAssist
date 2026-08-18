import React, { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  shareCode: string;
  expiresAt?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
  shareCode,
  expiresAt,
}) => {
  const [copyState, setCopyState] = useState<'message' | null>(null);

  if (!isOpen) return null;

  const shareMessage = `🎉 I just finished a Lingali session! Dive into my progress: ${shareUrl}`;

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopyState('message');
      setTimeout(() => setCopyState(null), 2000);
    } catch (err) {
      console.error('Failed to copy share message:', err);
    }
  };

  const formatExpiry = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Share Your Lingali Results</CardTitle>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {/* Share Code */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Share Code
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-3 bg-gray-100 rounded-lg text-lg font-mono font-bold text-center">
                  {shareCode}
                </code>
              </div>
            </div>

            {/* Expiry Info */}
            {expiresAt && (
              <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
                ⏰ This link expires on {formatExpiry(expiresAt)}
              </div>
            )}

            {/* Share Message */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Ready-to-share caption
              </label>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900 space-y-1">
                <p className="font-medium">Make it marketing-ready!</p>
                <p className="text-blue-800">{shareMessage}</p>
              </div>
            </div>

            {/* Info */}
            <div className="text-sm text-gray-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="font-medium text-slate-900 mb-1">Help us spread the word 🚀</p>
              <p>Post this on social, drop it in your study group, or send it to a friend—every share helps more learners discover Lingali.</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCopyMessage}
                variant="default"
                className="flex-1"
              >
                {copyState === 'message' ? '✓ Message Copied' : '📣 Copy Share Message'}
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

