'use client';

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FunnelStep } from '@/lib/api';

interface SortableRowProps {
  step: FunnelStep;
  onToggle: () => void;
}

function SortableRow({ step, onToggle }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.event,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-background-tertiary ${isDragging ? 'bg-background-tertiary' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-foreground-muted cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripIcon />
      </button>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={step.visible}
        onChange={onToggle}
        className="accent-accent shrink-0"
      />

      {/* Event name */}
      <span className="text-sm text-foreground-secondary truncate flex-1">{step.event}</span>
    </div>
  );
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <circle cx="4" cy="3" r="1.2" />
      <circle cx="10" cy="3" r="1.2" />
      <circle cx="4" cy="7" r="1.2" />
      <circle cx="10" cy="7" r="1.2" />
      <circle cx="4" cy="11" r="1.2" />
      <circle cx="10" cy="11" r="1.2" />
    </svg>
  );
}

interface FunnelConfiguratorProps {
  steps: FunnelStep[];
  onChange: (steps: FunnelStep[]) => void;
  onApply: () => void;
  isSaving: boolean;
}

export function FunnelConfigurator({ steps, onChange, onApply, isSaving }: FunnelConfiguratorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const installsStep = steps.find((s) => s.event === 'installs');
  const draggableSteps = steps.filter((s) => s.event !== 'installs');

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = draggableSteps.findIndex((s) => s.event === active.id);
    const newIndex = draggableSteps.findIndex((s) => s.event === over.id);
    const reordered = arrayMove(draggableSteps, oldIndex, newIndex);
    onChange(installsStep ? [installsStep, ...reordered] : reordered);
  }

  function handleToggle(event: string) {
    onChange(steps.map((s) => (s.event === event ? { ...s, visible: !s.visible } : s)));
  }

  return (
    <div className="flex flex-col h-full p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Configure Steps</h3>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {/* Installs row — pinned, not draggable */}
        {installsStep && (
          <div className="flex items-center gap-2 px-3 py-2 rounded mb-1 bg-background-tertiary/50">
            <span className="text-foreground-muted w-[14px]" aria-hidden>⠿</span>
            <input
              type="checkbox"
              checked={installsStep.visible}
              onChange={() => handleToggle('installs')}
              className="accent-accent shrink-0"
            />
            <span className="text-sm text-foreground-secondary truncate flex-1">installs</span>
            <span className="text-xs text-foreground-muted ml-auto">pinned</span>
          </div>
        )}

        {/* Draggable steps */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={draggableSteps.map((s) => s.event)} strategy={verticalListSortingStrategy}>
            {draggableSteps.map((step) => (
              <SortableRow key={step.event} step={step} onToggle={() => handleToggle(step.event)} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <button
        onClick={onApply}
        disabled={isSaving}
        className="mt-4 w-full py-2 rounded-md bg-accent hover:bg-accent/80 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSaving && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {isSaving ? 'Saving…' : 'Apply'}
      </button>
    </div>
  );
}
