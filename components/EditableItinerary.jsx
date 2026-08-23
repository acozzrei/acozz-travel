"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ItemCard from "@/components/ItemCard";
import { dayKey, dayLabel } from "@/lib/dates";

function SortableItem({ item, onEdit, onDelete, onResolvePhoto }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex gap-1 items-stretch">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex items-center px-1 text-stone-300 hover:text-stone-500 cursor-grab active:cursor-grabbing touch-none shrink-0"
        aria-label="Drag to reorder or move to another day"
      >
        ⠿
      </button>
      <div className="flex-1 min-w-0">
        <ItemCard item={item} onEdit={onEdit} onDelete={onDelete} onResolvePhoto={onResolvePhoto} />
      </div>
    </div>
  );
}

// Every day is its own droppable zone (not just a sortable list), so
// dragging an item onto an otherwise-empty day still works — a plain
// SortableContext has nothing to collide with when its list is empty.
function DayColumn({ id, items, onEdit, onDelete, onResolvePhoto }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="flex flex-col gap-3 min-h-[3rem]">
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableItem key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} onResolvePhoto={onResolvePhoto} />
        ))}
        {items.length === 0 && (
          <div className="text-xs text-stone-300 border border-dashed border-stone-200 rounded-lg py-4 text-center">
            Drag an item here
          </div>
        )}
      </SortableContext>
    </div>
  );
}

function findContainer(groups, id) {
  if (groups[id]) return id;
  return Object.keys(groups).find((key) => groups[key].some((item) => item.id === id));
}

function groupByDay(items) {
  const groups = {};
  for (const item of items) {
    const key = dayKey(item.startTime);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  return groups;
}

// Editable, drag-and-drop day-by-day itinerary for the owner's own trip
// page: reorder within a day, or drag an item onto a different day
// entirely. Every drop persists immediately via
// /api/trips/[tripId]/items/reorder — nothing lives only in local state
// that a refresh would lose. Unscheduled items (no startTime) render
// read-only below, same as the plain ItineraryTimeline — dragging doesn't
// apply to them since they have no day to belong to.
export default function EditableItinerary({ tripId, items, onEdit, onDelete, onResolvePhoto }) {
  const scheduled = items.filter((i) => i.startTime);
  const unscheduled = items.filter((i) => !i.startTime);

  const [groups, setGroups] = useState(() => groupByDay(scheduled));
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resyncs local drag state when the trip refetches (e.g. after edit/delete)
    setGroups(groupByDay(items.filter((i) => i.startTime)));
  }, [items]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const sortedKeys = Object.keys(groups).sort();

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragOver(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeContainer = findContainer(groups, active.id);
    const overContainer = findContainer(groups, over.id) || over.id;
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setGroups((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer] || [];
      const activeIndex = activeItems.findIndex((i) => i.id === active.id);
      if (activeIndex === -1) return prev;
      const overIndex = overItems.findIndex((i) => i.id === over.id);
      const movingItem = activeItems[activeIndex];
      const newActiveItems = activeItems.filter((i) => i.id !== active.id);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      const newOverItems = [...overItems.slice(0, insertAt), movingItem, ...overItems.slice(insertAt)];
      return { ...prev, [activeContainer]: newActiveItems, [overContainer]: newOverItems };
    });
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const container = findContainer(groups, active.id);
    if (!container) return;
    const containerItems = groups[container];
    const activeIndex = containerItems.findIndex((i) => i.id === active.id);
    const overIndex = containerItems.findIndex((i) => i.id === over.id);

    let finalGroups = groups;
    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      finalGroups = { ...groups, [container]: arrayMove(containerItems, activeIndex, overIndex) };
      setGroups(finalGroups);
    }

    const payloadItems = [];
    for (const key of Object.keys(finalGroups)) {
      finalGroups[key].forEach((item, index) => {
        const itemDayKey = dayKey(item.startTime);
        let startTime;
        if (itemDayKey !== key) {
          const timeOfDay = new Date(item.startTime).toISOString().slice(11, 19);
          startTime = `${key}T${timeOfDay}Z`;
        }
        payloadItems.push({ id: item.id, order: index, ...(startTime ? { startTime } : {}) });
      });
    }

    try {
      await fetch(`/api/trips/${tripId}/items/reorder`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: payloadItems }),
      });
    } catch {
      // Best-effort — the next refresh re-syncs from the server regardless.
    }
  }

  if (items.length === 0) {
    return <p className="text-stone-500 text-sm">No itinerary items yet.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {sortedKeys.map((key) => (
          <div key={key}>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">{dayLabel(key)}</h2>
            <DayColumn id={key} items={groups[key]} onEdit={onEdit} onDelete={onDelete} onResolvePhoto={onResolvePhoto} />
          </div>
        ))}
      </DndContext>

      {unscheduled.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Unscheduled</h2>
          <div className="flex flex-col gap-3">
            {unscheduled.map((item) => (
              <ItemCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} onResolvePhoto={onResolvePhoto} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
