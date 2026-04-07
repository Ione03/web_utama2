# Django REST API Backend

A flexible content management backend built with Django REST Framework for the Qwik frontend.

## Features

- **Flexible Content Model**: Store different types of data (text, images, rich text) with a single unified model
- **Hierarchical Structure**: Self-referential parent-child relationships for nested content
- **Multi-site Support**: Built on Django's Sites framework
- **Rich Text Editor**: CKEditor 5 integration for textarea content
- **Image Management**: Generic relations for flexible image attachments
- **REST API**: Full CRUD operations via Django REST Framework
- **CORS Enabled**: Pre-configured for frontend communication
- **Admin Interface**: Comprehensive Django admin for content management

## Installation

1. **Create virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Run migrations**:
   ```bash
   python manage.py migrate
   ```

5. **Create superuser**:
   ```bash
   python manage.py createsuperuser
   ```

6. **Run development server**:
   ```bash
   python manage.py runserver
   ```

## API Endpoints

### Base URL
- Development: `http://localhost:8000/api/`
- Admin: `http://localhost:8000/admin/`

### Content Endpoints

- **List/Create Contents**: `GET/POST /api/contents/`
- **Retrieve/Update/Delete**: `GET/PUT/PATCH/DELETE /api/contents/{id}/`
- **Get Children**: `GET /api/contents/{id}/children/`
- **Get All Descendants**: `GET /api/contents/{id}/descendants/`
- **Find by Code**: `GET /api/contents/by_code/?code={code}&site={site_id}`

### Query Parameters

- `site`: Filter by site ID
- `code`: Filter by code
- `value_type`: Filter by value type (1=Text, 2=Image, 3=Textarea, 4=Icon, 5=UL, 6=NAV)
- `parent`: Filter by parent ID
- `is_active`: Filter active/inactive (true/false)
- `template_id`: Filter by template ID
- `root_only`: Get only root items (no parent) - use `?root_only=true`
- `search`: Search in code, value_text, value_textarea
- `ordering`: Order results (e.g., `order`, `-created_at`)

### Photo Endpoints

- **List/Create Photos**: `GET/POST /api/photos/`
- **Retrieve/Update/Delete**: `GET/PUT/PATCH/DELETE /api/photos/{id}/`

### Site Endpoints

- **List Sites**: `GET /api/sites/`
- **Retrieve Site**: `GET /api/sites/{id}/`

## Models

### Content Model

The main model for storing flexible content:

- `site`: ForeignKey to Site
- `code`: CharField for AJAX identification
- `value_type`: SmallIntegerField (1=Text, 2=Image, 3=Textarea, etc.)
- `value_text`: CharField for text/icon content
- `value_image`: GenericRelation to Photo
- `value_textarea`: CKEditor5Field for rich text
- `template_id`: CharField for template reference
- `parent`: Self-referential ForeignKey for hierarchy
- `order`: IntegerField for custom ordering
- `is_active`: BooleanField for status

### Photo Model

Generic image storage with ContentType:

- `content_type`: ForeignKey to ContentType
- `object_id`: PositiveIntegerField
- `image`: ImageField
- `title`: CharField
- `alt_text`: CharField

## Usage Examples

### Create Content (Text)
```javascript
fetch('http://localhost:8000/api/contents/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    site: 1,
    code: 'header-title',
    value_type: 1,
    value_text: 'Welcome to Our Site',
    is_active: true
  })
})
```

### Get Content by Code
```javascript
fetch('http://localhost:8000/api/contents/by_code/?code=header-title&site=1')
  .then(response => response.json())
  .then(data => console.log(data))
```

### Get Root Content Items
```javascript
fetch('http://localhost:8000/api/contents/?root_only=true')
  .then(response => response.json())
  .then(data => console.log(data))
```

### Create Hierarchical Content
```javascript
// Create parent
const parent = await fetch('http://localhost:8000/api/contents/', {
  method: 'POST',
  body: JSON.stringify({
    site: 1,
    code: 'main-nav',
    value_type: 6,
    is_active: true
  })
})

// Create child
const child = await fetch('http://localhost:8000/api/contents/', {
  method: 'POST',
  body: JSON.stringify({
    site: 1,
    code: 'nav-item-1',
    value_type: 1,
    value_text: 'Home',
    parent: parent.id,
    is_active: true
  })
})
```

## Development

### Running Tests
```bash
python manage.py test
```

### Create Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Collect Static Files
```bash
python manage.py collectstatic
```

## Tech Stack

- Django 5.0
- Django REST Framework 3.14
- django-cors-headers 4.3
- django-ckeditor-5 0.2
- python-decouple 3.8
- Pillow 10.0

## License

MIT
