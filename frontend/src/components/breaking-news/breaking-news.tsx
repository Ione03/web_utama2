import { component$, useStylesScoped$ } from "@builder.io/qwik";

interface BreakingNewsItem {
    id: number;
    source: string;
    title: string;
    timeAgo: string;
    url?: string;
}

interface BreakingNewsProps {
    items: BreakingNewsItem[];
}

export const BreakingNews = component$<BreakingNewsProps>(({ items }) => {
    // Use useStylesScoped$ for component-specific styles
    useStylesScoped$(`
        @keyframes scroll {
            0% {
                transform: translateX(0);
            }
            100% {
                transform: translateX(-50%);
            }
        }
        .animate-scroll {
            animation: scroll 30s linear infinite;
        }
        .pause-animation:hover {
            animation-play-state: paused;
        }
    `);

    return (
        <div id="breakingnews" class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 py-2 mb-6 mt-4">
            {/* <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8"> */}
            <div class="flex items-center gap-4 overflow-hidden">
                {/* Breaking News Label */}
                <div class="flex items-center gap-2 flex-shrink-0">
                    <div class="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                        <span class="text-sm">📰</span>
                        <span>Berita Terkini</span>
                    </div>
                </div>

                {/* Scrolling News Ticker */}
                <div class="flex-1 overflow-hidden">
                    <div class="flex gap-6 animate-scroll hover:pause-animation">
                        {/* Duplicate items for seamless loop */}
                        {[...items, ...items].map((item, index) => (
                            <a
                                key={`${item.id}-${index}`}
                                href={item.url || `#news-${item.id}`}
                                class="flex items-center gap-2 whitespace-nowrap text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-shrink-0"
                            >
                                <span class="text-slate-400 dark:text-slate-500">•</span>
                                <span class="text-slate-900 dark:text-slate-100 font-medium">{item.title}</span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
            {/* </div> */}
        </div>
    );
});
