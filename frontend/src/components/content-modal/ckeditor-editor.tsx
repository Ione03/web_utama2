import { component$, useSignal, useVisibleTask$, type Signal } from "@builder.io/qwik";
import 'ckeditor5/ckeditor5.css';

interface CKEditorProps {
    content: Signal<string>;
    placeholder?: string;
}

export const CKEditorComponent = component$<CKEditorProps>(({ content, placeholder = "Start writing..." }) => {
    const editorRef = useSignal<HTMLElement>();
    const editorInstance = useSignal<any | null>(null);
    const isInitialized = useSignal(false);
    const isUpdating = useSignal(false);

    // Initialize CKEditor when component mounts
    useVisibleTask$(async ({ track, cleanup }) => {
        if (!editorRef.value) return;

        // Only initialize once
        if (!isInitialized.value) {
            try {
                // Dynamic import to prevent SSR issues
                const { ClassicEditor, Essentials, Bold, Italic, Paragraph, Heading, Link, List } = await import('ckeditor5');

                const editor = await ClassicEditor.create(editorRef.value, {
                    licenseKey: 'GPL', // Using GPL license for open source
                    plugins: [Essentials, Bold, Italic, Paragraph, Heading, Link, List],
                    toolbar: {
                        items: ['heading', '|', 'bold', 'italic', 'link', '|', 'bulletedList', 'numberedList', '|', 'undo', 'redo']
                    },
                    placeholder,
                    heading: {
                        options: [
                            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                            { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                            { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                            { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
                        ]
                    }
                });

                editorInstance.value = editor;
                isInitialized.value = true;

                // Sync content changes to signal
                editor.model.document.on('change:data', () => {
                    if (!isUpdating.value) {
                        content.value = editor.getData();
                    }
                });

                // Set initial content
                if (content.value) {
                    editor.setData(content.value);
                }

                cleanup(() => {
                    if (editor) {
                        editor.destroy().catch((error: any) => {
                            console.error('Error destroying editor:', error);
                        });
                        editorInstance.value = null;
                        isInitialized.value = false;
                    }
                });
            } catch (error) {
                console.error('Error initializing CKEditor:', error);
            }
        }
    });

    // Track content changes and update editor
    useVisibleTask$(({ track }) => {
        const newContent = track(() => content.value);

        if (editorInstance.value && isInitialized.value) {
            const currentData = editorInstance.value.getData();
            // Only update if content actually changed and it's different from editor
            if (currentData !== newContent) {
                isUpdating.value = true;
                editorInstance.value.setData(newContent || '');
                // Small delay to ensure the change event doesn't fire
                setTimeout(() => {
                    isUpdating.value = false;
                }, 100);
            }
        }
    });

    return (
        <div class="border border-gray-300 rounded-lg overflow-hidden bg-white">
            <div ref={editorRef} class="min-h-[300px]" />
        </div>
    );
});
