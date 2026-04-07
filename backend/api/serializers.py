from rest_framework import serializers
from django.contrib.sites.models import Site
from django.contrib.auth.models import User
from .models import Photo, Content, SiteMetadata, Template, UserSettings, UserProfile
from .encryption import encrypt_data


class PhotoSerializer(serializers.ModelSerializer):
    """Serializer for Photo model"""
    image_url = serializers.SerializerMethodField()
    # Accept object_id as CharField to allow encrypted strings
    # The actual decryption and conversion to int happens in perform_create
    object_id = serializers.CharField()
    
    class Meta:
        model = Photo
        fields = ['id', 'content_type', 'object_id', 'image', 'image_url', 'title', 'alt_text', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_image_url(self, obj):
        """Get full URL for image"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class TemplateSerializer(serializers.ModelSerializer):
    """Serializer for Template model"""
    content_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Template
        fields = ['id', 'name', 'description', 'is_active', 'content_count', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_content_count(self, obj):
        """Count number of contents using this template"""
        return obj.contents.count()


class ContentSerializer(serializers.ModelSerializer):
    """Serializer for Content model with nested relationships"""
    encrypted_id = serializers.SerializerMethodField()
    encrypted_site_id = serializers.SerializerMethodField()
    site_name = serializers.CharField(source='site.name', read_only=True)
    value_type_display = serializers.CharField(source='get_value_type_display', read_only=True)
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)
    images = PhotoSerializer(source='value_image', many=True, read_only=True)
    children = serializers.SerializerMethodField()
    parent_code = serializers.CharField(source='parent.code', read_only=True, allow_null=True)
    encrypted_template_id = serializers.SerializerMethodField()
    template_name = serializers.CharField(source='template.name', read_only=True, allow_null=True)
    encrypted_code = serializers.SerializerMethodField()
    parent_id = serializers.SerializerMethodField()
    # code berikut adalah kode konten berikutnya berdasarkan urutan
    next_code = serializers.SerializerMethodField() 
    # index gambar dalam konten
    # default image ada 3 gambar, jadi indexnya 0,1,2
    image_index = serializers.SerializerMethodField()
    
    class Meta:
        model = Content
        fields = [
            'encrypted_id', 'encrypted_site_id', 'site_name', 
            'encrypted_code', 'slug', 'url', 'next_code', 'image_index', 'value_type', 'value_type_display', 
            'content_type', 'content_type_display', 'is_page', 'children', 
            'value_text', 'value_textarea', 'value_video', 'encrypted_template_id', 'template_name', 'parent_id', 'parent_code',
            'images', 'order', 'is_active', 'created_at', 'updated_at'
        ]
        # 
        read_only_fields = ['created_at', 'updated_at']
    
    def increment_code(self, code):
        m_array = code.split('-')
        tmp = m_array[-1]   
        if tmp.isdigit():            
            tmp_int = int(tmp) + 1
            m_array.pop(-1)            
            m_array.append(f"{tmp_int:02}")
            return '-'.join(m_array)            
        return None

    def next_index(self, obj):
        ''' Kembalikan index untuk gambar selanjutnya        
            Jika jumlah anak 0 maka kode berikutnya slideshow-image-02
            karna slideshow-image-01 sudah digunakan
        '''        
        # return Content.objects.filter(
        #     parent_id=obj.id,            
        # ).count() + 2
        content = Content.objects.filter(parent_id=obj.id).order_by('-code').first()
        if content:
            next_code = content.code
            m_array = next_code.split('-')
            tmp = m_array[-1]   
            if tmp.isdigit():
                return int(tmp) + 1
        # else:             
            # content = Content.objects.filter(parent_id=obj.id).order_by('-code').first()

        # if parent id is empty, means no children yet
        return 2  # default index if no children
        
    def get_image_index(self, obj):
        """Get index of the first image in the content's images"""
        # image_index = self.current_code(obj)
        next_index = self.next_index(obj)       
        return (next_index % 3)  # assuming 3 images per content
       
        # image_index = obj.code        
        # # if image_index:
        # m_array = image_index.split('-')
        # tmp = m_array[-1]   
        # if tmp.isdigit():
        #     return (int(tmp) + 1) % 3  # assuming 3 images per content        
        # return 1 # default index if not found

    def get_next_code(self, obj):
        """Get the code of the next content item based on order"""
        # order__gt=obj.order
        # next_content = self.current_code(obj)
        # next_content = obj.code
        # if next_content:        
        next_index = self.next_index(obj)
        next_code = obj.code
        m_array = next_code.split('-')
        tmp = m_array[-1]   
        if tmp.isdigit():
            m_array.pop(-1)            
            m_array.append(f"{next_index:02}")
            next_code = '-'.join(m_array)
        
        print('next_code:', next_code)
        # Jika return None, karna index 3 bukan numerik maka return None
        if next_code:
            return encrypt_data(next_code)
        return None

    def get_parent_id(self, obj):
        """Get encrypted parent ID"""
        if obj.parent:
            return encrypt_data(str(obj.parent.id))
        return None
    
    def get_encrypted_id(self, obj):
        return encrypt_data(str(obj.id))

    def get_encrypted_site_id(self, obj):
        return encrypt_data(str(obj.site_id))
    
    def get_encrypted_code(self, obj):
        """Get encrypted code"""
        return encrypt_data(obj.code)
    
    def get_encrypted_template_id(self, obj):
        return encrypt_data(str(obj.template_id))
    
    def get_children(self, obj):
        """Get child content items recursively"""
        children = obj.get_children()
        return ContentSerializer(children, many=True, context=self.context).data


class ContentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views (no nested children)"""
    encrypted_id = serializers.SerializerMethodField()
    encrypted_site_id = serializers.SerializerMethodField()
    site_name = serializers.CharField(source='site.name', read_only=True)
    value_type_display = serializers.CharField(source='get_value_type_display', read_only=True)
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)
    parent_code = serializers.CharField(source='parent.code', read_only=True, allow_null=True)
    encrypted_template_id = serializers.SerializerMethodField()
    template_name = serializers.CharField(source='template.name', read_only=True, allow_null=True)
    images = PhotoSerializer(source='value_image', many=True, read_only=True)
    image_count = serializers.SerializerMethodField()
    children_count = serializers.SerializerMethodField()
    encrypted_code = serializers.SerializerMethodField()
    
    class Meta:
        model = Content
        fields = [
            'encrypted_id', 'encrypted_site_id', 'site_name', 'encrypted_code', 'slug',
            'value_type', 'value_type_display', 'content_type', 'content_type_display', 'is_page',
            'value_text', 'value_video', 'encrypted_template_id', 'template_name', 'parent', 'parent_code',
            'images', 'image_count', 'children_count', 'order', 'is_active', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_encrypted_id(self, obj):
        return encrypt_data(str(obj.id))

    def get_encrypted_site_id(self, obj):
        return encrypt_data(str(obj.site_id))    

    def get_encrypted_code(self, obj):
        """Get encrypted code"""
        return encrypt_data(obj.code)
    
    def get_encrypted_template_id(self, obj):
        return encrypt_data(str(obj.template_id))
    
    def get_image_count(self, obj):
        """Count related images"""
        return obj.value_image.count()
    
    def get_children_count(self, obj):
        """Count child items"""
        return obj.children.filter(is_active=True).count()


class ContentCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating content"""
    
    class Meta:
        model = Content
        fields = [
            'site', 'code', 'slug', 'url', 'value_type', 'content_type', 'is_page', 'value_text', 'value_textarea', 'value_video',
            'template', 'parent', 'order', 'is_active'
        ]
    
    def validate(self, data):
        """Custom validation"""
        # Prevent circular parent relationship
        if 'parent' in data and data['parent']:
            parent = data['parent']
            instance = self.instance
            if instance and parent.id == instance.id:
                raise serializers.ValidationError({
                    'parent': 'Content cannot be its own parent'
                })
            
            # Check for circular reference in ancestors
            if instance:
                current = parent
                while current:
                    if current.id == instance.id:
                        raise serializers.ValidationError({
                            'parent': 'Circular parent relationship detected'
                        })
                    current = current.parent
        
        return data


class SiteSerializer(serializers.ModelSerializer):
    """Serializer for Site model"""
    
    class Meta:
        model = Site
        fields = ['id', 'domain', 'name']


class SiteMetadataSerializer(serializers.ModelSerializer):
    """Serializer for SiteMetadata model"""
    site_domain = serializers.CharField(source='site.domain', read_only=True)
    og_image_url = serializers.SerializerMethodField()
    favicon_url = serializers.SerializerMethodField()
    apple_touch_icon_url = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = SiteMetadata
        fields = [
            'id', 'site', 'site_domain',
            'site_title', 'site_tagline',
            'meta_description', 'meta_keywords',
            'og_title', 'og_description', 'og_image', 'og_image_url', 'og_type',
            'twitter_card', 'twitter_site', 'twitter_creator',
            'favicon', 'favicon_url',
            'apple_touch_icon', 'apple_touch_icon_url',
            'logo', 'logo_url',
            'theme_color', 'canonical_url', 'robots',
            'google_site_verification', 'google_analytics_id', 'facebook_app_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_og_image_url(self, obj):
        """Get full URL for og_image"""
        if obj.og_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.og_image.url)
            return obj.og_image.url
        return None
    
    def get_favicon_url(self, obj):
        """Get full URL for favicon"""
        if obj.favicon:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.favicon.url)
            return obj.favicon.url
        return None
    
    def get_apple_touch_icon_url(self, obj):
        """Get full URL for apple_touch_icon"""
        if obj.apple_touch_icon:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.apple_touch_icon.url)
            return obj.apple_touch_icon.url
        return None
    
    def get_logo_url(self, obj):
        """Get full URL for logo"""
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None


