const STORAGE_KEY = 'safio_encrypted_password';
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const getKey = async () => {
    const storedKey = localStorage.getItem('safio_crypto_key');
    if (storedKey) {
        return crypto.subtle.importKey('jwk', JSON.parse(storedKey), { name: 'AES-GCM' }, false, [
            'encrypt',
            'decrypt',
        ]);
    }
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const exportedKey = await crypto.subtle.exportKey('jwk', key);
    localStorage.setItem('safio_crypto_key', JSON.stringify(exportedKey));
    return key;
};
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
};
const base64ToArrayBuffer = (value: string) => {
    const binary = window.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};
export const saveLoginPassword = async (password: string) => {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(password));
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            iv: arrayBufferToBase64(iv.buffer),
            data: arrayBufferToBase64(encrypted),
        })
    );
};
export const getLoginPassword = async () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return '';
        const { iv, data } = JSON.parse(stored);
        const key = await getKey();
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(base64ToArrayBuffer(iv)) },
            key,
            base64ToArrayBuffer(data)
        );
        return textDecoder.decode(decrypted);
    } catch {
        removeLoginPassword();
        return '';
    }
};
export const removeLoginPassword = () => {
    localStorage.removeItem(STORAGE_KEY);
};
