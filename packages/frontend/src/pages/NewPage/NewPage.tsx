/**
 * NewPage Container Component
 * 
 * The enhanced "New" page (formerly Focus page) that displays email threads
 * requiring the agent's reply. Assembles all sub-components and wires up
 * state management hooks.
 * 
 * Requirements: 1.1, 8.1, 8.2, 8.5, 9.4
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import { ThreadCard } from '../../components/ThreadCard/ThreadCard';
import { ReplyComposer } from '../../components/ReplyComposer/ReplyComposer';
import { FilterChips, DEFAULT_FILTER_OPTIONS } from '../../components/FilterChips/FilterChips';
import { NewPageSkeleton } from '../../components/NewPageSkeleton/NewPageSkeleton';
import { AnimatedEmptyState } from '../../components/AnimatedEmptyState/AnimatedEmptyState';
import { NewPageHeader } from '../../components/NewPageHeader/NewPageHeader';
import { NewPageError } from '../../components/NewPageError/NewPageError';
import { NewThreadsBanner } from '../../components/NewThreadsBanner/NewThreadsBanner';
import { SnoozeOverlay } from '../../components/SnoozeOverlay/SnoozeOverlay';
import { ToastContainer } from '../../components/Toast/Toast';
import { VirtualList } from '../../components/VirtualList/VirtualList';
import { FolderSidebar } from '../../components/FolderSidebar/FolderSidebar';
import { ForwardEmailModal } from '../../components/ForwardEmailModal/ForwardEmailModal';
import { FolderPickerModal } from '../../components/FolderPickerModal/FolderPickerModal';
import { CreateFolderModal } from '../../components/CreateFolderModal/CreateFolderModal';
import { EmailFolder, CUSTOM_FOLDERS, ALL_FOLDERS } from '../../data/mockFolders';
import { useThreadsState } from '../../hooks/useThreadsState';
import { useFilterState } from '../../hooks/useFilterState';
import { useBatchState } from '../../hooks/useBatchState';
import { useThreadActions } from '../../hooks/useThreadActions';
import { useDropdownState } from '../../hooks/useDropdownState';
import { useReplyComposer } from '../../hooks/useReplyComposer';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { BatchActionBar } from '../../components/BatchActionBar/BatchActionBar';
import { FloatingComposeButton } from '../../components/FloatingComposeButton/FloatingComposeButton';
import { ComposeModal } from '../../components/ComposeModal/ComposeModal';
import { Portal } from '../../components/Portal/Portal';

import { BatchAction, FilterOption, SnoozeOptions } from '../../models/newPage.types';
import { GodmodeToggle } from '../../components/GodmodeToggle/GodmodeToggle';
import './NewPage.css';

interface NewPageProps {
  filterMode?: 'focus' | 'waiting' | 'all';
}

/**
 * NewPage - Enhanced thread management page
 */
