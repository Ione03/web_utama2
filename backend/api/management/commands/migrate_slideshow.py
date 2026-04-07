from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Content


class Command(BaseCommand):
    help = 'Migrate hero slideshow to parent-child structure'

    def handle(self, *args, **options):
        """
        Migrate slideshow structure:
        - Slide 1 becomes the parent
        - Slides 2 and 3 become children of Slide 1
        """
        
        # Slideshow codes (actual codes in database)
        slide1_code = 'slideshow-image-01'
        slide2_code = 'slideshow-image-02'
        slide3_code = 'slideshow-image-03'
        
        try:
            with transaction.atomic():
                # Get all three slides
                slide1 = Content.objects.filter(code=slide1_code).first()
                slide2 = Content.objects.filter(code=slide2_code).first()
                slide3 = Content.objects.filter(code=slide3_code).first()
                
                if not slide1:
                    self.stdout.write(self.style.ERROR(f'Slide 1 not found with code: {slide1_code}'))
                    return
                
                if not slide2:
                    self.stdout.write(self.style.WARNING(f'Slide 2 not found with code: {slide2_code}'))
                
                if not slide3:
                    self.stdout.write(self.style.WARNING(f'Slide 3 not found with code: {slide3_code}'))
                
                # Check if already migrated
                if slide2 and slide2.parent_id == slide1.id:
                    self.stdout.write(self.style.WARNING('Migration already completed - Slide 2 is already a child of Slide 1'))
                    return
                
                # Slide 1 becomes the parent (no changes needed, just ensure it has no parent)
                if slide1.parent_id:
                    self.stdout.write(self.style.NOTICE(f'Removing parent from Slide 1'))
                    slide1.parent = None
                    slide1.save()
                
                slide1.order = 0
                slide1.save()
                self.stdout.write(self.style.SUCCESS(f'✓ Slide 1 set as parent (order=0)'))
                
                # Slide 2 becomes child of Slide 1
                if slide2:
                    slide2.parent = slide1
                    slide2.order = 1
                    slide2.save()
                    self.stdout.write(self.style.SUCCESS(f'✓ Slide 2 set as child of Slide 1 (order=1)'))
                
                # Slide 3 becomes child of Slide 1
                if slide3:
                    slide3.parent = slide1
                    slide3.order = 2
                    slide3.save()
                    self.stdout.write(self.style.SUCCESS(f'✓ Slide 3 set as child of Slide 1 (order=2)'))
                
                # Verify migration
                self.stdout.write(self.style.NOTICE('\nVerifying migration:'))
                children = slide1.get_children()
                self.stdout.write(self.style.NOTICE(f'Parent: {slide1.code} (order={slide1.order})'))
                self.stdout.write(self.style.NOTICE(f'Children count: {children.count()}'))
                for child in children:
                    self.stdout.write(self.style.NOTICE(f'  - {child.code} (order={child.order})'))
                
                self.stdout.write(self.style.SUCCESS('\n✅ Migration completed successfully!'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Migration failed: {str(e)}'))
            raise
