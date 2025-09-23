from django.urls import path
from .views import LoginView, LogoutView, PasswordResetView, UserDetailView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path("logout/", LogoutView.as_view(), name="logout"),
    path('password-reset/', PasswordResetView.as_view(), name='password_reset'),
    path('profile/<uuid:id>/', UserDetailView.as_view(), name='user_detail'),
]