class UserSettingsSerializer(serializers.Serializer):
    """
    Serializer for UserSettings with dictionary format.
    Handles the key-value structure and provides easy-to-use format for frontend.
    """
    # Accept a dictionary of settings
    settings = serializers.DictField(child=serializers.CharField(), required=False)
    
    def to_representation(self, instance):
        """
        Convert UserSettings queryset or instance to dictionary format.
        If instance is a User, get all their settings.
        If instance is a queryset, convert to dict.
        """
        from django.contrib.auth.models import User
        from .common import get_site_id
        
        if isinstance(instance, User):
            # Get site from context (request)
            request = self.context.get('request')
            site_id = get_site_id(request) if request else None
            
            if not site_id:
                return {'settings': {}}
            
            from django.contrib.sites.models import Site
            site = Site.objects.get(id=site_id)
            
            # Get all settings for this user and site
            settings_dict = UserSettings.get_all_settings(instance, site)
            
            # Merge with defaults for any missing settings
            defaults = UserSettings.get_default_settings()
            for key, value in defaults.items():
                if key not in settings_dict:
                    settings_dict[key] = value
            
            return {'settings': settings_dict}
        
        # If it's already a dict, return it
        if isinstance(instance, dict):
            return {'settings': instance}
        
        return {'settings': {}}
    
    def create(self, validated_data):
        """Create multiple settings from dictionary"""
        from .common import get_site_id
        from django.contrib.sites.models import Site
        
        request = self.context.get('request')
        user = request.user
        site_id = get_site_id(request)
        site = Site.objects.get(id=site_id)
        
        settings_dict = validated_data.get('settings', {})
        UserSettings.set_multiple_settings(user, site, settings_dict)
        
        return user
    
    def update(self, instance, validated_data):
        """Update multiple settings from dictionary"""
        from .common import get_site_id
        from django.contrib.sites.models import Site
        
        request = self.context.get('request')
        site_id = get_site_id(request)
        site = Site.objects.get(id=site_id)
        
        settings_dict = validated_data.get('settings', {})
        UserSettings.set_multiple_settings(instance, site, settings_dict)
        
        return instance


class UserSerializer(serializers.ModelSerializer):
    """Serializer for Django User model"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile model with nested user data"""
    user = UserSerializer(read_only=True)
    avatar_url = serializers.SerializerMethodField()
    avatar_data = PhotoSerializer(source='avatar', read_only=True)
    
    # Fields for updating user model
    username = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(write_only=True, required=False)
    first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'email_verified', 'avatar', 'avatar_data', 'avatar_url',
            'username', 'email', 'first_name', 'last_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'email_verified', 'created_at', 'updated_at']
    
    def get_avatar_url(self, obj):
        """Get full URL for avatar image"""
        if obj.avatar and obj.avatar.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.image.url)
            return obj.avatar.image.url
        return None
    
    def update(self, instance, validated_data):
        """Update user profile and related user model"""
        # Extract user-related fields
        username = validated_data.pop('username', None)
        email = validated_data.pop('email', None)
        first_name = validated_data.pop('first_name', None)
        last_name = validated_data.pop('last_name', None)
        
        # Update user model if any user fields were provided
        user = instance.user
        if username is not None:
            user.username = username
        if email is not None:
            user.email = email
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        
        if any([username, email, first_name, last_name]):
            user.save()
        
        # Update UserProfile model
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        return instance

