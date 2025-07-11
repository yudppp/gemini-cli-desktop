/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ToolCallConfirmationDetails,
  ToolConfirmationOutcome,
} from '../types/approval';
import { CoreConfirmationDetails, ToolCallRequest } from '../types/common';

// Config type will be injected at runtime to avoid ES Module issues
type Config = any;

export class GeminiService {
  config: Config;
  private confirmToolCallHandler?: (
    details: ToolCallConfirmationDetails,
  ) => Promise<ToolConfirmationOutcome>;

  constructor(
    config: Config,
    confirmToolCallHandler?: (
      details: ToolCallConfirmationDetails,
    ) => Promise<ToolConfirmationOutcome>,
  ) {
    this.config = config;
    this.confirmToolCallHandler = confirmToolCallHandler;
  }

  // Convert core library confirmation details to our local format
  private convertConfirmationDetails(
    coreDetails: CoreConfirmationDetails,
    toolName: string,
  ): ToolCallConfirmationDetails | null {
    if (!coreDetails) return null;

    const baseDetails = {
      toolCallId: `${toolName}-${Date.now()}`,
      title: coreDetails.title || 'Tool Execution',
    };

    // Check if it's an MCP tool based on coreDetails type
    if (coreDetails.type === 'mcp') {
      // Core library MCP tools provide type: 'mcp' in confirmation details
      return {
        ...baseDetails,
        type: 'mcp',
        title: coreDetails.title || 'MCP Tool Execution',
        serverName: coreDetails.serverName || 'unknown',
        toolName: coreDetails.toolName || toolName,
        toolDisplayName:
          coreDetails.toolDisplayName || coreDetails.toolName || toolName,
      };
    }

    // Default to info type for other tools
    return {
      ...baseDetails,
      type: 'info',
      title: coreDetails.title || 'Information Request',
      prompt: coreDetails.prompt || `Execute ${toolName}`,
      urls: coreDetails.urls,
    };
  }

  async initializeMcp(_mcpServers: Record<string, unknown>) {
    // MCP initialization would go here if needed
    console.log('MCP initialization not implemented yet');
  }

