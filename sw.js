
const CACHE_NAME = "photozoj-photos-v1";
const MAX_CACHED_PHOTOS = 100;

// Устанавливаем Service Worker
self.addEventListener("install", event => {
  self.skipWaiting();
});

// Активируем новую версию
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key => key.startsWith("photozoj-photos-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

// Кэшируем фотографии Яндекс Форм
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // Работаем только с фотографиями
  if (
    request.method !== "GET" ||
    request.destination !== "image" ||
    url.hostname !== "forms.yandex.ru" ||
    !url.pathname.startsWith("/u/files")
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Сначала ищем фотографию в локальном кэше
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        return cachedResponse;
      }

      // Если фотографии нет — загружаем из интернета
      const response = await fetch(request);

      // Сохраняем успешный ответ или непрозрачный ответ
      if (response.ok || response.type === "opaque") {
        try {
          await cache.put(request, response.clone());

          // Ограничиваем размер кэша
          const keys = await cache.keys();

          if (keys.length > MAX_CACHED_PHOTOS) {
            const excess = keys.length - MAX_CACHED_PHOTOS;

            await Promise.all(
              keys.slice(0, excess).map(key => cache.delete(key))
            );
          }
        } catch (error) {
          console.warn("[PhotoZOJ] Не удалось сохранить фото:", error);
        }
      }

      return response;
    })()
  );
});
