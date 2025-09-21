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

User = get_user_model()

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