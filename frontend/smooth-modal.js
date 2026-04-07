
document.addEventListener("DOMContentLoaded", () => {    
    let uniqueName = 'name';
    let ww=300, hh=300;

    $("#value_image").on("change", function (event) {
        // console.log('on change image value');
        										
        const file = event.target.files[0];
        // const file = this.files[0];
        //     <input id="modalWidth" name="modalType" type="text" x-model="smFormData.modalWidth"/>
        //    <input id="modalHeight" n

        const img_width = document.getElementById('modalWidth');
        const img_height = document.getElementById('modalHeight');

        // console.log('img_dim', img_width.value, 'x', img_height.value);
        // width = elem.getAttribute('data-modal-width');
        // height = elem.getAttribute('data-modal-height');        
        ww = img_width.value;
        hh =img_height.value;
        if (file && file.type.startsWith('image/')) {
            smartCropImage(file, ww, hh, (resizedBlob) => {								
                // Kembalikan ke inputbox element html (agar dikirim bersama proses submit)

                uniqueName = `${siteId}_${new Date().toISOString().replace(/[-:.TZ]/g, '')}`;
                ext = getFileExtension(file.name);
                uniqueName = uniqueName + "." + ext;
                // console.log('unique name', uniqueName);
                
                // file.name
                const resizedFile = new File([resizedBlob], uniqueName, { type: file.type });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(resizedFile);
                this.files = dataTransfer.files;
            });
        } else {
            alert('Please select a valid image file.');
            // event.target.value = ''; // Clear the input
            this.value = '';
        };								
    
    });
});

function smartCropImage(file, targetWidth, targetHeight, callback) {
    const reader = new FileReader();

    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            // Create canvas for the final output
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');

            // Use Smartcrop to find the best crop
            SmartCrop.crop(img, {
                width: targetWidth,
                height: targetHeight,
                minScale: 0.8, // Minimum scale to consider (adjust as needed)
                ruleOfThirds: true,
                faceDetection: {
                    enabled: true,
                    weight: 0.9
                }
            }, function(result) {
                // Apply the best crop found
                const crop = result.topCrop;
                
                // Draw the cropped and resized image
                ctx.drawImage(
                    img,
                    crop.x, crop.y,            // Source x, y
                    crop.width, crop.height,   // Source width, height
                    0, 0,                      // Destination x, y
                    targetWidth, targetHeight  // Destination width, height
                );

                // Convert to Blob and pass to callback
                canvas.toBlob(
                    (blob) => {
                        callback(blob);
                    },
                    file.type || 'image/jpeg',  // Fallback to JPEG if type not available
                    0.9                        // Quality
                );
            });
        };
        img.src = event.target.result;
    };

    reader.readAsDataURL(file);
};

function getFileExtension(filename) {
    const match = filename.match(/\.(\w+)$/);
    return match ? match[1] : '';
};

