from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.contrib.sites.models import Site
from django_filters.rest_framework import DjangoFilterBackend
from .models import Photo, Content, SiteMetadata, Template, UserSettings, UserProfile
from .serializers import (
    PhotoSerializer, ContentSerializer, ContentListSerializer,
    ContentCreateUpdateSerializer, SiteSerializer, SiteMetadataSerializer,
    TemplateSerializer, UserSettingsSerializer, UserProfileSerializer
)
from .common import get_site_id
from .encryption import decrypt_data


class CustomPageNumberPagination(PageNumberPagination):
    """Custom pagination class that allows client to override page_size"""
    page_size = 10  # Default page size
    page_size_query_param = 'page_size'  # Allow client to override via ?page_size=100
    max_page_size = 10000  # Maximum allowed page size

class PhotoViewSet(viewsets.ModelViewSet):
    """ViewSet for Photo model"""
    queryset = Photo.objects.all()
    serializer_class = PhotoSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['content_type', 'object_id']
    ordering_fields = ['created_at', 'title']
    ordering = ['-created_at']

    # Customizing GET for list endpoint
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        print('PhotoViewSet list - original queryset count:', queryset.count())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def get_queryset(self):
        """Override to handle object_id filtering properly"""
        queryset = super().get_queryset()
        
        # Handle object_id filtering
        object_id = self.request.query_params.get('object_id')
        
        if object_id:
            print(f'PhotoViewSet get_queryset - filtering by object_id: {object_id}')
            queryset = queryset.filter(object_id=object_id)
            print(f'PhotoViewSet get_queryset - filtered queryset count: {queryset.count()}')
        
        return queryset

    def perform_create(self, serializer):
        """Override to decrypt object_id before creating"""
        object_id = self.request.data.get('object_id')
        if object_id:
            # Decrypt the object_id
            decrypted_id = decrypt_data(str(object_id))
            print(f'PhotoViewSet create - encrypted object_id: {object_id}')
            print(f'PhotoViewSet create - decrypted object_id: {decrypted_id}')
            serializer.save(object_id=int(decrypted_id))
        else:
            serializer.save()
    
    def perform_update(self, serializer):
        """Override to decrypt object_id before updating"""
        object_id = self.request.data.get('object_id')
        if object_id:
            # Decrypt the object_id
            decrypted_id = decrypt_data(str(object_id))
            print(f'PhotoViewSet update - encrypted object_id: {object_id}')
            print(f'PhotoViewSet update - decrypted object_id: {decrypted_id}')
            serializer.save(object_id=int(decrypted_id))
        else:
            serializer.save()

    def perform_delete(self, serializer):
        """Override to decrypt object_id before deleting"""
        object_id = self.request.data.get('object_id')
        print('PhotoViewSet delete - object_id:', object_id)
        if object_id:
            # Decrypt the object_id
            decrypted_id = decrypt_data(str(object_id))
            print(f'PhotoViewSet delete - encrypted object_id: {object_id}')
            print(f'PhotoViewSet delete - decrypted object_id: {decrypted_id}')
            serializer.delete(object_id=int(decrypted_id))
        # else:
        #     serializer.save()
    
    @action(detail=False, methods=['delete'], url_path='delete-by-object-id')
    def delete_by_object_id(self, request):
        """Delete photos by object_id (encrypted Content ID)"""
        object_id = request.data.get('object_id') or request.query_params.get('object_id')
        
        if not object_id:
            return Response(
                {'error': 'object_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Decrypt the object_id
        decrypted_id = decrypt_data(str(object_id))
        print(f'PhotoViewSet delete_by_object_id - encrypted object_id: {object_id}')
        print(f'PhotoViewSet delete_by_object_id - decrypted object_id: {decrypted_id}')
        
        # Find and delete all photos with this object_id
        photos = Photo.objects.filter(object_id=int(decrypted_id))
        count = photos.count()
        photos.delete()
        
        return Response({
            'message': f'Deleted {count} photo(s)',
            'count': count
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='content-type-id')
    def get_content_type_id(self, request):
        """Get ContentType ID for Content model"""
        from django.contrib.contenttypes.models import ContentType
        
        content_type = ContentType.objects.get_for_model(Content)
        return Response({'content_type_id': content_type.id})


class TemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for Template model"""
    queryset = Template.objects.all()
    serializer_class = TemplateSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class ContentViewSet(viewsets.ModelViewSet):
    """ViewSet for Content model with filtering and search"""
    queryset = Content.objects.select_related('site', 'parent', 'template').prefetch_related('value_image', 'children')
    pagination_class = CustomPageNumberPagination  # Use custom pagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['site', 'code', 'value_type', 'content_type', 'parent', 'is_active', 'template']
    search_fields = ['code', 'value_text', 'value_textarea']
    ordering_fields = ['order', 'created_at', 'code']
    ordering = ['-created_at', 'order']  # Order by creation date descending (newest first)
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'list':
            return ContentListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ContentCreateUpdateSerializer
        return ContentSerializer
    
    def get_queryset(self):
        """Filter queryset based on query parameters and automatically by site"""
        queryset = super().get_queryset()
        
        # Automatically filter by site_id from request
        site_id = get_site_id(self.request)
        if site_id:
            queryset = queryset.filter(site_id=site_id)
        
        # Get only root items (no parent)
        root_only = self.request.query_params.get('root_only', None)
        if root_only and root_only.lower() == 'true':
            queryset = queryset.filter(parent__isnull=True)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def navigation(self, request):
        """Get navigation menu tree"""
        site_id = get_site_id(request)
        # 4 is NAVIGATION
        queryset = self.get_queryset().filter(
            site_id=site_id, 
            content_type=4, 
            parent__isnull=True
        )
        serializer = ContentSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='navigation/top')
    def navigation_top(self, request):
        """Get top navigation menu (children of top_menu)"""
        site_id = get_site_id(request)
        
        # Find the top_menu parent
        try:
            top_menu = Content.objects.get(
                site_id=site_id,
                content_type=4,  # NAVIGATION
                code='top_menu'
            )
            # Get children of top_menu
            queryset = self.get_queryset().filter(
                site_id=site_id,
                content_type=4,
                parent=top_menu
            )
            serializer = ContentSerializer(queryset, many=True, context={'request': request})
            return Response(serializer.data)
        except Content.DoesNotExist:
            # If top_menu doesn't exist, return empty list
            return Response([])
    
    @action(detail=False, methods=['get'], url_path='navigation/bottom')
    def navigation_bottom(self, request):
        """Get bottom navigation menu (children of bottom_menu)"""
        site_id = get_site_id(request)
        
        # Find the bottom_menu parent
        try:
            bottom_menu = Content.objects.get(
                site_id=site_id,
                content_type=4,  # NAVIGATION
                code='bottom_menu'
            )
            # Get children of bottom_menu
            queryset = self.get_queryset().filter(
                site_id=site_id,
                content_type=4,
                parent=bottom_menu
            )
            serializer = ContentSerializer(queryset, many=True, context={'request': request})
            return Response(serializer.data)
        except Content.DoesNotExist:
            # If bottom_menu doesn't exist, return empty list
            return Response([])
    
    @action(detail=False, methods=['get'])
    def by_code(self, request):
        """Get content by encrypted code"""
        code = request.query_params.get('code', None)
        site_id = get_site_id(request)
        
        if not code:
            return Response(
                {'error': 'code parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Decrypt the code
            decrypted_code = decrypt_data(code)
            print(f'by_code - encrypted code: {code}')
            print(f'by_code - decrypted code: {decrypted_code}')
        except Exception as e:
            print(f'Error decrypting code: {e}')
            return Response(
                {'error': 'Invalid code'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find the content
        queryset = self.get_queryset().filter(code=decrypted_code, site_id=site_id)
        content = queryset.first()
        
        if not content:
            return Response(
                {'error': 'Content not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return the content with full serialization
        serializer = ContentSerializer(content, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_slug(self, request):
        """Get content by slug"""
        slug = request.query_params.get('slug', None)
        site_id = get_site_id(request)
        
        if not slug:
            return Response(
                {'error': 'slug parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find the content by slug and site_id
        queryset = self.get_queryset().filter(slug=slug, site_id=site_id)
        content = queryset.first()
        
        if not content:
            return Response(
                {'error': 'Content not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return the content with full serialization
        serializer = ContentSerializer(content, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['POST'])
    def create_navigation(self, request):
        """Create a new navigation menu item"""
        print("DEBUG: create_navigation called")
        site_id = get_site_id(request)
        print(f"DEBUG: site_id={site_id}")
        data = request.data.copy()
        
        # Handle location parameter - auto-assign to top_menu or bottom_menu
        location = data.pop('location', None)
        if location and not data.get('parent'):
            # Get or create the location container
            container_code = f'{location}_menu'  # 'top_menu' or 'bottom_menu'
            container, created = Content.objects.get_or_create(
                site_id=site_id,
                code=container_code,
                defaults={
                    'content_type': 4,  # NAVIGATION
                    'value_type': 1,     # TEXT
                    'value_text': f'{location.title()} Menu',
                    'slug': container_code,
                    'is_active': True,
                }
            )
            if created:
                print(f"DEBUG: Created location container: {container_code}")
            data['parent'] = container.id
        
        # Auto-generate code if not provided
        if not data.get('code'):
            import time
            data['code'] = f"menu_{int(time.time()*1000)}"
            
        data['site'] = site_id
        data['content_type'] = 4 # Navigation
        data['value_type'] = 1 # Text
        
        # Decrypt parent if provided and not already set by location
        if data.get('parent') and isinstance(data['parent'], str):
            try:
                data['parent'] = decrypt_data(data['parent'])
                print(f"DEBUG: Decrypted parent={data['parent']}")
            except Exception as e:
                print('Error decrypting parent:', e)
                return Response({'error': 'Invalid parent ID'}, status=status.HTTP_400_BAD_REQUEST)
        
        print(f"DEBUG: Data to serialize: {data}")
        serializer = ContentCreateUpdateSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            saved_content = serializer.save()
            print(f"DEBUG: Saved content: {saved_content.id}, code={saved_content.code}")
            # Return full serializer data so frontend can render it
            response_serializer = ContentSerializer(saved_content, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        print("DEBUG: Serializer errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'])
    def custom_post(self, request):
        """Custom post action that creates or updates content with encrypted code"""
        site_id = get_site_id(request)
        data = request.data.copy()
        
        # Get encrypted code if provided
        code = data.get('code', None)
        
        if code:
            # Decrypt the code
            try:
                decrypted_code = decrypt_data(code)
                print(f'custom_post - encrypted code: {code}')
                print(f'custom_post - decrypted code: {decrypted_code}')
            except Exception as e:
                print(f'Error decrypting code: {e}')
                return Response({'error': 'Invalid code'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if content exists
            content = Content.objects.filter(code=decrypted_code, site_id=site_id).first()
            
            if content:
                # Update existing content
                data.pop('code', None)
                data.pop('site', None)
                
                # Decrypt parent if provided
                if data.get('parent'):
                    try:
                        data['parent'] = decrypt_data(data['parent'])
                    except Exception as e:
                        print(f'Error decrypting parent: {e}')
                        pass
                
                serializer = ContentCreateUpdateSerializer(content, data=data, partial=True, context={'request': request})
                if serializer.is_valid():
                    saved = serializer.save()
                    response_serializer = ContentSerializer(saved, context={'request': request})
                    return Response(response_serializer.data, status=status.HTTP_200_OK)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Create new content
        data['site'] = site_id
        
        # Auto-generate code if not provided
        if not data.get('code'):
            import time
            data['code'] = f"content_{int(time.time()*1000)}"
        else:
            # Use decrypted code
            data['code'] = decrypted_code
        
        # Decrypt parent if provided
        if data.get('parent'):
            try:
                data['parent'] = decrypt_data(data['parent'])
            except Exception as e:
                print(f'Error decrypting parent: {e}')
                return Response({'error': 'Invalid parent ID'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ContentCreateUpdateSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            saved = serializer.save()
            response_serializer = ContentSerializer(saved, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=False, methods=['put', 'patch'])
    def update_by_code(self, request):
        """Update content by code"""
        print("DEBUG: update_by_code called")
        code = request.data.get('code', None)
        site_id = get_site_id(request)
        print(f"DEBUG: site_id={site_id}, code (encrypted)={code}")
        
        # decrypted_code = decrypt_data(code)
        code = decrypt_data(code)
        print(f"DEBUG: Decrypted code={code}")

        if not code:
            return Response(
                {'error': 'code field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(code=code, site_id=site_id)
        content = queryset.first()
        
        if not content:
            print("DEBUG: Content not found")
            return Response(
                {'error': 'Content not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        print(f"DEBUG: Found content {content.id}")
        
        # Use the appropriate serializer for update operations
        serializer_class = self.get_serializer_class()
        partial = request.method == 'PATCH'
        
        # Prepare data: exclude code and site, handle encrypted parent
        data = request.data.copy()
        data.pop('code', None)
        data.pop('site', None)
        
        if data.get('parent'):
            try:
                data['parent'] = decrypt_data(data['parent'])
                print(f"DEBUG: Decrypted parent={data['parent']}")
            except Exception as e:
                print(f"DEBUG: Parent decryption failed: {e}")
                pass # Let serializer handle validation error if decryption fails
        
        print(f"DEBUG: Data for update: {data}")
        serializer = serializer_class(content, data=data, partial=partial, context={'request': request})
        
        if serializer.is_valid():
            saved = serializer.save()
            print(f"DEBUG: Updated content {saved.id}")
            return Response(serializer.data)
        
        print("DEBUG: Update serializer errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['delete'])
    def delete_by_code(self, request):
        """Delete content by encrypted code"""
        code = request.data.get('code', None)
        site_id = get_site_id(request)
        
        if not code:
            return Response(
                {'error': 'code field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Decrypt the code
        decrypted_code = decrypt_data(code)
        print('Encrypted code:', code)
        print('Decrypted code:', decrypted_code)
        
        # Find the content
        queryset = self.get_queryset().filter(code=decrypted_code, site_id=site_id)
        content = queryset.first()
        
        if not content:
            return Response(
                {'error': 'Content not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Delete the content (this will cascade delete children due to CASCADE on parent field)
        content_code = content.code
        content.delete()
        
        return Response(
            {'message': f'Content "{content_code}" deleted successfully'},
            status=status.HTTP_200_OK
        )



class SiteViewSet(viewsets.ReadOnlyModelViewSet):
    """ReadOnly ViewSet for Site model"""
    queryset = Site.objects.all()
    serializer_class = SiteSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['domain', 'name']
    
    # @action(detail=False, methods=['get'])
    # def by_domain(self, request):
    #     """Get site by domain name"""
    #     domain = request.query_params.get('domain', None)
        
    #     if not domain:
    #         return Response(
    #             {'error': 'domain parameter is required'},
    #             status=status.HTTP_400_BAD_REQUEST
    #         )
        
    #     site = Site.objects.filter(domain=domain).first()
    #     if not site:
    #         return Response(
    #             {'error': 'Site not found'},
    #             status=status.HTTP_404_NOT_FOUND
    #         )
        
    #     serializer = self.get_serializer(site)
    #     return Response(serializer.data)


class SiteMetadataViewSet(viewsets.ModelViewSet):
    """ViewSet for SiteMetadata model"""
    queryset = SiteMetadata.objects.select_related('site')
    serializer_class = SiteMetadataSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['site']
    search_fields = ['site_title', 'site_tagline', 'meta_description']
    
    @action(detail=False, methods=['get'])
    def by_site(self, request):
        """Get metadata by site ID or domain"""
        site_id = request.query_params.get('site_id', None)
        domain = request.query_params.get('domain', None)
        
        if not site_id and not domain:
            return Response(
                {'error': 'Either site_id or domain parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            if site_id:
                metadata = SiteMetadata.objects.get(site_id=site_id)
            else:
                site = Site.objects.get(domain=domain)
                metadata = SiteMetadata.objects.get(site=site)
            
            serializer = self.get_serializer(metadata, context={'request': request})
            return Response(serializer.data)
        except (SiteMetadata.DoesNotExist, Site.DoesNotExist):
            return Response(
                {'error': 'Metadata not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class UserSettingsViewSet(viewsets.ViewSet):
    """
    ViewSet for UserSettings with key-value structure.
    Provides endpoints for getting and setting user preferences.
    """
    
    @action(detail=False, methods=['get'])
    def all(self, request):
        """Get all settings for current user as a dictionary"""
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        serializer = UserSettingsSerializer(
            request.user, 
            context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Update multiple settings at once"""
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        serializer = UserSettingsSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.update(request.user, serializer.validated_data)
            # Return updated settings
            result_serializer = UserSettingsSerializer(
                request.user,
                context={'request': request}
            )
            return Response(result_serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='get/(?P<setting_name>[^/.]+)')
    def get_setting(self, request, setting_name=None):
        """Get a specific setting value"""
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        site_id = get_site_id(request)
        site = Site.objects.get(id=site_id)
        
        # Get the setting value or default
        defaults = UserSettings.get_default_settings()
        value = UserSettings.get_setting(
            request.user, 
            site, 
            setting_name,
            default=defaults.get(setting_name, '')
        )
        
        return Response({
            'setting_name': setting_name,
            'setting_value': value
        })
    
    @action(detail=False, methods=['post'], url_path='set/(?P<setting_name>[^/.]+)')
    def set_setting(self, request, setting_name=None):
        """Set a specific setting value"""
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        setting_value = request.data.get('setting_value')
        if setting_value is None:
            return Response(
                {'error': 'setting_value is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        site_id = get_site_id(request)
        site = Site.objects.get(id=site_id)
        
        # Set the setting
        setting = UserSettings.set_setting(
            request.user,
            site,
            setting_name,
            setting_value
        )
        
        return Response({
            'setting_name': setting.setting_name,
            'setting_value': setting.setting_value,
            'message': f'Setting {setting_name} updated successfully'
        }, status=status.HTTP_200_OK)


class UserProfileViewSet(viewsets.ViewSet):
    """
    ViewSet for UserProfile management.
    Provides endpoints for getting and updating user profile data.
    """
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current user's profile"""
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            profile = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            # Create profile if it doesn't exist
            profile = UserProfile.objects.create(user=request.user)
        
        serializer = UserProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['put', 'patch'])
    def update_current(self, request):
        """Update current user's profile"""
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            profile = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            # Create profile if it doesn't exist
            profile = UserProfile.objects.create(user=request.user)
        
        serializer = UserProfileSerializer(
            profile,
            data=request.data,
            partial=True,  # Allow partial updates
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

