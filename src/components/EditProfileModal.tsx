import React, { useState } from 'react';
import { X, User, Check, Sparkles } from 'lucide-react';
import type { HouseMember } from '../types.js';
import { updateProfile } from '../services/api.js';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: HouseMember;
  onSuccess: (updatedMember: HouseMember, newState: any) => void;
}

const EMOJI_OPTIONS = [
  '👑', '⚡', '🎯', '🚀', '🌟', '🍀', '✨', '🔥',
  '🌈', '🦊', '🦁', '🐯', '🐼', '🐨', '🥋', '🎧',
  '🎨', '☕', '🍕', '🏆', '🎮', '💡', '🎸', '⚽'
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentMember,
  onSuccess,
}) => {
  const [name, setName] = useState(currentMember.name);
  const [selectedEmoji, setSelectedEmoji] = useState(currentMember.avatarEmoji || '⚡');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await updateProfile(currentMember.id, name.trim(), selectedEmoji);
      onSuccess(res.member, res.state);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">
              {selectedEmoji}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Edit Your Profile
              </h3>
              <p className="text-[11px] text-slate-500">
                Change your name or avatar emoji
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Your Display Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                required
                maxLength={30}
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Choose Avatar Emoji
            </label>
            <div className="grid grid-cols-6 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 max-h-36 overflow-y-auto">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                    selectedEmoji === emoji
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm scale-110 ring-2 ring-slate-900/20'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save Name'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
