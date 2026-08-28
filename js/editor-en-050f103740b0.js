document.addEventListener('DOMContentLoaded', function () {
            // Set English placeholders for input fields
            setTimeout(function () {
                const nameInput = document.getElementById('input-name_ar');
                const taglineInput = document.getElementById('input-tagline_ar');

                if (nameInput) {
                    nameInput.placeholder = 'Your Full Name Here';
                    if (!nameInput.value || nameInput.value === 'اسمك الكامل هنا') {
                        nameInput.value = 'Your Full Name Here';
                    }
                }
                if (taglineInput) {
                    taglineInput.placeholder = 'Job Title / Company';
                    if (!taglineInput.value || taglineInput.value === 'المسمى الوظيفي / الشركة') {
                        taglineInput.value = 'Job Title / Company';
                    }
                }
            }, 100);
        });
