from django.urls import path
from .views import LoginView, LogoutView, PasswordResetView, UpdateProfilePictureView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path("logout/", LogoutView.as_view(), name="logout"),
    path('password-reset/', PasswordResetView.as_view(), name='password_reset'),
    path('update-profile-picture/', UpdateProfilePictureView.as_view(), name='update_profile_picture'),
]