import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, PersonStanding, Plus, ChevronDown } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from '@/components/ui/context-menu';
import ConfirmDialog from './ConfirmDialog';
import ShareWorkoutDialog from './ShareWorkoutDialog';
import ColorPickerPopover from './ColorPickerPopover';
import { useI18n } from '../lib/i18n';

export default function WeekDayColumn({
  day,
  dayLabel,
  isToday,
  workouts,
  allWorkouts,
  onDragEnd,
  onRemoveFromDay,
  onDeleteWorkout,
  onRename,
  onAddNew,
  onAddExisting,
  onAddFromBase,
  onColorChange,
  getExCount,
  getTotals,
}) {
  const navigate = useNavigate();
  const { language } = useI18n();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [shareTarget, setShareTarget] = useState(null);
  const [colorPickerFor, setColorPickerFor] = useState(null);
  const menuRef = useRef(null);
  const plusBtnRef = useRef(null);

  useEffect(() => {
    if (!showAddMenu) return;
    const handler = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowAddMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddMenu]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.mode === 'day') onRemoveFromDay(deleteTarget.id, day);
    else onDeleteWorkout(deleteTarget.id);
    setDeleteTarget(null);
  };

  const hasOtherWorkouts = allWorkouts.some((workout) => {
    if (!workout.name || !workout.name.trim()) return false;
    const days = workout.weekdays?.length ? workout.weekdays : workout.weekday ? [workout.weekday] : [];
    return !days.includes(day);
  });

  const copy = language === 'en'
    ? {
      today: 'Today',
      addWorkout: 'Add workout',
      newWorkout: 'New workout',
      existingWorkout: 'Existing workout',
      fromDb: 'Choose from workout DB',
      expand: 'Expand',
      collapse: 'Collapse',
      share: 'Share',
      rename: 'Rename',
      removeFromDay: `Remove from ${dayLabel}`,
      deleteAll: 'Delete completely',
      removeTitle: `Remove from ${dayLabel}?`,
      deleteTitle: 'Delete workout completely?',
      removeDescription: 'The workout remains assigned to other weekdays.',
      deleteDescription: 'The workout will be removed from all weekdays. This cannot be undone.',
    }
    : {
      today: 'Heute',
      addWorkout: 'Workout hinzufügen',
      newWorkout: 'Neues Workout',
      existingWorkout: 'Vorhandenes Workout',
      fromDb: 'Aus Workout-DB wählen',
      expand: 'Aufklappen',
      collapse: 'Einklappen',
      share: 'Teilen',
      rename: 'Umbenennen',
      removeFromDay: `Von ${dayLabel} entfernen`,
      deleteAll: 'Komplett löschen',
      removeTitle: `Von ${dayLabel} entfernen?`,
      deleteTitle: 'Workout komplett löschen?',
      removeDescription: 'Das Workout bleibt an anderen Wochentagen bestehen.',
      deleteDescription: 'Das Workout wird an allen Wochentagen entfernt. Dieser Schritt kann nicht rückgängig gemacht werden.',
    };

  return (
    <div className="transition-colors border-border bg-card">
      <div
        className="px-3 opacity-100 rounded-none relative flex items-center justify-between gap-2 cursor-pointer select-none"
        style={{ backgroundColor: 'hsl(var(--primary))', paddingTop: '0.18em', paddingBottom: '0.18em' }}
        onClick={() => setCollapsed((value) => !value)}
      >
        <span className="font-display font-normal uppercase tracking-widest" style={{ color: 'hsl(var(--card))', fontSize: '0.85em' }}>
          {dayLabel}
        </span>
        {isToday ? (
          <span className="absolute left-1/2 -translate-x-1/2 font-body font-bold uppercase tracking-widest rounded bg-white/25 text-white leading-none pointer-events-none" style={{ fontSize: '0.65em', padding: '0.2em 0.5em' }}>
            {copy.today}
          </span>
        ) : null}
        <div className="flex items-center gap-1 relative z-10">
          <div className="relative" ref={menuRef}>
            <button
              ref={plusBtnRef}
              onClick={(event) => {
                event.stopPropagation();
                setShowAddMenu((value) => !value);
              }}
              className="flex items-center justify-center rounded-full transition-colors hover:bg-black/10"
              style={{ color: 'white', width: '1.5em', height: '1.5em' }}
              title={copy.addWorkout}
            >
              <Plus style={{ width: '1em', height: '1em', strokeWidth: 3 }} />
            </button>

            {showAddMenu ? (
              <div className="absolute right-0 top-full mt-1 z-[9999] bg-card border border-border rounded-xl shadow-lg py-1" style={{ minWidth: 160 }}>
                <button onClick={(event) => { event.stopPropagation(); setShowAddMenu(false); onAddNew(day); }} className="block w-full text-left px-4 py-2 text-sm font-body text-foreground hover:bg-secondary/70 transition-colors">
                  {copy.newWorkout}
                </button>
                {hasOtherWorkouts ? (
                  <button onClick={(event) => { event.stopPropagation(); setShowAddMenu(false); onAddExisting(day); }} className="block w-full text-left px-4 py-2 text-sm font-body text-foreground hover:bg-secondary/70 transition-colors">
                    {copy.existingWorkout}
                  </button>
                ) : null}
                <button onClick={(event) => { event.stopPropagation(); setShowAddMenu(false); onAddFromBase(day); }} className="block w-full text-left px-4 py-2 text-sm font-body text-foreground hover:bg-secondary/70 transition-colors">
                  {copy.fromDb}
                </button>
              </div>
            ) : null}
          </div>
          <div
            onClick={(event) => { event.stopPropagation(); setCollapsed((value) => !value); }}
            className="flex items-center justify-center rounded-full transition-colors hover:bg-black/10"
            style={{ color: 'white', width: '1.5em', height: '1.5em' }}
            title={collapsed ? copy.expand : copy.collapse}
          >
            <ChevronDown style={{ width: '1em', height: '1em' }} className={`transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
          </div>
        </div>
      </div>

      {!collapsed ? (
        <DragDropContext onDragEnd={(result) => onDragEnd(day, result)}>
          <Droppable droppableId={`day-${day}`} direction="vertical">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {workouts.map((workout, index) => {
                  const count = getExCount(workout);
                  const { secs, sets, allSets } = getTotals(workout);
                  const color = workout.color || '#212121';

                  return (
                    <Draggable key={`${day}-${workout.id}`} draggableId={`${day}-${workout.id}`} index={index}>
                      {(prov, snap) => (
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              onClick={() => !snap.isDragging && navigate(`/workout/${workout.id}`)}
                              className={`flex items-center border-t border-border/50 cursor-pointer transition-colors ${snap.isDragging ? 'bg-primary/10 shadow-md' : 'hover:bg-muted/30 bg-card'}`}
                              style={{ padding: '0.3em 0.5em', ...prov.draggableProps.style }}
                            >
                              <div
                                {...prov.dragHandleProps}
                                onTouchStart={(event) => event.stopPropagation()}
                                onClick={(event) => event.stopPropagation()}
                                className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0 flex items-center justify-center"
                                style={{ width: '1.8em', height: '1.8em', touchAction: 'none', marginRight: '0.15em' }}
                              >
                                <GripVertical style={{ width: '0.75em', height: '0.75em' }} />
                              </div>

                              <div className="relative shrink-0" style={{ width: '0.6em', height: '0.6em', marginRight: '1.1em' }} onClick={(event) => { event.stopPropagation(); setColorPickerFor(colorPickerFor === workout.id ? null : workout.id); }}>
                                <div className="w-full h-full rounded-full ring-1 ring-black/20 cursor-pointer hover:scale-110 transition-transform active:scale-95" style={{ backgroundColor: color }} />
                                {colorPickerFor === workout.id ? (
                                  <ColorPickerPopover
                                    color={color}
                                    onChange={(nextColor) => {
                                      onColorChange(workout.id, nextColor);
                                      setColorPickerFor(null);
                                    }}
                                    onClose={() => setColorPickerFor(null)}
                                  />
                                ) : null}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="font-body font-semibold text-foreground truncate leading-tight" style={{ fontSize: '0.9em' }}>
                                  {workout.name}
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center leading-tight" style={{ fontSize: '0.65em' }}>
                                <div className="flex items-center gap-0.5 justify-end" style={{ minWidth: '2.5em' }}>
                                  <PersonStanding className="text-muted-foreground shrink-0" style={{ width: '1.2em', height: '1.2em' }} />
                                  <span className="text-yellow-800">{count}</span>
                                </div>
                                <div className="text-muted-foreground flex items-center" style={{ marginLeft: '1.4em', minWidth: '3.5em' }}>
                                  <span style={{ width: '1em', height: '1em', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {allSets
                                      ? <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                                      : <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                                  </span>
                                  <span style={{ marginLeft: '0.3em' }}>
                                    {allSets
                                      ? <span className="tabular-nums">{sets} S</span>
                                      : <div className="flex flex-col tabular-nums leading-none"><span>{Math.floor(secs / 60)}<span style={{ opacity: 0.6, fontSize: '0.75em' }}>m</span></span><span>{String(secs % 60).padStart(2, '0')}<span style={{ opacity: 0.6, fontSize: '0.75em' }}>s</span></span></div>}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onClick={(event) => { event.stopPropagation(); setShareTarget(workout); }}>{copy.share}</ContextMenuItem>
                            <ContextMenuItem onClick={(event) => { event.stopPropagation(); onRename(workout); }}>{copy.rename}</ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={(event) => { event.stopPropagation(); setDeleteTarget({ id: workout.id, mode: 'day' }); }}>{copy.removeFromDay}</ContextMenuItem>
                            <ContextMenuItem onClick={(event) => { event.stopPropagation(); setDeleteTarget({ id: workout.id, mode: 'all' }); }}>{copy.deleteAll}</ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title={deleteTarget?.mode === 'day' ? copy.removeTitle : copy.deleteTitle}
        description={deleteTarget?.mode === 'day' ? copy.removeDescription : copy.deleteDescription}
      />

      {shareTarget ? <ShareWorkoutDialog workout={shareTarget} onClose={() => setShareTarget(null)} /> : null}
    </div>
  );
}
