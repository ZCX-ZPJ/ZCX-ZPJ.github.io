// Service Worker - 图片缓存策略 (Cache First)
const CACHE_NAME = 'portfolio-v2'; // 更新图片时修改版本号即可强制刷新缓存

// 安装时预缓存关键资源（可选）
self.addEventListener('install', event => {
    self.skipWaiting(); // 立即激活
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// 拦截网络请求
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 只缓存图片请求（.webp, .jpg, .png 等）和关键静态资源
    if (url.pathname.match(/\.(webp|jpg|jpeg|png|gif|svg|js|css|html)$/i) || 
        url.hostname.includes('cdn.jsdelivr.net') || 
        url.hostname.includes('你的OSS域名')) {
        
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                // 缓存命中，直接返回
                if (cachedResponse) {
                    // 同时后台更新缓存（Stale-While-Revalidate）
                    fetch(event.request).then(response => {
                        if (response && response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, responseClone);
                            });
                        }
                    }).catch(() => {});
                    return cachedResponse;
                }

                // 没有缓存，发起网络请求并缓存
                return fetch(event.request).then(response => {
                    if (!response || response.status !== 200) {
                        return response;
                    }
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                });
            })
        );
    }
});