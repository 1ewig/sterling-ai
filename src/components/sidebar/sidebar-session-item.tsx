'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Edit2, Trash2, Check, X } from 'lucide-react';
import { sidebarHorizontalCollapseVariants, tapScalePill } from '@/constants/animation';
import type { ConversationRecord } from '@/lib/db';

export interface SidebarSessionItemProps {
  conversation: ConversationRecord;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  isCollapsed: boolean;
  onSelect: () => void;
  onStartRename: (e: React.MouseEvent) => void;
  onSaveRename: (e?: React.FormEvent | React.MouseEvent) => void;
  onCancelRename: () => void;
  onEditTitleChange: (value: string) => void;
  onOpenDelete: (e: React.MouseEvent) => void;
}

/**
 * Pure presentation list item representing an individual chat session thread.
 * Memoized to prevent re-renders when other conversations update.
 */
export const SidebarSessionItem = memo(function SidebarSessionItem({
  conversation,
  isActive,
  isEditing,
  editTitle,
  isCollapsed,
  onSelect,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onEditTitleChange,
  onOpenDelete,
}: SidebarSessionItemProps) {
  if (isEditing && !isCollapsed) {
    return (
      <div className="h-10 flex items-center gap-1.5 px-2 rounded-xl bg-theme-bg-elevated border border-theme-border-strong shrink-0">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveRename(e);
            if (e.key === 'Escape') onCancelRename();
          }}
          autoFocus
          className="flex-1 min-w-0 bg-transparent text-xs text-theme-text-primary font-medium focus:outline-none px-1"
        />
        <motion.button
          type="button"
          whileTap={tapScalePill}
          onClick={onSaveRename}
          className="p-1 rounded hover:bg-theme-bg-surface text-theme-status-success cursor-pointer transition-colors select-none"
          title="Save"
          aria-label="Save"
        >
          <Check className="size-3.5" />
        </motion.button>
        <motion.button
          type="button"
          whileTap={tapScalePill}
          onClick={onCancelRename}
          className="p-1 rounded hover:bg-theme-bg-surface text-theme-text-muted hover:text-theme-text-primary cursor-pointer transition-colors select-none"
          title="Cancel"
          aria-label="Cancel"
        >
          <X className="size-3.5" />
        </motion.button>
      </div>
    );
  }

  return (
    <motion.div
      whileTap={tapScalePill}
      role="button"
      tabIndex={0}
      title={conversation.title || 'New Chat'}
      onClick={onSelect}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative h-10 w-full flex items-center rounded-xl text-xs font-medium cursor-pointer transition-colors overflow-hidden shrink-0 select-none ${
        isActive
          ? 'bg-theme-bg-elevated text-theme-text-primary border border-theme-border-subtle shadow-2xs font-semibold'
          : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-elevated/40 border border-transparent'
      }`}
    >
      {/* Anchored Icon Slot */}
      <div className="size-10 flex items-center justify-center shrink-0">
        <MessageSquare
          className={`size-3.5 transition-colors ${
            isActive
              ? 'text-theme-brand-primary'
              : 'text-theme-text-muted group-hover:text-theme-text-secondary'
          }`}
        />
      </div>

      {/* Chat Title and Row Actions Container */}
      <motion.div
        initial={false}
        variants={sidebarHorizontalCollapseVariants}
        animate={isCollapsed ? 'collapsed' : 'expanded'}
        className="flex-1 flex items-center justify-between min-w-0 overflow-hidden pr-2.5 gap-1.5"
      >
        <span className="truncate whitespace-nowrap text-left flex-1">
          {conversation.title || 'New Chat'}
        </span>

        {/* Hover Action Buttons */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <motion.button
            type="button"
            whileTap={tapScalePill}
            onClick={onStartRename}
            className="p-1 rounded hover:bg-theme-bg-surface text-theme-text-muted hover:text-theme-text-primary cursor-pointer transition-colors"
            title="Rename Chat"
          >
            <Edit2 className="size-3" />
          </motion.button>
          <motion.button
            type="button"
            whileTap={tapScalePill}
            onClick={onOpenDelete}
            className="p-1 rounded hover:bg-theme-bg-surface text-theme-text-muted hover:text-theme-status-danger cursor-pointer transition-colors"
            title="Delete Chat"
          >
            <Trash2 className="size-3" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
});
