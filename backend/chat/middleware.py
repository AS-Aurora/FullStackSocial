from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import urllib.parse

User = get_user_model()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        token = None
        
        headers = dict(scope['headers'])
        if b'cookie' in headers:
            cookie_header = headers[b'cookie'].decode()
            cookies = {}
            for cookie in cookie_header.split(';'):
                if '=' in cookie:
                    key, value = cookie.strip().split('=', 1)
                    cookies[key] = urllib.parse.unquote(value)
            
            token = cookies.get('jwt-auth')
        
        if not token:
            query_string = scope.get('query_string', b'').decode()
            query_params = urllib.parse.parse_qs(query_string)
            if 'token' in query_params:
                token = query_params['token'][0]
        
        if token:
            try:
                access_token = AccessToken(token)
                scope['user'] = await self.get_user_from_token(access_token)
            except (InvalidToken, TokenError):
                scope['user'] = AnonymousUser()
        else:
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)
    
    @database_sync_to_async
    def get_user_from_token(self, access_token):
        try:
            user_id = access_token['user_id']
            user = User.objects.get(id=user_id)
            return user
        except User.DoesNotExist:
            return AnonymousUser()