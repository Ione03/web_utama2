// API service for Django REST API backend

// Dynamic API base URL configuration
// In development: use localhost:8000
// In production: use the same origin as the frontend
const getApiBaseUrl = (): string => {
    if (typeof window === 'undefined') {
        // Server-side rendering - default to localhost
        return 'http://localhost:8000/api';
    }

    // Check if running on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8000/api';
    }

    // Production: use current origin
    return `${window.location.origin}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// Export base URL for use in other components (e.g., image URLs)
export const getApiBaseOrigin = (): string => {
    if (typeof window === 'undefined') {
        return 'http://localhost:8000';
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8000';
    }

    return window.location.origin;
};

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Value type choices for Content model
 */
export enum OptValueType {
    TEXT = 1,       // Text
    IMAGE = 2,      // Image
    VIDEO = 3,      // Video   
    // ICON = 4,       // Icon
    // UL = 5,         // Unordered List
    // NAV = 6,        // Navigation
}

/**
 * Content type choices for Content model
 */
export enum ContentTypeChoice {
    LOGO = 1,       // Logo
    SLIDESHOW = 2,  // Slideshow
    CONTENT = 3,    // Content
    NAVIGATION = 4, // Navigation
    FOOTER = 5,     // Footer
    BANNER = 6,     // Banner
    AVATAR = 7,     // Avatar
    FAVICON = 8,    // Favicon    
    OTHER = 99,     // Other
}

/**
 * Photo model interface
 */
export interface Photo {
    id?: number;
    content_type: number;
    object_id: string;
    image: string;
    title: string;
    alt_text: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Photo form data for create/update operations
 */
export interface PhotoFormData {
    content_type: number;
    object_id: number;
    image: File | string;
    title?: string;
    alt_text?: string;
}

/**
 * Template model interface
 */
export interface Template {
    id?: number;
    name: string;
    description?: string;
    is_active: boolean;
    content_count?: number;
    created_at?: string;
    updated_at?: string;
}

/**
 * Template form data for create/update operations
 */
export interface TemplateFormData {
    name: string;
    description?: string;
    is_active?: boolean;
}

/**
 * Content model interface
 */
export interface Content {
    id?: number;
    site?: number;
    code: string;
    encrypted_code?: string;
    slug?: string;
    value_type: OptValueType;
    content_type?: ContentTypeChoice;
    value_text?: string;
    value_image?: Photo[];
    images?: Photo[];  // Alias for value_image from serializer
    value_textarea?: string;
    template?: number;
    template_name?: string;
    parent?: number;
    order: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    children?: Content[];
}

/**
 * Content form data for create/update operations
 */
export interface ContentFormData {
    // site: number;
    code: string;
    slug?: string;
    value_type: OptValueType;
    content_type?: ContentTypeChoice;
    value_text?: string;
    value_image?: string;
    value_textarea?: string;
    template?: number;
    parent?: number;
    order?: number;
    is_active?: boolean;
}

/**
 * Query parameters for filtering content
 */
export interface ContentQueryParams {
    site?: number;
    code?: string;
    value_type?: OptValueType;
    content_type?: ContentTypeChoice;
    parent?: number;
    template?: number;
    is_active?: boolean;
    root_only?: boolean;
    search?: string;
    ordering?: string;
    page_size?: number;
}

// ============================================================================
// Template Service
// ============================================================================

class TemplateService {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Get all templates
     */
    async getTemplates(params?: { is_active?: boolean }): Promise<Template[]> {
        try {
            let url = `${this.baseUrl}/templates/`;

            if (params?.is_active !== undefined) {
                url += `?is_active=${params.is_active}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching templates:', error);
            throw error;
        }
    }

    /**
     * Get a single template by ID
     */
    async getTemplate(id: number): Promise<Template> {
        try {
            const response = await fetch(`${this.baseUrl}/templates/${id}/`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching template ${id}:`, error);
            throw error;
        }
    }

    /**
     * Create a new template
     */
    async createTemplate(data: TemplateFormData): Promise<Template> {
        try {
            const response = await fetch(`${this.baseUrl}/templates/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }
            return await response.json();
        } catch (error) {
            console.error('Error creating template:', error);
            throw error;
        }
    }

    /**
     * Update an existing template
     */
    async updateTemplate(id: number, data: TemplateFormData): Promise<Template> {
        try {
            const response = await fetch(`${this.baseUrl}/templates/${id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }
            return await response.json();
        } catch (error) {
            console.error(`Error updating template ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete a template
     */
    async deleteTemplate(id: number): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/templates/${id}/`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error(`Error deleting template ${id}:`, error);
            throw error;
        }
    }
}

// ============================================================================
// Content Service
// ============================================================================

class PhotoService {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Get all photos
     */
    async getPhotos(): Promise<Photo[]> {
        try {
            const response = await fetch(`${this.baseUrl}/photos/`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching photos:', error);
            throw error;
        }
    }

    /**
     * Get a single photo by ID
     */
    async getPhoto(id: number): Promise<Photo> {
        try {
            const response = await fetch(`${this.baseUrl}/photos/${id}/`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching photo ${id}:`, error);
            throw error;
        }
    }

    /**
     * Create a new photo
     */
    async createPhoto(data: PhotoFormData): Promise<Photo> {
        try {
            const formData = new FormData();

            // from django.contrib.contenttypes.models import ContentType
            // ContentType.objects.get_for_model(Content).id   

            formData.append('content_type', data.content_type.toString());
            formData.append('object_id', data.object_id.toString());


            console.log('FORMDATA', formData);

            if (data.image instanceof File) {
                formData.append('image', data.image);
            }

            if (data.title) {
                formData.append('title', data.title);
            }

            if (data.alt_text) {
                formData.append('alt_text', data.alt_text);
            }

            const response = await fetch(`${this.baseUrl}/photos/`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating photo:', error);
            throw error;
        }
    }

    /**
     * Update an existing photo
     */
    async updatePhoto(id: number, data: Partial<PhotoFormData>): Promise<Photo> {
        try {
            const formData = new FormData();

            if (data.content_type !== undefined) {
                formData.append('content_type', data.content_type.toString());
            }

            if (data.object_id !== undefined) {
                formData.append('object_id', data.object_id.toString());
            }

            if (data.image instanceof File) {
                formData.append('image', data.image);
            }

            if (data.title !== undefined) {
                formData.append('title', data.title);
            }

            if (data.alt_text !== undefined) {
                formData.append('alt_text', data.alt_text);
            }

            const response = await fetch(`${this.baseUrl}/photos/${id}/`, {
                method: 'PATCH',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            return await response.json();
        } catch (error) {
            console.error(`Error updating photo ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete a photo
     */
    async deletePhoto(id: number): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/photos/${id}/`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error(`Error deleting photo ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get photos by object_id
     */
    async getPhotoByObjectId(object_id: string): Promise<Photo[]> {
        try {
            const response = await fetch(`${this.baseUrl}/photos/?object_id=${object_id}`);
            if (!response.ok) {
                console.error(`Error fetching photos: HTTP ${response.status} for object_id ${object_id}`);
                // Return empty array instead of throwing to prevent modal from breaking
                return [];
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching photos by object_id ${object_id}:`, error);
            // Return empty array instead of throwing
            return [];
        }
    }

    /**
     * Delete a photo by object_id
     */
    async deletePhotoByObjectId(object_id: number): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/photos/delete-by-object-id/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ object_id }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error(`Error deleting photo by object_id ${object_id}:`, error);
            throw error;
        }
    }

    /**
     * Get ContentType ID for Content model
     */
    async getContentTypeId(): Promise<number> {
        try {
            const response = await fetch(`${this.baseUrl}/photos/content-type-id/`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.content_type_id;
        } catch (error) {
            console.error('Error fetching content type ID:', error);
            throw error;
        }
    }
}

// ============================================================================
// Content Service
// ============================================================================

class ContentService {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Build query string from parameters
     */
    private buildQueryString(params: ContentQueryParams): string {
        const queryParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                queryParams.append(key, value.toString());
            }
        });

        return queryParams.toString();
    }

    /**
     * Get all contents with optional filtering
     */
    async getContents(params?: ContentQueryParams): Promise<Content[]> {
        try {
            let url = `${this.baseUrl}/contents/`;

            if (params) {
                const queryString = this.buildQueryString(params);
                if (queryString) {
                    url += `?${queryString}`;
                }
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching contents:', error);
            throw error;
        }
    }

    /**
     * Get a single content by ID
     */
    async getContent(id: number): Promise<Content> {
        try {
            const response = await fetch(`${this.baseUrl}/contents/${id}/`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error fetching content ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get content by code and site
     */
    async getContentByCode(code: string): Promise<Content | null> {
        try {
            const response = await fetch(
                `${this.baseUrl}/contents/by_code/?code=${code}`
            );

            // Return null if not found (404)
            if (response.status === 404) {
                console.log(`Content not found for code: ${code}`);
                return null;
            }

            // Throw error for other HTTP errors so components can handle them
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error fetching content by code ${code}:`, error);
            throw error;
        }
    }

    /**
     * Get content by slug
     */
    async getContentBySlug(slug: string): Promise<Content | null> {
        try {
            const response = await fetch(
                `${this.baseUrl}/contents/by_slug/?slug=${encodeURIComponent(slug)}`
            );

            // Return null if not found (404)
            if (response.status === 404) {
                console.log(`Content not found for slug: ${slug}`);
                return null;
            }

            // Throw error for other HTTP errors
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error fetching content by slug ${slug}:`, error);
            throw error;
        }
    }

    /**
     * Get children of a content item
     */
    async getChildren(id: number): Promise<Content[]> {
        try {
            const response = await fetch(`${this.baseUrl}/contents/${id}/children/`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error fetching children of content ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get all descendants of a content item
     */
    async getDescendants(id: number): Promise<Content[]> {
        try {
            const response = await fetch(`${this.baseUrl}/contents/${id}/descendants/`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error fetching descendants of content ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get only root content items (items without a parent)
     */
    async getRootContents(params?: Omit<ContentQueryParams, 'root_only'>): Promise<Content[]> {
        return this.getContents({ ...params, root_only: true });
    }

    /**
     * Create a new content
     */
    async createContent(data: ContentFormData): Promise<Content> {
        try {
            const response = await fetch(`${this.baseUrl}/contents/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating content:', error);
            throw error;
        }
    }

    /**
     * Custom post action to retrieve content by encrypted code
     */
    async createContentCustom(data: ContentFormData): Promise<{ message: string; data: Content }> {
        try {
            const response = await fetch(`${this.baseUrl}/contents/custom_post/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            return await response.json();
        } catch (error) {
            console.error('Error in custom post:', error);
            throw error;
        }
    }

    /**
     * Update an existing content (full update)
     */
    async updateContent(id: number, data: ContentFormData): Promise<Content> {
        console.log('Updating content with data:', JSON.stringify(data), id);
        try {
            const response = await fetch(`${this.baseUrl}/contents/${id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            return await response.json();
        } catch (error) {
            console.error(`Error updating content ${id}:`, error);
            throw error;
        }
    }

    /**
     * Partially update an existing content
     */
    async patchContent(id: number, data: Partial<ContentFormData>): Promise<Content> {
        try {
            const response = await fetch(`${this.baseUrl}/contents/${id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            return await response.json();
        } catch (error) {
            console.error(`Error patching content ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete a content
     */
    async deleteContent(id: number): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/contents/${id}/`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error(`Error deleting content ${id}:`, error);
            throw error;
        }
    }

    /**
     * Update content by code (full update)
     */
    async updateContentByCode(code: string, data: ContentFormData): Promise<Content> {
        console.log('Updating content by code:', code, 'with data:', JSON.stringify(data));
        try {
            const response = await fetch(`${this.baseUrl}/contents/update_by_code/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...data, code }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            return await response.json();
        } catch (error) {
            console.error(`Error updating content by code ${code}:`, error);
            throw error;
        }
    }

    /**
     * Partially update content by code
     */
    async patchContentByCode(code: string, site: number, data: Partial<ContentFormData>): Promise<Content> {
        console.log('Patching content by code:', code, 'with data:', JSON.stringify(data));
        try {
            const response = await fetch(`${this.baseUrl}/contents/update_by_code/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...data, code, site }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            return await response.json();
        } catch (error) {
            console.error(`Error patching content by code ${code}:`, error);
            throw error;
        }
    }

    /**
     * Delete content by encrypted code
     */
    async deleteContentByCode(code: string): Promise<void> {
        console.log('Deleting content by code:', code);
        try {
            const response = await fetch(`${this.baseUrl}/contents/delete_by_code/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }
        } catch (error) {
            console.error(`Error deleting content by code ${code}:`, error);
            throw error;
        }
    }
}

// ============================================================================
// Site Service
// ============================================================================

export interface Site {
    id: number;
    domain: string;
    name: string;
}

class SiteService {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Get all sites
     */
    async getSites(): Promise<Site[]> {
        try {
            const response = await fetch(`${this.baseUrl}/sites/`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching sites:', error);
            throw error;
        }
    }

    /**
     * Get a single site by ID
     */
    async getSite(id: number): Promise<Site> {
        try {
            const response = await fetch(`${this.baseUrl}/sites/${id}/`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error fetching site ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get site ID by domain name
     */
    async getSiteByDomain(domain: string): Promise<Site> {
        try {
            const response = await fetch(
                `${this.baseUrl}/sites/?search=${encodeURIComponent(domain)}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // console.log('API response:', data);
            // console.log('Response type:', typeof data);
            // console.log('Is array:', Array.isArray(data));

            // Handle different response formats
            let sites: Site[];
            sites = data.results;

            // if (Array.isArray(data)) {
            //     sites = data;
            // } else if (data.results && Array.isArray(data.results)) {
            //     // Handle paginated response
            //     sites = data.results;
            // } else if (typeof data === 'object' && data.id) {
            //     // Single site object
            //     return data.id;
            // } else {
            //     console.error('Unexpected response format:', data);
            //     throw new Error(`Unexpected API response format`);
            // }

            // Try to find exact domain match first, otherwise use first result
            const site = sites.find(s => s.domain === domain) || sites[0];

            if (!site) {
                throw new Error(`Site with domain '${domain}' not found`);
            }

            return site;
        } catch (error) {
            console.error(`Error fetching site by domain ${domain}:`, error);
            throw error;
        }
    }
}

// ============================================================================
// Site Metadata Interface and Service
// ============================================================================

/**
 * Site Metadata interface for SEO, social media, and branding
 */
export interface SiteMetadata {
    id?: number;
    site: number;
    site_domain?: string;

    // Basic Information
    site_title: string;
    site_tagline?: string;

    // SEO Meta Tags
    meta_description: string;
    meta_keywords?: string;
    canonical_url?: string;
    robots?: string;

    // Open Graph
    og_title?: string;
    og_description?: string;
    og_image?: string;
    og_image_url?: string;
    og_type?: string;

    // Twitter Card
    twitter_card?: string;
    twitter_site?: string;
    twitter_creator?: string;

    // Branding Assets
    favicon?: string;
    favicon_url?: string;
    apple_touch_icon?: string;
    apple_touch_icon_url?: string;
    logo?: string;
    logo_url?: string;
    theme_color?: string;

    // Analytics & Verification
    google_site_verification?: string;
    google_analytics_id?: string;
    facebook_app_id?: string;

    // Timestamps
    created_at?: string;
    updated_at?: string;
}

/**
 * Site Metadata form data for create/update operations
 */
export interface SiteMetadataFormData {
    site: number;
    site_title: string;
    site_tagline?: string;
    meta_description: string;
    meta_keywords?: string;
    og_title?: string;
    og_description?: string;
    og_image?: File | string;
    og_type?: string;
    twitter_card?: string;
    twitter_site?: string;
    twitter_creator?: string;
    favicon?: File | string;
    apple_touch_icon?: File | string;
    logo?: File | string;
    theme_color?: string;
    canonical_url?: string;
    robots?: string;
    google_site_verification?: string;
    google_analytics_id?: string;
    facebook_app_id?: string;
}

class SiteMetadataService {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Get all site metadata
     */
    async getSiteMetadata(params?: { site?: number }): Promise<SiteMetadata[]> {
        try {
            let url = `${this.baseUrl}/site-metadata/`;

            if (params?.site) {
                url += `?site=${params.site}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching site metadata:', error);
            throw error;
        }
    }

    /**
     * Get a single site metadata by ID
     */
    async getMetadata(id: number): Promise<SiteMetadata> {
        try {
            const response = await fetch(`${this.baseUrl}/site-metadata/${id}/`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error fetching metadata ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get metadata by site ID or domain
     */
    async getMetadataByDomain(domain: string): Promise<SiteMetadata> {
        try {
            const response = await fetch(
                `${this.baseUrl}/site-metadata/by_site/?domain=${encodeURIComponent(domain)}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            let Metas: SiteMetadata[];
            Metas = data.results;

            // if (Array.isArray(data)) {
            //     Metas = data;
            // } else if (data.results && Array.isArray(data.results)) {
            //     // Handle paginated response
            //     Metas = data.results;
            // } else if (typeof data === 'object' && data.id) {
            //     // Single site object
            //     return data.id;
            // } else {
            //     console.error('Unexpected response format:', data);
            //     throw new Error(`Unexpected API response format`);
            // }

            // Try to find exact domain match first, otherwise use first result
            // const meta = Metas.find(s => s.domain === domain) || Metas[0];
            const meta = Metas[0];

            if (!meta) {
                throw new Error(`Site with domain '${domain}' not found`);
            }

            return meta;

        } catch (error) {
            console.error(`Error fetching metadata by domain ${domain}:`, error);
            throw error;
        }
    }

    /**
     * Get metadata by site ID
     */
    async getMetadataBySiteId(siteId: number): Promise<SiteMetadata> {
        try {
            const response = await fetch(
                `${this.baseUrl}/site-metadata/by_site/?site_id=${siteId}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error fetching metadata by site ID ${siteId}:`, error);
            throw error;
        }
    }

    /**
     * Create new site metadata
     */
    async createMetadata(data: SiteMetadataFormData): Promise<SiteMetadata> {
        try {
            const formData = new FormData();

            // Add all text fields
            formData.append('site', data.site.toString());
            formData.append('site_title', data.site_title);
            formData.append('meta_description', data.meta_description);

            // Add optional text fields
            if (data.site_tagline) formData.append('site_tagline', data.site_tagline);
            if (data.meta_keywords) formData.append('meta_keywords', data.meta_keywords);
            if (data.og_title) formData.append('og_title', data.og_title);
            if (data.og_description) formData.append('og_description', data.og_description);
            if (data.og_type) formData.append('og_type', data.og_type);
            if (data.twitter_card) formData.append('twitter_card', data.twitter_card);
            if (data.twitter_site) formData.append('twitter_site', data.twitter_site);
            if (data.twitter_creator) formData.append('twitter_creator', data.twitter_creator);
            if (data.theme_color) formData.append('theme_color', data.theme_color);
            if (data.canonical_url) formData.append('canonical_url', data.canonical_url);
            if (data.robots) formData.append('robots', data.robots);
            if (data.google_site_verification) formData.append('google_site_verification', data.google_site_verification);
            if (data.google_analytics_id) formData.append('google_analytics_id', data.google_analytics_id);
            if (data.facebook_app_id) formData.append('facebook_app_id', data.facebook_app_id);

            // Add image files
            if (data.og_image instanceof File) formData.append('og_image', data.og_image);
            if (data.favicon instanceof File) formData.append('favicon', data.favicon);
            if (data.apple_touch_icon instanceof File) formData.append('apple_touch_icon', data.apple_touch_icon);
            if (data.logo instanceof File) formData.append('logo', data.logo);

            const response = await fetch(`${this.baseUrl}/site-metadata/`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating metadata:', error);
            throw error;
        }
    }

    /**
     * Update site metadata
     */
    async updateMetadata(id: number, data: Partial<SiteMetadataFormData>): Promise<SiteMetadata> {
        try {
            const formData = new FormData();

            // Add all provided fields
            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (value instanceof File) {
                        formData.append(key, value);
                    } else {
                        formData.append(key, value.toString());
                    }
                }
            });

            const response = await fetch(`${this.baseUrl}/site-metadata/${id}/`, {
                method: 'PATCH',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            return await response.json();
        } catch (error) {
            console.error(`Error updating metadata ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete site metadata
     */
    async deleteMetadata(id: number): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/site-metadata/${id}/`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error(`Error deleting metadata ${id}:`, error);
            throw error;
        }
    }
}


// ============================================================================
// Authentication Service
// ============================================================================

/**
 * Captcha data interface
 */
export interface CaptchaData {
    key: string;
    image_url: string;
}

/**
 * Login credentials interface
 */
export interface LoginCredentials {
    username: string;
    password: string;
    captchaKey: string;
    captchaValue: string;
}

/**
 * OTP verification interface
 */
export interface OTPVerification {
    username: string;
    otp: string;
    remember_device?: boolean;  // Optional, default true
}

/**
 * User interface for authenticated user
 */
export interface AuthUser {
    id: number;
    username: string;
    email: string;
    email_verified: boolean;
    avatar_url?: string | null;
}

/**
 * Login response interface
 */
export interface LoginResponse {
    skip_otp: boolean;          // If true, OTP was skipped (trusted device)
    message: string;
    username?: string;          // Returned when OTP is needed
    email_verified?: boolean;   // Returned when OTP is needed
    user?: AuthUser;            // Returned when skip_otp is true
}

/**
 * OTP verification response interface
 */
export interface OTPVerificationResponse {
    message: string;
    trust_token?: string;       // Token to remember this device
    user: AuthUser;
}

class AuthService {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Get new captcha from backend
     */
    async getCaptcha(): Promise<CaptchaData> {
        try {
            const response = await fetch(`${this.baseUrl}/auth/captcha/refresh/`);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error fetching captcha:', error);
            throw error;
        }
    }

    /**
     * Initial login with username, password, and Django captcha
     */
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/auth/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
                credentials: 'include', // Important for session cookies
            });

            // Check if response is actually JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response:', text.substring(0, 200));
                throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}. Please check backend.`);
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error during login:', error);
            if (error instanceof Error && error.message.includes('JSON')) {
                throw new Error('Server error: Please check if backend is running correctly');
            }
            throw error;
        }
    }

    /**
     * Verify OTP code to complete login
     */
    async verifyOTP(data: OTPVerification): Promise<OTPVerificationResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/auth/verify-otp/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                credentials: 'include', // Important for session cookies
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
            }

            return responseData;
        } catch (error) {
            console.error('Error verifying OTP:', error);
            throw error;
        }
    }

    /**
     * Resend OTP code
     */
    async resendOTP(username: string): Promise<{ message: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/auth/resend-otp/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username }),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error resending OTP:', error);
            throw error;
        }
    }

    /**
     * Get current authenticated user
     */
    async getCurrentUser(): Promise<AuthUser> {
        try {
            const response = await fetch(`${this.baseUrl}/auth/user/`, {
                method: 'GET',
                credentials: 'include', // Important for session cookies
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting current user:', error);
            throw error;
        }
    }

    /**
     * Logout and destroy session
     */
    async logout(): Promise<{ message: string }> {
        try {
            // Get CSRF token from cookie
            const getCookie = (name: string) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop()?.split(';').shift();
                return '';
            };

            const csrfToken = getCookie('csrftoken');

            const response = await fetch(`${this.baseUrl}/auth/logout/`, {
                method: 'POST',
                credentials: 'include', // Important for session cookies
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken && { 'X-CSRFToken': csrfToken }),
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error during logout:', error);
            throw error;
        }
    }

    /**
     * Register a new user account
     */
    async register(data: { email: string; password: string; password_confirm: string }): Promise<{ message: string; email: string; username: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/auth/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                credentials: 'include',
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
            }

            return responseData;
        } catch (error) {
            console.error('Error during registration:', error);
            throw error;
        }
    }

    /**
     * Request password reset OTP
     */
    async forgotPassword(email: string): Promise<{ message: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/auth/forgot-password/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error requesting password reset:', error);
            throw error;
        }
    }

    /**
     * Reset password with OTP
     */
    async resetPassword(data: { email: string; otp: string; new_password: string; password_confirm: string }): Promise<{ message: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/auth/reset-password/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                credentials: 'include',
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
            }

            return responseData;
        } catch (error) {
            console.error('Error resetting password:', error);
            throw error;
        }
    }
}

// ============================================================================
// User Settings Service
// ============================================================================

class UserSettingsService {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Get all settings for current user
     */
    async getUserSettings(): Promise<{ settings: Record<string, string> }> {
        try {
            const response = await fetch(`${this.baseUrl}/user-settings/all/`, {
                method: 'GET',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching user settings:', error);
            throw error;
        }
    }

    /**
     * Update multiple settings at once
     */
    async updateUserSettings(settings: Record<string, string>): Promise<{ settings: Record<string, string> }> {
        try {
            const response = await fetch(`${this.baseUrl}/user-settings/bulk_update/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ settings }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating user settings:', error);
            throw error;
        }
    }

    /**
     * Get a specific setting value
     */
    async getSetting(settingName: string): Promise<{ setting_name: string; setting_value: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/user-settings/get/${settingName}/`, {
                method: 'GET',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error fetching setting ${settingName}:`, error);
            throw error;
        }
    }

    /**
     * Set a specific setting value
     */
    async setSetting(settingName: string, settingValue: string): Promise<{ setting_name: string; setting_value: string; message: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/user-settings/set/${settingName}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ setting_value: settingValue }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            return await response.json();
        } catch (error) {
            console.error(`Error setting ${settingName}:`, error);
            throw error;
        }
    }
}

// ============================================================================
// UserProfile Service
// ============================================================================

export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
}

export interface PhotoData {
    id: number;
    image: string;
    image_url: string;
    title: string;
    alt_text: string;
}

export interface UserProfile {
    id: number;
    user: User;
    email_verified: boolean;
    avatar: number | null;  // Photo ID
    avatar_data: PhotoData | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface UserProfileUpdateData {
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    avatar?: number | null;
}

class UserProfileService {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Get current user's profile
     */
    async getCurrentProfile(): Promise<UserProfile> {
        try {
            const response = await fetch(`${this.baseUrl}/user-profile/current/`, {
                method: 'GET',
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    }

    /**
     * Update current user's profile
     */
    async updateCurrentProfile(data: UserProfileUpdateData): Promise<UserProfile> {
        try {
            const response = await fetch(`${this.baseUrl}/user-profile/update_current/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }
}

// ============================================================================
// Export Service Instances
// ============================================================================

export const templateApi = new TemplateService(API_BASE_URL);
export const photoApi = new PhotoService(API_BASE_URL);
export const contentApi = new ContentService(API_BASE_URL);
export const siteApi = new SiteService(API_BASE_URL);
export const siteMetadataApi = new SiteMetadataService(API_BASE_URL);
export const authApi = new AuthService(API_BASE_URL);
export const userSettingsApi = new UserSettingsService(API_BASE_URL);
export const userProfileApi = new UserProfileService(API_BASE_URL);