export const NewPage: React.FC<NewPageProps> = ({ filterMode = 'focus' }) => {
  const navigate = useNavigate();

  // Thread state management
  const {
    threads,
    isLoading,
    error,
    syncStatus,
    newThreadsCount,
    refresh,
    removeThread,
    mergeNewThreads
  } = useThreadsState({ filter: filterMode });

  // Reference for pull-to-refresh container
  const threadListRef = useRef<HTMLDivElement>(null);

  // Thread actions with visual feedback
  const {
    state: actionState,
    snoozeThread,
    sendDraft,
    openSnoozeOverlay,
    closeSnoozeOverlay,
    dismissToast,
    getThreadAnimation,
    addToast
  } = useThreadActions(removeThread);

  // Filter state management
  const {
    activeFilters,
    activeFolderId,
    setFilters,
    setSearchQuery,
    setFolderId,
    filteredThreads,
    filterCounts
  } = useFilterState(threads);

  // Batch selection state
  const {
    isBatchMode,
    selectedIds,
    toggleBatchMode,
    exitBatchMode,
    toggleSelection,
    enterBatchMode
  } = useBatchState();

  // Dropdown state management (single expansion invariant)
  const {
    toggleDropdown,
    closeAllDropdowns,
    isDropdownExpanded
  } = useDropdownState();

  // Reply composer state management
  const {
    isOpen: isReplyComposerOpen,
    currentThread: replyThread,
    selectedStyle,
    isGenerating,
    generatedMessage,
    openComposer: openReplyComposer,
    closeComposer: closeReplyComposer,
    sendReply,
    changeStyle,
    regenerateReply
  } = useReplyComposer();

  // Compose modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Folder sidebar state
  const [isFolderSidebarOpen, setIsFolderSidebarOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);

  // Forward modal state
  const [forwardModalState, setForwardModalState] = useState<{
    isOpen: boolean;
    threadId: string | null;
    subject: string;
    content: string;
  }>({ isOpen: false, threadId: null, subject: '', content: '' });

  // Move to modal state
  const [moveToModalState, setMoveToModalState] = useState<{
    isOpen: boolean;
    threadId: string | null;
  }>({ isOpen: false, threadId: null });

  // Custom folders state (starts with existing custom folders from mock)
  const [customFolders, setCustomFolders] = useState<EmailFolder[]>(CUSTOM_FOLDERS);

  // Scroll-aware compact mode state
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);

  // Handle scroll for compact header mode
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsHeaderCompact(scrollPosition > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Build filter options with counts
  const filterOptions: FilterOption[] = useMemo(() => {
    return DEFAULT_FILTER_OPTIONS.map(opt => ({
      ...opt,
      count: filterCounts[opt.type] || 0
    }));
  }, [filterCounts]);

  // Handle dropdown toggle (single expansion invariant)
  const handleDropdownToggle = useCallback((threadId: string) => {
    toggleDropdown(threadId);
  }, [toggleDropdown]);

  // Handle quick reply button click
  const handleQuickReply = useCallback((threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      openReplyComposer(thread);
    }
  }, [threads, openReplyComposer]);

  // Handle thread selection in batch mode
  const handleSelect = useCallback((threadId: string) => {
    toggleSelection(threadId);
  }, [toggleSelection]);

  // Handle long press to enter batch mode and select item
  const handleLongPress = useCallback((threadId: string) => {
    enterBatchMode();
    toggleSelection(threadId);
  }, [enterBatchMode, toggleSelection]);

  // Handle thread actions
  const handleAction = useCallback((threadId: string, action: 'view' | 'snooze' | 'send_draft' | 'delete' | 'forward' | 'move_to' | 'archive' | 'mark_read') => {
    const thread = threads.find(t => t.id === threadId);

    switch (action) {
      case 'view':
        navigate(`/threads/${threadId}`);
        break;
      case 'snooze':
        openSnoozeOverlay(threadId, thread?.subject);
        break;
      case 'send_draft':
        sendDraft(threadId);
        break;
      case 'delete':
        console.log('Deleting thread:', threadId);
        removeThread(threadId);
        break;
      case 'forward':
        setForwardModalState({
          isOpen: true,
          threadId,
          subject: thread?.subject || '',
          content: thread?.aiSummary || thread?.summary || ''
        });
        break;
      case 'move_to':
        setMoveToModalState({ isOpen: true, threadId });
        break;
      case 'archive':
        console.log('Archiving thread:', threadId);
        removeThread(threadId); // Move to archive (simulated)
        break;
      case 'mark_read':
        console.log('Toggling read status:', threadId);
        break;
    }
  }, [navigate, threads, openSnoozeOverlay, sendDraft, removeThread]);

  // Handle snooze confirmation
  const handleSnoozeConfirm = useCallback((threadId: string, options: SnoozeOptions) => {
    snoozeThread(threadId, options);
  }, [snoozeThread]);



  // Handle new message send
  const handleComposeSend = useCallback(async (data: { to: string[], subject: string, message: string }) => {
    // In a real app, this would call the API
    console.log('Sending new message:', data);
    return new Promise<void>(resolve => setTimeout(resolve, 1000));
  }, []);

  // Handle batch actions
  const handleBatchAction = useCallback(async (action: BatchAction) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    console.log(`Executing batch action: ${action} on ${ids.length} threads`);

    try {
      // For archive/delete/mark_read, we'll perform them in a simulated batch
      // In a real app, this would be a single API call
      let actionLabel = '';
      switch (action) {
        case 'archive_all':
          ids.forEach(id => removeThread(id));
          actionLabel = 'archived';
          break;
        case 'delete_all':
          ids.forEach(id => removeThread(id));
          actionLabel = 'deleted';
          break;
        case 'mark_read':
          // Simulate marking read
          actionLabel = 'marked as read';
          break;
        case 'snooze_all':
          // For snooze, we might want to open a modal or just snooze for a default time
          // Here we'll simulate a 4h snooze for simplicity
          ids.forEach(id => removeThread(id));
          actionLabel = 'snoozed';
          break;
      }

      // Show success notification
      addToast('success', `${ids.length} thread${ids.length === 1 ? '' : 's'} ${actionLabel}`);

      // Exit batch mode
      exitBatchMode();
    } catch (error) {
      console.error('Batch action failed:', error);
    }
  }, [exitBatchMode, selectedIds, removeThread]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // Handle merge new threads
  const handleMergeNewThreads = useCallback(() => {
    mergeNewThreads();
  }, [mergeNewThreads]);

  // Folder sidebar handlers
  const handleViewFolders = useCallback(() => {
    setIsFolderSidebarOpen(true);
  }, []);

  const handleCreateFolder = useCallback(() => {
    setIsCreateFolderModalOpen(true);
  }, []);

  const handleFolderCreate = useCallback((folder: { name: string; color: string }) => {
    const newFolder: EmailFolder = {
      id: `custom-${Date.now()}`,
      name: folder.name,
      type: 'custom',
      color: folder.color,
      unreadCount: 0,
      totalCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCustomFolders(prev => [...prev, newFolder]);
    console.log('Created folder:', newFolder);
  }, []);

  const handleFolderSelect = useCallback((folderId: string) => {
    setFolderId(folderId);
    setIsFolderSidebarOpen(false);
    console.log('Selected folder:', folderId);
  }, [setFolderId]);

  const handleDeleteFolder = useCallback((folderId: string) => {
    // Only delete custom folders
    const folder = customFolders.find(f => f.id === folderId);
    if (!folder) {
      console.log('Cannot delete: folder not found or is a system folder');
      return;
    }

    // Clear folder filter if viewing deleted folder
    if (activeFolderId === folderId) {
      setFolderId(null);
    }

    // Remove folder
    setCustomFolders(prev => prev.filter(f => f.id !== folderId));
    console.log('Deleted folder:', folderId);
  }, [customFolders, activeFolderId, setFolderId]);

  // Render thread item for virtual list
  const renderThreadItem = useCallback((thread: Thread, index: number) => {
    const animation = getThreadAnimation(thread.id);
    const animationClass = animation ? `thread-card--${animation}` : '';

    return (
      <div
        className={`new-page__thread-item ${animationClass}`}
        style={{ animationDelay: `${index * 50}ms` }}
        role="listitem"
      >
        <ThreadCard
          thread={thread}
          isDropdownExpanded={isDropdownExpanded(thread.id)}
          isSelected={selectedIds.has(thread.id)}
          isBatchMode={isBatchMode}
          showQuickReply={true}
          onDropdownToggle={handleDropdownToggle}
          onQuickReply={handleQuickReply}
          onSelect={handleSelect}
          onLongPress={handleLongPress}
          onAction={handleAction}
          className={animationClass}
        />
      </div>
    );
  }, [selectedIds, isBatchMode, isDropdownExpanded, handleDropdownToggle, handleQuickReply, handleSelect, handleAction, getThreadAnimation]);

  // Pull-to-refresh hook
  const {
    attachPullToRefresh,
    detachPullToRefresh,
    isRefreshing: isPullRefreshing,
    pullDistance,
    getPullIndicatorStyle,
    getPullContainerStyle
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    maxPullDistance: 120,
    enableHapticFeedback: true
  });

  // Attach pull-to-refresh to thread list
  useEffect(() => {
    if (threadListRef.current) {
      attachPullToRefresh(threadListRef.current);
    }
    return () => {
      detachPullToRefresh();
    };
  }, [attachPullToRefresh, detachPullToRefresh]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Close dropdowns if clicking outside thread cards
      if (!target.closest('.thread-card')) {
        closeAllDropdowns();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [closeAllDropdowns]);

  // Count urgent threads
  const urgentCount = useMemo(() => {
    return threads.filter(t => t.riskLevel === 'high').length;
  }, [threads]);

  // Determine if virtual scrolling should be used (>20 threads)
  const shouldUseVirtualScrolling = filteredThreads.length > 20;
  const THREAD_ITEM_HEIGHT = 180; // Approximate height of a thread card

  // Render loading state
  if (isLoading && threads.length === 0) {
    return (
      <div className="new-page" data-theme="high-tech" data-testid="new-page-loading">
        <AmbientBackground variant="subtle" />
        <div className="new-page__container">
          <NewPageHeader
            threadCount={0}
            urgentCount={0}
            isCompact={isHeaderCompact}
            syncStatus={syncStatus}
            onRefresh={handleRefresh}
            onSearch={setSearchQuery}
            onFilterChange={setFilters}
          />
          <div className="new-page__skeleton-list">
            <NewPageSkeleton count={4} testId="new-page-skeleton" />
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && threads.length === 0) {
    return (
      <div className="new-page" data-theme="high-tech" data-testid="new-page-error">
        <AmbientBackground variant="subtle" />
        <div className="new-page__container">
          <NewPageHeader
            threadCount={0}
            urgentCount={0}
            isCompact={isHeaderCompact}
            syncStatus={syncStatus}
            onRefresh={handleRefresh}
            onSearch={setSearchQuery}
            onFilterChange={setFilters}
          />
          <NewPageError
            message={error.message}
            onRetry={handleRefresh}
            testId="new-page-error-state"
          />
        </div>
      </div>
    );
  }

  // Render empty state
  if (!isLoading && filteredThreads.length === 0) {
    return (
      <div className="new-page" data-theme="high-tech">
        <AmbientBackground variant="subtle" />
        <div className="new-page__container">
          <NewPageHeader
            threadCount={threads.length}
            urgentCount={urgentCount}
            isCompact={isHeaderCompact}
            syncStatus={syncStatus}
            onRefresh={handleRefresh}
            onSearch={setSearchQuery}
            onFilterChange={setFilters}
          />

          <FilterChips
            filters={filterOptions}
            activeFilters={activeFilters}
            onFilterChange={setFilters}
            className="new-page__filters"
          />

          <AnimatedEmptyState
            message="All caught up!"
            subMessage="No threads need your attention right now. Great job staying on top of your inbox!"
            avatarState="idle"
            showParticles={true}
            testId="new-page-empty-state"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="new-page" data-theme="high-tech">
      <AmbientBackground variant="subtle" />

      <div className="new-page__container">
        {/* Header with God Mode Toggle */}
        <div className="new-page__header-wrapper">
          <NewPageHeader
            threadCount={filteredThreads.length}
            urgentCount={urgentCount}
            isCompact={isHeaderCompact}
            syncStatus={syncStatus}
            onRefresh={handleRefresh}
            onSearch={setSearchQuery}
            onToggleBatchMode={toggleBatchMode}
            isBatchMode={isBatchMode}
            onFilterChange={setFilters}
            onViewFolders={handleViewFolders}
            onCreateFolder={handleCreateFolder}
            title={filterMode === 'focus' ? 'New mail' : filterMode === 'waiting' ? 'Awaiting response' : 'All inbox'}
            activeFolderName={activeFolderId ? [...ALL_FOLDERS, ...customFolders].find(f => f.id === activeFolderId)?.name : undefined}
            onClearFolder={() => setFolderId(null)}
          />
          <div className="new-page__godmode-toggle">
            <GodmodeToggle compact />
          </div>
        </div>

        {/* Filter chips */}
        <FilterChips
          filters={filterOptions}
          activeFilters={activeFilters}
          onFilterChange={setFilters}
          className="new-page__filters"
        />

        {/* New threads banner */}
        <NewThreadsBanner
          count={newThreadsCount}
          isVisible={newThreadsCount > 0}
          onMerge={handleMergeNewThreads}
        />

        {/* Pull-to-refresh indicator */}
        {pullDistance > 0 && (
          <div
            className="new-page__pull-indicator"
            style={getPullIndicatorStyle()}
            aria-hidden="true"
          >
            <svg
              className={`new-page__pull-icon ${isPullRefreshing ? 'new-page__pull-icon--spinning' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </div>
        )}

        {/* Thread list */}
        <div
          ref={threadListRef}
          className="new-page__thread-list"
          role="list"
          aria-label="Email threads"
          style={getPullContainerStyle()}
        >
          {shouldUseVirtualScrolling ? (
            <VirtualList
              items={filteredThreads}
              itemHeight={THREAD_ITEM_HEIGHT}
              renderItem={renderThreadItem}
              overscan={5}
              className="new-page__virtual-list"
            />
          ) : (
            filteredThreads.map((thread, index) => {
              const animation = getThreadAnimation(thread.id);
              const animationClass = animation ? `thread-card--${animation}` : '';

              return (
                <div
                  key={thread.id}
                  className={`new-page__thread-item ${animationClass}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  role="listitem"
                >
                  <ThreadCard
                    thread={thread}
                    isDropdownExpanded={isDropdownExpanded(thread.id)}
                    isSelected={selectedIds.has(thread.id)}
                    isBatchMode={isBatchMode}
                    showQuickReply={true}
                    onDropdownToggle={handleDropdownToggle}
                    onQuickReply={handleQuickReply}
                    onSelect={handleSelect}
                    onLongPress={handleLongPress}
                    onAction={handleAction}
                    className={animationClass}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Reply Composer Modal */}
        {/* Reply Composer Modal - Rendered via Portal to escape stacking contexts and ensure centering */}
        {isReplyComposerOpen && replyThread && (
          <Portal>
            <ReplyComposer
              isOpen={isReplyComposerOpen}
              thread={replyThread}
              selectedStyle={selectedStyle}
              isGenerating={isGenerating}
              generatedMessage={generatedMessage}
              onClose={closeReplyComposer}
              onSend={sendReply}
              onStyleChange={changeStyle}
              onRegenerate={regenerateReply}
            />
          </Portal>
        )}
      </div>

      {/* Snooze Overlay */}
      <SnoozeOverlay
        isOpen={actionState.isSnoozeOpen}
        threadId={actionState.snoozeThreadId}
        threadSubject={actionState.snoozeThreadSubject || undefined}
        onConfirm={handleSnoozeConfirm}
        onClose={closeSnoozeOverlay}
      />

      {/* Toast Notifications */}
      <ToastContainer
        toasts={actionState.toasts}
        onDismiss={dismissToast}
      />

      {/* Batch Action Bar - Rendered via Portal to escape stacking contexts */}
      <Portal>
        <BatchActionBar
          selectedCount={selectedIds.size}
          isVisible={isBatchMode && selectedIds.size > 0}
          onAction={handleBatchAction}
          onCancel={exitBatchMode}
        />
      </Portal>

      {/* Compose Features - Rendered via Portal to escape stacking contexts */}
      <Portal>
        <FloatingComposeButton
          onClick={() => setIsComposeOpen(true)}
        />
      </Portal>

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleComposeSend}
      />

      {/* Folder Sidebar - Portal to escape stacking context */}
      <Portal>
        <FolderSidebar
          isOpen={isFolderSidebarOpen}
          onClose={() => setIsFolderSidebarOpen(false)}
          activeFolderId={activeFolderId ?? undefined}
          onFolderSelect={handleFolderSelect}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
          customFolders={customFolders}
        />
      </Portal>

      {/* Create Folder Modal - Portal */}
      <Portal>
        <CreateFolderModal
          isOpen={isCreateFolderModalOpen}
          onClose={() => setIsCreateFolderModalOpen(false)}
          onCreateFolder={handleFolderCreate}
          existingFolderNames={[...ALL_FOLDERS.map(f => f.name), ...customFolders.map(f => f.name)]}
        />
      </Portal>

      {/* Forward Email Modal - Portal */}
      <Portal>
        <ForwardEmailModal
          isOpen={forwardModalState.isOpen}
          originalSubject={forwardModalState.subject}
          originalContent={forwardModalState.content}
          onClose={() => setForwardModalState({ isOpen: false, threadId: null, subject: '', content: '' })}
          onSend={async (data) => {
            console.log('Forwarding email:', data);
            // In a real app, this would call the API
          }}
        />
      </Portal>

      {/* Move to Folder Modal - Portal */}
      <Portal>
        <FolderPickerModal
          isOpen={moveToModalState.isOpen}
          onClose={() => setMoveToModalState({ isOpen: false, threadId: null })}
          onFolderSelect={(folderId) => {
            console.log('Moving thread', moveToModalState.threadId, 'to folder', folderId);
            // In a real app, this would call the API and update the thread
            if (moveToModalState.threadId) {
              removeThread(moveToModalState.threadId);
            }
          }}
        />
      </Portal>

    </div>
  );
};

export default NewPage;
