from django.urls import path
from .views import LoginView, LogoutView, PasswordResetView, PasswordResetConfirmView, UserDetailView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path("logout/", LogoutView.as_view(), name="logout"),
    path('password-reset/', PasswordResetView.as_view(), name='password_reset'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('profile/<uuid:id>/', UserDetailView.as_view(), name='user_detail'),
]