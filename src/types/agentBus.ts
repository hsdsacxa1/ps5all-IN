export type AgentBusMessageStatus =
  | 'info'
  | 'working'
  | 'done'
  | 'blocked'
  | 'handoff';

export interface AgentBusLock {
  mode: 'mkdir-v2' | 'legacy-file';
  holder: string;
  task: string;
  acquiredAt: string;
  epoch?: number;
  beatMtime?: number;
  clockMtime?: number;
  ageSeconds?: number;
  filesTouched?: string[];
  note?: string;
}

export interface AgentBusMessage {
  id: string;
  epoch?: number;
  timestamp: string;
  from: string;
  to: string;
  status: AgentBusMessageStatus;
  summary: string;
  filesTouched?: string[];
  nextStep?: string;
  sourceFile?: string;
}

export interface AgentBusMessageDraft {
  from: string;
  to: string;
  status: AgentBusMessageStatus;
  summary: string;
  filesTouched?: string[];
  nextStep?: string;
}

export interface AgentBusFeed {
  schemaVersion: 1 | 2;
  updatedAt: string;
  messages: AgentBusMessage[];
}

export interface AgentBusInboxEntry {
  name: string;
  path: string;
  size: number;
  mtime?: number;
}

export interface AgentBusSnapshot {
  initialized: boolean;
  protocolVersion: 1 | 2;
  epoch: number;
  consoleClockMtime?: number;
  lock: AgentBusLock | null;
  staleLocks: string[];
  feed: AgentBusFeed;
  inbox: AgentBusInboxEntry[];
  fetchedAt: string;
  error?: string;
}
