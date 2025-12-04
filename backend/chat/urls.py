from django.urls import path
from .views import (
    ConversationListView,
    ConversationDetailView,
    StartConversationView,
    SendMessageView,
    UnreadCountView
)

urlpatterns = [
    path('conversations/', ConversationListView.as_view(), name='conversation-list'),
    path('conversations/<uuid:conversation_id>/', ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/start/', StartConversationView.as_view(), name='start-conversation'),
    path('conversations/<uuid:conversation_id>/messages/', SendMessageView.as_view(), name='send-message'),
    path('unread-count/', UnreadCountView.as_view(), name='unread-count'),
]