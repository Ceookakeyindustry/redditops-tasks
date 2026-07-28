'use client';

import { useState } from 'react';
import { X, Plus, Palette, Trash2, Check } from 'lucide-react';
import type { Label } from '@/lib/types';
import { PRESET_LABELS } from '@/lib/types';

const LABEL_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4',
  '#3B82F6', '#8B5CF6', '#A855F7', '#EC4899', '#6B7280',
  '#14B8A6', '#84CC16', '#22C55E', '#0EA5E9', '#6366F1',
];

interface LabelManagerProps {
  labels: Label[];
  onChange: (labels: Label[]) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md';
}

export default function LabelManager({ labels, onChange, readOnly = false, size = 'md' }: LabelManagerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [editingLabel, setEditingLabel] = useState<{ name: string; color: string } | null>(null);

  const removeLabel = (name: string) => {
    onChange(labels.filter(l => l.name !== name));
  };

  const addLabel = (label: Label) => {
    if (labels.find(l => l.name === label.name)) return;
    onChange([...labels, label]);
    setShowPicker(false);
  };

  const bgClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {labels.map(label => (
        <span
          key={label.name}
          className={`inline-flex items-center gap-1 rounded-full font-medium ${bgClass} text-white group`}
          style={{ backgroundColor: label.color }}
        >
          {label.name}
          {!readOnly && (
            <button
              onClick={() => removeLabel(label.name)}
              className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </span>
      ))}

      {!readOnly && (
        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-[#8B5CF6]/30 hover:text-[#8B5CF6] transition-all text-xs px-2 py-1"
          >
            <Plus className="w-3 h-3" />
            Label
          </button>

          {showPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
              <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-xl bg-white border border-gray-200 shadow-lg p-3 animate-fade-in">
                <p className="text-xs font-medium text-gray-500 mb-2">Add Label</p>

                {/* Custom label input */}
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Custom label..."
                    value={editingLabel?.name || ''}
                    onChange={e => setEditingLabel(prev => ({ name: e.target.value, color: prev?.color || '#8B5CF6' }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && editingLabel?.name.trim()) {
                        addLabel({ name: editingLabel.name.trim(), color: editingLabel.color });
                        setEditingLabel({ name: '', color: '#8B5CF6' });
                      }
                    }}
                    className="input-field text-sm flex-1"
                  />
                  <button
                    onClick={() => {
                      if (editingLabel?.name.trim()) {
                        addLabel({ name: editingLabel.name.trim(), color: editingLabel.color });
                        setEditingLabel({ name: '', color: '#8B5CF6' });
                      }
                    }}
                    className="btn-primary px-3 py-2 text-xs"
                    disabled={!editingLabel?.name.trim()}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Color picker for custom label */}
                {editingLabel && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {LABEL_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setEditingLabel(prev => ({ ...prev!, color }))}
                        className={`w-5 h-5 rounded-full transition-all ${
                          editingLabel.color === color ? 'ring-2 ring-offset-1 ring-gray-400 scale-125' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}

                {/* Preset labels */}
                <p className="text-xs font-medium text-gray-500 mb-2 mt-2">Presets</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_LABELS.map(label => {
                    const isActive = labels.find(l => l.name === label.name);
                    return (
                      <button
                        key={label.name}
                        onClick={() => {
                          if (isActive) {
                            removeLabel(label.name);
                          } else {
                            addLabel(label);
                          }
                        }}
                        className={`inline-flex items-center gap-1 rounded-full text-xs px-2 py-1 text-white transition-all ${
                          isActive ? 'opacity-50 ring-1 ring-white' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: label.color }}
                      >
                        {isActive ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                        {label.name}
                      </button>
                    );
                  })}
                </div>

                {/* Remove all labels */}
                {labels.length > 0 && (
                  <button
                    onClick={() => { onChange([]); setShowPicker(false); }}
                    className="mt-3 w-full text-xs text-red-400 hover:text-red-300 flex items-center justify-center gap-1 py-2 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove all labels
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
