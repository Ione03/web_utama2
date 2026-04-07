import { component$, Signal } from "@builder.io/qwik";

interface ContentType {
    id: string;
    label: string;
    icon: string;
    description: string;
}

const contentTypes: ContentType[] = [
    {
        id: 'text_image',
        label: 'Text + Image',
        icon: '🖼️',
        description: 'Text and content required, image optional'
    },
    {
        id: 'video',
        label: 'Text + Video',
        icon: '🎬',
        description: 'Text, content, and video URL required'
    },
];

interface ContentTypeSelectorProps {
    selectedType: Signal<string>;
    disabled?: boolean;
    editMode?: boolean;
}

export const ContentTypeSelector = component$<ContentTypeSelectorProps>(({ selectedType, disabled = false, editMode = false }) => {
    return (
        <div class="flex gap-2">
            {contentTypes.map((type) => {
                // In edit mode, disable the other type (not the selected one)
                const isDisabled = disabled || (editMode && type.id !== selectedType.value);

                return (
                    <button
                        key={type.id}
                        type="button"
                        title={type.description}
                        disabled={isDisabled}
                        onClick$={() => {
                            if (!isDisabled) {
                                selectedType.value = type.id;
                            }
                        }}
                        class={`px-3 py-1.5 rounded-lg border-2 transition-all ${isDisabled
                            ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-100'
                            : 'hover:scale-105 cursor-pointer'
                            } ${selectedType.value === type.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                    >
                        <div class="flex items-center gap-1">
                            <span class="text-base">{type.icon}</span>
                            <span class="font-semibold text-xs whitespace-nowrap">{type.label}</span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
});
