"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ListWithItems, Item } from "@/lib/types";
import { Plus, ChevronDown, ChevronUp, Trash2, Search, CheckSquare, Share2 } from "lucide-react";
import { GROCERY_CATALOG } from "@/data/grocery-catalog";
import SharePanel from "./share-panel";
import Modal from "@/components/ui/modal";

type Suggestion = {
  id: string;
  name: string;
  category: string;
  source: "history" | "catalog";
  confidence?: string | null;
};

interface ListCardProps {
  list: ListWithItems;
  completed?: boolean;
  onFinish?: () => void;
  onRefresh?: () => void;
  userId?: string;
  onDelete?: (list: ListWithItems) => void;
  expanded?: boolean;
  onToggleExpand?: (id: string) => void;
}

export default function ListCard({
  list: initialList,
  completed = false,
  onFinish,
  onRefresh,
  userId,
  onDelete,
  expanded: expandedProp,
  onToggleExpand,
}: ListCardProps) {
  const [list, setList] = useState<ListWithItems>(initialList);
  const [isFinishing, setIsFinishing] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Other");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [expandedState, setExpandedState] = useState(false);
  const [suppressNextSuggestions, setSuppressNextSuggestions] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const supabase = createClient();
  const isTemp = typeof list.id === "string" && list.id.startsWith("temp-");

  const titleText = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(list.created_at));
  const isExpanded = expandedProp ?? expandedState;
  const toggleExpanded = () => {
    if (onToggleExpand) onToggleExpand(list.id);
    else setExpandedState((e) => !e);
  };
  const isOwner = userId ? list.user_id === userId : false;

  const formatDateTime = (iso?: string | null) =>
    iso
      ? new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(iso))
      : "";

  // Sync local state with prop changes
  useEffect(() => {
    setList(initialList);
  }, [initialList]);

  const handleFinishList = async () => {
    if (isFinishing || !onFinish) return;

    setIsFinishing(true);
    try {
      await onFinish();
    } finally {
      setIsFinishing(false);
    }
  };

  const handleToggleItem = async (item: Item) => {
    // Mark item as updating
    setUpdatingItems((prev) => new Set([...prev, item.id]));

    // Optimistic update - update UI immediately
    const newCheckedAt = item.checked_at ? null : new Date().toISOString();
    const updatedItems = list.items.map((listItem) =>
      listItem.id === item.id
        ? { ...listItem, checked_at: newCheckedAt }
        : listItem
    );
    setList({ ...list, items: updatedItems });

    try {
      const { error } = await supabase
        .from("items")
        .update({
          checked_at: newCheckedAt,
        })
        .eq("id", item.id);

      if (error) throw error;
      // Also update the parent component if needed
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error toggling item:", error);
      // Revert the optimistic update on error
      setList(initialList);
      if (onRefresh) onRefresh();
    } finally {
      // Remove item from updating state
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Remove "${itemName}" from the list?`)) return;
    try {
      const { error } = await supabase.from("items").delete().eq("id", itemId);
      if (error) throw error;
      if (onRefresh) onRefresh();
      // Optimistically remove from local state
      setList((prev) => ({
        ...prev,
        items: prev.items.filter((i) => i.id !== itemId),
      }));
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleAddItem = async () => {
    const name = newItemName.trim();
    if (!name || !userId) return;
    try {
      const { data, error } = await supabase
        .from("items")
        .insert([
          {
            list_id: list.id,
            user_id: userId,
            name,
            category: newItemCategory || "Other",
          },
        ])
        .select("*")
        .single();
      if (error) throw error;
      setNewItemName("");
      setNewItemCategory("Other");
      setSuggestions([]);
      setShowSuggestions(false);
      // Optimistically add locally
      setList((prev) => ({ ...prev, items: [...prev.items, data as Item] }));
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleCheckAll = async () => {
    const unchecked = list.items.filter((i) => !i.checked_at);
    if (unchecked.length === 0) return;
    const now = new Date().toISOString();
    // Optimistic update
    const prev = list;
    setList((prevList) => ({
      ...prevList,
      items: prevList.items.map((i) =>
        i.checked_at ? i : { ...i, checked_at: now }
      ),
    }));
    try {
      const { error } = await supabase
        .from("items")
        .update({ checked_at: now })
        .eq("list_id", list.id)
        .is("checked_at", null);
      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (e) {
      // Revert on error
      setList(prev);
      console.error("Error checking all items:", e);
    }
  };

  // Autocomplete suggestions based on item_predictions
  useEffect(() => {
    if (!userId) return;
    const q = newItemName.trim();
    let cancelled = false;

    // Suppress suggestions once after selecting a suggestion
    if (suppressNextSuggestions) {
      setSuppressNextSuggestions(false);
      setSuggestions([]);
      setShowSuggestions(false);
      setLoadingSuggestions(false);
      return;
    }

    // If input is empty, clear and hide suggestions
    if (q.length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoadingSuggestions(false);
      return;
    }

    const doFetch = async () => {
      setLoadingSuggestions(true);
      try {
        // Local catalog first (filter by query when length >= 1)
        const qLower = q.toLowerCase();
        const local = GROCERY_CATALOG.filter((ci) =>
          ci.name.toLowerCase().includes(qLower)
        )
          .slice(0, 12)
          .map((ci) => ({
            id: `local-${ci.name}`,
            name: ci.name,
            category: ci.category,
            source: "catalog" as const,
            confidence: null,
          }));

        // Remote history only for length >= 2 to reduce noise
        let remote: Suggestion[] = [];
        if (q.length >= 2) {
          const { data, error } = await supabase
            .from("item_predictions")
            .select("id,name,category,confidence,frequency")
            .eq("user_id", userId)
            .ilike("name", `%${q}%`)
            .order("frequency", { ascending: false })
            .limit(8);
          if (error) throw error;
          remote = (data || []).map((d: { id: string; name: string; category: string; confidence: string | null; frequency: number }) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            source: "history" as const,
            confidence: d.confidence ?? null,
          }));
        }

        if (cancelled) return;
        // Merge, de-dupe by name+category, prioritize history first
        const merged: Record<string, Suggestion> = {};
        for (const s of [...remote, ...local]) {
          merged[`${s.name}|${s.category}`] = s;
        }
        const list = Object.values(merged).slice(0, 12);
        setSuggestions(list);
        setShowSuggestions(list.length > 0);
      } catch (e) {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    };

    const timer = setTimeout(doFetch, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [newItemName, userId, supabase]);

  const handlePickSuggestion = (s: Suggestion) => {
    // Prevent the immediate effect cycle from reopening suggestions
    setSuppressNextSuggestions(true);
    setSuggestions([]);
    setShowSuggestions(false);
    setNewItemName(s.name);
    setNewItemCategory(s.category);
  };

  const handleDeleteList = async () => {
    if (completed) return;
    const confirmed = confirm(
      `Delete list "${list.title}"? This cannot be undone.`
    );
    if (!confirmed) return;
    if (typeof onDelete === "function") {
      // Let parent handle optimistic delete + server call
      onDelete(list);
      return;
    }
    try {
      const { error } = await supabase.from("lists").delete().eq("id", list.id);
      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error deleting list:", error);
    }
  };

  const checkedItems = list.items.filter((item) => item.checked_at);
  const uncheckedItems = list.items.filter((item) => !item.checked_at);
  const progress =
    list.items.length > 0 ? (checkedItems.length / list.items.length) * 100 : 0;

  return (
    <div
      className={`bg-white rounded-lg border shadow-sm p-3 sm:p-4 ${
        completed ? "opacity-75" : ""
      } w-full`}
    >
      <div 
        className="flex items-center justify-between mb-2 cursor-pointer hover:bg-gray-50/50 rounded-lg p-2 -m-2 transition-colors"
        onClick={toggleExpanded}
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
            {titleText}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {list.items.length} items
            </span>
            {checkedItems.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {checkedItems.length} checked
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            className="text-xs border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-2 sm:px-2 sm:py-1 rounded inline-flex items-center gap-1 min-h-[36px] sm:min-h-0"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span className="hidden sm:inline">Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span className="hidden sm:inline">Expand</span>
              </>
            )}
          </button>
          {isOwner ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShareOpen(true);
              }}
              className="text-xs border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-2 sm:px-2 sm:py-1 rounded inline-flex items-center gap-1 min-h-[36px] sm:min-h-0"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
          ) : (
            <button
              disabled
              className="text-xs border border-gray-200 text-gray-400 px-3 py-2 sm:px-2 sm:py-1 rounded inline-flex items-center gap-1 cursor-not-allowed min-h-[36px] sm:min-h-0"
              title="Shared"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Shared</span>
            </button>
          )}
          {!completed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteList();
              }}
              className="text-xs border border-red-200 text-red-700 hover:bg-red-50 px-3 py-2 sm:px-2 sm:py-1 rounded inline-flex items-center gap-1 disabled:opacity-50 min-h-[36px] sm:min-h-0"
              title="Delete list"
              disabled={isTemp}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="mb-2">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-green-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {list.items.length > 0 && (
              <p className="text-[10px] text-gray-600 mt-1">
                {Math.round(progress)}% complete
              </p>
            )}
          </div>

          {/* Action buttons - moved to top for better mobile UX */}
          <div className="relative mb-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                onClick={handleCheckAll}
                disabled={isTemp || uncheckedItems.length === 0}
                className="text-xs border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-2 sm:px-2 sm:py-1 rounded inline-flex items-center justify-center gap-1 disabled:opacity-50 min-h-[40px] sm:min-h-0"
                title="Check all items"
              >
                <CheckSquare className="w-4 h-4" />
                Check All
              </button>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onFocus={() =>
                    suggestions.length > 0 && setShowSuggestions(true)
                  }
                  onBlur={() => setShowSuggestions(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowSuggestions(false);
                  }}
                  placeholder="Add item…"
                  className="w-full px-3 py-2 sm:px-2 sm:py-1 border border-gray-300 rounded text-sm disabled:bg-gray-50 pr-8 min-h-[40px] sm:min-h-0"
                  disabled={isTemp}
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3 sm:right-2 top-1/2 -translate-y-1/2" />
              </div>
              <button
                onClick={handleAddItem}
                disabled={!newItemName.trim() || isTemp}
                className="text-xs bg-blue-600 text-white px-3 py-2 sm:px-2 sm:py-1 rounded inline-flex items-center justify-center gap-1 disabled:opacity-50 min-h-[40px] sm:min-h-0"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded shadow-sm max-h-56 overflow-auto">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePickSuggestion(s)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-gray-800 truncate">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {s.category}
                      </div>
                    </div>
                    {s.source === "history" && (
                      <div className="text-[10px] text-gray-400 ml-2 shrink-0">
                        {s.confidence}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1 max-h-56 overflow-auto pr-1 mb-2">
            {list.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => handleToggleItem(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    handleToggleItem(item);
                }}
              >
                <label className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={!!item.checked_at}
                    onChange={() => handleToggleItem(item)}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    disabled={updatingItems.has(item.id)}
                  />
                  <span
                    className={`text-sm truncate ${
                      item.checked_at
                        ? "line-through text-gray-500"
                        : "text-gray-700"
                    }`}
                  >
                    {item.name}
                  </span>
                  {item.predicted && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">
                      auto
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500">
                    {item.checked_at
                      ? `Checked ${formatDateTime(item.checked_at)}`
                      : `Added ${formatDateTime(item.created_at)}`}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id, item.name);
                    }}
                    className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                    title="Remove item"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {list.items.length === 0 && (
              <p className="text-xs text-gray-500">No items yet.</p>
            )}
          </div>
        </>
      )}

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share List">
        <SharePanel listId={list.id} isOwner={isOwner} onChanged={onRefresh} />
      </Modal>
    </div>
  );
}
