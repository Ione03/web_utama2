from django.contrib.sites.models import Site

def get_site_id(request):    
    """
    Get **Site ID** khusus untuk halaman **Frontend**

    Ambil data **Site ID** berdasarkan **Domain** yang sedang aktif

    :param request: parameter ini untuk mendapatkan alamat **Domain**
    :type request: str                

    :return: **Site ID**, **0** jika site tidak ditemukan
    :rtype: int  
    """

    # Dipanggil di semua halaman
    # return langsung di variabel site_id, jika return = 0 render pesan error        
    # Khusus untuk front end
    # print(';localhost:8000;', request.get_host())
    site_id = Site.objects.filter(domain = request.get_host()).values_list('id', flat=True)    
    # print('site_id', site_id)
    if site_id:
        return site_id[0]
    return 0 # Not found