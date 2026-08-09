// Script này chạy rất sớm để chống lỗi querySelector của Chrome extension
// Không gây hydration error vì không dùng dangerouslySetInnerHTML

(function () {
    // Chỉ chạy ở client
    if (typeof document === 'undefined') return;

    // Nếu body chưa có → tạm thời override querySelector để tránh crash
    if (!document.body) {
        const originalQuerySelector = Document.prototype.querySelector;
        const originalQuerySelectorAll = Document.prototype.querySelectorAll;

        Document.prototype.querySelector = function () {
            return null;
        };

        Document.prototype.querySelectorAll = function () {
            return { length: 0 } as any;
        };

        const restore = () => {
            Document.prototype.querySelector = originalQuerySelector;
            Document.prototype.querySelectorAll = originalQuerySelectorAll;
            document.removeEventListener('DOMContentLoaded', restore);
            window.removeEventListener('load', restore);
        };

        document.addEventListener('DOMContentLoaded', restore);
        window.addEventListener('load', restore);
    }
})();