  async sendMessage(
    message: string,
    history: Array<{ role: string; content: string }> = [],
    options: {
      model?: string;
      onStream?: (chunk: string) => void;
      attachments?: Array<{
        filename: string;
        mimeType: string;
        data: string;
      }>;
    } = {},
  ): Promise<string> {
    try {
      console.log('[GeminiService] sendMessage called');
      console.log('[GeminiService] Message:', message);
      console.log(
        '[GeminiService] Model:',
        options.model || this.config.getModel(),
      );

      const geminiClient = this.config.getGeminiClient();
      if (!geminiClient) {
        console.error('[GeminiService] Gemini client not initialized');
        throw new Error('Gemini client not initialized');
      }
      console.log('[GeminiService] Gemini client available');

      // Update model if specified
      if (options.model && options.model !== this.config.getModel()) {
        this.config.setModel(options.model);
      }

      // Set history in the chat (text only for previous messages)
      const chatHistory = history.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      geminiClient.setHistory(chatHistory);

      // Get tool registry to check if tools are available
      const toolRegistry = await this.config.getToolRegistry();
      const tools = toolRegistry.getFunctionDeclarations();
      console.log(`[GeminiService] Available tools: ${tools.length}`);
      if (tools.length > 0) {
        console.log(
          '[GeminiService] Tool names:',
          tools.map((t: any) => (t as { name: string }).name).slice(0, 5),
        );
      }

      // Create abort controller for the request
      const abortController = new AbortController();

      // Build parts array with attachments first, then text
      const parts: any[] = [];

      if (options.attachments && options.attachments.length > 0) {
        console.log(
          `[GeminiService] Processing ${options.attachments.length} attachments`,
        );
        for (const attachment of options.attachments) {
          // Handle text files (including SVG sent as text/plain)
          if (
            attachment.mimeType === 'text/plain' ||
            attachment.mimeType.startsWith('text/')
          ) {
            // Decode base64 to text
            const text = Buffer.from(attachment.data, 'base64').toString(
              'utf-8',
            );
            parts.push({ text: `File: ${attachment.filename}\n\n${text}` });
            console.log(
              `[GeminiService] Added text attachment: ${attachment.filename}`,
            );
          } else {
            // Handle binary files (images, PDFs, etc.)
            parts.push({
              inlineData: {
                data: attachment.data,
                mimeType: attachment.mimeType,
              },
            });
            console.log(
              `[GeminiService] Added binary attachment: ${attachment.filename} (${attachment.mimeType})`,
            );
            console.log(
              `[GeminiService] Base64 preview: ${attachment.data.substring(0, 50)}...`,
            );
          }
        }
      }

      // Add text after images
      if (message) {
        parts.push({ text: message });
      }

      // Send message using the client's stream method that handles tools
      console.log('[GeminiService] Sending message via sendMessageStream');
      const messageStream = geminiClient.sendMessageStream(
        parts,
        abortController.signal,
      );

      let responseText = '';
      let toolCallRequests: ToolCallRequest[] = [];

      // Process the stream events
      console.log('[GeminiService] Processing stream events...');
      let eventCount = 0;
      let thoughtCount = 0;
      const recentThoughts: string[] = [];
      let errorCount = 0;
      try {
        for await (const event of messageStream) {
          eventCount++;
          console.log(`[GeminiService] Event ${eventCount} type:`, event.type);
          switch (event.type) {
            case 'content':
              console.log(
                `[GeminiService] Content chunk length: ${event.value.length}`,
              );
              responseText += event.value;
              if (options.onStream) {
                options.onStream(event.value);
              }
              break;
            case 'tool_call_request':
              console.log(
                '[GeminiService] Tool call requested:',
                event.value.name,
                'args:',
                JSON.stringify(event.value.args),
              );
              toolCallRequests.push(event.value);
              if (options.onStream) {
                options.onStream(
                  JSON.stringify({ type: 'tool_call', name: event.value.name }),
                );
              }
              break;
            case 'tool_call_response':
              console.log('Tool call completed:', event.value.callId);
              break;
            case 'error':
              errorCount++;
              console.log(
                `[GeminiService] Error detected! (error #${errorCount})`,
              );
              throw new Error(event.value.error.message);
            case 'thought': {
              thoughtCount++;

              // Check for repetitive thoughts
              const thoughtSubject = event.value.subject || '';
              if (recentThoughts.includes(thoughtSubject)) {
                console.log(`[GeminiService] Repetitive thought detected!`);
              }

              // Keep track of recent thoughts (last 5)
              recentThoughts.push(thoughtSubject);
              if (recentThoughts.length > 5) {
                recentThoughts.shift();
              }

              // Progressive thought limits: 10 -> 20 -> 30 -> 40 -> 50
              let currentThoughtLimit;
              if (thoughtCount <= 10) {
                currentThoughtLimit = 10; // Basic thinking
              } else if (thoughtCount <= 20) {
                currentThoughtLimit = 20; // Deeper thinking
              } else if (thoughtCount <= 30) {
                currentThoughtLimit = 30; // Complex thinking
              } else if (thoughtCount <= 40) {
                currentThoughtLimit = 40; // Advanced thinking
              } else {
                currentThoughtLimit = 50; // Maximum depth
              }

              console.log(
                `Model thinking (${thoughtCount}/${currentThoughtLimit}):`,
                event.value,
              );

              // Prevent infinite thinking loops with progressive limits
              if (thoughtCount > currentThoughtLimit) {
                console.warn(
                  `[GeminiService] Thought limit (${currentThoughtLimit}) reached, stopping stream to prevent loop`,
                );
                abortController.abort();
                break;
              }

              if (options.onStream) {
                options.onStream(
                  JSON.stringify({ type: 'thought', value: event.value }),
                );
              }
              break;
            }
            case 'chat_compressed':
              console.log('Chat compressed:', event.value);
              break;
            default:
              console.log(
                '[GeminiService] Unknown event type:',
                (event as { type: string }).type,
              );
          }
        }
      } catch (iterError) {
        console.error('[GeminiService] Error in event iteration:', iterError);
        throw iterError;
      }

      console.log(`[GeminiService] Stream ended after ${eventCount} events`);
      console.log(
        '[GeminiService] Tool call requests collected:',
        toolCallRequests.length,
      );

      // If there are tool calls, execute them and get the final response
      let maxIterations = 10; // Safety limit to prevent infinite loops
      let currentIteration = 0;
      while (toolCallRequests.length > 0 && maxIterations > 0) {
        maxIterations--;
        currentIteration++;
        console.log(
          `[GeminiService] Iteration ${currentIteration}: Executing ${toolCallRequests.length} tool calls...`,
        );

        const toolRegistry = await this.config.getToolRegistry();
        const responseParts = [];

        for (const toolCall of toolCallRequests) {
          console.log(`[GeminiService] Executing tool: ${toolCall.name}`);
          const callId =
            toolCall.callId ||
            `${toolCall.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

          if (options.onStream) {
            options.onStream(
              JSON.stringify({ type: 'tool_executing', name: toolCall.name }),
            );
          }

          try {
            // Find the tool
            const tool = toolRegistry.getTool(toolCall.name);

            if (tool) {
              // Check if we need approval for this tool
              const approvalMode = this.config.getApprovalMode();
              console.log(`[GeminiService] Approval mode: ${approvalMode}`);

              // Check if we need approval for this tool (always require approval)
              if (this.confirmToolCallHandler) {
                console.log(
                  `[GeminiService] Checking if tool needs approval: ${toolCall.name}`,
                );

                // Check if tool has shouldConfirmExecute method
                let needsApproval = false;
                let confirmationDetails: ToolCallConfirmationDetails | null =
                  null;

                if (tool.shouldConfirmExecute) {
                  console.log(
                    `[GeminiService] Tool has shouldConfirmExecute method`,
                  );
                  const coreConfirmationDetails =
                    await tool.shouldConfirmExecute(
                      toolCall.args,
                      abortController.signal,
                    );

                  if (coreConfirmationDetails) {
                    confirmationDetails = this.convertConfirmationDetails(
                      coreConfirmationDetails as CoreConfirmationDetails,
                      toolCall.name,
                    );
                    needsApproval = !!confirmationDetails;
                  }
                } else {
                  // For MCP tools or tools without shouldConfirmExecute, always require approval
                  console.log(
                    `[GeminiService] Tool does not have shouldConfirmExecute method, requiring approval`,
                  );
                  // Create confirmation details for all tools that don't have shouldConfirmExecute
                  confirmationDetails = this.convertConfirmationDetails(
                    {},
                    toolCall.name,
                  );
                  needsApproval = true;
                }

                if (needsApproval && confirmationDetails) {
                  console.log(
                    `[GeminiService] Tool requires approval: ${toolCall.name}`,
                  );
                  const outcome = await this.confirmToolCallHandler(
                    confirmationDetails as any,
                  );

                  if (outcome === ToolConfirmationOutcome.Cancel) {
                    console.log(
                      `[GeminiService] Tool execution cancelled by user: ${toolCall.name}`,
                    );
                    responseParts.push({
                      functionResponse: {
                        id: callId,
                        name: toolCall.name,
                        response: { error: 'Tool execution cancelled by user' },
                      },
                    });
                    continue;
                  }
                  console.log(
                    `[GeminiService] Tool approved with outcome: ${outcome}`,
                  );
                }
              }

              // Execute the tool
              const result = await tool.execute(
                toolCall.args,
                abortController.signal,
              );

              // Create the function response part based on llmContent type
              let outputString;
              if (typeof result.llmContent === 'string') {
                outputString = result.llmContent;
              } else if (Array.isArray(result.llmContent)) {
                // If it's an array, convert to string or handle as needed
                const textParts = result.llmContent
                  .filter(
                    (part: unknown): part is { text: string } =>
                      typeof part === 'object' &&
                      part !== null &&
                      'text' in part,
                  )
                  .map((part: { text: string }) => part.text)
                  .join('');
                outputString = textParts || JSON.stringify(result.llmContent);
              } else {
                // Handle single Part object
                outputString = JSON.stringify(result.llmContent);
              }

              responseParts.push({
                functionResponse: {
                  id: callId,
                  name: toolCall.name,
                  response: { output: outputString },
                },
              });
            } else {
              throw new Error(`Tool not found: ${toolCall.name}`);
            }
          } catch (error) {
            errorCount++;
            console.error(
              `[GeminiService] Tool execution error for ${toolCall.name}:`,
              error,
            );
            console.log(
              `[GeminiService] Tool error detected! (error #${errorCount})`,
            );

            // Error responses
            responseParts.push({
              functionResponse: {
                id: callId,
                name: toolCall.name,
                response: {
                  error: error instanceof Error ? error.message : String(error),
                },
              },
            });
          }
        }

        // Don't add to history manually - sendMessageStream will handle it

        // Clear toolCallRequests for this iteration
        toolCallRequests = [];

        // Send tool responses as continuation
        console.log(
          '[GeminiService] Sending tool responses for continuation...',
        );
        console.log(
          '[GeminiService] Number of response parts:',
          responseParts.length,
        );

        // Send the response parts as the continuation message
        const continuationStream = geminiClient.sendMessageStream(
          responseParts, // Send array of function response parts
          abortController.signal,
        );

        // Process the continuation stream
        let continuationEventCount = 0;
        const continuationToolCallRequests: ToolCallRequest[] = [];

        // Dynamic thought limit based on iteration count (10 -> 20 -> 30 -> 40 -> 50)
        const dynamicThoughtLimit = Math.min(
          10 + (currentIteration - 1) * 10,
          50,
        );
        console.log(
          `[GeminiService] Iteration ${currentIteration}: Thought limit ${dynamicThoughtLimit}`,
        );

        try {
          for await (const event of continuationStream) {
            continuationEventCount++;
            console.log(
              `[GeminiService] Continuation event ${continuationEventCount}:`,
              event.type,
            );

            if (event.type === 'content') {
              console.log(
                `[GeminiService] Continuation content length: ${event.value.length}`,
              );
              responseText += event.value;
              if (options.onStream) {
                options.onStream(event.value);
              }
            } else if (event.type === 'tool_call_request') {
              console.log(
                'Continuation tool call requested:',
                event.value.name,
                'args:',
                JSON.stringify(event.value.args),
              );
              continuationToolCallRequests.push(event.value);
              if (options.onStream) {
                options.onStream(
                  JSON.stringify({ type: 'tool_call', name: event.value.name }),
                );
              }
            } else if (event.type === 'tool_call_response') {
              console.log('Tool call completed:', event.value.callId);
            } else if (event.type === 'thought') {
              thoughtCount++;

              // Check for repetitive thoughts (same as main stream)
              const thoughtSubject = event.value.subject || '';
              if (recentThoughts.includes(thoughtSubject)) {
                console.log(
                  `[GeminiService] Repetitive continuation thought detected!`,
                );
              }

              // Keep track of recent thoughts (last 5)
              recentThoughts.push(thoughtSubject);
              if (recentThoughts.length > 5) {
                recentThoughts.shift();
              }

              console.log(
                `Continuation model thinking (${thoughtCount}/${dynamicThoughtLimit}):`,
                event.value,
              );

              // Prevent infinite thinking loops with progressive limits
              if (thoughtCount > dynamicThoughtLimit) {
                console.warn(
                  `[GeminiService] Continuation thought limit (${dynamicThoughtLimit}) reached, stopping stream to prevent loop`,
                );
                abortController.abort();
                break;
              }

              if (options.onStream) {
                options.onStream(
                  JSON.stringify({ type: 'thought', value: event.value }),
                );
              }
            } else if (event.type === 'error') {
              console.error('[GeminiService] Continuation error:', event.value);
              throw new Error(event.value.error.message);
            }
          }
        } catch (continuationError) {
          console.error(
            '[GeminiService] Error in continuation stream:',
            continuationError,
          );
          throw continuationError;
        }
        console.log(
          `[GeminiService] Continuation completed with ${continuationEventCount} events`,
        );
        console.log(
          `[GeminiService] Continuation tool calls collected: ${continuationToolCallRequests.length}`,
        );
        console.log(
          `[GeminiService] Current response text length: ${responseText.length}`,
        );

        // If there are more tool calls in the continuation, handle them recursively
        if (continuationToolCallRequests.length > 0) {
          console.log(
            '[GeminiService] Processing additional tool calls from continuation...',
          );
          toolCallRequests = continuationToolCallRequests;
          // Continue the loop to process these new tool calls
        } else {
          // No more tool calls, we're done
          console.log('[GeminiService] No more tool calls, exiting loop');
          break;
        }
      }

      if (maxIterations === 0) {
        console.warn(
          '[GeminiService] Maximum iteration limit reached, stopping tool execution',
        );
      }

      console.log(
        '[GeminiService] Final response length:',
        responseText?.length || 0,
      );
      return responseText || 'No response generated';
    } catch (error: unknown) {
      const errorObj = error as Error;
      console.error('[GeminiService] Error in sendMessage:', error);
      console.error('[GeminiService] Error details:', errorObj.message);
      console.error('[GeminiService] Error stack:', errorObj.stack);
      throw new Error(
        `Failed to get response from Gemini: ${errorObj.message || 'Unknown error'}`,
      );
    }
  }

  async stopMcpServer(_serverName: string) {
    console.log('Stopping MCP server not implemented yet');
  }

  async startMcpServer(_serverName: string, _config: Record<string, unknown>) {
    console.log('Starting MCP server not implemented yet');
  }
}
