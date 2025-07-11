/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Type definitions for tool approval
 */

// Approval mode (YOLO mode removed)
export enum ApprovalMode {
  DEFAULT = 'default', // Default mode: approval required for each tool
}

// Approval result
export enum ToolConfirmationOutcome {
  ProceedOnce = 'proceed_once', // Execute only this time
  ProceedAlways = 'proceed_always', // Always allow (add to whitelist)
  Cancel = 'cancel', // Cancel
}

// Approval UI type
export type ToolConfirmationType = 'mcp' | 'info';

// Base approval details interface
interface BaseConfirmationDetails {
  type: ToolConfirmationType;
  title: string;
  toolCallId: string;
}

// MCP approval (for MCP tools)
export interface ToolMcpConfirmationDetails extends BaseConfirmationDetails {
  type: 'mcp';
  serverName: string;
  toolName: string;
  toolDisplayName: string;
}

// Info approval (for WebFetch etc.)
export interface ToolInfoConfirmationDetails extends BaseConfirmationDetails {
  type: 'info';
  prompt: string;
  urls?: string[];
}

// Union type for approval details
export type ToolCallConfirmationDetails =
  | ToolMcpConfirmationDetails
  | ToolInfoConfirmationDetails;

// Approval request event
export interface ToolApprovalRequest {
  id: string;
  timestamp: Date;
  details: ToolCallConfirmationDetails;
}

// Approval response event
export interface ToolApprovalResponse {
  id: string;
  outcome: ToolConfirmationOutcome;
}

// Whitelist settings
export interface ApprovalWhitelist {
  mcpServers: Set<string>; // MCP server names
  mcpTools: Set<string>; // Individual MCP tools (server.tool format)
  toolTypes: Set<string>; // Other tool types
}
