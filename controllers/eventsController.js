/**
 * CONTROLADOR: eventsController.js
 * Gerencia a listagem, filtragem e detalhe de eventos.
 * Manipula o DOM para renderizar os cards de eventos dinamicamente.
 * Controla a lógica de inscrição em eventos.
 *
 * @module EventsController
 */

const EventsController = (() => {

  // Estado interno do controller
  let _currentUser = null;
  let _allEvents = [];
  let _activeFilter = 'todos';
  let _searchTerm = '';

  // ─────────────────────────────────────────────
  //  UTILITÁRIOS DE FORMATAÇÃO
  // ─────────────────────────────────────────────

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
  }

  function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatPrice(price) {
    return price === 0 ? 'Gratuito' : `R$ ${price.toFixed(2).replace('.', ',')}`;
  }

  function getAvailabilityClass(registered, capacity) {
    const percent = registered / capacity;
    if (percent >= 1) return 'full';
    if (percent >= 0.85) return 'almost-full';
    return 'available';
  }

  function getCategoryLabel(category) {
    const labels = {
      tecnologia: 'Tecnologia',
      academico: 'Acadêmico',
      hackathon: 'Hackathon',
      palestra: 'Palestra',
      empreendedorismo: 'Empreendedorismo',
      esporte: 'Esporte',
      cultura: 'Cultura',
    };
    return labels[category] || category;
  }

  function getCategoryIcon(category) {
    const icons = {
      tecnologia: '💻',
      academico: '🎓',
      hackathon: '⚡',
      palestra: '🎤',
      empreendedorismo: '🚀',
      esporte: '🏆',
      cultura: '🎭',
    };
    return icons[category] || '📌';
  }

  // ─────────────────────────────────────────────
  //  RENDERIZAÇÃO DE CARDS
  // ─────────────────────────────────────────────

  // Verifica se o usuário atual pode excluir o evento
  function canDelete(event) {
    if (!_currentUser) return false;
    return _currentUser.role === 'admin' || event.createdBy === _currentUser.id;
  }

  function renderEventCard(event) {
    const availClass = getAvailabilityClass(event.registered, event.capacity);
    const vagas = event.capacity - event.registered;
    const vagasText = availClass === 'full' ? 'Esgotado' : `${vagas} vagas`;
    const eventDate = new Date(event.date);
    const isUpcoming = eventDate > new Date();
    const showDelete = canDelete(event);

    return `
      <article class="event-card" data-id="${event.id}" role="article" tabindex="0"
               onclick="EventsController.openDetail('${event.id}')"
               onkeypress="if(event.key==='Enter') EventsController.openDetail('${event.id}')">
        <div class="event-card__image">
          <img src="${event.image}" alt="${event.title}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80'">
          <span class="event-card__category ${event.category}">
            ${getCategoryIcon(event.category)} ${getCategoryLabel(event.category)}
          </span>
          ${!isUpcoming ? '<span class="event-card__badge badge-past">Encerrado</span>' : ''}
          ${showDelete ? `
            <button
              class="card-delete-btn"
              aria-label="Excluir evento"
              title="Excluir evento"
              onclick="event.stopPropagation(); EventsController.confirmDelete('${event.id}', '${event.title.replace(/'/g, "&apos;")}')"
            >🗑️</button>
          ` : ''}
        </div>
        <div class="event-card__body">
          <h3 class="event-card__title">${event.title}</h3>
          <p class="event-card__description">${event.description.substring(0, 120)}...</p>
          <div class="event-card__meta">
            <span class="meta-item">📅 ${formatDate(event.date)}</span>
            <span class="meta-item">⏰ ${formatTime(event.date)}</span>
            <span class="meta-item">📍 ${event.location}</span>
            <span class="meta-item">👤 ${event.instructor}</span>
          </div>
          <div class="event-card__footer">
            <span class="event-price ${event.price === 0 ? 'free' : ''}">${formatPrice(event.price)}</span>
            <span class="event-availability ${availClass}">${vagasText}</span>
          </div>
        </div>
      </article>
    `;
  }

  function renderEmptyState(message = 'Nenhum evento encontrado.') {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">📭</div>
        <h3>Nenhum resultado</h3>
        <p>${message}</p>
      </div>
    `;
  }

  function renderLoading() {
    return `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Carregando eventos...</p>
      </div>
    `;
  }

  // ─────────────────────────────────────────────
  //  LISTAGEM DE EVENTOS
  // ─────────────────────────────────────────────

  async function loadEvents() {
    const grid = document.getElementById('events-grid');
    const countEl = document.getElementById('events-count');
    if (!grid) return;

    grid.innerHTML = renderLoading();

    const result = await EventsAPI.getAll({
      category: _activeFilter,
      search: _searchTerm,
    });

    if (!result.success) {
      grid.innerHTML = renderEmptyState('Erro ao carregar eventos.');
      return;
    }

    _allEvents = result.data;

    if (countEl) {
      countEl.textContent = `${_allEvents.length} evento${_allEvents.length !== 1 ? 's' : ''} encontrado${_allEvents.length !== 1 ? 's' : ''}`;
    }

    if (_allEvents.length === 0) {
      grid.innerHTML = renderEmptyState('Tente limpar os filtros ou usar outra busca.');
      return;
    }

    grid.innerHTML = _allEvents.map(renderEventCard).join('');
  }

  function openDetail(eventId) {
    window.location.href = `event-detail.html?id=${eventId}`;
  }

  // ─────────────────────────────────────────────
  //  FILTROS E BUSCA
  // ─────────────────────────────────────────────

  function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _activeFilter = btn.dataset.category;
        loadEvents();
      });
    });

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          _searchTerm = e.target.value.trim();
          loadEvents();
        }, 300);
      });
    }

    const clearSearchBtn = document.getElementById('clear-search');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        _searchTerm = '';
        loadEvents();
      });
    }
  }

  function setupNavbar() {
    const userNameEl = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');

    if (userNameEl && _currentUser) {
      userNameEl.textContent = _currentUser.name;
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', AuthController.handleLogout);
    }
  }

  // ─────────────────────────────────────────────
  //  PÁGINA DE DETALHE
  // ─────────────────────────────────────────────

  async function loadEventDetail() {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');

    if (!eventId) {
      window.location.href = 'events.html';
      return;
    }

    const result = await EventsAPI.getById(eventId);
    if (!result.success) {
      window.location.href = 'events.html';
      return;
    }

    const event = result.data;
    renderDetailPage(event);

    // Verificar inscrição
    const checkResult = await EventsAPI.checkRegistration(eventId, _currentUser.id);
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn && checkResult.registered) {
      registerBtn.textContent = '✅ Já inscrito';
      registerBtn.classList.add('btn-registered');
      registerBtn.disabled = true;
    }
  }

  function renderDetailPage(event) {
    const availClass = getAvailabilityClass(event.registered, event.capacity);
    const percent = Math.round((event.registered / event.capacity) * 100);

    // Header image
    const heroImg = document.getElementById('detail-hero-img');
    if (heroImg) heroImg.src = event.image;

    // Título e metadata
    const titleEl = document.getElementById('detail-title');
    if (titleEl) titleEl.textContent = event.title;

    document.title = `${event.title} | EventHub`;

    const fields = {
      'detail-category': `${getCategoryIcon(event.category)} ${getCategoryLabel(event.category)}`,
      'detail-date': `📅 ${formatDate(event.date)} às ${formatTime(event.date)}`,
      'detail-location': `📍 ${event.location}`,
      'detail-instructor': `👤 ${event.instructor}`,
      'detail-price': formatPrice(event.price),
      'detail-description': event.description,
    };

    Object.entries(fields).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });

    // Barra de progresso de vagas
    const progressEl = document.getElementById('detail-progress');
    const progressBarEl = document.getElementById('detail-progress-bar');
    const availEl = document.getElementById('detail-availability');

    if (progressEl) progressEl.textContent = `${event.registered} / ${event.capacity} inscritos`;
    if (progressBarEl) {
      progressBarEl.style.width = `${percent}%`;
      progressBarEl.className = `progress-bar ${availClass}`;
    }
    if (availEl) {
      const vagas = event.capacity - event.registered;
      availEl.textContent = availClass === 'full' ? 'Esgotado' : `${vagas} vagas disponíveis`;
      availEl.className = `availability-badge ${availClass}`;
    }

    // Botão de inscrição
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
      if (availClass === 'full') {
        registerBtn.textContent = '🚫 Esgotado';
        registerBtn.disabled = true;
        registerBtn.classList.add('btn-disabled');
      } else {
        // Remove listener anterior para não duplicar
        const newBtn = registerBtn.cloneNode(true);
        registerBtn.parentNode.replaceChild(newBtn, registerBtn);
        newBtn.addEventListener('click', () => handleEventRegister(event.id));
      }
    }

    // Botão de exclusão (somente criador ou admin)
    const deleteBtn = document.getElementById('detail-delete-btn');
    if (deleteBtn) {
      if (canDelete(event)) {
        deleteBtn.classList.remove('hidden');
        // Remove listener anterior
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
        newDeleteBtn.addEventListener('click', () => {
          confirmDelete(event.id, event.title, true);
        });
      } else {
        deleteBtn.classList.add('hidden');
      }
    }
  }

  // ─────────────────────────────────────────────
  //  EXCLUSÃO DE EVENTOS
  // ─────────────────────────────────────────────

  /**
   * Exibe modal de confirmação antes de excluir.
   * @param {string} eventId
   * @param {string} eventTitle
   * @param {boolean} [fromDetail=false] - Se estiver na página de detalhe
   */
  function confirmDelete(eventId, eventTitle, fromDetail = false) {
    // Remove modal anterior se existir
    const old = document.getElementById('delete-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'delete-modal';
    modal.className = 'delete-modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'delete-modal-title');
    modal.innerHTML = `
      <div class="delete-modal">
        <div class="delete-modal__icon">🗑️</div>
        <h3 id="delete-modal-title" class="delete-modal__title">Excluir Evento</h3>
        <p class="delete-modal__message">
          Tem certeza que deseja excluir <strong>"${eventTitle}"</strong>?
          <br><span class="delete-modal__warning">Esta ação não pode ser desfeita.</span>
        </p>
        <div class="delete-modal__actions">
          <button id="delete-cancel-btn" class="btn btn-secondary">Cancelar</button>
          <button id="delete-confirm-btn" class="btn btn-danger">
            🗑️ Sim, excluir
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    // Anima entrada
    requestAnimationFrame(() => modal.classList.add('open'));

    function closeModal() {
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 250);
    }

    document.getElementById('delete-cancel-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onEsc); }
    });

    document.getElementById('delete-confirm-btn').addEventListener('click', async () => {
      await executeDelete(eventId, fromDetail);
      closeModal();
    });
  }

  async function executeDelete(eventId, fromDetail) {
    const btn = document.getElementById('delete-confirm-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Excluindo...';
    }

    const result = await EventsAPI.deleteEvent(eventId, _currentUser.id, _currentUser.role);

    if (result.success) {
      if (fromDetail) {
        // Na página de detalhe: volta pra listagem com mensagem
        sessionStorage.setItem('mvc_flash', result.message);
        window.location.href = 'events.html';
      } else {
        // Na listagem: remove o card com animação e recarrega
        const card = document.querySelector(`.event-card[data-id="${eventId}"]`);
        if (card) {
          card.style.transition = 'all 0.3s ease';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.9)';
          setTimeout(() => loadEvents(), 350);
        } else {
          loadEvents();
        }
      }
    } else {
      // Mostra erro sem fechar modal
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '🗑️ Sim, excluir';
      }
      alert(result.message);
    }
  }

  async function handleEventRegister(eventId) {
    const registerBtn = document.getElementById('register-btn');
    const alertEl = document.getElementById('register-alert');

    if (registerBtn) {
      registerBtn.disabled = true;
      registerBtn.innerHTML = '<span class="spinner"></span> Inscrevendo...';
    }

    const result = await EventsAPI.register(eventId, _currentUser.id);

    if (registerBtn) {
      if (result.success) {
        registerBtn.textContent = '✅ Já inscrito';
        registerBtn.classList.add('btn-registered');
      } else {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Inscrever-se';
      }
    }

    if (alertEl) {
      alertEl.textContent = result.message;
      alertEl.className = `alert alert-${result.success ? 'success' : 'error'} visible`;
      setTimeout(() => alertEl.classList.remove('visible'), 5000);
    }

    // Recarregar detalhe para atualizar contagem
    if (result.success) {
      const params = new URLSearchParams(window.location.search);
      const res = await EventsAPI.getById(params.get('id'));
      if (res.success) renderDetailPage(res.data);
    }
  }

  // ─────────────────────────────────────────────
  //  INICIALIZAÇÃO
  // ─────────────────────────────────────────────

  async function initList(user) {
    _currentUser = user;
    setupNavbar();
    setupFilters();
    await loadEvents();

    // Exibe flash message vinda da exclusão na página de detalhe
    const flash = sessionStorage.getItem('mvc_flash');
    if (flash) {
      sessionStorage.removeItem('mvc_flash');
      const flashEl = document.createElement('div');
      flashEl.className = 'flash-toast visible';
      flashEl.textContent = flash;
      document.body.appendChild(flashEl);
      setTimeout(() => { flashEl.style.opacity = '0'; setTimeout(() => flashEl.remove(), 400); }, 3500);
    }
  }

  async function initDetail(user) {
    _currentUser = user;
    setupNavbar();
    await loadEventDetail();
  }

  return { initList, initDetail, openDetail, confirmDelete };
})();
