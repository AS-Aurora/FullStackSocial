from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import LoginSerializer
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from allauth.account.models import EmailAddress

User = get_user_model()

class CustomRegisterSerializer(RegisterSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._has_phone_field = False
    
    def get_cleaned_data(self):
        return {
            'username': self.validated_data.get('username', ''),
            'email': self.validated_data.get('email', ''),
            'password1': self.validated_data.get('password1', ''),
        }

class CustomLoginSerializer(LoginSerializer):
    username = serializers.CharField(required=True, allow_blank=False)
    email = None
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'email' in self.fields:
            del self.fields['email']
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError('Invalid credentials')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')
            
            if not EmailAddress.objects.filter(user=user, verified=True).exists():
                raise serializers.ValidationError("Email address is not verified.")
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include username and password')

class UserSerializer(serializers.ModelSerializer):
    # profile_picture = serializers.SerializerMethodField() //This is where the issue was... This line caused the profile picture to be readonly 

    profile_picture = serializers.ImageField(
        required=False,
        allow_null=True,
    )
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile_picture', 'location', 'bio', 'is_email_verified', 'created_at', 'updated_at']
        read_only_fields = ['id', 'email', 'is_email_verified', 'created_at', 'updated_at']
    
    def get_profile_picture(self, obj):
        data = super().get_profile_picture(obj)
        if obj.profile_picture:
            request = self.context.get('request')
            data['profile_picture'] = (request.build_absolute_uri(obj.profile_picture.url) if request else obj.profile_picture.url)
        return data

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Follow

User = get_user_model()


class FollowSerializer(serializers.ModelSerializer):
    """Serializer for Follow model"""
    follower = serializers.StringRelatedField(read_only=True)
    following = serializers.StringRelatedField(read_only=True)
    follower_id = serializers.UUIDField(source='follower.id', read_only=True)
    following_id = serializers.UUIDField(source='following.id', read_only=True)
    
    class Meta:
        model = Follow
        fields = ['id', 'follower', 'following', 'follower_id', 'following_id', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserProfileSerializer(serializers.ModelSerializer):

    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'profile_picture', 
            'location', 'bio', 'full_name', 'created_at',
            'followers_count', 'following_count', 'is_following'
        ]
        read_only_fields = ['id', 'email', 'created_at']
    
    def get_followers_count(self, obj):
        """Count of users following this user"""
        return obj.followers_set.count()
    
    def get_following_count(self, obj):
        """Count of users this user is following"""
        return obj.following_set.count()
    
    def get_is_following(self, obj):
        """Check if request user follows this user"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Follow.objects.filter(
                follower=request.user,
                following=obj
            ).exists()
        return False
    
    def get_profile_picture(self, obj):
        """Return full URL for profile picture"""
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None