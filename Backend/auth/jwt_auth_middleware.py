from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from asgiref.sync import sync_to_async
import logging

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        from django.contrib.auth.models import AnonymousUser
        from rest_framework_simplejwt.tokens import UntypedToken
        from rest_framework_simplejwt.authentication import JWTAuthentication
        from django.db import close_old_connections

        logger = logging.getLogger("channels.jwt")
        query_string = scope["query_string"].decode()
        token = parse_qs(query_string).get("token")
        
        if token:
            token = token[0]
            try:
                # Envelopper les appels synchrones dans sync_to_async
                @sync_to_async
                def validate_token_and_get_user(token_str):
                    validated_token = UntypedToken(token_str)
                    return JWTAuthentication().get_user(validated_token)
                
                user = await validate_token_and_get_user(token)
                logger.info(f"WebSocket JWT OK: user={user}")
                scope["user"] = user
            except Exception as e:
                logger.warning(f"WebSocket JWT INVALID: {e}")
                scope["user"] = AnonymousUser()
        else:
            logger.warning("WebSocket JWT: No token provided")
            scope["user"] = AnonymousUser()
        
        close_old_connections()
        return await super().__call__(scope, receive, send) 