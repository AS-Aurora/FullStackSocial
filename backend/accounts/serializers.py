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