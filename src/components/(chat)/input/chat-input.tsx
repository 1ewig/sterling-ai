'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
  memo,
  useLayoutEffect,
  useEffect,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Square } from 'lucide-react';
import { hoverScaleIcon, iconSwapVariants, tapScaleIcon } from '@/constants/animation';
import { useAppStore } from '@/stores/app-store';

export interface ChatInputHandle {
  setInputText: (text: string) => void;
  getText: () => string;
  focus: () => void;
  blur: () => void;
  clear: () => void;
}

export interface ChatInputProps {
  isLoading: boolean;
  onSend: (text: string) => void | Promise<void>;
  onStop?: () => void;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  maxHeight?: number;
  showAura?: boolean;
}

/**
 * Robust expanding single-row chat input area.
 * Expands upward cleanly, supports keyboard shortcuts, IME safety, and animated states.
 */
export const ChatInput = memo(
  forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
    {
      isLoading,
      onSend,
      onStop,
      placeholder = 'Ask a question, research a topic, or search the web...',
      className,
      containerClassName,
      autoFocus = false,
      disabled = false,
      maxHeight = 160,
      showAura = false,
    },
    ref
  ) {
    const activeConversationId = useAppStore((state) => state.activeConversationId);
    const storeInput = useAppStore((state) => state.input);
    const setStoreInput = useAppStore((state) => state.setInput);

    const [text, setText] = useState(storeInput || '');
    const prevStoreInputRef = useRef(storeInput);
    const prevConvIdRef = useRef(activeConversationId);
    const [isFocused, setIsFocused] = useState(false);
    const [isComposing, setIsComposing] = useState(false);
    const [isMultiLine, setIsMultiLine] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize logic with zero-jank measurement
    const resizeTextarea = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;

      el.style.height = 'auto';

      const scrollHeight = el.scrollHeight;
      const targetHeight = Math.min(Math.max(scrollHeight, 38), maxHeight);

      el.style.height = `${targetHeight}px`;
      el.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';

      setIsMultiLine(scrollHeight > 46 || el.value.includes('\n'));
    }, [maxHeight]);

    useLayoutEffect(() => {
      resizeTextarea();
    }, [text, resizeTextarea]);

    useEffect(() => {
      const handleResize = () => resizeTextarea();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [resizeTextarea]);

    // Sync external storeInput changes or conversation session switches
    useEffect(() => {
      const isSessionChanged = activeConversationId !== prevConvIdRef.current;
      const isInputChanged = storeInput !== prevStoreInputRef.current;

      if (isSessionChanged || isInputChanged) {
        prevConvIdRef.current = activeConversationId;
        const nextText = storeInput || '';
        prevStoreInputRef.current = nextText;
        setText(nextText);
        const target = textareaRef.current;
        if (target) {
          target.value = nextText;
        }
        requestAnimationFrame(() => {
          resizeTextarea();
          if (nextText && target) {
            target.focus();
            target.setSelectionRange(nextText.length, nextText.length);
          }
        });
      }
    }, [activeConversationId, storeInput, resizeTextarea]);

    useImperativeHandle(
      ref,
      () => ({
        setInputText: (newText: string) => {
          prevStoreInputRef.current = newText;
          setStoreInput(newText);
          setText(newText);
          const target = textareaRef.current;
          if (target) {
            target.value = newText;
            requestAnimationFrame(() => {
              resizeTextarea();
              target.focus();
              target.setSelectionRange(newText.length, newText.length);
            });
          }
        },
        getText: () => text,
        focus: () => textareaRef.current?.focus(),
        blur: () => textareaRef.current?.blur(),
        clear: () => {
          prevStoreInputRef.current = '';
          setStoreInput('');
          setText('');
          setIsMultiLine(false);
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.overflowY = 'hidden';
          }
        },
      }),
      [text, resizeTextarea, setStoreInput]
    );

    const handleSubmit = useCallback(() => {
      const trimmed = text.trim();
      if (!trimmed || isLoading || disabled) return;

      prevStoreInputRef.current = '';
      setStoreInput('');
      setText('');
      setIsMultiLine(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.overflowY = 'hidden';
      }
      void onSend(trimmed);
    }, [text, isLoading, disabled, onSend, setStoreInput]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !isComposing && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSubmit();
      }
    };

    const handlePaste = () => {
      requestAnimationFrame(resizeTextarea);
    };

    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button')) return;
      textareaRef.current?.focus();
    };

    const isButtonDisabled = (!text.trim() && !isLoading) || disabled;

    return (
      <div className={containerClassName ?? 'px-spacing-md pb-spacing-lg sm:pb-spacing-xl bg-theme-bg-base shrink-0'}>
        <div className={`relative mx-auto w-full ${className ?? 'max-w-4xl'}`}>
          {showAura && (
            <>
              <div
                aria-hidden="true"
                className={`chat-input-aura-glow-container ${isFocused ? 'is-focused' : ''}`}
              >
                <div className="chat-input-aura-glow-spinner" />
              </div>
              <div
                aria-hidden="true"
                className={`chat-input-aura-border-container ${isFocused ? 'is-focused' : ''}`}
              >
                <div className="chat-input-aura-border-spinner" />
              </div>
            </>
          )}

          <div
            onClick={handleContainerClick}
            className={`w-full relative z-2 flex items-end gap-2 bg-theme-bg-surface/95 hover:bg-theme-bg-surface cursor-text ${showAura
                ? 'rounded-2xl py-2.5 pl-4 pr-2 border border-theme-border-subtle/70'
                : isMultiLine
                  ? `rounded-2xl py-2 pl-4 pr-2 border ${isFocused
                    ? 'border-theme-brand-primary ring-2 ring-theme-brand-primary/30'
                    : 'border-theme-border-subtle hover:border-theme-border-strong'
                  } focus-within:border-theme-brand-primary focus-within:ring-2 focus-within:ring-theme-brand-primary/30`
                  : `rounded-full py-1.5 pl-4 pr-1.5 border ${isFocused
                    ? 'border-theme-brand-primary ring-2 ring-theme-brand-primary/30'
                    : 'border-theme-border-subtle hover:border-theme-border-strong'
                  } focus-within:border-theme-brand-primary focus-within:ring-2 focus-within:ring-theme-brand-primary/30`
              } shadow-xs transition-all duration-150 backdrop-blur-xl`}
          >
            {/* Text Area */}
            <textarea
              ref={textareaRef}
              value={text}
              rows={1}
              disabled={disabled}
              autoFocus={autoFocus}
              placeholder={placeholder}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => {
                const val = e.target.value;
                setText(val);
                prevStoreInputRef.current = val;
                setStoreInput(val);
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-theme-text-primary placeholder:text-theme-text-muted outline-none focus:outline-none focus-visible:outline-none focus:ring-0 py-1 custom-scrollbar min-h-[34px] max-h-[160px]"
              style={{ maxHeight: `${maxHeight}px` }}
            />

            {/* Action Button (Send / Stop) */}
            <motion.button
              type="button"
              whileHover={!isButtonDisabled ? hoverScaleIcon : undefined}
              whileTap={!isButtonDisabled ? tapScaleIcon : undefined}
              onClick={isLoading ? onStop : handleSubmit}
              disabled={isButtonDisabled}
              aria-label={isLoading ? 'Stop generating' : 'Send'}
              className={`flex items-center justify-center size-8 rounded-full transition-all shadow-xs select-none shrink-0 mb-0.5 ${isLoading
                ? 'bg-theme-text-primary text-theme-bg-base hover:opacity-90 active:scale-95 cursor-pointer'
                : isButtonDisabled
                  ? 'bg-theme-bg-elevated text-theme-text-muted opacity-40 cursor-not-allowed'
                  : 'bg-theme-brand-primary text-theme-bg-overlay hover:brightness-105 active:brightness-95 cursor-pointer'
                }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isLoading ? (
                  <motion.div
                    key="stop"
                    variants={iconSwapVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="flex items-center justify-center"
                  >
                    <Square className="size-3 fill-current" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="send"
                    variants={iconSwapVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Send className="size-3.5 translate-x-px" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>
    );
  })
);
