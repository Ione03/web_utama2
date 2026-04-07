from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PhotoViewSet, ContentViewSet, SiteViewSet, 
    SiteMetadataViewSet, TemplateViewSet, UserSettingsViewSet, UserProfileViewSet
)
from .auth_views import (
    LoginView, VerifyOTPView, ResendOTPView,
    CurrentUserView, LogoutView, VerifyEmailView, CaptchaRefreshView
)
from .auth_extra_views import (
    RegisterView, ForgotPasswordView, ResetPasswordView
)

# Create a router and register viewsets
router = DefaultRouter()
router.register(r'photos', PhotoViewSet, basename='photo')
router.register(r'templates', TemplateViewSet, basename='template')
router.register(r'contents', ContentViewSet, basename='content')
router.register(r'sites', SiteViewSet, basename='site')
router.register(r'site-metadata', SiteMetadataViewSet, basename='sitemetadata')
router.register(r'user-settings', UserSettingsViewSet, basename='usersettings')
router.register(r'user-profile', UserProfileViewSet, basename='userprofile')

# Authentication URL patterns
auth_patterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('user/', CurrentUserView.as_view(), name='current-user'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('verify-email/<str:token>/', VerifyEmailView.as_view(), name='verify-email'),
    path('captcha/refresh/', CaptchaRefreshView.as_view(), name='captcha-refresh'),
]

urlpatterns = [
    path('', include(router.urls)),
    path('auth/', include(auth_patterns)),
]
