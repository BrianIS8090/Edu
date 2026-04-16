// Firebase Progress — хранение прогресса чтения в Firestore
// Заменяет localStorage-провайдер на Firestore для синхронизации между устройствами
(function() {
  'use strict';

  var db = firebase.firestore();
  var progressMap = {};
  var lastReadData = null;
  var currentUid = null;
  var saveTimer = null;
  var pendingUpdates = {};
  var userLastVisit = null;

  // Сохраняем оригинальный onAuthReady
  var originalOnAuthReady = window.EduApp.onAuthReady;

  // Перехватываем onAuthReady для загрузки данных из Firestore
  window.EduApp.onAuthReady = function(user) {
    currentUid = user.uid;
    loadUserData(user).then(function() {
      // Вызываем оригинальный обработчик (init)
      if (originalOnAuthReady) originalOnAuthReady(user);
    });
  };

  // Загрузка данных пользователя из Firestore
  function loadUserData(user) {
    var userRef = db.collection('users').doc(user.uid);

    return userRef.get().then(function(doc) {
      var now = firebase.firestore.FieldValue.serverTimestamp();

      if (doc.exists) {
        var data = doc.data();

        // Сохраняем lastVisit для бейджа "Новое"
        // currentVisit предыдущей сессии становится lastVisit
        userLastVisit = data.currentVisit ? data.currentVisit.toDate() : null;

        // Загружаем прогресс в память
        progressMap = data.progress || {};
        lastReadData = data.lastRead || null;

        // Обновляем визит и профиль
        return userRef.update({
          lastVisit: data.currentVisit || now,
          currentVisit: now,
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || ''
        });
      } else {
        // Новый пользователь — создаём документ
        progressMap = {};
        lastReadData = null;
        userLastVisit = null;

        return userRef.set({
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          lastVisit: null,
          currentVisit: now,
          progress: {},
          lastRead: null
        });
      }
    }).then(function() {
      // Устанавливаем дату последнего визита для бейджа "Новое"
      if (window.EduApp.setUserLastVisit) {
        window.EduApp.setUserLastVisit(userLastVisit);
      }

      // Заменяем провайдер прогресса
      window.EduApp.setProgressProvider(firestoreProvider);
    });
  }

  // Провайдер прогресса через Firestore
  var firestoreProvider = {
    getProgress: function(id) {
      var entry = progressMap[id];
      return entry ? (entry.percent || 0) : 0;
    },

    saveProgress: function(id, percent) {
      var current = this.getProgress(id);
      var nextValue = Math.max(current, Math.round(percent));

      if (!progressMap[id]) {
        progressMap[id] = {};
      }
      progressMap[id].percent = nextValue;

      // Ставим readAt при 100%
      if (nextValue >= 100 && !progressMap[id].readAt) {
        progressMap[id].readAt = firebase.firestore.Timestamp.now();
      }

      scheduleSave('progress.' + id + '.percent', nextValue);
      if (progressMap[id].readAt && nextValue >= 100) {
        scheduleSave('progress.' + id + '.readAt', progressMap[id].readAt);
      }
    },

    getReadTime: function(id) {
      // readTime берём из каталога — не храним в Firestore
      var items = window.EduApp.getAllItems();
      var item = items.find(function(entry) { return entry.id === id; });
      return item && item.readTime ? Math.round(item.readTime) : null;
    },

    saveReadTime: function() {
      // readTime вычисляется из каталога, сохранять не нужно
    },

    getLastRead: function() {
      return lastReadData;
    },

    saveLastRead: function(data) {
      lastReadData = data;
      scheduleSave('lastRead', data);
    },

    getUserLastVisit: function() {
      return userLastVisit;
    }
  };

  // Отложенная запись в Firestore (debounce 500мс)
  function scheduleSave(path, value) {
    pendingUpdates[path] = value;

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 500);
  }

  function flushSave() {
    if (!currentUid || Object.keys(pendingUpdates).length === 0) return;

    var updates = Object.assign({}, pendingUpdates);
    pendingUpdates = {};
    saveTimer = null;

    db.collection('users').doc(currentUid).update(updates)
      .catch(function(error) {
        console.error('Ошибка сохранения прогресса:', error);
        // Возвращаем неудачные обновления в очередь
        Object.keys(updates).forEach(function(key) {
          if (!pendingUpdates[key]) {
            pendingUpdates[key] = updates[key];
          }
        });
      });
  }

  // Сохраняем при закрытии страницы
  window.addEventListener('beforeunload', function() {
    if (Object.keys(pendingUpdates).length > 0) {
      flushSave();
    }
  });
})();
