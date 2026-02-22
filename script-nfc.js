/**
 * script-nfc.js - Web NFC Implementation for MC PRIME
 * Handles writing cryptographically signed URLs to physical NFC Tags bridging to /r/:token backend routes.
 */

const NFCWriter = {
    reader: null,
    abortController: null,

    isSupported: function () {
        return 'NDEFReader' in window;
    },

    /**
     * @param {string} designShortId 
     * @param {HTMLElement} statusElement - Optional UI text container for updates
     * @param {function} onComplete - Callback when done
     */
    writeCard: async function (designShortId, statusElement, onComplete) {
        if (!this.isSupported()) {
            if (statusElement) statusElement.innerHTML = '<span style="color:#e74c3c;">متصفحك الحالي أو جهازك لا يدعم تقنية Web NFC. (متاح على متصفح Chrome لـ Android فقط)</span>';
            return;
        }

        try {
            if (statusElement) statusElement.innerHTML = 'جاري استخراج التوقيع الآمن...';

            // 1. Fetch Signed Token from the backend
            const response = await Auth.fetchWithAuth(`${Auth.getBaseUrl()}/api/nfc/sign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ designId: designShortId })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'فشل استخراج التوقيع');
            }

            const data = await response.json();
            const signedUrl = data.url; // e.g., https://mcprim.com/r/eyJhbG...

            // 2. Setup NDEF Writer
            if (statusElement) statusElement.innerHTML = 'يرجى تقريب بطاقة NFC من خلف الهاتف الآن... <i class="fas fa-spinner fa-spin"></i>';

            this.abortController = new AbortController();
            this.reader = new NDEFReader();

            await this.reader.write({
                records: [{ recordType: 'url', data: signedUrl }]
            }, {
                signal: this.abortController.signal,
                overwrite: true
            });

            if (statusElement) statusElement.innerHTML = '<span style="color:#2ecc71;"><i class="fas fa-check-circle"></i> تمت برمجة البطاقة بنجاح بالرابط الموقّع!</span>';
            if (onComplete) onComplete(true);

        } catch (error) {
            console.error('NFC Write Error:', error);
            if (error.name === 'AbortError') {
                if (statusElement) statusElement.innerHTML = '<span style="color:#f39c12;">تم تفعيل الإلغاء. لم يتم كتابة البطاقة.</span>';
            } else if (error.name === 'NotAllowedError') {
                if (statusElement) statusElement.innerHTML = '<span style="color:#e74c3c;">تم رفض صلاحية استخدام NFC. يرجى السماح للمتصفح باستخدام التقنية.</span>';
            } else {
                if (statusElement) statusElement.innerHTML = `<span style="color:#e74c3c;">خطأ: ${error.message || 'تعذر كتابة البطاقة!'}</span>`;
            }
            if (onComplete) onComplete(false, error);
        }
    },

    cancelWrite: function () {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
};

window.NFCWriter = NFCWriter;