function smModalData() {
    return {
        smIsOpen: false,
        // smWidth: 0,
        // smHeight: 0,

        smFormData: {
            modalTitle: '',
            modalCode: '',
            modalType: 'text',
            modalWidth: 300,    
            modalHeight: 300,
            modalList: 0,

            value_text: '',
            value_textarea: '',
            value_image: null,
            imagePreview: null
        },
        
        smOpenModal(elem) {
            title = elem.getAttribute('data-modal-title');
            code = elem.getAttribute('data-modal-code');            
            type = elem.getAttribute('data-modal-type');
            width = elem.getAttribute('data-modal-width');
            height = elem.getAttribute('data-modal-height');            
            list = elem.getAttribute('data-modal-list');         
            
            if (list>0) {
                // code = code + '-' + (currentSliderItem+1).toString();
                // console.log('code on modal form', code);
                code = 'slideshow-image-' + (currentSliderItem+1).toString();
                console.log('code on modal form', code);
                
                let elem2 = document.getElementById(code);
                elem.setAttribute('data-modal-code', code);
                elem.setAttribute('data-modal-width', elem2.getAttribute('data-modal-width'));
                elem.setAttribute('data-modal-height', elem2.getAttribute('data-modal-height'));
            };

            this.smFormData.modalTitle = title;
            this.smFormData.modalCode = code;
            this.smFormData.modalType = type;
            this.smFormData.modalWidth = width;
            this.smFormData.modalHeight = height;
            this.smFormData.modalList = list;

            
            // console.log('parameter=', type, title, code);
            // this.smFormData.modalType = modalType;
            this.smIsOpen = true;
            
            // Reset form values
            this.smFormData.value_text = title;
            this.smFormData.value_textarea = '';
            this.smFormData.value_image = null;

            if (list>0) {
                // alert('Change Slide Show Image ' + currentSliderItem.toString());
                str = imgList[currentSliderItem];
                const path = str.replace(/^url\("([^"]+)"\)$/, '$1');
                // console.log(path);

                // console.log('Image', path);
                this.smFormData.value_image = path;
                this.smFormData.modalType = 'image';
                this.smFormData.modalTitle = path;
                // $('.slider-item-show').css({
                //     'background-image': imgList[currentSliderItem]
                // });
                this.smFormData.imagePreview = null;             
            }
            else {
                const elem_img = elem.querySelector('img');
                // console.log('elem_img', elem_img);
                if (elem_img) {
                    // console.log(';orev', this.smFormData.imagePreview);
                    
                    const img = elem_img.getAttribute('src');
                    // console.log('img', img);
                    // console.log('log', this.$refs.image.src);
                    this.$refs.image.src = img;
                    // console.log('log', this.$refs.image.src);
                    this.smFormData.modalTitle = img;

                    // this.smFormData.imagePreview = img;   
                    this.smFormData.imagePreview = null;             
                }
            };

            // else {
            //     console.log('MODALtitle', this.smFormData.modalTitle);
            //     console.log('title', title);
            //     this.smFormData.value_text = title;
                // this.smFormData.value_text.disabled = true;

                // Set focus to the second input
                // this.smFormData.value_text.focus();

                // document.querySelector('#value_text').disabled = true;
                // console.log(document.querySelector('value_text'));
                // document.querySelector('value_text').textContent = 'apa';
            // }
        },
        
        smCloseModal() {
            this.smIsOpen = false;
        },
        
        smHandleImageUpload(event) {
            const file = event.target.files[0];
            console.log('FILE', file);
            if (file) {
                this.smFormData.value_image = file;
                // Create preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.smFormData.imagePreview = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        },
        
        // smGetDimensions() {
        //     // const img = this.$refs.image;
        //     this.smWidth = this.smFormData.modalWidth; //img.naturalWidth;
        //     this.smHeight = this.smFormData.modalHeight; //img.naturalHeight;
        // },
        
        smSubmitForm() {
            // this.preventDefault();

            // Validate form based on type
            if (this.smFormData.modalType === 'text' && !this.smFormData.value_text) {
                alert('Please enter text');
                return;
            }
            
            if (this.smFormData.modalType === 'textarea' && !this.smFormData.value_textarea) {
                alert('Please enter content');
                return;
            }
            
            if (this.smFormData.modalType === 'image' && !this.smFormData.value_image) {
                alert('Please select an image');
                return;
            }
            
            // Call your existing function
            sm_send_request_ajax(this.smFormData);
            
            // Close modal
            this.smCloseModal();
        }
    };
};

function sm_send_image() {
    const csrftoken = getCookie('csrftoken');
    const form = document.querySelector('#infoForm');
    const formData = new FormData(form);

    console.log('SEND IMAGE');
    // const formData = new FormData(frmData);
    fetch('/id/api/post-direct-update/', {
        method: 'POST',
        headers: {
            // 'Content-Type': 'application/json', // Bedanya disini (jika ini diaktifkan maka error saat upload image)
            // header type otomatis dipiliah saat menggunakan FormData()
            'X-CSRFToken': csrftoken
        },
        body: formData                 
    })
    .then(response => {
        // console.log('Response status:', response.status); // Log the response status
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: FAIL`);
        };
        // alert(response.json());
        return response.json();
    })
    .then(data => {
        // alert('Update disini ' + data);
        // console.log('DATA=', data.Data);
        // console.log('DATA=', data.Data.value_image_url);
        // alert('Data received: ' + JSON.stringify(data, null, 2)); // Log the received data
        // alert('Data received: ' + data); // Log the received data  
        // alert('rrrr->', data.Data.value_image_url);
        if (data.Data.code.includes('slideshow-image')) {
            // console.log('data.Data.value_image_url', data.Data.value_image_url);
            // $('.slider-item-show').css({
            //     'background-image': data.Data.value_image_url
            // });
            // console.log('imgList[currentSliderItem] ', imgList[currentSliderItem] );
            
            // imgList[currentSliderItem] = 'url("' + data.Data.value_image_url + '")';
            
            // const elem = document.querySelector('#' + data.Data.code);
            elem = document.getElementById(data.Data.code);
            // console.log('BEFORE IMAGE2', data.Data.code, elem);
            // console.log('IMAGE2', data.Data.value_image_url, data.Data.value_image);
            elem.style = "background-image : url('" +  data.Data.value_image_url + "')";

            // setTimeout(() => {
            //     // do nothing...
            // }, 70);

            // paksa update langsung imgLIst
            // imgList[currentSliderItem] = 'url("' + data.Data.value_image_url + '")';
            // console.log('Update slide show IMAGE2 '+ imgList);
            // document.getElementById(data.Data.code).style = "background-image : url('" +  data.Data.value_image_url + "')";

            // console.log('AFTER IMAGE2', data.Data.code, elem);
            begin_slide_show();
            // console.log('Update slide show IMAGE2 '+ imgList);
            // console.log('imgList[currentSliderItem] ', imgList );
        }
        else
            document.querySelector('#' + data.Data.code).querySelector('img').setAttribute('src', data.Data.value_image_url);
    })
    .catch(error => {
        console.log('Error:' + error.message);
    });
};

function sm_send_text() {
    const csrftoken = getCookie('csrftoken');
    const form = document.querySelector('#infoForm');
    const formData = new FormData(form);

    console.log('SEND TEXT', formData.modalTitle);
    // const formData = new FormData(frmData);
    fetch('/id/api/post-direct-update/', {
        method: 'POST',
        headers: {
            // 'Content-Type': 'application/json', // Bedanya disini (jika ini diaktifkan maka error saat upload image)
            // header type otomatis dipiliah saat menggunakan FormData()
            'X-CSRFToken': csrftoken
        },
        // body: JSON.stringify(formData)
        body: formData
    })
    .then(response => {
        // console.log('Response status:', response.status); // Log the response status
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: FAIL`);
        };
        // alert(response.json());
        return response.json();
    })
    .then(data => {
        // alert('Update disini ' + data);
        // console.log('DATA=', data.Data);
        // console.log('DATA=', data.Data.value_image_url);
        // alert('Data received: ' + JSON.stringify(data, null, 2)); // Log the received data
        // alert('Data received: ' + data.Data); // Log the received data  
        // console.log('data.Data', data.Data);
        // console.log('ELEM',  data.Data.code);
        const elem = document.querySelector('#' + data.Data.code);
        const elem_header = document.querySelector('#' + data.Data.code + '-1');

        // console.log('ELEM', elem, elem_header, data.Data.value_text, data.Data.code);
        
        if (elem) {
            elem.textContent = data.Data.value_text;
            elem.setAttribute('data-modal-title', data.Data.value_text);
        };

        if (elem_header) {
            elem_header.textContent = data.Data.value_text;
        };

        sm_update_slideshow(data.Data.code);
        // begin_slide_show();
        // getImage();
        // document.querySelector('#' + data.Data.code).querySelector('img').setAttribute('src', data.Data.value_image_url);
    })
    .catch(error => {
        console.log('Error:' + error.message);
    });
};

