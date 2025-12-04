from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import Conversation, Message
from .serializers import (
    ConversationSerializer, 
    ConversationDetailSerializer,
    MessageSerializer
)

User = get_user_model()


class ConversationListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        conversations = Conversation.objects.filter(
            Q(participant1=request.user) | Q(participant2=request.user)
        ).order_by('-updated_at')
        
        serializer = ConversationSerializer(
            conversations, 
            many=True, 
            context={'request': request}
        )
        
        return Response(serializer.data)


class ConversationDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, id=conversation_id)
        
        if conversation.participant1 != request.user and conversation.participant2 != request.user:
            return Response(
                {'error': 'You are not a participant in this conversation'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        Message.objects.filter(
            conversation=conversation
        ).exclude(sender=request.user).update(is_read=True)
        
        serializer = ConversationDetailSerializer(
            conversation, 
            context={'request': request}
        )
        
        return Response(serializer.data)


class StartConversationView(APIView):

    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        other_user_id = request.data.get('user_id')
        
        if not other_user_id:
            return Response(
                {'error': 'user_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        other_user = get_object_or_404(User, id=other_user_id)
        
        if other_user == request.user:
            return Response(
                {'error': 'Cannot start conversation with yourself'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        conversation, created = Conversation.get_or_create_conversation(request.user, other_user)
        
        serializer = ConversationDetailSerializer(
            conversation, 
            context={'request': request}
        )
        
        return Response(
            {
                'conversation': serializer.data,
                'created': created
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, id=conversation_id)
        
        if conversation.participant1 != request.user and conversation.participant2 != request.user:
            return Response(
                {'error': 'You are not a participant in this conversation'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        content = request.data.get('content', '').strip()
        
        if not content:
            return Response(
                {'error': 'Message content is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content
        )
        
        serializer = MessageSerializer(message)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        unread_count = Message.objects.filter(
            Q(conversation__participant1=request.user) | Q(conversation__participant2=request.user),
            is_read=False
        ).exclude(sender=request.user).count()
        
        return Response({'unread_count': unread_count})