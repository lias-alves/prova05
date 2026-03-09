/**
 * CONTROLADOR: authController.js
 * Gerencia toda a lógica de autenticação:
 * – Inicialização dos formulários de login e registro
 * – Validação de campos
 * – Comunicação com AuthAPI
 * – Gerenciamento de sessão e redirecionamento
 *
 * @module AuthController
 */

const AuthController = (() => {

  // ─────────────────────────────────────────────
  //  UTILITÁRIOS INTERNOS
  // ─────────────────────────────────────────────

  function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = message;
      el.classList.add('visible');
    }
  }

  function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
      el.textContent = '';
      el.classList.remove('visible');
    });
  }

  function showAlert(type, message) {
    const alert = document.getElementById('auth-alert');
    if (!alert) return;
    alert.textContent = message;
    alert.className = `alert alert-${type} visible`;
    setTimeout(() => alert.classList.remove('visible'), 5000);
  }

  function setLoading(button, loading) {
    if (loading) {
      button.disabled = true;
      button.dataset.originalText = button.innerHTML;
      button.innerHTML = '<span class="spinner"></span> Aguarde...';
    } else {
      button.disabled = false;
      button.innerHTML = button.dataset.originalText;
    }
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ─────────────────────────────────────────────
  //  GUARDA DE ROTA: redireciona se já logado
  // ─────────────────────────────────────────────
  function guardAuth() {
    const session = StorageService.getSession();
    if (session) {
      window.location.href = 'events.html';
    }
  }

  // ─────────────────────────────────────────────
  //  CONTROLADOR DE LOGIN
  // ─────────────────────────────────────────────
  async function handleLogin(event) {
    event.preventDefault();
    clearErrors();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = document.querySelector('#login-form .btn-primary');
    let valid = true;

    if (!email) {
      showError('email-error', 'O e-mail é obrigatório.');
      valid = false;
    } else if (!validateEmail(email)) {
      showError('email-error', 'Digite um e-mail válido.');
      valid = false;
    }

    if (!password) {
      showError('password-error', 'A senha é obrigatória.');
      valid = false;
    }

    if (!valid) return;

    setLoading(submitBtn, true);

    const result = await AuthAPI.login(email, password);

    setLoading(submitBtn, false);

    if (result.success) {
      showAlert('success', `Bem-vindo, ${result.user.name}! Redirecionando...`);
      setTimeout(() => {
        window.location.href = 'events.html';
      }, 1000);
    } else {
      showAlert('error', result.message);
    }
  }

  // ─────────────────────────────────────────────
  //  CONTROLADOR DE REGISTRO
  // ─────────────────────────────────────────────
  async function handleRegister(event) {
    event.preventDefault();
    clearErrors();

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const submitBtn = document.querySelector('#register-form .btn-primary');
    let valid = true;

    if (!name || name.length < 3) {
      showError('name-error', 'O nome deve ter pelo menos 3 caracteres.');
      valid = false;
    }

    if (!email) {
      showError('email-error', 'O e-mail é obrigatório.');
      valid = false;
    } else if (!validateEmail(email)) {
      showError('email-error', 'Digite um e-mail válido.');
      valid = false;
    }

    if (!password || password.length < 6) {
      showError('password-error', 'A senha deve ter pelo menos 6 caracteres.');
      valid = false;
    }

    if (password !== confirmPassword) {
      showError('confirm-password-error', 'As senhas não coincidem.');
      valid = false;
    }

    if (!valid) return;

    setLoading(submitBtn, true);

    const result = await AuthAPI.register({ name, email, password });

    setLoading(submitBtn, false);

    if (result.success) {
      showAlert('success', 'Conta criada com sucesso! Redirecionando para o login...');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } else {
      showAlert('error', result.message);
    }
  }

  // ─────────────────────────────────────────────
  //  CONTROLADOR DE LOGOUT
  // ─────────────────────────────────────────────
  function handleLogout() {
    AuthAPI.logout();
    window.location.href = 'login.html';
  }

  // ─────────────────────────────────────────────
  //  GUARDA DE ROTA PARA PÁGINAS PROTEGIDAS
  // ─────────────────────────────────────────────
  function requireAuth() {
    const session = StorageService.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
  }

  // ─────────────────────────────────────────────
  //  INICIALIZAÇÃO
  // ─────────────────────────────────────────────
  async function init(page) {
    await StorageService.init();

    if (page === 'login') {
      guardAuth();
      const form = document.getElementById('login-form');
      if (form) form.addEventListener('submit', handleLogin);
    }

    if (page === 'register') {
      guardAuth();
      const form = document.getElementById('register-form');
      if (form) form.addEventListener('submit', handleRegister);
    }

    if (page === 'events' || page === 'event-detail') {
      return requireAuth();
    }

    return null;
  }

  return { init, handleLogout, requireAuth };
})();
