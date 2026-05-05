// Service Worker (sw.js) - v4

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// ✅ 主要：接收伺服器推送並顯示通知
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    event.waitUntil(
        self.registration.showNotification(data.title || '🧋 胖肚肚截止倒數！', {
            body: data.body || '只剩 10 分鐘就截止了，快去填下午茶單！',
            icon: 'https://cdn-icons-png.flaticon.com/512/2722/2722527.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/2722/2722527.png',
            tag: 'drink-reminder',
            requireInteraction: true,
            data: { url: data.url || 'https://funeral1234.github.io/tomb/fatdudoo/fatdudoo.html' }
        })
    );
});

// 點擊通知時自動開啟表單
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

// IndexedDB 封裝
async function getLastNotifiedDate() {
    return new Promise((resolve) => {
        const request = indexedDB.open("NotificationDB", 1);
        request.onupgradeneeded = (e) => e.target.result.createObjectStore("settings");
        request.onsuccess = (e) => {
            const db = e.target.result;
            const store = db.transaction("settings", "readonly").objectStore("settings");
            const getRequest = store.get("lastNotifiedDate");
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => resolve(null);
        };
        request.onerror = () => resolve(null);
    });
}