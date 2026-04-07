# Authentication Testing Guide

## ✅ Test User Already Created!

**Credentials:**
- **Username:** `testuser`
- **Password:** `testpass123`
- **Email:** `test@example.com`

## How to Login for Testing Edit/Delete

### Step 1: Navigate to the Site
Open http://localhost:5174/ in your browser

### Step 2: Open Login Modal
Click **Account** → **Login** in the navigation menu

### Step 3: Enter Credentials
- Username: `testuser`
- Password: `testpass123`
- reCAPTCHA: (if enabled in development, might auto-pass)

### Step 4: Enter OTP
**IMPORTANT:** Check the **backend terminal** where Django is running!

The OTP code will be printed like this:
```
========================================
OTP for testuser: 123456
========================================
```

Copy the 6-digit code and enter it in the modal.

### Step 5: You're Logged In! 🎉

Now you can:
- **Edit slideshow slides:** Hover over any hero image → Click "Edit Slide"
- **Delete content:** Open edit mode → Click red "Delete" button

## Troubleshooting

**Can't see OTP in terminal?**
- Make sure Django dev server is running: `cd backend && python manage.py runserver`
- OTP is printed to console during development

**Login not working?**
- Verify test user exists:
  ```bash
  cd backend
  python manage.py shell -c "from django.contrib.auth.models import User; print(User.objects.filter(username='testuser').exists())"
  ```

**Need to recreate user?**
Run in backend directory:
```bash
python manage.py shell <<'EOF'
from django.contrib.auth.models import User
User.objects.filter(username='testuser').delete()
User.objects.create_user('testuser', 'test@example.com', 'testpass123')
print("✓ Test user recreated")
EOF
```

## Testing the Edit/Delete Features

Once logged in:

### Test Edit:
1. Hover over hero slideshow image
2. "Edit Slide" button appears (top-right)
3. Click it
4. Modal opens with existing content
5. Make changes
6. Click "Update Content"
7. ✅ Changes saved!

### Test Delete:
1. Edit a slide
2. Click red "🗑️ Delete" button (bottom-left)
3. Confirm deletion
4. ✅ Content deleted!

### Test Unauthenticated Access:
1. Logout (click username → Logout)
2. Hover over slideshow
3. ✅ No edit buttons should appear
