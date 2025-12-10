from rest_framework import viewsets, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Post, Comment
from .serializers import PostSerializer, CommentSerializer

class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Post.objects.filter(is_active=True).select_related('author').prefetch_related('likes', 'comments')
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
    
    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        post = self.get_object()
        user = request.user
        
        if post.likes.filter(id=user.id).exists():
            post.likes.remove(user)
            liked = False
        else:
            post.likes.add(user)
            liked = True
        
        return Response({
            'liked': liked,
            'like_count': post.likes.count()
        })
    
    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        post = self.get_object()
        comments = post.comments.filter(is_active=True).select_related('author')
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)

class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Comment.objects.filter(is_active=True).select_related('author')
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

from django.contrib.auth import get_user_model
from accounts.models import Follow
from .serializers import FeedPostSerializer

User = get_user_model()

class FeedView(generics.ListAPIView):
    serializer_class = FeedPostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        following_ids = Follow.objects.filter(follower=user).values_list('following_id', flat=True)
        author_ids = list(following_ids) + [user.id]
        queryset = Post.objects.filter(author_id__in=author_ids,is_active=True,privacy__in=['public', 'friends']).select_related('author').prefetch_related('likes','comments').order_by('-created_at')
        
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        if not queryset.exists():
            return Response({
                'results': [],
                'message': 'Your feed is empty. Follow some users to see their posts!'
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)