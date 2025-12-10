from django.urls import path
from .views import LoginView, LogoutView, PasswordResetView, PasswordResetConfirmView, UserDetailView, FollowUserView, UnfollowUserView, CheckFollowStatusView, FollowersListView, FollowingListView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path("logout/", LogoutView.as_view(), name="logout"),
    path('password-reset/', PasswordResetView.as_view(), name='password_reset'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('profile/<uuid:id>/', UserDetailView.as_view(), name='user_detail'),

    path('follow/<uuid:user_id>/', FollowUserView.as_view(), name='follow-user'),
    path('unfollow/<uuid:user_id>/', UnfollowUserView.as_view(), name='unfollow-user'),
    path('check-follow/<uuid:user_id>/', CheckFollowStatusView.as_view(), name='check-follow'),
    
    path('users/<uuid:user_id>/followers/', FollowersListView.as_view(), name='user-followers'),
    path('users/<uuid:user_id>/following/', FollowingListView.as_view(), name='user-following'),
]