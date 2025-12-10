from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from allauth.account.models import EmailAddress
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from .adapters import CustomAccountAdapter
from .serializers import UserSerializer
from rest_framework import permissions
from rest_framework import generics, status
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str

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


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        if not all([uid, token, new_password, confirm_password]):
            return Response({
                'detail': 'All fields are required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if new_password != confirm_password:
            return Response({
                'detail': 'Passwords do not match.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(new_password) < 8:
            return Response({
                'detail': 'Password must be at least 8 characters long.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Decode the user ID
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            
            # Check if token is valid
            if default_token_generator.check_token(user, token):
                user.set_password(new_password)
                user.save()
                
                return Response({
                    'detail': 'Password has been reset successfully.',
                    'message': 'You can now log in with your new password.'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'detail': 'Invalid or expired reset link.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({
                'detail': 'Invalid reset link.'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'detail': 'An error occurred while resetting the password.'
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
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"detail": "Successfully logged out."}, status=200)
        response.delete_cookie('jwt-auth')
        response.delete_cookie('jwt-refresh-token')
        return response

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = 'id'
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method in ['PATCH', 'PUT']:
            return [IsAuthenticated()]
        return []

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        if request.user != instance:
            return Response(
                {"detail": "You can only edit your own profile."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Follow
from .serializers import FollowSerializer, UserProfileSerializer

class FollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if target_user == request.user:
            return Response(
                {'detail': 'You cannot follow yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )

        follow, created = Follow.objects.get_or_create(
            follower=request.user,
            following=target_user
        )

        if not created:
            return Response(
                {'detail': 'You are already following this user'},
                status=status.HTTP_400_BAD_REQUEST
            )

        channel_layer = get_channel_layer()
        notification_data = {
            'type': 'send_notification',
            'notification': {
                'type': 'follow',
                'from_user': {
                    'id': str(request.user.id),
                    'username': request.user.username,
                    'profile_picture': request.user.profile_picture.url if request.user.profile_picture else None,
                },
                'message': f'{request.user.username} started following you',
                'created_at': follow.created_at.isoformat(),
            }
        }
        
        async_to_sync(channel_layer.group_send)(
            f"user_{target_user.id}",
            notification_data
        )

        serializer = FollowSerializer(follow, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class UnfollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, user_id):
        deleted_count, _ = Follow.objects.filter(
            follower=request.user,
            following_id=user_id
        ).delete()

        if deleted_count == 0:
            return Response(
                {'detail': 'You are not following this user'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {'detail': 'Successfully unfollowed user'},
            status=status.HTTP_200_OK
        )


class CheckFollowStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        is_following = Follow.objects.filter(
            follower=request.user,
            following_id=user_id
        ).exists()

        return Response({
            'is_following': is_following
        })


class FollowersListView(generics.ListAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        
        follower_ids = Follow.objects.filter(
            following_id=user_id
        ).values_list('follower_id', flat=True)
        
        return User.objects.filter(id__in=follower_ids)
    
class FollowingListView(generics.ListAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        
        following_ids = Follow.objects.filter(
            follower_id=user_id
        ).values_list('following_id', flat=True)
        
        return User.objects.filter(id__in=following_ids)

class CheckFollowStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        is_following = Follow.objects.filter(
            follower=request.user,
            following_id=user_id
        ).exists()

        return Response({
            'is_following': is_following
        })