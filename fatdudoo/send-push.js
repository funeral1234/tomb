const webpush = require('web-push');

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

async function main() {
    // 從 JSONBin 讀取所有訂閱（用主要金鑰）
    const resp = await fetch(
        `https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}/latest`,
        { headers: { 'X-Master-Key': process.env.JSONBIN_MASTER_KEY } }
    );
    const data = await resp.json();
    const allRecords = Array.isArray(data.record) ? data.record : [];
    // 過濾掉無效的項目（空字串、沒有 endpoint 的物件等）
    const subscriptions = allRecords.filter(s => s && typeof s === 'object' && s.endpoint);

    // 若有無效項目，自動清理 JSONBin
    if (subscriptions.length !== allRecords.length) {
        console.log(`⚠️ 發現 ${allRecords.length - subscriptions.length} 筆無效訂閱，自動清除...`);
        await fetch(`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: { 'X-Master-Key': process.env.JSONBIN_MASTER_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify(subscriptions)
        });
    }

    console.log(`共 ${subscriptions.length} 個有效訂閱，開始發送...`);
    if (subscriptions.length > 0) {
        console.log('第一筆訂閱結構：', JSON.stringify(subscriptions[0], null, 2));
    }

    if (subscriptions.length === 0) {
        console.log('沒有訂閱，結束。');
        return;
    }

    const payload = JSON.stringify({
        title: '🧋 胖肚肚截止倒數！',
        body: '只剩 10 分鐘就截止了，快去填下午茶單！',
        url: 'https://funeral1234.github.io/tomb/fatdudoo/fatdudoo.html'
    });

    const expired = [];

    await Promise.all(
        subscriptions.map(sub => {
            const ep = (sub && sub.endpoint) ? sub.endpoint.substring(0, 60) : '(no endpoint)';
            return webpush.sendNotification(sub, payload).then(() => {
                console.log(`✅ 成功：${ep}...`);
            }).catch(err => {
                console.error(`❌ [${err.statusCode}]：${ep}...`, err.message);
                if (err.statusCode === 410 || err.statusCode === 404) {
                    expired.push(sub.endpoint);
                }
            });
        })
    );

    // 自動清除失效訂閱
    if (expired.length > 0) {
        const active = subscriptions.filter(s => !expired.includes(s.endpoint));
        await fetch(
            `https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}`,
            {
                method: 'PUT',
                headers: {
                    'X-Master-Key': process.env.JSONBIN_MASTER_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(active)
            }
        );
        console.log(`已清除 ${expired.length} 個失效訂閱`);
    }

    console.log('全部完成！');
}

main().catch(err => {
    console.error('發生錯誤：', err);
    process.exit(1);
});
