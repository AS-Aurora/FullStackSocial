import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    profile_picture = models.URLField(
        max_length=500,
        null=True, 
        blank=True,
    )
    location = models.CharField(
        max_length=100, 
        null=True, 
        blank=True,
        help_text="Your current location"
    )
    bio = models.TextField(
        max_length=500, 
        null=True, 
        blank=True,
        help_text="Tell us about yourself"
    )
    is_email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Use email as the username field
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        db_table = 'custom_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username
    
    @property
    def profile_picture_url(self):
        """
        Get the profile picture URL with fallback to default Cloudinary image.
        Returns the Cloudinary URL or a default avatar.
        """
        if self.profile_picture:
            return self.profile_picture
        else:
            # Default avatar from Cloudinary
            # You can upload a default avatar to your Cloudinary and use its URL
            # Or use Cloudinary's built-in avatar generation
            default_avatar_url = "https://res.cloudinary.com/your-cloud-name/image/upload/v1/default-avatar.jpg"
            return default_avatar_url
    
    def get_profile_picture_url(self):
        """
        Alternative method to get profile picture URL.
        Useful for API serializers and templates.
        """
        return self.profile_picture_url
    
    @staticmethod
    def get_default_avatar_url():
        """
        Static method to get default avatar URL.
        Useful when you need the default avatar without a user instance.
        """
        return "https://res.cloudinary.com/your-cloud-name/image/upload/v1/default-avatar.jpg"