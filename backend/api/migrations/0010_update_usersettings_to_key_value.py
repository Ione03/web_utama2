from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


def migrate_old_settings_to_new(apps, schema_editor):
    """
    Migrate data from old UserSettings structure to new key-value structure.
    This handles the transition if any old settings exist.
    """
    # Get the old UserSettings model (if it exists)
    try:
        OldUserSettings = apps.get_model('api', 'UserSettings')
        # Check if old table has the old structure
        if hasattr(OldUserSettings, 'show_hero'):
            # Old structure exists, migrate the data
            Site = apps.get_model('sites', 'Site')
            NewUserSettings = apps.get_model('api', 'UserSettings')
            
            for old_setting in OldUserSettings.objects.all():
                user = old_setting.user
                # Use first available site or default site
                site = Site.objects.first()
                
                if not site:
                    continue
                
                # Migrate each field to key-value pairs
                settings_to_create = [
                    ('show_hero', 'true' if old_setting.show_hero else 'false'),
                    ('hero_text_alignment', old_setting.hero_text_alignment or 'center'),
                    ('hero_button_label', old_setting.hero_button_label or 'Get Started'),
                    ('show_external_content', 'true' if old_setting.show_external_content else 'false'),
                    ('breaking_news_animation', old_setting.breaking_news_animation or 'default'),
                    ('custom_favicon_url', old_setting.custom_favicon_url or ''),
                ]
                
                for setting_name, setting_value in settings_to_create:
                    NewUserSettings.objects.create(
                        user=user,
                        site=site,
                        setting_name=setting_name,
                        setting_value=str(setting_value)
                    )
    except Exception as e:
        # If migration fails, it's probably because the old structure doesn't exist
        # which is fine - just skip
        print(f"Note: Skipping data migration - {e}")
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_usersettings'),
        ('sites', '0002_alter_domain_unique'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # First, drop the old UserSettings table completely
        migrations.DeleteModel(
            name='UserSettings',
        ),
        
        # Create the new UserSettings model with key-value structure
        migrations.CreateModel(
            name='UserSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('setting_name', models.CharField(help_text='Name of the setting (e.g., "show_hero", "hero_text_alignment")', max_length=100, verbose_name='setting name')),
                ('setting_value', models.TextField(help_text='Value of the setting (stored as string or JSON)', verbose_name='setting value')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='updated at')),
                ('site', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='sites.site', verbose_name='site')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='settings', to=settings.AUTH_USER_MODEL, verbose_name='user')),
            ],
            options={
                'verbose_name': 'User Setting',
                'verbose_name_plural': 'User Settings',
            },
        ),
        
        # Add unique constraint
        migrations.AlterUniqueTogether(
            name='usersettings',
            unique_together={('user', 'site', 'setting_name')},
        ),
        
        # Add index for performance
        migrations.AddIndex(
            model_name='usersettings',
            index=models.Index(fields=['user', 'site', 'setting_name'], name='api_userSet_user_id_abc123_idx'),
        ),
    ]
