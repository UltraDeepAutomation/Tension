import React from 'react';
import { Sidebar } from '@/widgets/sidebar/ui/Sidebar';
import { Canvas } from '@/widgets/canvas/ui/Canvas';
import { Toolbar } from '@/widgets/toolbar/ui/Toolbar';
import { SettingsPanel } from '@/widgets/settings-panel/ui/SettingsPanel';
import { useWorkspaceModel } from '@/pages/workspace/model/useWorkspaceModel';
import { useOpenAIKey } from '@/features/manage-openai-key/model/useOpenAIKey';
import { CommandPalette, CommandAction } from '@/widgets/command-palette/ui/CommandPalette';
import { Minimap } from '@/widgets/minimap/ui/Minimap';
import { CouncilPanel } from '@/widgets/council-panel';
import { SearchPanel } from '@/widgets/search-panel';
import { ChatPanel, type ChatMessage, type ThinkingStep } from '@/widgets/chat-panel';
import { MultiModelPicker } from '@/widgets/multimodel-picker/ui/MultiModelPicker';
import { getCouncilById } from '@/shared/lib/council';
import { Loader2, Users, MessageSquare } from 'lucide-react';
import type { ProviderId } from '@/entities/node/model/types';

export const WorkspacePage: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isCmdKOpen, setIsCmdKOpen] = React.useState(false);
  const [isCouncilPanelOpen, setIsCouncilPanelOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = React.useState(false);
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [thinkingSteps, setThinkingSteps] = React.useState<ThinkingStep[]>([]);
  const [isChatThinking, setIsChatThinking] = React.useState(false);
  const [isMultiModelOpen, setIsMultiModelOpen] = React.useState(false);
  const [multiModelNodeId, setMultiModelNodeId] = React.useState<string | null>(null);
  const defaultMultiModels = React.useMemo(() => [
    { modelId: 'gpt-4.1', providerId: 'openai' as const },
    { modelId: 'claude-3-5-sonnet-20241022', providerId: 'anthropic' as const },
    { modelId: 'gemini-1.5-pro', providerId: 'google' as const },
  ], []);
  const [multiModelSelection, setMultiModelSelection] = React.useState<Set<string>>(
    () => new Set(defaultMultiModels.map((m) => m.modelId))
  );
  const { state, actions } = useWorkspaceModel();
  const { apiKey, isLoaded, hasKey, updateKey } = useOpenAIKey();
  
  // Tool state management
  const [isSpacePressed, setIsSpacePressed] = React.useState(false);
  const [isMetaPressed, setIsMetaPressed] = React.useState(false);
  
  // The "permanent" tool selected via toolbar (cursor or hand)
  const permanentToolRef = React.useRef<'cursor' | 'hand'>('cursor');
  
  // Update permanent tool only when user clicks toolbar buttons
  const handleToolChange = React.useCallback((tool: 'cursor' | 'hand') => {
    permanentToolRef.current = tool;
    actions.setTool(tool);
  }, [actions]);

  // Keyboard modifiers for temporary tool switching
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      // Cmd+K for command palette
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsCmdKOpen((prev) => !prev);
        return;
      }

      // Cmd+F for search
      if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
        event.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      // V for cursor tool
      if (event.key === 'v' || event.key === 'V') {
        if (!event.metaKey && !event.ctrlKey) {
          permanentToolRef.current = 'cursor';
          actions.setTool('cursor');
        }
        return;
      }

      // H for hand tool
      if (event.key === 'h' || event.key === 'H') {
        if (!event.metaKey && !event.ctrlKey) {
          permanentToolRef.current = 'hand';
          actions.setTool('hand');
        }
        return;
      }

      // Space — temporary hand mode
      if (event.code === 'Space' && !event.metaKey && !event.ctrlKey) {
        // Don't activate if typing in input
        if ((event.target as HTMLElement).tagName === 'INPUT' || 
            (event.target as HTMLElement).tagName === 'TEXTAREA') {
          return;
        }
        event.preventDefault();
        setIsSpacePressed(true);
        actions.setTool('hand');
        return;
      }

      // Meta/Cmd — temporary hand mode
      if (event.key === 'Meta') {
        setIsMetaPressed(true);
        actions.setTool('hand');
        return;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Space released
      if (event.code === 'Space') {
        setIsSpacePressed(false);
        // Only restore if Meta is not still pressed
        if (!isMetaPressed) {
          actions.setTool(permanentToolRef.current);
        }
        return;
      }

      // Meta released
      if (event.key === 'Meta') {
        setIsMetaPressed(false);
        // Only restore if Space is not still pressed
        if (!isSpacePressed) {
          actions.setTool(permanentToolRef.current);
        }
        return;
      }
    };

    // Handle window blur (user switches apps while holding modifier)
    const handleBlur = () => {
      setIsSpacePressed(false);
      setIsMetaPressed(false);
      actions.setTool(permanentToolRef.current);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [actions, isSpacePressed, isMetaPressed]);
  
  // Compute if zoom modifier is active (Cmd/Ctrl held for zoom)
  const isZoomModifierActive = isMetaPressed;

  // Navigate to a specific node (center it in view)
  const navigateToNode = React.useCallback((nodeId: string) => {
    const node = state.nodes.find(n => n.id === nodeId);
    if (node) {
      // Center the canvas on this node
      actions.centerOnNode(nodeId);
      // Открываем чат, если пришли из сообщения
      setIsChatPanelOpen(true);
    }
  }, [state.nodes, actions]);

  // Select a node (for search results)
  const selectNodeById = React.useCallback((nodeId: string) => {
    // This will be handled by Canvas internally via a ref or state lift
    // For now, we just navigate to it
  }, []);

  const handleMultiModelApply = React.useCallback((models: { modelId: string; providerId: ProviderId }[]) => {
    if (!multiModelNodeId) return;
    setMultiModelSelection(new Set(models.map((m) => m.modelId)));
    actions.playMultiModel({ nodeId: multiModelNodeId, models });
    setIsMultiModelOpen(false);
    setMultiModelNodeId(null);
  }, [actions, multiModelNodeId]);

  // Handle chat message send
  const handleChatSend = React.useCallback(async (message: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setIsChatThinking(true);
    
    // TODO: Integrate with Council Engine for real responses
    // For now, simulate a response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Получено сообщение: "${message}"\n\nCouncil обрабатывает запрос...`,
        timestamp: Date.now(),
        agentName: 'Council',
      };
      setChatMessages(prev => [...prev, assistantMessage]);
      setIsChatThinking(false);
    }, 1500);
  }, []);

  const commandActions: CommandAction[] = React.useMemo(() => [
    { id: 'new-chat', label: 'Create New Chat', perform: actions.createChat, icon: '➕' },
    { id: 'undo', label: 'Undo', perform: actions.undo, icon: '↩️', shortcut: ['⌘', 'Z'] },
    { id: 'redo', label: 'Redo', perform: actions.redo, icon: '↪️', shortcut: ['⌘', '⇧', 'Z'] },
    { id: 'export', label: 'Export Chat to JSON', perform: actions.exportChat, icon: '📤' },
    { id: 'fit-view', label: 'Fit View', perform: actions.centerCanvas, icon: '⤢' },
    { id: 'auto-layout', label: 'Auto-Layout Graph', perform: actions.autoLayout, icon: '📐' },
    { id: 'zoom-in', label: 'Zoom In', perform: () => actions.changeZoom(0.1), icon: '🔍' },
    { id: 'zoom-out', label: 'Zoom Out', perform: () => actions.changeZoom(-0.1), icon: '🔍' },
    { id: 'reset-zoom', label: 'Reset Zoom', perform: actions.resetZoom, icon: '0' },
    { id: 'search', label: 'Search Nodes', perform: () => setIsSearchOpen(true), icon: '🔎', shortcut: ['⌘', 'F'] },
    { id: 'settings', label: 'Open Settings', perform: () => setIsSettingsOpen(true), icon: '⚙️' },
  ], [actions]);

  return (
    <div className="workspace">
      <CommandPalette
        isOpen={isCmdKOpen}
        onClose={() => setIsCmdKOpen(false)}
        actions={commandActions}
      />
      <SearchPanel
        nodes={state.nodes}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigateToNode={navigateToNode}
        onSelectNode={selectNodeById}
      />
      <Sidebar
        chats={state.chats}
        currentChatId={state.currentChatId}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onCreateChat={actions.createChat}
        onSelectChat={actions.selectChat}
        onDeleteChat={actions.deleteChat}
      />
      <div className="workspace-main">
        {state.isLoading && (
          <div className="workspace-loading">
            <Loader2 className="animate-spin text-primary" size={48} />
          </div>
        )}
        <Canvas
          canvasState={state.canvas}
          nodes={state.nodes}
          connections={state.connections}
          onNodePositionChange={actions.updateNodePosition}
          onNodePromptChange={actions.updateNodePrompt}
          onNodeBranchCountChange={actions.updateNodeBranchCount}
          onNodeDeepLevelChange={actions.updateNodeDeepLevel}
          onNodeModelChange={actions.updateNodeModel}
          onCanvasPan={actions.panCanvas}
          onZoomAtPoint={actions.zoomAtPoint}
          isZoomModifierActive={isZoomModifierActive}
          onPlayNode={(nodeId: string) =>
            actions.playNode({ nodeId, apiKey, model: state.settings.model })
          }
          onDeleteNode={actions.deleteNode}
          onDuplicateNode={actions.duplicateNode}
          onCopyNodes={actions.copyNodes}
          onPasteNodes={actions.pasteNodes}
          onCenterCanvas={actions.centerCanvas}
          onResetZoom={actions.resetZoom}
          councilMode={!!state.selectedCouncilId}
          councilName={state.selectedCouncilId ? getCouncilById(state.selectedCouncilId)?.name : undefined}
          onPlayCouncil={state.selectedCouncilId ? (nodeId) => {
            const node = state.nodes.find((n) => n.id === nodeId);
            const prompt = node?.prompt || node?.context || '';

            // Open chat panel and reset thinking history
            setIsChatPanelOpen(true);
            setThinkingSteps([]);

            if (prompt.trim()) {
              const userMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'user',
                content: prompt,
                timestamp: Date.now(),
                nodeId,
              };
              setChatMessages((prev) => [...prev, userMessage]);
            }

            setIsChatThinking(true);

            actions
              .playCouncil({
                nodeId,
                councilId: state.selectedCouncilId!,
                onThinkingStep: (step) => {
                  // Append thinking step to sidebar
                  setThinkingSteps((prev) => [...prev, step]);

                  // When synthesis is ready, add final answer as chat message
                  if (step.stage === 'synthesis') {
                    const assistantMessage: ChatMessage = {
                      id: crypto.randomUUID(),
                      role: 'assistant',
                      content: step.output,
                      timestamp: step.timestamp,
                      agentName: step.agentName,
                      providerId: step.providerId,
                      modelId: step.modelId,
                      nodeId,
                    };
                    setChatMessages((prev) => [...prev, assistantMessage]);
                    setIsChatThinking(false);
                  }
                },
              })
              .catch((error) => {
                console.error('playCouncil error', error);
                setIsChatThinking(false);
              });
          } : undefined}
          onPlayMultiModel={(nodeId) => {
            setMultiModelNodeId(nodeId);
            setIsMultiModelOpen(true);
          }}
        />
        <Toolbar
          tool={state.canvas.tool}
          onToolChange={handleToolChange}
          onCenterCanvas={actions.centerCanvas}
          onUndo={actions.undo}
          onRedo={actions.redo}
          onExport={actions.exportChat}
          onImport={actions.importChat}
          canUndo={state.canUndo}
          canRedo={state.canRedo}
          saveStatus={state.isSaving ? 'saving' : 'saved'}
        />
        <Minimap
          nodes={state.nodes}
          canvasState={state.canvas}
          onNavigate={actions.panCanvas}
          onZoomIn={() => actions.changeZoom(0.1)}
          onZoomOut={() => actions.changeZoom(-0.1)}
          onResetZoom={actions.resetZoom}
        />
        <SettingsPanel
          isOpen={isSettingsOpen}
          apiKey={apiKey}
          isLoaded={isLoaded}
          hasKey={hasKey}
          onChangeKey={updateKey}
          model={state.settings.model}
          onChangeModel={actions.setSettingsModel}
          onClose={() => setIsSettingsOpen(false)}
          onExport={actions.exportChat}
          onImport={actions.importChat}
          onClearData={() => {
            actions.clearData();
            setIsSettingsOpen(false);
          }}
          // Multi-provider props
          providers={state.providers}
          onUpdateProvider={actions.updateProvider}
          onTestProvider={actions.testProvider}
        />
        
        {/* Council Panel */}
        <CouncilPanel
          isOpen={isCouncilPanelOpen}
          selectedCouncilId={state.selectedCouncilId}
          onSelectCouncil={(council) => {
            actions.selectCouncil(council.id);
            setIsCouncilPanelOpen(false);
          }}
          onClose={() => setIsCouncilPanelOpen(false)}
        />
        
        {/* Council Mode Toggle Button */}
        <button
          className={`council-toggle-button ${state.selectedCouncilId ? 'council-toggle-button--active' : ''}`}
          onClick={() => {
            if (state.selectedCouncilId) {
              // Toggle off council mode
              actions.selectCouncil(null);
            } else {
              setIsCouncilPanelOpen(true);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setIsCouncilPanelOpen(true);
          }}
          title={state.selectedCouncilId 
            ? `Council: ${getCouncilById(state.selectedCouncilId)?.name} (клик чтобы выключить, ПКМ для выбора)`
            : 'Включить Council Mode'
          }
        >
          <Users size={18} />
          {state.selectedCouncilId && (
            <span className="council-toggle-name">
              {getCouncilById(state.selectedCouncilId)?.icon}
            </span>
          )}
        </button>
        
        {/* Chat Panel Toggle Button */}
        <button
          className={`chat-toggle-button ${isChatPanelOpen ? 'chat-toggle-button--active' : ''}`}
          onClick={() => setIsChatPanelOpen(!isChatPanelOpen)}
          title="Открыть чат с Council"
        >
          <MessageSquare size={18} />
        </button>
        
        {/* Chat Panel */}
        <ChatPanel
          isOpen={isChatPanelOpen}
          onClose={() => setIsChatPanelOpen(false)}
          messages={chatMessages}
          thinkingSteps={thinkingSteps}
          onSendMessage={handleChatSend}
          onNavigateToNode={navigateToNode}
          isThinking={isChatThinking}
        />
        <MultiModelPicker
          isOpen={isMultiModelOpen}
          selected={multiModelSelection}
          onClose={() => {
            setIsMultiModelOpen(false);
            setMultiModelNodeId(null);
          }}
          onApply={handleMultiModelApply}
        />
      </div>
    </div>
  );
};
