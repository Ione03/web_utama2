# Social Authentication Settings

# Authentication backends
AUTHENTICATION_BACKENDS = [
    # Django default
    'django.contrib.auth.backends.ModelBackend',
    
    # Social auth backends
    'social_core.backends.google.GoogleOAuth2',
    'social_core.backends.facebook.FacebookOAuth2',
    'social_core.backends.github.GithubOAuth2',
]

# Social Auth URLs
LOGIN_URL = '/login/'
LOGIN_REDIRECT_URL = config('FRONTEND_URL', default='http://localhost:5173')
LOGOUT_REDIRECT_URL = config('FRONTEND_URL', default='http://localhost:5173')
SOCIAL_AUTH_URL_NAMESPACE = 'social'

# Google OAuth2
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = config('GOOGLE_OAUTH2_CLIENT_ID', default='')
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = config('GOOGLE_OAUTH2_CLIENT_SECRET', default='')
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = ['email', 'profile']

# Facebook OAuth2
SOCIAL_AUTH_FACEBOOK_KEY = config('FACEBOOK_APP_ID', default='')
SOCIAL_AUTH_FACEBOOK_SECRET = config('FACEBOOK_APP_SECRET', default='')
SOCIAL_AUTH_FACEBOOK_SCOPE = ['email']
SOCIAL_AUTH_FACEBOOK_PROFILE_EXTRA_PARAMS = {
    'fields': 'id,name,email'
}

# GitHub OAuth2
SOCIAL_AUTH_GITHUB_KEY = config('GITHUB_CLIENT_ID', default='')
SOCIAL_AUTH_GITHUB_SECRET = config('GITHUB_CLIENT_SECRET', default='')
SOCIAL_AUTH_GITHUB_SCOPE = ['user:email']

# Common social auth settings
SOCIAL_AUTH_ADMIN_USER_SEARCH_FIELDS = ['username', 'first_name', 'email']
SOCIAL_AUTH_USERNAME_IS_FULL_EMAIL = True
SOCIAL_AUTH_SESSION_EXPIRATION = False  # Use Django's session settings
SOCIAL_AUTH_REDIRECT_IS_HTTPS = config('SOCIAL_AUTH_REDIRECT_IS_HTTPS', default=False, cast=bool)

# Pipeline for social auth (customize as needed)
SOCIAL_AUTH_PIPELINE = (
    # Get the information we can about the user and return it in a simple
    # format to create the user instance later. In some cases the details are
    # already part of the auth response from the provider, but sometimes this
    # could hit a provider API.
    'social_core.pipeline.social_auth.social_details',
    
    # Get the social uid from whichever service we're authing thru. The uid is
    # the unique identifier of the given user in the provider.
    'social_core.pipeline.social_auth.social_uid',
    
    # Verifies that the current auth process is valid within the current
    # project, raises AuthException otherwise.
    'social_core.pipeline.social_auth.auth_allowed',
    
    # Checks if the current social-account is already associated in the site.
    'social_core.pipeline.social_auth.social_user',
    
    # Make up a username for this person, appends a random string at the end if
    # there's any collision.
    'social_core.pipeline.user.get_username',
    
    # Send a validation email to the user to verify its email address.
    # Disabled by default.
    # 'social_core.pipeline.mail.mail_validation',
    
    # Associates the current social details with another user account with
    # a similar email address. Disabled by default.
    'social_core.pipeline.social_auth.associate_by_email',
    
    # Create a user account if we haven't found one yet.
    'social_core.pipeline.user.create_user',
    
    # Create the record that associates the social account with the user.
    'social_core.pipeline.social_auth.associate_user',
    
    # Populate the extra_data field in the social record with the values
    # specified by settings (and the default ones like access_token, etc).
    'social_core.pipeline.social_auth.load_extra_data',
    
    # Update the user record with any changed info from the auth service.
    'social_core.pipeline.user.user_details',
)
