from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeedView, PostViewSet, CommentViewSet, RankedFeedView

router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='post')
router.register(r'comments', CommentViewSet, basename='comment')

urlpatterns = [
    path('', include(router.urls)),
    path('feed/', FeedView.as_view(), name='feed'),
    path('feed/ranked/', RankedFeedView.as_view(), name='ranked-feed'),
]
