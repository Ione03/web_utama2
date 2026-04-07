# SiteMetadata Model - Setup Instructions

## Overview
A new `SiteMetadata` model has been added to store website metadata including SEO tags, social media tags (Open Graph, Twitter), favicons, logos, and analytics codes.

## Database Migration

Run these commands in your backend directory:

```bash
cd backend

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate
```

## API Endpoints

### List all site metadata
```
GET /api/site-metadata/
```

### Get specific site metadata
```
GET /api/site-metadata/{id}/
```

### Get metadata by site ID or domain
```
GET /api/site-metadata/by_site/?site_id=1
GET /api/site-metadata/by_site/?domain=example.com
```

### Create site metadata
```
POST /api/site-metadata/
Content-Type: application/json

{
  "site": 1,
  "site_title": "My Awesome Site",
  "site_tagline": "The best site ever",
  "meta_description": "Welcome to my awesome website",
  "og_title": "My Awesome Site",
  "og_description": "Check out my awesome site",
  "theme_color": "#4285f4"
}
```

### Update site metadata
```
PUT/PATCH /api/site-metadata/{id}/
```

### Delete site metadata
```
DELETE /api/site-metadata/{id}/
```

## Model Fields

### Basic Information
- `site` - OneToOne relationship with Site
- `site_title` - Main website title
- `site_tagline` - Short tagline or slogan

### SEO Meta Tags
- `meta_description` - SEO meta description (150-160 chars)
- `meta_keywords` - Comma-separated keywords
- `canonical_url` - Canonical URL
- `robots` - Robots meta tag (default: "index, follow")

### Open Graph (Facebook, LinkedIn, etc.)
- `og_title` - Open Graph title
- `og_description` - Open Graph description
- `og_image` - Open Graph image (recommended: 1200x630px)
- `og_type` - Open Graph type (default: "website")

### Twitter Card
- `twitter_card` - Card type (summary, summary_large_image, app, player)
- `twitter_site` - Website Twitter handle
- `twitter_creator` - Content creator Twitter handle

### Branding Assets
- `favicon` - Website favicon (32x32px)
- `apple_touch_icon` - Apple touch icon (180x180px)
- `logo` - Website logo
- `theme_color` - Theme color for mobile browsers (hex code)

### Analytics & Verification
- `google_site_verification` - Google Search Console verification code
- `google_analytics_id` - Google Analytics tracking ID (e.g., G-XXXXXXXXXX)
- `facebook_app_id` - Facebook App ID

## Django Admin

The model is registered in Django admin with organized fieldsets:
- Site selection
- Basic Information
- SEO Meta Tags (collapsible)
- Open Graph (collapsible)
- Twitter Card (collapsible)
- Branding Assets (collapsible)
- Analytics & Verification (collapsible)

Access at: `http://localhost:8000/admin/api/sitemetadata/`

## Helper Methods

The model includes these helper methods:
- `get_og_title()` - Returns og_title or falls back to site_title
- `get_og_description()` - Returns og_description or falls back to meta_description
- `get_og_image_url()` - Returns full URL for og_image

## Example Usage in Frontend

```typescript
import { siteMetadataApi } from '~/services/api';

// Get metadata by domain
const metadata = await siteMetadataApi.getMetadataByDomain('example.com');

// Use in DocumentHead
export const head: DocumentHead = {
  title: metadata.site_title,
  meta: [
    {
      name: "description",
      content: metadata.meta_description,
    },
    {
      property: "og:title",
      content: metadata.get_og_title(),
    },
    {
      property: "og:image",
      content: metadata.og_image_url,
    },
  ],
};
```

## Notes

- One SiteMetadata per Site (OneToOne relationship)
- All image fields store files in `media/` directory
- Image URLs are automatically converted to full URLs in API responses
- Most fields are optional except `site`, `site_title`, and `meta_description`
