import os
from django.db import models
from django.contrib.sites.models import Site
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.utils.translation import gettext_lazy as _
from django_ckeditor_5.fields import CKEditor5Field
from django.contrib.auth.models import User
from django.utils import timezone
from .common import get_site_id
from django.dispatch import receiver
import secrets
import string


# Constants
exposed_request = None
LEN_NAME = 100
LEN_TITLE = 255


class OptValueType(models.IntegerChoices):
    """Value type choices for Content model"""
    # text only for, menu, label, caption, title on website
    TEXT = 1, _('Text-Only')
    # text with  image for, hero, banner, card, profile
    IMAGE = 2, _('Text-Image')
    # text with video for, video embed, video link
    VIDEO = 3, _('Text-Video')

    # TEXTAREA = 4, _('Textarea')
    # ICON = 5, _('Icon')
    # UL = 6, _('Unordered List')
    # NAV = 7, _('Navigation')


class ContentTypeChoice(models.IntegerChoices):
    """Content type choices for Content model"""
    LOGO = 1, _('Logo')
    SLIDESHOW = 2, _('Slideshow')
    CONTENT = 3, _('Content')
    NAVIGATION = 4, _('Navigation')
    FOOTER = 5, _('Footer')
    BANNER = 6, _('Banner')
    AVATAR = 7, _('Avatar')
    FAVICON = 8, _('Favicon')    
    PAGES = 9, _('Pages')    
    OTHER = 99, _('Other')


def site_image_path(instance, filename):
    """
    Generate file path for uploaded images:
    media/images/<site_id>/<original_filename>
    """
    # Ensure site_id exists on the instance
    # site_id = getattr(instance, 'site_id', None)
    # if not site_id:
    #     raise ValueError("site_id must be set before saving the image.")

    site_id = f'{get_site_id(exposed_request)}'
    print('site', site_id)

    folder_path = os.path.join('images', site_id)
    # print('Create Folder: ', folder_path)
    # os.makedirs(folder_path, exist_ok=True)

    # Sanitize filename to avoid unsafe characters
    base, ext = os.path.splitext(filename)
    safe_filename = f"{base.strip().replace(' ', '_')}{ext.lower()}"

    return f"{folder_path}/{safe_filename}"


