import React from 'react';

export interface ToolDisplayInfo {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  symbol?: string;
}

export interface ToolCardProps {
  resultObj: Record<string, unknown>;
}

export interface ToolResultCardProps {
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
}
