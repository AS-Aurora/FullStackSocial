from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from allauth.account.models import EmailAddress
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework import serializers
from .adapters import CustomAccountAdapter

User = get_user_model()

class PasswordResetView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response({'detail': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            
            adapter = CustomAccountAdapter()
            adapter.send_password_reset_mail(request, user, None)
            
            return Response({
                'detail': 'Password reset email has been sent.',
                'message': 'If your email exists in our system, you will receive a password reset link.'
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({
                'detail': 'Password reset email has been sent.',
                'message': 'If your email exists in our system, you will receive a password reset link.'
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'detail': 'An error occurred while sending the password reset email.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({'detail': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=username, password=password)

        if user is None or not user.is_active:
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not EmailAddress.objects.filter(user=user, verified=True).exists():
            return Response({'detail': 'Email address is not verified'}, status=status.HTTP_400_BAD_REQUEST)

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        response = Response({
            'refresh': str(refresh),
            'access': access_token,
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            }
        })
        
        response.set_cookie(
            'jwt-auth',
            access_token,
            max_age=60 * 60,
            httponly=True,
            samesite='Lax',
            secure=False
        )
        
        response.set_cookie(
            'jwt-refresh-token',
            str(refresh),
            max_age=24 * 60 * 60,
            httponly=True,
            samesite='Lax',
            secure=False
        )
        
        return response

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response({"detail": "Successfully logged out."}, status=200)
        response.delete_cookie('jwt-auth')
        response.delete_cookie('jwt-refresh-token')
        return response
    

class UpdateProfilePictureView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Update user's profile picture with Cloudinary URL
        Expected payload: {"profile_picture_url": "https://res.cloudinary.com/..."}
        """
        profile_picture_url = request.data.get('profile_picture_url')
        
        if not profile_picture_url:
            return Response({
                'detail': 'profile_picture_url is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Basic URL validation (you can make this more robust)
        if not profile_picture_url.startswith('https://res.cloudinary.com/'):
            return Response({
                'detail': 'Invalid Cloudinary URL'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update user's profile picture
        request.user.profile_picture = profile_picture_url
        request.user.save()
        
        return Response({
            'detail': 'Profile picture updated successfully',
            'profile_picture_url': request.user.profile_picture_url
        }, status=status.HTTP_200_OK)
    
    def delete(self, request):
        """
        Remove user's profile picture (set to default)
        """
        request.user.profile_picture = None
        request.user.save()
        
        return Response({
            'detail': 'Profile picture removed, using default',
            'profile_picture_url': request.user.profile_picture_url
        }, status=status.HTTP_200_OK)

