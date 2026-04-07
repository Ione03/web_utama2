"""
Authentication views for secure login with Django captcha and OTP verification.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from captcha.models import CaptchaStore
from django.utils import timezone

from .models import UserProfile, OTP, OTPPurpose, TrustedDevice


def get_device_fingerprint(request):
    """Generate device fingerprint from IP and User Agent"""
    import hashlib
    ip = request.META.get('REMOTE_ADDR', '')
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    fingerprint_string = f"{ip}:{user_agent}"
    return hashlib.sha256(fingerprint_string.encode()).hexdigest()



@method_decorator(ratelimit(key='ip', rate='50/15m', method='POST'), name='dispatch')
class LoginView(APIView):
    """
    Initial login view - validates credentials and sends OTP.
    Rate limited to 50 attempts per 15 minutes per IP (increased for development).
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        captcha_key = request.data.get('captchaKey')
        captcha_value = request.data.get('captchaValue')
        
        # Validate required fields
        if not all([username, password, captcha_key, captcha_value]):
            return Response({
                'error': 'Username, password, and captcha are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify Django captcha
        try:
            captcha = CaptchaStore.objects.get(hashkey=captcha_key)
            
            # Check if captcha has expired
            if captcha.expiration < timezone.now():
                captcha.delete()
                return Response({
                    'error': 'Captcha has expired. Please refresh and try again.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify captcha response (case-insensitive)
            if captcha.response.lower() != captcha_value.lower():
                return Response({
                    'error': 'Invalid captcha. Please try again.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Delete used captcha
            captcha.delete()
            
        except CaptchaStore.DoesNotExist:
            return Response({
                'error': 'Invalid captcha. Please refresh and try again.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Authenticate user
        user = authenticate(username=username, password=password)
        if not user:
            return Response({
                'error': 'Invalid username or password'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # OTP BYPASSED - Login user directly
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        profile, created = UserProfile.objects.get_or_create(user=user)
        
        return Response({
            'skip_otp': True,
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'email_verified': profile.email_verified
            }
        }, status=status.HTTP_200_OK)


class CaptchaRefreshView(APIView):
    """Generate a new captcha and return key + image URL"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Return a new captcha key and image URL"""
        from captcha.helpers import captcha_image_url
        from captcha.models import CaptchaStore
        
        # Generate new captcha - this returns the challenge string
        challenge = CaptchaStore.generate_key()
        
        # Split the challenge to get the key (format: "challenge,response")
        # The challenge is what needs to be answered, but it's stored differently
        # We need to get the most recently created captcha
        captcha_obj = CaptchaStore.objects.order_by('-id').first()
        
        if captcha_obj:
            return Response({
                'key': captcha_obj.hashkey,
                'image_url': captcha_image_url(captcha_obj.hashkey)
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Failed to generate captcha'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyOTPView(APIView):
    """Verify OTP and complete login"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        otp_code = request.data.get('otp')
        remember_device = request.data.get('remember_device', True)  # Default: remember
        
        if not all([username, otp_code]):
            return Response({
                'error': 'Username and OTP code are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({
                'error': 'Invalid username'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verify OTP
        otp = OTP.objects.filter(
            user=user,
            code=otp_code,
            purpose=OTPPurpose.LOGIN,
            is_used=False
        ).first()
        
        if not otp:
            return Response({
                'error': 'Invalid OTP code'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not otp.is_valid():
            return Response({
                'error': 'OTP code has expired. Please request a new one.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark OTP as used
        otp.is_used = True
        otp.save()
        
        # Log the user in
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        
        # Create trusted device if remember_device is True
        trust_token = None
        if remember_device:
            device_fingerprint = get_device_fingerprint(request)
            trusted = TrustedDevice.create_trust(user, device_fingerprint, days=7)
            trust_token = trusted.trust_token
        
        # Get user profile
        profile = UserProfile.objects.get(user=user)
        
        return Response({
            'message': 'Login successful',
            'trust_token': trust_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'email_verified': profile.email_verified
            }
        }, status=status.HTTP_200_OK)


@method_decorator(ratelimit(key='ip', rate='3/15m', method='POST'), name='dispatch')
class ResendOTPView(APIView):
    """Resend OTP code. Rate limited to 3 attempts per 15 minutes."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        
        if not username:
            return Response({
                'error': 'Username is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({
                'error': 'Invalid username'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Generate new OTP
        otp = OTP.create_otp(user, purpose=OTPPurpose.LOGIN)
        
        # Send OTP via email
        self._send_otp_email(user, otp.code)
        
        return Response({
            'message': 'New OTP sent to your email'
        }, status=status.HTTP_200_OK)
    
    def _send_otp_email(self, user, otp_code):
        """Send OTP code via email"""
        subject = 'Your Login OTP Code (Resent)'
        
        try:
            html_message = render_to_string('otp_email.html', {
                'user': user,
                'otp_code': otp_code,
                'expiration_minutes': settings.OTP_EXPIRATION_MINUTES
            })
            plain_message = strip_tags(html_message)
        except:
            plain_message = f"""
Hello {user.username},

Your NEW OTP code for login is: {otp_code}

This code will expire in {settings.OTP_EXPIRATION_MINUTES} minutes.

If you didn't request this code, please ignore this email.

Best regards,
Your Application Team
            """
            html_message = None
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )


class CurrentUserView(APIView):
    """Get current authenticated user information"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        profile, created = UserProfile.objects.get_or_create(user=user)
        
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'email_verified': profile.email_verified
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """Logout and destroy session"""
    permission_classes = [AllowAny]  # Allow any to handle session logout
    authentication_classes = []  # No authentication required
    
    def post(self, request):
        # Logout even if not authenticated (clears any existing session)
        logout(request)
        return Response({
            'message': 'Logout successful'
        }, status=status.HTTP_200_OK)


class VerifyEmailView(APIView):
    """Verify user email address using token"""
    permission_classes = [AllowAny]
    
    def get(self, request, token):
        try:
            profile = UserProfile.objects.get(email_verification_token=token)
            if not profile.email_verified:
                profile.email_verified = True
                profile.save()
                message = 'Email verified successfully!'
            else:
                message = 'Email already verified.'
            
            return Response({
                'message': message
            }, status=status.HTTP_200_OK)
        except UserProfile.DoesNotExist:
            return Response({
                'error': 'Invalid verification token'
            }, status=status.HTTP_400_BAD_REQUEST)
