from django.contrib import admin
from .models import (
    Photo, Content, Template, SiteMetadata,
    UserProfile, OTP
)


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'content_type', 'object_id', 'created_at']
    list_filter = ['content_type', 'created_at']
    search_fields = ['title', 'alt_text']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Content)
class ContentAdmin(admin.ModelAdmin):
    list_display = ['id', 'code', 'value_type', 'site', 'template', 'is_active', 'created_at']
    list_filter = ['value_type', 'is_active', 'site', 'template', 'created_at']
    search_fields = ['code', 'value_text']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['parent', 'template']


@admin.register(SiteMetadata)
class SiteMetadataAdmin(admin.ModelAdmin):
    list_display = ['site', 'site_title', 'created_at', 'updated_at']
    search_fields = ['site_title', 'site_tagline', 'meta_description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'email_verified', 'created_at', 'updated_at']
    list_filter = ['email_verified', 'created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['email_verification_token', 'created_at', 'updated_at']
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing an existing object
            return self.readonly_fields + ('user',)
        return self.readonly_fields


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ['user', 'code', 'purpose', 'is_used', 'is_valid_status', 'created_at', 'expires_at']
    list_filter = ['purpose', 'is_used', 'created_at']
    search_fields = ['user__username', 'code']
    readonly_fields = ['created_at']
    
    def is_valid_status(self, obj):
        return obj.is_valid()
    is_valid_status.boolean = True
    is_valid_status.short_description = 'Valid'
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing an existing object
            return self.readonly_fields + ('user', 'code', 'purpose')
        return self.readonly_fields
