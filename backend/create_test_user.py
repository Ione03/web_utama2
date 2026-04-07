#!/usr/bin/env python
"""
Quick script to create a test user for authentication testing in localhost.
Usage: python create_test_user.py
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'authbox.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile

def create_test_user():
    """Create or update test user with verified email"""
    
    username = 'testuser'
    email = 'test@example.com'
    password = 'testpass123'
    
    # Check if user exists
    try:
        user = User.objects.get(username=username)
        print(f"✓ User '{username}' already exists")
        user.set_password(password)
        user.save()
        print(f"✓ Password updated to: {password}")
    except User.DoesNotExist:
        # Create new user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        print(f"✓ Created user: {username}")
    
    # Verify email
    try:
        profile = UserProfile.objects.get(user=user)
        profile.email_verified = True
        profile.save()
        print(f"✓ Email verified for: {email}")
    except UserProfile.DoesNotExist:
        print(f"⚠ UserProfile not found - email verification may be required")
    
    print("\n" + "="*50)
    print("TEST USER CREDENTIALS")
    print("="*50)
    print(f"Username: {username}")
    print(f"Password: {password}")
    print(f"Email:    {email}")
    print("="*50)
    print("\nYou can now login at: http://localhost:5174/")
    print("Navigate to: Account → Login")
    print("\n⚠ Note: OTP will be printed in backend console during login")

if __name__ == '__main__':
    create_test_user()
