from django.contrib import admin
from .models import CustomUser, Follow

admin.site.register(CustomUser)

admin.site.register(Follow)
# class FollowAdmin(admin.ModelAdmin):
#     list_display = ['id', 'follower', 'following', 'created_at']
#     list_filter = ['created_at']
#     search_fields = ['follower__username', 'following__username']
#     raw_id_fields = ['follower', 'following']
#     readonly_fields = ['created_at']
    
#     def get_queryset(self, request):
#         qs = super().get_queryset(request)
#         return qs.select_related('follower', 'following')