#!/usr/bin/env python
"""
Quick script to create a test site
Run with: python create_site.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.sites.models import Site

# Create or get the site
site, created = Site.objects.get_or_create(
    domain='example.com',
    defaults={'name': 'Example Site'}
)

if created:
    print(f"✓ Created new site: {site.domain} (ID: {site.id})")
else:
    print(f"✓ Site already exists: {site.domain} (ID: {site.id})")

# List all sites
print("\nAll sites in database:")
for s in Site.objects.all():
    print(f"  - ID: {s.id}, Domain: {s.domain}, Name: {s.name}")
