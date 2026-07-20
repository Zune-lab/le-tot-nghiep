document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================================
    // 0. CẤU HÌNH SUPABASE & GOOGLE SCRIPT
    // =========================================================
    const SUPABASE_URL = 'https://hehaxyxalywtsiwwihzc.supabase.co'; 
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlaGF4eXhhbHl3dHNpd3dpaHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0Nzk2MDIsImV4cCI6MjA5OTA1NTYwMn0.9RER8C6M1oNifiA2mi8FnlDjwHY6Y7iVYGVb4arQ5Bg'; 
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const GOOGLE_DRIVE_UPLOAD_URL = 'https://script.google.com/macros/s/AKfycbxTuMTeqhPyjgRB7VsuTpOEUQqKL8qH4l3zzheTGYSP1s6shkUiIDxoFdGa6BeguMwqPA/exec';

    // =========================================================
    // 0.5. NHỚ TÊN KHÁCH (LOCAL STORAGE) - đổi "invite Các bạns" thành "invited <tên>"
    //      nếu khách này đã từng RSVP trên máy/trình duyệt này rồi.
    // =========================================================
    const GUEST_NAME_KEY = 'baoanh_guest_name';

    function getSavedGuestName() {
        try {
            return localStorage.getItem(GUEST_NAME_KEY) || '';
        } catch (e) {
            console.warn('Không đọc được localStorage:', e);
            return '';
        }
    }

    function saveGuestName(name) {
        try {
            localStorage.setItem(GUEST_NAME_KEY, name);
        } catch (e) {
            console.warn('Không lưu được localStorage (có thể đang ở chế độ ẩn danh):', e);
        }
    }

    // Dùng textContent/createElement thay vì innerHTML để tên khách không bao giờ
    // bị hiểu nhầm thành thẻ HTML (chống XSS nếu ai đó nhập tên kiểu "<img onerror=...>")
    function renderInviteName(name) {
        const inviteEl = document.querySelector('.event-invite');
        if (!inviteEl || !name) return;
        inviteEl.textContent = 'invited ';
        const u = document.createElement('u');
        u.textContent = name;
        inviteEl.appendChild(u);
    }

    renderInviteName(getSavedGuestName());
    
    // =========================================================
    // 0.6. TOAST NOTIFICATION (thông báo nhỏ góc trên, dùng cho gửi ảnh...)
    // =========================================================
    function showToast(message, type = 'success', duration = 3200) {
        const container = document.getElementById('toast-container');
        if (!container) { alert(message); return; }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icon = document.createElement('span');
        icon.className = 'toast-icon';
        icon.textContent = type === 'success' ? '✅' : '⚠️';

        const text = document.createElement('span');
        text.textContent = message;

        toast.appendChild(icon);
        toast.appendChild(text);
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-out');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        }, duration);
    }
    window.showToast = showToast;

    // Bọc mỗi chữ trong 1 span màu cầu vồng (rc1..rc7), dùng cho tiêu đề modal
    function rainbowize(text) {
        const frag = document.createDocumentFragment();
        let colorIdx = 0;
        for (const ch of text) {
            const span = document.createElement('span');
            span.textContent = ch;
            if (/\s/.test(ch)) {
                // giữ nguyên khoảng trắng, không tính màu
            } else if (!/[\p{L}\p{N}]/u.test(ch)) {
                span.className = 'rc-dot';
            } else {
                colorIdx = (colorIdx % 7) + 1;
                span.className = `rc${colorIdx}`;
            }
            frag.appendChild(span);
        }
        return frag;
    }
    window.rainbowizeText = rainbowize;

    // =========================================================
    // 1. PARALLAX EFFECT CHO CHỮ 2026
    // =========================================================
    const parallaxLayer = document.querySelector('.parallax-layer');
    window.addEventListener('scroll', () => {
        requestAnimationFrame(() => {
            if(!parallaxLayer) return;
            const scrolled = window.scrollY;
            const speed = parseFloat(parallaxLayer.getAttribute('data-speed'));
            parallaxLayer.style.transform = `translate(-50%, calc(-50% - ${scrolled * speed}px)) rotate(-8deg) scaleY(1.15) skewX(-10deg)`;
        });
    });

    // =========================================================
    // 2. COUNTDOWN TIMER & MULTI-IMAGE DROP ZONE
    // =========================================================
    const targetDate = new Date('August 6, 2026 11:00:00').getTime();

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

        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.background = 'var(--baby-blue)'; });
        dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.style.background = 'var(--white)'; });
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
            
            if (validFiles.length !== newFiles.length) alert('Chỉ nhận file ảnh thôi nha homie ơi!');
            if (selectedFiles.length + validFiles.length > 10) { alert('Mỗi lần gửi tối đa 10 ảnh thôi. Gửi từ từ nha!'); return; }
            
            const oversized = validFiles.some(file => file.size > 8 * 1024 * 1024);
            if (oversized) { alert('Có ảnh bự quá (Trên 8MB). Chọn ảnh nhẹ hơn xíu nha!'); return; }

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
                    img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover';
                    img.style.border = '2px solid var(--navy-black)'; img.style.borderRadius = '4px';

                    const removeBtn = document.createElement('button');
                    removeBtn.innerHTML = '✖'; removeBtn.style.position = 'absolute';
                    removeBtn.style.top = '-8px'; removeBtn.style.right = '-8px';
                    removeBtn.style.background = 'var(--alert-red)'; removeBtn.style.color = 'var(--white)';
                    removeBtn.style.border = '2px solid var(--navy-black)'; removeBtn.style.borderRadius = '50%';
                    removeBtn.style.cursor = 'pointer'; removeBtn.style.fontWeight = 'bold';
                    removeBtn.style.width = '24px'; removeBtn.style.height = '24px';
                    
                    removeBtn.onclick = (event) => { event.preventDefault(); event.stopPropagation(); selectedFiles.splice(index, 1); renderPreviews(); };

                    imgWrapper.appendChild(img); imgWrapper.appendChild(removeBtn);
                    previewContainer.appendChild(imgWrapper);
                };
                reader.readAsDataURL(file);
            });
        }

        function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        sendBtn.addEventListener('click', async () => {
            if (selectedFiles.length === 0) return;

            if (!GOOGLE_DRIVE_UPLOAD_URL || GOOGLE_DRIVE_UPLOAD_URL.includes('DÁN_WEB_APP_URL')) {
                showToast('Chưa cấu hình nơi lưu ảnh (Google Drive). Xem hướng dẫn trong file google-drive-upload.gs nhé!', 'error');
                return;
            }

            const originalText = sendBtn.innerText;
            sendBtn.disabled = true;
            sendBtn.style.opacity = '0.6';
            sendBtn.innerText = `ĐANG GỬI ${selectedFiles.length} ẢNH... ⏳`;

            try {
                const guestNameInput = document.getElementById('guestName');
                const inputName = guestNameInput && guestNameInput.value.trim() ? guestNameInput.value.trim() : '';
                const guestName = inputName || getSavedGuestName();

                const filesPayload = await Promise.all(selectedFiles.map(async (file) => ({
                    filename: file.name,
                    mimeType: file.type || 'image/jpeg',
                    data: await fileToBase64(file)
                })));

                const res = await fetch(GOOGLE_DRIVE_UPLOAD_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ guestName, files: filesPayload })
                });

                const result = await res.json();

                if (result.status === 'success') {
                    sendBtn.innerText = 'ĐÃ GỬI THÀNH CÔNG! ✅';
                    sendBtn.style.background = 'var(--neon-green)';
                    showToast(`Đã gửi ${filesPayload.length} ảnh thành công! Cảm ơn homie 💙`, 'success');
                    selectedFiles = [];
                    renderPreviews();
                    setTimeout(() => {
                        sendBtn.innerText = originalText;
                        sendBtn.style.opacity = '1';
                        sendBtn.disabled = false;
                    }, 2500);
                } else {
                    throw new Error(result.message || 'Lỗi không xác định từ server.');
                }
            } catch (err) {
                console.error('Lỗi gửi ảnh lên Drive:', err);
                showToast('Gửi ảnh thất bại rồi 😢 Kiểm tra lại mạng hoặc thử lại sau nha!', 'error');
                sendBtn.innerText = originalText;
                sendBtn.style.opacity = '1';
                sendBtn.disabled = false;
            }
        });
    }

    // =========================================================
    // 3. RSVP FORM LOGIC
    // =========================================================
    const form = document.getElementById('rsvpForm');
    const btnSubmitForm = document.querySelector('.submit-btn:not(#sendImageBtn)'); 
    const guestCountInput = document.getElementById('guestCount');
    const guestNamesInput = document.getElementById('guestName');
    const guestMessageInput = document.getElementById('guestMsg');
    const successModal = document.getElementById('success-modal'); 

    if(guestCountInput) {
        guestCountInput.addEventListener('input', (e) => {
            const val = e.target.value;
            const count = parseInt(val);
            // 🚀 FIX LỖI RESET CHỮ (KIỂM TRA CHỖ TRỐNG HOẶC NaN)
            if (val === "" || isNaN(count) || count <= 1) {
                guestNamesInput.placeholder = 'Who r u?'; // Placeholder mặc định
            } else {
                guestNamesInput.placeholder = 'Tên các homie (VD: Vương, Hà...)';
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

            if (Number.isNaN(countNumber) || countNumber < 1) {
                alert("Số lượng homie phải lớn hơn hoặc bằng 1!");
                resetSubmitButton(); return;
            }

            if (!allNamesStr || allNamesStr.length < 2) {
                alert("Vui lòng nhập tên hợp lệ (ít nhất 2 ký tự)!");
                resetSubmitButton(); return;
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
                resetSubmitButton(); return;
            }

            const validNameRegex = /^[\p{L}\s]+$/u; 

            for (let i = 0; i < nameList.length; i++) {
                const name = nameList[i];
                if (name === "") { alert("Danh sách tên bị dư dấu phẩy."); resetSubmitButton(); return; }
                if (name.length < 2) { alert(`Tên "${name}" ngắn quá.`); resetSubmitButton(); return; }
                if (!validNameRegex.test(name)) { alert(`Tên "${name}" có ký tự lạ.`); resetSubmitButton(); return; }
            }

            if (rawMsg) {
                // 🚀 ÉP VỀ CHỮ THƯỜNG TRƯỚC: Thêm .toLowerCase() để trị tính năng viết hoa của điện thoại
                const msgNoSpaces = rawMsg.toLowerCase().replace(/\s+/g, ''); 
                
                // Giữ nguyên đoạn chống spam
                if (msgNoSpaces.length >= 4 && /^(.)\1+$/.test(msgNoSpaces)) {
                    alert("Lời nhắn toàn chữ lặp thế homie? Ghi gì đó ý nghĩa xíu đi!");
                    resetSubmitButton(); 
                    return;
                }
            }

            const msg = rawMsg || "Không có lời nhắn";

            try {
                const { error } = await supabase
                    .from('rsvps')
                    .insert([{ guest_count: countNumber, guest_names: allNamesStr, message: msg }]);

                if (error) {
                    console.error("Supabase Error:", error);
                    alert("Lỗi khi lưu dữ liệu. Vui lòng kiểm tra lại cấu hình nhé!");
                } else {
                    saveGuestName(allNamesStr);
                    renderInviteName(allNamesStr);

                    if (successModal) {
                        const titleEl = successModal.querySelector('h3');
                        titleEl.innerHTML = '';
                        titleEl.appendChild(rainbowize('ĐÃ CHỐT ĐƠN!'));
                        titleEl.appendChild(document.createTextNode(' 🚀'));
                        successModal.querySelector('p').innerText = "Đã nhận được thông tin xác nhận của bạn. Hẹn gặp nhé!";
                        successModal.classList.add('active'); 
                    } else {
                        showToast("Gửi thành công rồi nhé!", 'success');
                    }
                    
                    form.reset(); 
                    guestNamesInput.placeholder = 'Who r u?';
                }
            } catch (error) {
                alert("Mất mạng rồi rớt mạng rồi, check WiFi lại nhé!");
            } finally {
                resetSubmitButton();
            }
        });
    }

// =========================================================
    // 4. AUTO-EXPAND TEXTAREA CHO LỜI NHẮN (ĐÃ FIX BUG KẸT SCROLLBAR)
    // =========================================================
    const textareaMsg = document.getElementById('guestMsg');
    
    if(textareaMsg) {
        textareaMsg.addEventListener('input', function() {
            // 1. Đưa chiều cao về mức sàn (48px) để đo đạc lại từ đầu
            this.style.height = '48px'; 
            
            // 2. Lấy chiều cao thực tế của khối chữ bạn vừa gõ
            const newHeight = this.scrollHeight;
            
            // 3. Khóa cứng chiều cao nếu vượt quá giới hạn
            if (newHeight > 150) {
                // Nếu dài hơn 150px -> Khóa form ở 150px và BẬT thanh cuộn
                this.style.height = '150px';
                this.style.overflowY = 'auto';
            } else {
                // Nếu ngắn hơn 150px -> Cho phép phình to và TẮT thanh cuộn
                this.style.height = newHeight + 'px';
                this.style.overflowY = 'hidden';
            }
        });
    }
});
// =========================================================
// HÀM ĐÓNG MODAL (THÔNG BÁO)
// =========================================================
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
};