class Photo(models.Model):
    """Generic photo model for storing images"""
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # upload_to='photos/%Y/%m/%d/'
    image = models.ImageField(_('image'), upload_to=site_image_path)
    title = models.CharField(_('title'), max_length=LEN_TITLE, blank=True)
    alt_text = models.CharField(_('alt text'), max_length=LEN_TITLE, blank=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('Photo')
        verbose_name_plural = _('Photos')
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title or f"Photo {self.id}"


class UserProfile(models.Model):
    """
    Extended user profile for email verification.
    One-to-one relationship with Django User model.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name=_('user')
    )
    
    email_verified = models.BooleanField(
        _('email verified'),
        default=False,
        help_text=_('Indicates if the user has verified their email address')
    )
    
    email_verification_token = models.CharField(
        _('email verification token'),
        max_length=100,
        blank=True,
        help_text=_('Token for email verification')
    )
    
    # Profile avatar
    avatar = models.ForeignKey(
        'Photo',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_avatars',
        verbose_name=_('avatar'),
        help_text=_('User profile avatar photo')
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('User Profile')
        verbose_name_plural = _('User Profiles')
    
    def __str__(self):
        return f"Profile for {self.user.username}"
    
    def generate_verification_token(self):
        """Generate a unique email verification token"""
        self.email_verification_token = secrets.token_urlsafe(32)
        self.save()
        return self.email_verification_token


class UserSettings(models.Model):
    """
    Flexible user application settings using key-value pairs.
    This EAV (Entity-Attribute-Value) pattern allows adding new settings
    without database migrations.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='settings',
        verbose_name=_('user')
    )
    
    site = models.ForeignKey(
        Site,
        on_delete=models.CASCADE,
        verbose_name=_('site')
    )
    
    setting_name = models.CharField(
        _('setting name'),
        max_length=100,
        help_text=_('Name of the setting (e.g., "show_hero", "hero_text_alignment")')
    )
    
    setting_value = models.TextField(
        _('setting value'),
        help_text=_('Value of the setting (stored as string or JSON)')
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('User Setting')
        verbose_name_plural = _('User Settings')
        unique_together = ['user', 'site', 'setting_name']
        indexes = [
            models.Index(fields=['user', 'site', 'setting_name']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.setting_name}: {self.setting_value}"
    
    @classmethod
    def get_setting(cls, user, site, setting_name, default=None):
        """Get a specific setting value for a user and site"""
        try:
            setting = cls.objects.get(user=user, site=site, setting_name=setting_name)
            return setting.setting_value
        except cls.DoesNotExist:
            return default
    
    @classmethod
    def set_setting(cls, user, site, setting_name, setting_value):
        """Set a specific setting value for a user and site"""
        setting, created = cls.objects.update_or_create(
            user=user,
            site=site,
            setting_name=setting_name,
            defaults={'setting_value': str(setting_value)}
        )
        return setting
    
    @classmethod
    def get_all_settings(cls, user, site):
        """Get all settings for a user and site as a dictionary"""
        settings = cls.objects.filter(user=user, site=site)
        return {s.setting_name: s.setting_value for s in settings}
    
    @classmethod
    def set_multiple_settings(cls, user, site, settings_dict):
        """Set multiple settings at once from a dictionary"""
        updated_settings = []
        for setting_name, setting_value in settings_dict.items():
            setting = cls.set_setting(user, site, setting_name, setting_value)
            updated_settings.append(setting)
        return updated_settings
    
    @classmethod
    def get_default_settings(cls):
        """Return default settings as a dictionary"""
        return {
            'show_hero': 'true',
            'show_external_content': 'false',
            'breaking_news_animation': 'default',
            'hero_text_alignment': 'center',
            'hero_button_label': 'Get Started',
            'custom_favicon_url': '',
        }


class OTPPurpose(models.TextChoices):
    """Purpose choices for OTP"""
    LOGIN = 'LOGIN', _('Login')
    PASSWORD_RESET = 'PASSWORD_RESET', _('Password Reset')


class OTP(models.Model):
    """
    One-Time Password model for two-factor authentication.
    Stores temporary codes sent to users via email.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='otps',
        verbose_name=_('user')
    )
    
    code = models.CharField(
        _('OTP code'),
        max_length=6,
        help_text=_('6-digit OTP code')
    )
    
    purpose = models.CharField(
        _('purpose'),
        max_length=20,
        choices=OTPPurpose.choices,
        default=OTPPurpose.LOGIN
    )
    
    is_used = models.BooleanField(
        _('is used'),
        default=False,
        help_text=_('Whether this OTP has been used')
    )
    
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    expires_at = models.DateTimeField(_('expires at'))
    
    class Meta:
        verbose_name = _('OTP')
        verbose_name_plural = _('OTPs')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'code', 'is_used']),
        ]
    
    def __str__(self):
        return f"OTP for {self.user.username} - {self.purpose}"
    
    def is_valid(self):
        """Check if OTP is still valid (not used and not expired)"""
        return not self.is_used and timezone.now() < self.expires_at
    
    @classmethod
    def generate_code(cls):
        """Generate a random 6-digit OTP code"""
        return ''.join(secrets.choice(string.digits) for _ in range(6))
    
    @classmethod
    def create_otp(cls, user, purpose=OTPPurpose.LOGIN, expiration_minutes=10):
        """Create a new OTP for a user"""
        from django.conf import settings
        
        # Invalidate all previous unused OTPs for this user and purpose
        cls.objects.filter(
            user=user,
            purpose=purpose,
            is_used=False
        ).update(is_used=True)
        
        # Create new OTP
        code = cls.generate_code()
        expires_at = timezone.now() + timezone.timedelta(
            minutes=getattr(settings, 'OTP_EXPIRATION_MINUTES', expiration_minutes)
        )
        
        return cls.objects.create(
            user=user,
            code=code,
            purpose=purpose,
            expires_at=expires_at
        )


class TrustedDevice(models.Model):
    """
    Model untuk menyimpan perangkat yang dipercaya.
    User tidak perlu OTP saat login dari perangkat ini selama 7 hari.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='trusted_devices',
        verbose_name=_('user')
    )
    
    device_fingerprint = models.CharField(
        _('device fingerprint'),
        max_length=255,
        help_text=_('Unique device identifier (IP + User Agent hash)')
    )
    
    trust_token = models.CharField(
        _('trust token'),
        max_length=64,
        unique=True,
        help_text=_('Token to identify this trusted device')
    )
    
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    expires_at = models.DateTimeField(_('expires at'))
    last_used_at = models.DateTimeField(_('last used at'), auto_now=True)
    
    class Meta:
        verbose_name = _('Trusted Device')
        verbose_name_plural = _('Trusted Devices')
        unique_together = ['user', 'device_fingerprint']
        indexes = [
            models.Index(fields=['user', 'device_fingerprint']),
            models.Index(fields=['trust_token']),
        ]
    
    def __str__(self):
        return f"Trusted device for {self.user.username}"
    
    def is_valid(self):
        """Check if trust is still valid"""
        return timezone.now() < self.expires_at
    
    @classmethod
    def create_trust(cls, user, device_fingerprint, days=7):
        """Create or update trusted device"""
        trust_token = secrets.token_urlsafe(48)
        expires_at = timezone.now() + timezone.timedelta(days=days)
        
        device, created = cls.objects.update_or_create(
            user=user,
            device_fingerprint=device_fingerprint,
            defaults={
                'trust_token': trust_token,
                'expires_at': expires_at
            }
        )
        return device


class Template(models.Model):
    """
    Template model for storing template names.
    Used by Content model to categorize content by template.
    """
    name = models.CharField(
        _('template name'),
        max_length=LEN_NAME,
        unique=True,
        help_text=_('Unique template name')
    )
    
    description = models.TextField(
        _('description'),
        blank=True,
        help_text=_('Template description')
    )
    
    is_active = models.BooleanField(_('active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('Template')
        verbose_name_plural = _('Templates')
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Content(models.Model):
    """
    Flexible content model for storing different types of data from frontend.
    Supports text, images, and rich text content with hierarchical structure.
    """
    site = models.ForeignKey(
        Site, 
        on_delete=models.CASCADE,
        verbose_name=_('site')
    )
    
    code = models.CharField(
        _('code'), 
        max_length=LEN_NAME,
        help_text=_('Code for AJAX identification')
    )
    
    slug = models.SlugField(
        _('slug'),
        max_length=LEN_TITLE,
        blank=True,
        help_text=_('SEO-friendly URL slug (auto-generated from title)')
    )
    
    url = models.CharField(
        _('url'),
        max_length=500,
        blank=True,
        null=True,
        help_text=_('Custom URL for navigation menu items')
    )
    
    # option only two: text or image
    value_type = models.SmallIntegerField(
        choices=OptValueType.choices, 
        verbose_name=_('value type')
    )
    
    # Content type categorization
    content_type = models.SmallIntegerField(
        choices=ContentTypeChoice.choices,
        default=ContentTypeChoice.OTHER,
        verbose_name=_('content type'),
        help_text=_('Type of content (logo, slideshow, content, etc.)')
    )
    
    # Page flag - distinguish pages from regular content
    is_page = models.BooleanField(
        _('is page'),
        default=False,
        help_text=_('Mark this content as a page (vs regular content/article)')
    )
    
    # For storing text and icon
    value_text = models.CharField(
        _('text'), 
        max_length=LEN_TITLE, 
        null=True, 
        blank=True
    )
    
    # For storing image (URL via GenericRelation)
    value_image = GenericRelation(
        Photo,
        related_query_name='content'
    )
    
    # For storing UL and NAV (pending for News, Article, Announcement)
    value_textarea = CKEditor5Field(
        _('value textarea'), 
        blank=True, 
        null=True,
        config_name='extends'
    )
    
    # For storing video URL
    value_video = models.URLField(
        _('video URL'),
        max_length=500,
        blank=True,
        null=True,
        help_text=_('Video URL (YouTube, Vimeo, or direct video link)')
    )
    
    # Template reference (ForeignKey to Template model)
    template = models.ForeignKey(
        Template,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contents',
        verbose_name=_('template'),
        help_text=_('Template reference')
    )
    
    # Self-referential parent relationship for hierarchical structure
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name=_('parent')
    )
    
    # Metadata fields
    order = models.IntegerField(_('order'), default=0)
    is_active = models.BooleanField(_('active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('Content')
        verbose_name_plural = _('Contents')
        ordering = ['order', '-created_at']
        indexes = [
            models.Index(fields=['site', 'code']),
            models.Index(fields=['site', 'slug']),
            models.Index(fields=['parent']),
            models.Index(fields=['value_type']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.get_value_type_display()}"
    
    def get_children(self):
        """Get all child content items"""
        return self.children.filter(is_active=True)
    
    def get_all_descendants(self):
        """Recursively get all descendants"""
        descendants = []
        for child in self.get_children():
            descendants.append(child)
            descendants.extend(child.get_all_descendants())
        return descendants

    def save(self, *args, **kwargs):
        # Auto-generate slug from value_text if not provided
        if not self.slug and self.value_text:
            from django.utils.text import slugify
            base_slug = slugify(self.value_text)
            slug = base_slug
            counter = 1
            # Ensure slug is unique within the site
            while Content.objects.filter(site=self.site, slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        
        if self.order == 0:
            # Auto-assign order if not set
            max_order = Content.objects.filter(
                site=self.site,
                parent=self.parent
            ).aggregate(models.Max('order'))['order__max'] or 0
            self.order = max_order + 1
        super().save(*args, **kwargs)   


class SiteMetadata(models.Model):
    """
    Metadata for website including SEO, social media tags, and branding assets.
    One-to-one relationship with Site model.
    """
    site = models.OneToOneField(
        Site,
        on_delete=models.CASCADE,
        related_name='metadata',
        verbose_name=_('site')
    )
    
    # Basic Website Info
    site_title = models.CharField(
        _('site title'),
        max_length=LEN_TITLE,
        help_text=_('Main website title (shown in browser tab)')
    )
    site_tagline = models.CharField(
        _('site tagline'),
        max_length=LEN_TITLE,
        blank=True,
        help_text=_('Short tagline or slogan')
    )
    
    # SEO Meta Tags
    meta_description = models.TextField(
        _('meta description'),
        max_length=160,
        help_text=_('SEO meta description (recommended: 150-160 characters)')
    )
    meta_keywords = models.CharField(
        _('meta keywords'),
        max_length=LEN_TITLE,
        blank=True,
        help_text=_('Comma-separated keywords for SEO')
    )
    
    # Open Graph (Facebook, LinkedIn, etc.)
    og_title = models.CharField(
        _('og:title'),
        max_length=LEN_TITLE,
        blank=True,
        help_text=_('Open Graph title (if different from site title)')
    )
    og_description = models.TextField(
        _('og:description'),
        max_length=200,
        blank=True,
        help_text=_('Open Graph description')
    )
    og_image = models.ImageField(
        _('og:image'),
        upload_to='og_images/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text=_('Open Graph image (recommended: 1200x630px)')
    )
    og_type = models.CharField(
        _('og:type'),
        max_length=50,
        default='website',
        help_text=_('Open Graph type (website, article, etc.)')
    )
    
    # Twitter Card
    twitter_card = models.CharField(
        _('twitter:card'),
        max_length=50,
        default='summary_large_image',
        choices=[
            ('summary', 'Summary'),
            ('summary_large_image', 'Summary Large Image'),
            ('app', 'App'),
            ('player', 'Player'),
        ],
        help_text=_('Twitter card type')
    )
    twitter_site = models.CharField(
        _('twitter:site'),
        max_length=100,
        blank=True,
        help_text=_('Twitter handle of website (e.g., @username)')
    )
    twitter_creator = models.CharField(
        _('twitter:creator'),
        max_length=100,
        blank=True,
        help_text=_('Twitter handle of content creator')
    )
    
    # Branding Assets
    favicon = models.ImageField(
        _('favicon'),
        upload_to='favicons/',
        blank=True,
        null=True,
        help_text=_('Website favicon (.ico or .png, recommended: 32x32px)')
    )
    apple_touch_icon = models.ImageField(
        _('apple touch icon'),
        upload_to='icons/',
        blank=True,
        null=True,
        help_text=_('Apple touch icon (recommended: 180x180px)')
    )
    logo = models.ImageField(
        _('logo'),
        upload_to='logos/',
        blank=True,
        null=True,
        help_text=_('Website logo')
    )
    
    # Additional Settings
    theme_color = models.CharField(
        _('theme color'),
        max_length=7,
        default='#ffffff',
        help_text=_('Theme color for mobile browsers (hex color code)')
    )
    canonical_url = models.URLField(
        _('canonical URL'),
        blank=True,
        help_text=_('Canonical URL for the site')
    )
    robots = models.CharField(
        _('robots'),
        max_length=100,
        default='index, follow',
        help_text=_('Robots meta tag content')
    )
    
    # Analytics and Verification
    google_site_verification = models.CharField(
        _('google site verification'),
        max_length=100,
        blank=True,
        help_text=_('Google Search Console verification code')
    )
    google_analytics_id = models.CharField(
        _('google analytics ID'),
        max_length=50,
        blank=True,
        help_text=_('Google Analytics tracking ID (e.g., G-XXXXXXXXXX)')
    )
    facebook_app_id = models.CharField(
        _('facebook app ID'),
        max_length=50,
        blank=True,
        help_text=_('Facebook App ID')
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('Site Metadata')
        verbose_name_plural = _('Site Metadata')
    
    def __str__(self):
        return f"Metadata for {self.site.domain}"
    
    def get_og_title(self):
        """Return og:title or fallback to site_title"""
        return self.og_title or self.site_title
    
    def get_og_description(self):
        """Return og:description or fallback to meta_description"""
        return self.og_description or self.meta_description
    
    def get_og_image_url(self):
        """Return full URL for og:image"""
        if self.og_image:
            return self.og_image.url
        return None


# @receiver(models.signals.post_delete, sender=dokumen)
@receiver(models.signals.post_delete, sender=Photo)
def auto_delete_file_on_delete(sender, instance, **kwargs):
    """
    Deletes file from filesystem
    when corresponding `MediaFile` object is deleted.
    """
    if instance.image:
        if os.path.isfile(instance.image.path):
            os.remove(instance.image.path)

# @receiver(models.signals.pre_save, sender=dokumen)
@receiver(models.signals.pre_save, sender=Photo)
def auto_delete_file_on_change(sender, instance, **kwargs):
    """
    Deletes old file from filesystem
    when corresponding `MediaFile` object is updated
    with new file.
    """
    if not instance.pk:
        return False

    try:
        old_file = sender.objects.get(pk=instance.pk).image
    except sender.DoesNotExist:
        return False

    new_file = instance.image
    if not old_file == new_file:
        if os.path.isfile(old_file.path):
            # img = Image.open(old_file.path)
            # if img: img.close() # pastikan image sudah di close (antisipasi error file is open by another process)
            os.remove(old_file.path)
    #post_delete.connect(file_cleanup, sender=photo, dispatch_uid="photo.file_cleanup")        
