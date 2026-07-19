document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================================
    // 0. CẤU HÌNH SUPABASE (LƯU Ý: THAY KEY CỦA BẠN VÀO NHÉ)
    // =========================================================
    const SUPABASE_URL = 'https://hehaxyxalywtsiwwihzc.supabase.co'; 
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlaGF4eXhhbHl3dHNpd3dpaHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0Nzk2MDIsImV4cCI6MjA5OTA1NTYwMn0.9RER8C6M1oNifiA2mi8FnlDjwHY6Y7iVYGVb4arQ5Bg'; // Key bắt đầu bằng eyJ
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // =========================================================
    // 1. PARALLAX EFFECT CHO CHỮ 2026
    // =========================================================
    const parallaxLayer = document.querySelector('.parallax-layer');

    window.addEventListener('scroll', () => {
        requestAnimationFrame(() => {
            const scrolled = window.scrollY;
            const speed = parseFloat(parallaxLayer.getAttribute('data-speed'));
            if(parallaxLayer) parallaxLayer.style.transform = `translate(-50%, calc(-50% - ${scrolled * speed}px)) rotate(-8deg) scaleY(1.15) skewX(-10deg)`;
        });
    });

    // =========================================================
    // 2. COUNTDOWN TIMER & MULTI-IMAGE DROP ZONE
    // =========================================================
    const targetDate = new Date('August 15, 2026 08:00:00').getTime();

    const updateTimer = () => {
        const now = new Date().getTime();
        const diff = targetDate - now;

        const dEl = document.getElementById('days');
        const hEl = document.getElementById('hours');
        const mEl = document.getElementById('mins');

        if (diff < 0) {
            clearInterval(timerInterval);
            
            const peekSticker = document.querySelector('.box-countdown .peek-2');
            if(peekSticker) {
                peekSticker.innerText = "📸 PHOTO DROP!";
                peekSticker.style.background = "var(--hot-pink)";
                peekSticker.style.color = "var(--white)";
            }

            const timerContainer = document.querySelector('.timer');
            if(timerContainer) {
                timerContainer.innerHTML = `
                    <div class="drop-zone-wrapper" style="width: 100%; display: flex; flex-direction: column; gap: 15px; align-items: center;">
                        <label for="imageUpload" class="drop-zone" style="width: 100%; border: 3px dashed var(--navy-black); background: var(--white); padding: 30px 10px; text-align: center; cursor: pointer; transition: 0.2s;">
                            <h3 class="bubble-font drop-title" style="font-size: 1.6rem; color: var(--hot-pink); margin-bottom: 5px;">📸 CHỌN ẢNH DROP</h3>
                            <p style="font-weight: 900; font-size: 0.85rem; color: var(--navy-black);">Click hoặc Kéo thả ảnh (Tối đa 10 ảnh)</p>
                            <input type="file" id="imageUpload" accept="image/*" multiple style="display: none;">
                        </label>
                        
                        <div id="imagePreviewContainer" style="display: none; width: 100%; max-height: 250px; overflow-y: auto; flex-wrap: wrap; gap: 10px; justify-content: center; padding: 10px; border: 4px solid var(--navy-black); background: var(--white); box-shadow: 4px 4px 0 var(--navy-black);"></div>
                        
                        <button id="sendImageBtn" class="submit-btn bubble-font" style="display: none; width: 100%; background: var(--neon-green);">GỬI ẢNH LÊN SERVER 🚀</button>
                    </div>
                `;
                initDropZone(); 
            }
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if(dEl) dEl.innerText = days < 10 ? '0' + days : days;
        if(hEl) hEl.innerText = hours < 10 ? '0' + hours : hours;
        if(mEl) mEl.innerText = mins < 10 ? '0' + mins : mins;
    };

    let timerInterval = setInterval(updateTimer, 1000);
    updateTimer();

    // HÀM XỬ LÝ UP NHIỀU ẢNH
    function initDropZone() {
        const uploadInput = document.getElementById('imageUpload');
        const dropZone = document.querySelector('.drop-zone');
        const previewContainer = document.getElementById('imagePreviewContainer');
        const sendBtn = document.getElementById('sendImageBtn');
        const dropTitle = document.querySelector('.drop-title');
        
        let selectedFiles = []; 

        uploadInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) handleFiles(this.files);
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.background = 'var(--baby-blue)';
        });
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.style.background = 'var(--white)';
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.background = 'var(--white)';
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                uploadInput.files = e.dataTransfer.files; 
                handleFiles(e.dataTransfer.files);
            }
        });

        function handleFiles(files) {
            const newFiles = Array.from(files);
            const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
            
            if (validFiles.length !== newFiles.length) {
                alert('Chỉ nhận file ảnh thôi nha homie ơi!');
            }
            
            if (selectedFiles.length + validFiles.length > 10) {
                alert('Mỗi lần gửi tối đa 10 ảnh thôi. Gửi từ từ nha!');
                return;
            }

            const oversized = validFiles.some(file => file.size > 8 * 1024 * 1024);
            if (oversized) {
                alert('Có ảnh bự quá (Trên 8MB). Chọn ảnh nhẹ hơn xíu nha!');
                return;
            }

            selectedFiles = [...selectedFiles, ...validFiles];
            renderPreviews();
            uploadInput.value = ''; 
        }

        function renderPreviews() {
            if (selectedFiles.length === 0) {
                previewContainer.style.display = 'none';
                sendBtn.style.display = 'none';
                dropTitle.innerText = '📸 CHỌN ẢNH DROP';
                return;
            }

            previewContainer.innerHTML = '';
            previewContainer.style.display = 'flex';
            sendBtn.style.display = 'block';
            dropTitle.innerText = `📸 ĐÃ CHỌN ${selectedFiles.length} ẢNH (Click thêm)`;

            selectedFiles.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imgWrapper = document.createElement('div');
                    imgWrapper.style.position = 'relative';
                    imgWrapper.style.width = '80px';
                    imgWrapper.style.height = '80px';
                    
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    img.style.border = '2px solid var(--navy-black)';
                    img.style.borderRadius = '4px';

                    const removeBtn = document.createElement('button');
                    removeBtn.innerHTML = '✖';
                    removeBtn.style.position = 'absolute';
                    removeBtn.style.top = '-8px';
                    removeBtn.style.right = '-8px';
                    removeBtn.style.background = 'var(--alert-red)';
                    removeBtn.style.color = 'var(--white)';
                    removeBtn.style.border = '2px solid var(--navy-black)';
                    removeBtn.style.borderRadius = '50%';
                    removeBtn.style.cursor = 'pointer';
                    removeBtn.style.fontWeight = 'bold';
                    removeBtn.style.width = '24px';
                    removeBtn.style.height = '24px';
                    
                    removeBtn.onclick = (event) => {
                        event.preventDefault(); 
                        event.stopPropagation();
                        selectedFiles.splice(index, 1); 
                        renderPreviews(); 
                    };

                    imgWrapper.appendChild(img);
                    imgWrapper.appendChild(removeBtn);
                    previewContainer.appendChild(imgWrapper);
                };
                reader.readAsDataURL(file);
            });
        }

        sendBtn.addEventListener('click', async () => {
            if (selectedFiles.length === 0) return;
            
            // LƯU Ý CHO VƯƠNG: 
            // Vì Discord đang hư, chỗ gửi ảnh này tạm thời bị chặn lại để không phát sinh lỗi.
            // Nếu bạn muốn lưu ảnh lên Supabase, bạn sẽ cần setup tính năng Storage Bucket của Supabase.
            alert("Tính năng gửi ảnh tạm thời bảo trì vì server đang được nâng cấp! Bạn quay lại sau nhé.");
            
            // Reset sau khi bấm
            selectedFiles = [];
            renderPreviews();
        });
    }

    // =========================================================
    // 3. RSVP FORM LOGIC (Xác nhận đi chơi - Đã tích hợp Supabase)
    // =========================================================
    const form = document.getElementById('rsvpForm');
    const btnSubmitForm = document.querySelector('.submit-btn:not(#sendImageBtn)'); 
    const guestCountInput = document.getElementById('guestCount');
    const guestNamesInput = document.getElementById('guestName');
    const guestMessageInput = document.getElementById('guestMsg');
    const successModal = document.getElementById('success-modal'); // Đảm bảo bạn có modal này trong HTML

    if(guestCountInput) {
        guestCountInput.addEventListener('input', (e) => {
            const count = parseInt(e.target.value);
            if (count > 1) {
                guestNamesInput.placeholder = 'Tên các homie (VD: Vương, Hà...)';
            } else {
                guestNamesInput.placeholder = 'Tên gì ghi vô...';
            }
        });
    }

    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const originalBtnText = btnSubmitForm.innerText;
            btnSubmitForm.innerText = "ĐANG CHECK...";
            btnSubmitForm.disabled = true;
            btnSubmitForm.setAttribute('aria-disabled', 'true'); 

            const count = guestCountInput.value;
            const countNumber = Number(count);
            const allNamesStr = guestNamesInput.value.trim();
            const rawMsg = guestMessageInput.value.trim(); 

            const resetSubmitButton = () => {
                btnSubmitForm.innerText = originalBtnText;
                btnSubmitForm.disabled = false;
                btnSubmitForm.removeAttribute('aria-disabled');
            };

            // Validate logic giữ nguyên
            if (Number.isNaN(countNumber) || countNumber < 1) {
                alert("Số lượng homie phải lớn hơn hoặc bằng 1!");
                resetSubmitButton();
                return;
            }

            if (!allNamesStr || allNamesStr.length < 2) {
                alert("Vui lòng nhập tên hợp lệ (ít nhất 2 ký tự)!");
                resetSubmitButton();
                return;
            }

            const nameList = allNamesStr.split(',').map(n => n.trim());

            if (nameList.length !== countNumber) {
                if (countNumber === 1 && nameList.length > 1) {
                    alert("Đi 1 người sao nhập nhiều tên vậy? Kiểm tra lại nha!");
                } else if (nameList.length < countNumber) {
                    alert(`Bạn chọn ${countNumber} người. Nhớ nhập đủ ${countNumber} tên.`);
                } else {
                    alert(`Dư tên rồi homie!`);
                }
                resetSubmitButton();
                return;
            }

            const validNameRegex = /^[\p{L}\s]+$/u; 

            for (let i = 0; i < nameList.length; i++) {
                const name = nameList[i];
                if (name === "") { alert("Danh sách tên bị dư dấu phẩy."); resetSubmitButton(); return; }
                if (name.length < 2) { alert(`Tên "${name}" ngắn quá.`); resetSubmitButton(); return; }
                if (!validNameRegex.test(name)) { alert(`Tên "${name}" có ký tự lạ.`); resetSubmitButton(); return; }
            }

            if (rawMsg) {
                const msgNoSpaces = rawMsg.replace(/\s+/g, ''); 
                if (msgNoSpaces.length >= 4 && /^(.)\1+$/.test(msgNoSpaces)) {
                    alert("Lời nhắn toàn chữ lặp thế homie? Ghi gì đó ý nghĩa xíu đi!");
                    resetSubmitButton();
                    return;
                }
            }

            const msg = rawMsg || "Không có lời nhắn";

            try {
                // BẮN DATA LÊN BẢNG 'rsvps' CỦA SUPABASE
                const { error } = await supabase
                    .from('rsvps')
                    .insert([
                        { 
                            guest_count: countNumber, 
                            guest_names: allNamesStr, 
                            message: msg 
                        }
                    ]);

                if (error) {
                    console.error("Supabase Error:", error);
                    alert("Lỗi khi lưu dữ liệu. Vui lòng kiểm tra lại cấu hình nhé!");
                } else {
                    if (successModal) {
                        successModal.querySelector('h3').innerText = "ĐÃ CHỐT ĐƠN! 🚀";
                        successModal.querySelector('p').innerText = "Đã nhận được thông tin xác nhận của bạn. Hẹn gặp nhé!";
                        successModal.classList.add('active'); 
                    } else {
                        alert("Gửi thành công rồi nhé!");
                    }
                    
                    form.reset(); 
                    guestNamesInput.placeholder = 'Tên gì ghi vô...';
                }
            } catch (error) {
                alert("Mất mạng rồi rớt mạng rồi, check WiFi lại nhé!");
            } finally {
                resetSubmitButton();
            }
        });
    }
});
// =========================================================
    // 4. AUTO-EXPAND TEXTAREA CHO LỜI NHẮN (ĐÃ FIX LỖI KẸT XÓA CHỮ)
    // =========================================================
    const textareaMsg = document.getElementById('guestMsg');
    
    if(textareaMsg) {
        textareaMsg.addEventListener('input', function() {
            // 1. Reset chiều cao về auto để ép nó thu nhỏ lại khi xóa chữ
            this.style.height = 'auto'; 
            
            // 2. Tính chiều cao chữ + CỘNG THÊM 8PX VIỀN ĐEN (4px trên + 4px dưới)
            const newHeight = this.scrollHeight + 8;
            
            // 3. Set chiều cao mới
            this.style.height = newHeight + 'px';
            
            // 4. Khóa thanh cuộn nếu chưa vượt quá 180px
            if (newHeight >= 180) {
                this.style.overflowY = 'auto';
            } else {
                this.style.overflowY = 'hidden';
            }
        });
    }
    // =========================================================
// HÀM ĐÓNG MODAL (THÔNG BÁO)
// =========================================================
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
};