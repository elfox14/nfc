document.addEventListener('DOMContentLoaded', () => {
                const langBtn = document.getElementById('lang-toggle-btn');
                if (langBtn) {
                    const setLangText = () => {
                        const label = langBtn.querySelector('.tb-label');
                        if (label && label.textContent.trim() !== 'ع') {
                            label.textContent = 'ع';
                            langBtn.style.fontFamily = "'Tajawal', sans-serif";
                            langBtn.style.fontWeight = "bold";
                        } else if (!label && langBtn.textContent.trim() !== 'ع') {
                            langBtn.innerHTML = 'ع'; // Fallback if no tb-label span is present
                        }
                    };

                    // Initial set
                    setTimeout(setLangText, 100);

                    // Observer to prevent unwarranted changes
                    const observer = new MutationObserver((mutations) => {
                        observer.disconnect();
                        setLangText();
                        observer.observe(langBtn, { childList: true, characterData: true, subtree: true });
                    });

                    observer.observe(langBtn, { childList: true, characterData: true, subtree: true });
                }
            });
