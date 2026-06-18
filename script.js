document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================================
    // 1. PARALLAX EFFECT CHO CHỮ 2026
    // =========================================================
    const parallaxLayer = document.querySelector('.parallax-layer');

    window.addEventListener('scroll', () => {
        requestAnimationFrame(() => {
            const scrolled = window.scrollY;
            const speed = parseFloat(parallaxLayer.getAttribute('data-speed'));
            parallaxLayer.style.transform = `translate(-50%, calc(-50% - ${scrolled * speed}px)) rotate(-8deg) scaleY(1.15) skewX(-10deg)`;
        });
    });

    // =========================================================
    // 2. COUNTDOWN TIMER LOGIC
    // =========================================================
    const targetDate = new Date('August 15, 2026 08:00:00').getTime();

    const updateTimer = () => {
        const now = new Date().getTime();
        const diff = targetDate - now;

        const dEl = document.getElementById('days');
        const hEl = document.getElementById('hours');
        const mEl = document.getElementById('mins');

        if (diff < 0) {
            document.querySelector('.timer').innerHTML = "<h3 class='bubble-font' style='font-size: 2.5rem; color: var(--white); text-shadow: 4px 4px 0 var(--navy-black);'>IT'S GO TIME! 🔥</h3>";
            clearInterval(timerInterval);
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if(dEl) dEl.innerText = days < 10 ? '0' + days : days;
        if(hEl) hEl.innerText = hours < 10 ? '0' + hours : hours;
        if(mEl) mEl.innerText = mins < 10 ? '0' + mins : mins;
    };

    const timerInterval = setInterval(updateTimer, 1000);
    updateTimer();

    // =========================================================
    // 3. RSVP API INTEGRATION (BẢO MẬT & ACCESSIBILITY)
    // =========================================================
    const form = document.getElementById('rsvpForm');
    const successModal = document.getElementById('success-modal');
    const errorModal = document.getElementById('error-modal');
    const errorMessageEl = document.getElementById('error-message');
    
    const btnSubmit = document.querySelector('.submit-btn');
    const guestCountInput = document.getElementById('guestCount');
    const guestNamesInput = document.getElementById('guestName');
    const guestMessageInput = document.getElementById('guestMsg');

    guestCountInput.addEventListener('input', (e) => {
        const count = parseInt(e.target.value);
        if (count > 1) {
            guestNamesInput.placeholder = 'Tên các homie (VD: Vương, Hà...)';
        } else {
            guestNamesInput.placeholder = 'Tên gì ghi vô...';
        }
    });

    // MÃ HOÁ WEBHOOK BẰNG BASE64 ĐỂ TRÁNH BOT SCRAPING DỮ LIỆU
    // Lưu ý: Giải pháp này cản được bot cơ bản. Thực tế tốt nhất nên gọi qua một Serverless Function/Backend.
    const ENCODED_WEBHOOK_URL = 'aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTUxNjc1NDc3MTU3MzIxNTMxMy9oVW82dzAySTRhQ05mNUxUVFJ0NjlUSGNBNzUwWDBXaVlObERWOG5IQjVKNlozVEVVMTVyMF9TZENxbk9uUXNZRTdzeQ==';
    const DISCORD_WEBHOOK_URL = atob(ENCODED_WEBHOOK_URL);

    const showCustomAlert = (msg) => {
        errorMessageEl.innerText = msg;
        errorModal.classList.add('active');
    };

    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const originalBtnText = btnSubmit.innerText;
            btnSubmit.innerText = "ĐANG CHECK...";
            btnSubmit.disabled = true;
            btnSubmit.setAttribute('aria-disabled', 'true'); // Thuộc tính cho Screen Reader

            const count = guestCountInput.value;
            const countNumber = Number(count);
            const allNamesStr = guestNamesInput.value.trim();
            const msg = guestMessageInput.value || "Không có lời nhắn";

            const resetSubmitButton = () => {
                btnSubmit.innerText = originalBtnText;
                btnSubmit.disabled = false;
                btnSubmit.removeAttribute('aria-disabled');
            };

            // VALIDATION KHÁCH MỜI
            if (Number.isNaN(countNumber) || countNumber < 1) {
                showCustomAlert("Số lượng homie phải lớn hơn hoặc bằng 1!");
                resetSubmitButton();
                return;
            }

            if (!allNamesStr || allNamesStr.length < 2) {
                showCustomAlert("Vui lòng nhập tên hợp lệ (ít nhất 2 ký tự)!");
                resetSubmitButton();
                return;
            }

            const nameList = allNamesStr.split(',').map(n => n.trim());

            if (nameList.length !== countNumber) {
                if (countNumber === 1 && nameList.length > 1) {
                    showCustomAlert("Đi 1 người sao nhập nhiều tên vậy? Kiểm tra lại nha!");
                } else if (nameList.length < countNumber) {
                    showCustomAlert(`Bạn chọn ${countNumber} người. Nhớ nhập đủ ${countNumber} tên, cách nhau bằng dấu phẩy.`);
                } else {
                    showCustomAlert(`Chọn ${countNumber} người nhưng nhập tới ${nameList.length} tên. Dư quá rùi homie!`);
                }
                resetSubmitButton();
                return;
            }

            const validNameRegex = /^[\p{L}\s]+$/u; 

            for (let i = 0; i < nameList.length; i++) {
                const name = nameList[i];

                if (name === "") {
                    showCustomAlert("Danh sách tên bị dư dấu phẩy, sửa lẹ homie ơi.");
                    resetSubmitButton();
                    return;
                }

                if (name.length < 2) {
                    showCustomAlert(`Tên "${name}" ngắn quá. Phải có ít nhất 2 ký tự.`);
                    resetSubmitButton();
                    return;
                }

                if (!validNameRegex.test(name)) {
                    showCustomAlert(`Tên "${name}" có ký tự lạ. Chỉ nhận chữ cái và khoảng trắng thui.`);
                    resetSubmitButton();
                    return;
                }
            }

            const dateStr = new Date().toLocaleString('vi-VN'); 

            const textMessage = `🚀 **NEW RSVP | GRADUATION DROP 2026** 🚀\n\n` +
                                `👥 **Số lượng:** ${count} người\n` +
                                `👤 **Tên khách:** ${allNamesStr}\n` +
                                `💬 **Shoutout:** ${msg}\n` +
                                `🕒 **Thời gian log:** ${dateStr}`; 

            try {
                const response = await fetch(DISCORD_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: textMessage })
                });

                if (response.ok) {
                    successModal.classList.add('active'); 
                    form.reset(); 
                    guestNamesInput.placeholder = 'Tên gì ghi vô...';
                } else {
                    showCustomAlert("Lỗi Server: Discord từ chối nhận tin nhắn của bạn.");
                }
            } catch (error) {
                console.error("Lỗi:", error);
                showCustomAlert("Mất mạng rồi rớt mạng rồi, check WiFi lại nhé!");
            } finally {
                resetSubmitButton();
            }
        });
    }

    // Đóng Modal khi bấm OK
    window.closeModal = (modalId) => {
        const targetModal = document.getElementById(modalId);
        if(targetModal) targetModal.classList.remove('active');
    };
});