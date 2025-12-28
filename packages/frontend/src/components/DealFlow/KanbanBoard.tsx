import React from 'react';
import { createPortal } from 'react-dom';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { DealCard } from './DealCard';
import { Deal, PipelineColumn, formatCurrency } from './types';

interface KanbanBoardProps {
    columns: PipelineColumn[];
    onDealClick?: (deal: Deal) => void;
    onDealMove?: (dealId: string, fromStage: string, toStage: string) => void;
}

interface ColumnProps {
    column: PipelineColumn;
    isCollapsed: boolean;
    onToggleCollapse: (stage: string) => void;
    onDealClick?: (deal: Deal) => void;
}

const Column: React.FC<ColumnProps> = ({ column, isCollapsed, onToggleCollapse, onDealClick }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: column.stage
    });

    if (isCollapsed) {
        return (
            <div
                ref={setNodeRef}
                className="deal-flow__column deal-flow__column--collapsed"
                onClick={() => onToggleCollapse(column.stage)}
            >
                <div className="deal-flow__column-header">
                    <div className="deal-flow__column-title">
                        <span className="deal-flow__column-count">{column.count}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            className={`deal-flow__column ${isOver ? 'deal-flow__column--over' : ''}`}
        >
            <div className="deal-flow__column-header" onClick={() => onToggleCollapse(column.stage)}>
                <div className="deal-flow__column-title">
                    {column.label}
                    <span className="deal-flow__column-count">{column.count}</span>
                </div>
                {column.totalValue > 0 && (
                    <div className="deal-flow__column-value">
                        {formatCurrency(column.totalValue)}
                    </div>
                )}
            </div>
            <div className="deal-flow__column-content">
                <SortableContext
                    items={column.deals.map(d => d.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {column.deals.length === 0 ? (
                        <div className="deal-flow__column-empty">No deals</div>
                    ) : (
                        column.deals.map(deal => (
                            <DealCard
                                key={deal.id}
                                deal={deal}
                                onClick={onDealClick}
                            />
                        ))
                    )}
                </SortableContext>
            </div>
        </div>
    );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
    columns,
    onDealClick,
    onDealMove
}) => {
    const [activeId, setActiveId] = React.useState<string | null>(null);
    const [activeDeal, setActiveDeal] = React.useState<Deal | null>(null);
    const [collapsedStages, setCollapsedStages] = React.useState<Set<string>>(new Set());

    const toggleCollapse = (stage: string) => {
        const newCollapsed = new Set(collapsedStages);
        if (newCollapsed.has(stage)) {
            newCollapsed.delete(stage);
        } else {
            newCollapsed.add(stage);
        }
        setCollapsedStages(newCollapsed);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8
            }
        }),
        useSensor(KeyboardSensor)
    );

    // Find deal by ID across all columns
    const findDeal = (id: string): Deal | null => {
        for (const column of columns) {
            const deal = column.deals.find(d => d.id === id);
            if (deal) return deal;
        }
        return null;
    };

    // Find stage by deal ID
    const findStage = (id: string): string | null => {
        for (const column of columns) {
            if (column.deals.some(d => d.id === id)) {
                return column.stage;
            }
        }
        return null;
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        const deal = findDeal(active.id as string);
        setActiveDeal(deal);
    };

    const handleDragOver = (_event: DragOverEvent) => {
        // Could add visual feedback here
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            setActiveDeal(null);
            return;
        }

        const dealId = active.id as string;
        const fromStage = findStage(dealId);

        // Determine the target stage
        let toStage: string | null = null;

        // Check if dropped on a column
        if (columns.some(c => c.stage === over.id)) {
            toStage = over.id as string;
        } else {
            // Dropped on another deal, find its stage
            toStage = findStage(over.id as string);
        }

        // Trigger move callback if stages differ
        if (fromStage && toStage && fromStage !== toStage && onDealMove) {
            onDealMove(dealId, fromStage, toStage);
        }

        setActiveId(null);
        setActiveDeal(null);
    };

    const handleDragCancel = () => {
        setActiveId(null);
        setActiveDeal(null);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div className="deal-flow__kanban">
                {columns.map(column => (
                    <Column
                        key={column.stage}
                        column={column}
                        isCollapsed={collapsedStages.has(column.stage)}
                        onToggleCollapse={toggleCollapse}
                        onDealClick={onDealClick}
                    />
                ))}
            </div>

            {createPortal(
                <DragOverlay dropAnimation={{
                    duration: 200,
                    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                }}>
                    {activeId && activeDeal ? (
                        <DealCard deal={activeDeal} overlay />
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
};

export default KanbanBoard;
