from django.urls import path
from .views import NotificationListView, UnreadNotificationCountView, MarkNotificationReadView, MarkAllNotificationsReadView, DeleteNotificationView


urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('unread-count/', UnreadNotificationCountView.as_view(), name='unread-count'),
    path('<uuid:notification_id>/read/', MarkNotificationReadView.as_view(), name='mark-read'),
    path('mark-all-read/', MarkAllNotificationsReadView.as_view(), name='mark-all-read'),
    path('<uuid:notification_id>/delete/', DeleteNotificationView.as_view(), name='delete-notification'),
]