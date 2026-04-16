// Firebase Auth — авторизация через Google для EduPlatform
// Использует Firebase Compat SDK (подключён через CDN в index-v2.html)
// На HTTP (кроме localhost) авторизация пропускается — Google Sign-In требует HTTPS
(function() {
  'use strict';

  // Проверяем: Google Sign-In работает только по HTTPS (и localhost)
  var isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  var isHttps = location.protocol === 'https:';

  if (!isHttps && !isLocalhost) {
    // HTTP на сервере (Pi5 и т.п.) — пропускаем Firebase Auth, работаем через localStorage
    var overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'none';
    console.info('Firebase Auth пропущен: Google Sign-In требует HTTPS. Работаем через localStorage.');
    return;
  }

  // Конфигурация Firebase (проект edu7lamp)
  var firebaseConfig = {
    apiKey: 'AIzaSyAP7SQ2UfliY2Y8CVDCM0yEwLjiWC_2lWI',
    authDomain: 'edu7lamp.firebaseapp.com',
    projectId: 'edu7lamp',
    storageBucket: 'edu7lamp.firebasestorage.app',
    messagingSenderId: '905513685667',
    appId: '1:905513685667:web:c6facd48abe8aa43ce6516'
  };

  // Инициализация Firebase
  firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var googleProvider = new firebase.auth.GoogleAuthProvider();

  // DOM-элементы
  var authOverlay = document.getElementById('authOverlay');
  var appShell = document.querySelector('.app-shell');
  var googleSignInBtn = document.getElementById('googleSignIn');
  var logoutBtn = document.getElementById('logoutBtn');
  var userAvatar = document.getElementById('userAvatar');
  var userName = document.getElementById('userName');

  // Скрываем приложение до авторизации
  if (appShell) appShell.style.display = 'none';
  if (authOverlay) authOverlay.style.display = 'flex';

  // Слушатель состояния авторизации
  auth.onAuthStateChanged(function(user) {
    if (user) {
      // Пользователь авторизован — показываем приложение
      if (authOverlay) authOverlay.style.display = 'none';
      if (appShell) appShell.style.display = '';

      // Заполняем профиль в topbar
      if (userAvatar) {
        userAvatar.src = user.photoURL || '';
        userAvatar.alt = user.displayName || 'Аватар';
      }
      if (userName) {
        userName.textContent = user.displayName || user.email || '';
      }

      // Обновляем иконки Lucide (для кнопки выхода)
      if (typeof lucide !== 'undefined') lucide.createIcons();

      // Уведомляем приложение о готовности
      if (window.EduApp && window.EduApp.onAuthReady) {
        window.EduApp.onAuthReady(user);
      }
    } else {
      // Пользователь не авторизован — показываем экран входа
      if (authOverlay) authOverlay.style.display = 'flex';
      if (appShell) appShell.style.display = 'none';
    }
  });

  // Вход через Google
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', function() {
      googleSignInBtn.disabled = true;
      googleSignInBtn.textContent = 'Вход...';

      auth.signInWithPopup(googleProvider)
        .catch(function(error) {
          console.error('Ошибка авторизации:', error);
          // Показываем ошибку пользователю
          var errorEl = document.getElementById('authError');
          if (errorEl) {
            if (error.code === 'auth/popup-closed-by-user') {
              errorEl.textContent = 'Окно входа было закрыто';
            } else if (error.code === 'auth/popup-blocked') {
              errorEl.textContent = 'Всплывающее окно заблокировано браузером';
            } else {
              errorEl.textContent = 'Ошибка входа: ' + error.message;
            }
            errorEl.style.display = 'block';
          }
        })
        .finally(function() {
          googleSignInBtn.disabled = false;
          googleSignInBtn.textContent = 'Войти через Google';
        });
    });
  }

  // Выход
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      auth.signOut();
    });
  }

  // Экспортируем auth для firebase-progress.js
  window.firebaseAuth = auth;
})();