function sm_update_slideshow(code) {
    console.log('Inside Update Slide Show');
    const csrftoken = getCookie('csrftoken');
    // const form = document.querySelector('#infoForm');
    const formData = new FormData();
    // Add text data to FormData
    if (code.includes('slideshow-image')) {
        console.log('Update slide show IMAGE');
        formData.append('modalType', 'image');
        formData.append('value_image', '');    
    }
    else {
        formData.append('modalType', 'text');    
        formData.append('value_text', '');    
    };

    formData.append('modalTitle', '');    // samakan agar cuma ambil data saja (bukan update)    
    formData.append('modalCode', code);   
    console.log('code', code);
    
    // const formData = new FormData(frmData);
    fetch('/id/api/get-direct-update/', {
        method: 'POST',
        headers: {
            // 'Content-Type': 'application/json', // Bedanya disini (jika ini diaktifkan maka error saat upload image)
            // header type otomatis dipiliah saat menggunakan FormData()
            'X-CSRFToken': csrftoken
        },
        // body: JSON.stringify(formData)
        body: formData
    })
    .then(response => {
        // console.log('Response status:', response.status); // Log the response status
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: FAIL`);
        };
        // alert(response.json());
        return response.json();
    })
    .then(data => {
        // alert('Update disini ' + data);
        // console.log('DATA=', data.Data);
        // console.log('DATA=', data.Data.value_image_url);
        // alert('Data received: ' + JSON.stringify(data, null, 2)); // Log the received data
        // alert('Data received: ' + data.Data); // Log the received data  
        // console.log('data Slide Show', data);   
        
        // console.log('data.Data.code-->', data.Data.code, elem, code);
            
        // if (elem) {
        if (code.includes('slideshow-image')) {                
            const elem = document.querySelector('#' + data.Data.code);
            console.log('IMAGE', data.Data.value_image_url, data.Data.value_image);
            elem.style = "background-image : url('" +  data.Data.value_image_url + "')";
            // imgList[currentSliderItem] = 'url("' + data.Data.value_image_url + '")';
            console.log('Update slide show IMAGE '+ imgList);
        }
        else { 
            const elem = document.querySelector('#' + data.Data.code + '-1');
            elem.textContent = data.Data.value_text;     

        };
            // console.log('Update to', data.Data.value_text);
        // };
        begin_slide_show();
    })
    .catch(error => {
        console.log('Error:' + error.message);
    });
};

// Your existing function (mock implementation)
function sm_send_request_ajax(frmData) {
    // This would be your existing AJAX function
    // console.log('Form submitted with:', {
    //     // modalTitle: document.getElementById('modalTitle').value,
    //     // modalCode: document.getElementById('modalCode').value,
    //     // modalType: document.getElementById('modalType').value
    //     frmData
    // });
    // console.log('Form submitted with', frmData.value_image);
    mType = frmData.modalType;
    if (mType == 'image')
        sm_send_image()
    else if (mType == 'text')
        sm_send_text()

    
    
    // Show success message
    // alert('Data berhasil diperbarui! Pengunjung website akan melihat perubahan tersebut.');
};

// Demo function to open modal with different types
function openTextModal() {
    Alpine.data('modalData').openModal('text', 'Website Title', 'title', 'text');
};

function openTextareaModal() {
    Alpine.data('modalData').openModal('textarea', 'About Us Content', 'about', 'textarea');
};

function openImageModal() {
    Alpine.data('modalData').openModal('image', 'Hero Image', 'hero', 'image');
};

$(document).ready(function () {
    sm_update_slideshow('slideshow-title-1');
    sm_update_slideshow('slideshow-title-2');
    sm_update_slideshow('slideshow-title-3');
    sm_update_slideshow('slideshow-subtitle-1');
    sm_update_slideshow('slideshow-subtitle-2');
    sm_update_slideshow('slideshow-subtitle-3');
    // sm_update_slideshow('slideshow-image-1');
    // sm_update_slideshow('slideshow-image-2');
    // sm_update_slideshow('slideshow-image-3');
    // console.log('Load all data slide show from database');
    begin_slide_show();

    document.getElementById('value_text').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission
        }
    });
});