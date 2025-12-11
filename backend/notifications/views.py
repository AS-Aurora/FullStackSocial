from django.shortcuts import render

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).select_related('sender', 'post', 'comment').order_by('-created_at')

class UnreadNotificationCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'unread_count': count})


class MarkNotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, notification_id):
        try:
            notification = Notification.objects.get(id=notification_id, recipient=request.user)
            notification.mark_as_read()
            
            serializer = NotificationSerializer(notification)
            return Response(serializer.data)
            
        except Notification.DoesNotExist:
            return Response(
                {'detail': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class MarkAllNotificationsReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):

        from django.utils import timezone
        updated_count = Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True, read_at=timezone.now())
        return Response({
            'detail': f'Marked {updated_count} notifications as read',
            'count': updated_count
        })


class DeleteNotificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def delete(self, request, notification_id):
        try:
            notification = Notification.objects.get(id=notification_id,recipient=request.user)
            notification.delete()
            return Response(
                {'detail': 'Notification deleted'},
                status=status.HTTP_200_OK
            )
        
        except Notification.DoesNotExist:
            return Response(
                {'detail': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )
