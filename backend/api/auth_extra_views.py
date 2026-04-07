"""
Additional authentication views for registration and password reset.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
import re

from .models import UserProfile, OTP, OTPPurpose


@method_decorator(ratelimit(key='ip', rate='3/hour', method='POST'), name='dispatch')
class RegisterView(APIView):
    """
    User registration view with email verification.
    Rate limited to 3 attempts per hour per IP.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        password_confirm = request.data.get('password_confirm')
        
        # Validate required fields
        if not all([email, password, password_confirm]):
            return Response({
                'error': 'Email, password, and password confirmation are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate email format
        if not self._is_valid_email(email):
            return Response({
                'error': 'Invalid email format'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate passwords match
        if password != password_confirm:
            return Response({
                'error': 'Passwords do not match'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate password strength
        if len(password) < 8:
            return Response({
                'error': 'Password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already exists
        if User.objects.filter(email=email).exists():
            return Response({
                'error': 'An account with this email already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create username from email (before @)
        username = email.split('@')[0]
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        
        # Create user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        
        # Create user profile with verification token
        profile = UserProfile.objects.create(user=user)
        token = profile.generate_verification_token()
        
        # Send verification email
        self._send_verification_email(user, token)
        
        return Response({
            'message': 'Registration successful! Please check your email to verify your account.',
            'email': email,
            'username': username
        }, status=status.HTTP_201_CREATED)
    
    def _is_valid_email(self, email):
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def _send_verification_email(self, user, token):
        """Send email verification link"""
        verification_url = f"{settings.FRONTEND_URL}/verify-email/{token}"
        subject = 'Verify Your Email Address'
        
        plain_message = f"""
Hello {user.username},

Thank you for registering! Please verify your email address by clicking the link below:

{verification_url}

This link will expire in 24 hours.

If you didn't create this account, please ignore this email.

Best regards,
Your Application Team
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )


@method_decorator(ratelimit(key='ip', rate='3/15m', method='POST'), name='dispatch')
class ForgotPasswordView(APIView):
    """
    Password reset request view - sends OTP to email.
    Rate limited to 3 attempts per 15 minutes per IP.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response({
                'error': 'Email is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user by email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal if email exists for security
            return Response({
                'message': 'If an account with this email exists, a password reset code has been sent.'
            }, status=status.HTTP_200_OK)
        
        # Generate OTP for password reset
        otp = OTP.create_otp(user, purpose=OTPPurpose.PASSWORD_RESET)
        
        # Send OTP via email
        self._send_reset_email(user, otp.code)
        
        return Response({
            'message': 'If an account with this email exists, a password reset code has been sent.',
            'email': email
        }, status=status.HTTP_200_OK)
    
    def _send_reset_email(self, user, otp_code):
        """Send password reset OTP email"""
        subject = 'Password Reset Code'
        
        plain_message = f"""
Hello {user.username},

Your password reset code is: {otp_code}

This code will expire in {settings.OTP_EXPIRATION_MINUTES} minutes.

If you didn't request a password reset, please ignore this email and ensure your account is secure.

Best regards,
Your Application Team
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )


class ResetPasswordView(APIView):
    """
    Reset password using OTP verification.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        otp_code = request.data.get('otp')
        new_password = request.data.get('new_password')
        password_confirm = request.data.get('password_confirm')
        
        # Validate required fields
        if not all([email, otp_code, new_password, password_confirm]):
            return Response({
                'error': 'Email, OTP code, and new password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate passwords match
        if new_password != password_confirm:
            return Response({
                'error': 'Passwords do not match'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate password strength
        if len(new_password) < 8:
            return Response({
                'error': 'Password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({
                'error': 'Invalid email or OTP code'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify OTP
        otp = OTP.objects.filter(
            user=user,
            code=otp_code,
            purpose=OTPPurpose.PASSWORD_RESET,
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
        
        # Reset password
        user.set_password(new_password)
        user.save()
        
        return Response({
            'message': 'Password reset successful! You can now login with your new password.'
        }, status=status.HTTP_200_OK)
