import { component$, useSignal, $, type PropFunction, useStore, useVisibleTask$ } from "@builder.io/qwik";
import type { MenuItem } from "./desktop-menu";

interface MenuManagerModalProps {
    isOpen: boolean;
    onClose$: PropFunction<() => void>;
    onUpdate$: PropFunction<() => void>;
}

type EditorMode = 'list' | 'create' | 'edit';
type MenuLocation = 'top' | 'bottom';

interface EditorState {
    mode: EditorMode;
    location: MenuLocation; // Which menu location we're editing
    parentId: string | null; // Encrypted parent ID for creating children
    parentCode: string | null; // For display purpose
    currentId: string | null; // Encrypted ID for editing
    currentCode: string | null; // Code for identifying item to update/delete

    // Form data
    formData: {
        value_text: string;
        url: string;
        order: number;
    };
    isLoading: boolean;
    error: string | null;
}

export const MenuManagerModal = component$<MenuManagerModalProps>(({ isOpen, onClose$, onUpdate$ }) => {
    const menuItems = useStore<{ items: MenuItem[] }>({ items: [] });
    const editor = useStore<EditorState>({
        mode: 'list',
        location: 'top', // Default to top menu
        parentId: null,
        parentCode: null,
        currentId: null,
        currentCode: null,
        formData: {
            value_text: '',
            url: '',
            order: 0
        },
        isLoading: false,
        error: null
    });

    // Drag and drop state
    const dragState = useStore<{
        draggedItem: MenuItem | null;
        dragOverItem: MenuItem | null;
    }>({
        draggedItem: null,
        dragOverItem: null
    });

    // Track if changes were made
    const hasChanges = useSignal(false);

    const refreshMenu = $(async () => {
        try {
            editor.isLoading = true;
            const endpoint = editor.location === 'top'
                ? '/api/contents/navigation/top/'
                : '/api/contents/navigation/bottom/';

            const response = await fetch(endpoint, {
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    menuItems.items = await response.json();
                } else {
                    console.warn("Navigation API returned non-JSON response, skipping refresh");
                }
            } else {
                console.error("Failed to fetch menu:", response.status, response.statusText);
            }
        } catch (error) {
            console.error("Failed to fetch menu:", error);
            // Don't show error to user, just log it
        } finally {
            editor.isLoading = false;
        }
    });

    useVisibleTask$(({ track }) => {
        track(() => isOpen);
        if (isOpen) {
            refreshMenu();
            editor.mode = 'list';
            editor.error = null;
            hasChanges.value = false; // Reset changes tracker when opening
        } else if (hasChanges.value) {
            // Modal is closing and there were changes - trigger parent refresh
            onUpdate$();
        }
    });

    const handleDelete = $(async (code: string) => {
        if (!confirm("Are you sure you want to delete this menu item and all its children?")) return;

        try {
            editor.isLoading = true;
            const response = await fetch('/api/contents/delete_by_code/', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || '' // basic CSRF handling
                },
                body: JSON.stringify({ code: code })
            });

            if (response.ok) {
                hasChanges.value = true; // Mark that changes were made
                await refreshMenu();
            } else {
                const data = await response.json();
                alert(`Error: ${data.error || 'Failed to delete'}`);
            }
        } catch (e) {
            console.error(e);
            alert("An error occurred");
        } finally {
            editor.isLoading = false;
        }
    });

    const handleSave = $(async () => {
        try {
            editor.isLoading = true;
            editor.error = null;

            let url = '/api/contents/update_by_code/';
            let method = 'PATCH';

            if (editor.mode === 'create') {
                url = '/api/contents/create_navigation/';
                method = 'POST';
            }

            let body: any = {
                value_text: editor.formData.value_text,
                slug: editor.formData.value_text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
                url: editor.formData.url,
                order: editor.formData.order,
                content_type: 4, // Navigation
                value_type: 1, // Text
            };

            if (editor.mode === 'create') {
                if (editor.parentId) {
                    body.parent = editor.parentId; // Encrypted parent ID
                } else {
                    // Root item - assign to location container
                    body.location = editor.location; // 'top' or 'bottom'
                }
            } else {
                // Edit
                body.code = editor.currentCode; // Encrypted code for update_by_code
            }

            console.log("DEBUG: Saving menu item", { url, method, body });

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || ''
                },
                body: JSON.stringify(body)
            });

            console.log("DEBUG: Response status:", response.status, response.statusText);
            console.log("DEBUG: Response ok:", response.ok);

            if (response.ok) {
                const responseData = await response.json();
                console.log("DEBUG: Save success, response data:", responseData);
                hasChanges.value = true; // Mark that changes were made
                // Switch to list mode - menu will refresh when modal closes
                editor.mode = 'list';
                // Try to refresh menu, but don't fail if it errors
                try {
                    await refreshMenu();
                } catch (e) {
                    console.warn("Menu refresh failed, will refresh on modal close:", e);
                }
            } else {
                const data = await response.json();
                console.error("DEBUG: Save failed", data);
                editor.error = typeof data === 'string' ? data : (data.error || JSON.stringify(data));
            }
        } catch (e) {
            console.error("DEBUG: Save exception", e);
            editor.error = "An error occurred";
        } finally {
            editor.isLoading = false;
        }
    });

    const openCreate = $((parentId: string | null = null, parentCode: string | null = null) => {
        editor.mode = 'create';
        editor.parentId = parentId;
        editor.parentCode = parentCode;
        editor.formData = {
            value_text: '',
            url: '',
            order: 0
        };
        editor.error = null;
    });

    const openEdit = $((item: MenuItem) => {
        editor.mode = 'edit';
        editor.currentId = item.encrypted_id;
        editor.currentCode = item.encrypted_code;
        editor.formData = {
            value_text: item.value_text,
            url: item.url || item.slug || '',
            order: item.order || 0 // Load actual order from item
        };
        editor.error = null;
    });

    // Handle drag and drop reordering
    const handleReorder = $(async (draggedItem: MenuItem, targetItem: MenuItem, items: MenuItem[]) => {
        try {
            editor.isLoading = true;

            // Find indices
            const dragIndex = items.findIndex(i => i.encrypted_id === draggedItem.encrypted_id);
            const targetIndex = items.findIndex(i => i.encrypted_id === targetItem.encrypted_id);

            if (dragIndex === -1 || targetIndex === -1) return;

            // Create new array with reordered items
            const newItems = [...items];
            const [removed] = newItems.splice(dragIndex, 1);

            // Insert after target position, adjusting for removal
            let insertIndex = targetIndex;
            if (dragIndex < targetIndex) {
                // If dragging down, insert at target index (which shifts down after removal)
                insertIndex = targetIndex;
            } else {
                // If dragging up, insert after target index
                insertIndex = targetIndex + 1;
            }
            newItems.splice(insertIndex, 0, removed);

            // Reassign order values with spacing (0, 10, 20, 30...)
            const updates = newItems.map((item, index) => ({
                code: item.encrypted_code,
                order: index * 10
            }));

            // Batch update orders
            for (const update of updates) {
                await fetch('/api/contents/update_by_code/', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || ''
                    },
                    body: JSON.stringify({
                        code: update.code,
                        order: update.order
                    })
                });
            }

            // Refresh menu to show updated order
            hasChanges.value = true; // Mark that changes were made
            await refreshMenu();
        } catch (error) {
            console.error('Failed to reorder:', error);
            editor.error = 'Failed to reorder items';
        } finally {
            editor.isLoading = false;
            dragState.draggedItem = null;
            dragState.dragOverItem = null;
        }
    });

    // Recursive render function for list
    const renderTree = (items: MenuItem[], depth = 0) => {
        return (
            <ul class="space-y-2">
                {items.map(item => (
                    <li
                        key={item.encrypted_id}
                        draggable={true}
                        onDragStart$={(e) => {
                            dragState.draggedItem = item;
                            const target = e.currentTarget as HTMLElement;
                            if (target) {
                                target.style.opacity = '0.4';
                                target.style.cursor = 'grabbing';
                            }
                        }}
                        onDragEnd$={(e) => {
                            const target = e.currentTarget as HTMLElement;
                            if (target) {
                                target.style.opacity = '1';
                                target.style.cursor = 'grab';
                            }
                            dragState.draggedItem = null;
                            dragState.dragOverItem = null;
                        }}
                        onDragOver$={(e) => {
                            e.preventDefault();
                            dragState.dragOverItem = item;
                        }}
                        onDragLeave$={() => {
                            if (dragState.dragOverItem?.encrypted_id === item.encrypted_id) {
                                dragState.dragOverItem = null;
                            }
                        }}
                        onDrop$={(e) => {
                            e.preventDefault();
                            if (dragState.draggedItem && dragState.draggedItem.encrypted_id !== item.encrypted_id) {
                                handleReorder(dragState.draggedItem, item, items);
                            }
                        }}
                        class={`cursor-grab transition-all duration-200 ${dragState.dragOverItem?.encrypted_id === item.encrypted_id && dragState.draggedItem && dragState.draggedItem.encrypted_id !== item.encrypted_id
                            ? 'border-t-4 border-purple-500 pt-2'
                            : ''
                            }`}
                    >
                        <div class={`flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 border-2 transition-all ${dragState.draggedItem?.encrypted_id === item.encrypted_id
                            ? 'border-purple-300 shadow-lg'
                            : 'border-gray-200'
                            }`}>
                            <div class="flex items-center gap-3">
                                {/* Drag Handle - More prominent */}
                                <div class="flex flex-col gap-0.5 text-gray-400 hover:text-purple-600 transition-colors px-1">
                                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                                        <circle cx="4" cy="4" r="1.5" />
                                        <circle cx="4" cy="8" r="1.5" />
                                        <circle cx="4" cy="12" r="1.5" />
                                        <circle cx="12" cy="4" r="1.5" />
                                        <circle cx="12" cy="8" r="1.5" />
                                        <circle cx="12" cy="12" r="1.5" />
                                    </svg>
                                </div>
                                <span class="text-xs text-gray-400 font-mono min-w-[35px]">#{item.order}</span>
                                <span class="font-medium text-gray-800">{item.value_text}</span>
                                <span class="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">{item.url || item.slug}</span>
                            </div>
                            <div class="flex gap-2">
                                <button
                                    onClick$={() => openCreate(item.encrypted_id, item.value_text)}
                                    class="p-1 text-green-600 hover:text-green-800 text-xs font-bold"
                                    title="Add Sub-item"
                                >
                                    + Sub
                                </button>
                                <button
                                    onClick$={() => openEdit(item)}
                                    class="p-1 text-blue-600 hover:text-blue-800 text-xs"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick$={() => handleDelete(item.encrypted_code)}
                                    class="p-1 text-red-600 hover:text-red-800 text-xs"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                        {item.children && item.children.length > 0 && (
                            <div class="ml-6 mt-2 border-l-2 border-gray-200 pl-2">
                                {renderTree(item.children, depth + 1)}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        );
    };

    if (!isOpen) return null;

    return (
        <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick$={onClose$}>
            <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col m-4" onClick$={(e) => e.stopPropagation()}>
                {/* Header */}
                <div class="flex justify-between items-center p-6 border-b">
                    <div>
                        <h2 class="text-xl font-bold">Manage Navigation Menu</h2>
                        <p class="text-sm text-gray-500">Add, edit, or remove menu items</p>
                    </div>
                    <button onClick$={onClose$} class="text-gray-500 hover:text-gray-700">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div class="p-6 overflow-y-auto flex-1">
                    {/* Location Tabs - only show in list mode */}
                    {editor.mode === 'list' && (
                        <div class="flex gap-2 mb-4 border-b border-gray-200">
                            <button
                                onClick$={$(async () => {
                                    editor.location = 'top';
                                    await refreshMenu();
                                })}
                                class={`px-4 py-2 font-medium transition ${editor.location === 'top'
                                    ? 'text-purple-600 border-b-2 border-purple-600'
                                    : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                Top Menu (Navigation Bar)
                            </button>
                            <button
                                onClick$={$(async () => {
                                    editor.location = 'bottom';
                                    await refreshMenu();
                                })}
                                class={`px-4 py-2 font-medium transition ${editor.location === 'bottom'
                                    ? 'text-purple-600 border-b-2 border-purple-600'
                                    : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                Bottom Menu (Footer)
                            </button>
                        </div>
                    )}

                    {editor.error && (
                        <div class="mb-4 bg-red-50 text-red-700 p-3 rounded text-sm">
                            {editor.error}
                        </div>
                    )}

                    {editor.mode === 'list' && (
                        <div class="space-y-4">
                            <div class="flex justify-end">
                                <button
                                    onClick$={() => openCreate(null)}
                                    class="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 flex items-center gap-1"
                                >
                                    <span>+</span> Add Root Item
                                </button>
                            </div>

                            {menuItems.items.length === 0 ? (
                                <div class="text-center py-8 text-gray-400">
                                    No menu items. Click "Add Root Item" to start.
                                </div>
                            ) : (
                                renderTree(menuItems.items)
                            )}
                        </div>
                    )}

                    {(editor.mode === 'create' || editor.mode === 'edit') && (
                        <div class="space-y-4">
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="text-lg font-semibold">
                                    {editor.mode === 'create'
                                        ? `Add Item ${editor.parentCode ? `under "${editor.parentCode}"` : '(Root)'}`
                                        : 'Edit Item'}
                                </h3>
                                <button onClick$={() => editor.mode = 'list'} class="text-sm text-gray-500 hover:underline">
                                    Back to list
                                </button>
                            </div>

                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Label</label>
                                    <input
                                        type="text"
                                        value={editor.formData.value_text}
                                        onInput$={(e) => {
                                            const val = (e.target as HTMLInputElement).value;
                                            editor.formData.value_text = val;
                                        }}
                                        class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                                        placeholder="e.g. Services"
                                    />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">URL</label>
                                    <input
                                        type="text"
                                        value={editor.formData.url}
                                        onInput$={(e) => editor.formData.url = (e.target as HTMLInputElement).value}
                                        class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                                        placeholder="e.g. /, #about, /pages/faq, /detail/slug"
                                    />
                                    <p class="text-xs text-gray-500 mt-1">Supports: root (/), anchors (#about), pages (/pages/faq), or full URLs</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Order</label>
                                    <input
                                        type="number"
                                        value={editor.formData.order}
                                        onInput$={(e) => editor.formData.order = parseInt((e.target as HTMLInputElement).value)}
                                        class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div class="pt-4 flex justify-end gap-2">
                                <button
                                    onClick$={() => editor.mode = 'list'}
                                    class="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                                    disabled={editor.isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick$={handleSave}
                                    class="px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-700 flex items-center gap-2"
                                    disabled={editor.isLoading}
                                >
                                    {editor.isLoading && (
                                        <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    )}
                                    Save
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
