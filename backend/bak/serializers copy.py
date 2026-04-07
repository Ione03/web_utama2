from rest_framework import serializers
from django.contrib.sites.models import Site
from .models import Photo, Content, SiteMetadata, Template
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
            'encrypted_code', 'next_code', 'image_index', 'value_type', 'value_type_display', 'children', 
            'value_text', 'value_textarea', 'encrypted_template_id', 'template_name', 'parent_id', 'parent_code',
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
        return 1  # default index if no children
        
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
    parent_code = serializers.CharField(source='parent.code', read_only=True, allow_null=True)
    encrypted_template_id = serializers.SerializerMethodField()
    template_name = serializers.CharField(source='template.name', read_only=True, allow_null=True)    
    image_count = serializers.SerializerMethodField()
    children_count = serializers.SerializerMethodField()
    encrypted_code = serializers.SerializerMethodField()
    
    class Meta:
        model = Content
        fields = [
            'encrypted_id', 'encrypted_site_id', 'site_name', 'encrypted_code', 
            'value_type', 'value_type_display',
            'value_text', 'encrypted_template_id', 'template_name', 'parent', 'parent_code',
            'image_count', 'children_count', 'order', 'is_active', 
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
            'site', 'code', 'value_type', 'value_text', 'value_textarea',
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
