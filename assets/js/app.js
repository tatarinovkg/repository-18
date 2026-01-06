const tg = window.Telegram ? window.Telegram.WebApp : null;
const apiBaseUrl = 'https://api.s.tkgn.ru/api/';

let selectedServiceGroupId = null;
let selectedOrgGroupId = null;
let activeMode = 'service';
let orgGroupsLoaded = false;

function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.MainButton.setParams({ text: 'Закрыть', is_visible: true });
    tg.MainButton.onClick(() => tg.close());
    tg.MainButton.show();
  } catch (e) {
    console.warn('TG init error', e);
  }
}

function updateThemeIcon() {
  const isDark = document.documentElement.classList.contains('dark');
  const icon = el('themeIcon');
  if (icon) icon.textContent = isDark ? '☾' : '☀';
}

function toggleTheme() {
  const isDark = !document.documentElement.classList.contains('dark');
  document.documentElement.classList.toggle('dark', isDark);
  try {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    localStorage.setItem('themeOverride', 'user');
  } catch (e) {}
  updateThemeIcon();
}

function bootTheme() {
  try {
    const override = localStorage.getItem('themeOverride');
    const saved = localStorage.getItem('theme');
    if (override === 'user' && saved) {
      document.documentElement.classList.toggle('dark', saved === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  } catch (e) {}
  updateThemeIcon();
}

function el(id) {
  return document.getElementById(id);
}

function showError(fieldId, errorId, message) {
  const field = el(fieldId);
  const error = el(errorId);
  if (field) field.classList.add('ring-2', 'ring-red-500');
  if (error) {
    if (message) error.textContent = message;
    error.classList.remove('hidden');
  }
}

function hideError(fieldId, errorId) {
  const field = el(fieldId);
  const error = el(errorId);
  if (field) field.classList.remove('ring-2', 'ring-red-500');
  if (error) error.classList.add('hidden');
}

function bindEnterBlur(id) {
  const node = el(id);
  if (!node) return;
  node.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      node.blur();
    }
  });
}

function groupIdFrom(item) {
  return item?.groupID ?? item?.groupId ?? item?.id ?? item?.ID ?? null;
}

function groupNameFrom(item) {
  return item?.name ?? item?.title ?? item?.groupName ?? 'Без названия';
}

async function fetchGroups() {
  try {
    const r = await fetch(apiBaseUrl + 'groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const groups = await r.json();
    renderDropdownOptions('groupDropdown', groups);
    const select = el('groupSelect');
    if (select) select.textContent = 'Выберите группу';
  } catch (e) {
    const select = el('groupSelect');
    if (select) select.textContent = 'Не удалось загрузить группы';
  }
}

async function fetchOrgGroups() {
  try {
    const r = await fetch(apiBaseUrl + 'get_organisation_groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const groups = await r.json();
    renderDropdownOptions('orgGroupDropdown', groups);
    const select = el('orgGroupSelect');
    if (select) select.textContent = 'Выберите группу';
    orgGroupsLoaded = true;
  } catch (e) {
    const select = el('orgGroupSelect');
    if (select) select.textContent = 'Не удалось загрузить группы';
  }
}

function renderDropdownOptions(listId, groups) {
  const list = el(listId);
  if (!list) return;
  list.innerHTML = '';
  (groups || []).forEach((g) => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.textContent = groupNameFrom(g);
    item.dataset.groupId = groupIdFrom(g) ?? '';
    list.appendChild(item);
  });
}

function toggleDropdown(id) {
  const dropdown = el(id);
  if (!dropdown) return;
  const willOpen = dropdown.classList.contains('hidden');
  hideDropdowns();
  dropdown.classList.toggle('hidden', !willOpen);
}

function hideDropdowns() {
  ['groupDropdown', 'orgGroupDropdown'].forEach((id) => {
    const dd = el(id);
    if (dd) dd.classList.add('hidden');
  });
}

function handleServiceGroupClick(event) {
  const t = event.target;
  if (!t || !t.classList.contains('dropdown-item')) return;
  selectedServiceGroupId = t.dataset.groupId || null;
  const select = el('groupSelect');
  if (select) select.textContent = t.textContent;
  hideError('groupSelect', 'groupError');
  hideDropdowns();
}

function handleOrgGroupClick(event) {
  const t = event.target;
  if (!t || !t.classList.contains('dropdown-item')) return;
  selectedOrgGroupId = t.dataset.groupId || null;
  const select = el('orgGroupSelect');
  if (select) select.textContent = t.textContent;
  hideError('orgGroupSelect', 'orgGroupError');
  hideDropdowns();
}

function setLoading(v, text = 'Отправляем данные...') {
  const loading = el('loadingBlock');
  const btn = el('submitButton');
  if (loading) loading.classList.toggle('hidden', !v);
  if (btn) btn.disabled = v;
  const caption = el('loadingText');
  if (caption) caption.textContent = text;
}

function submitForm() {
  el('serverError')?.classList.add('hidden');
  if (activeMode === 'organisation') {
    submitOrganisationForm();
  } else {
    submitServiceForm();
  }
}

function submitServiceForm() {
  hideError('shortDescription', 'shortDescriptionError');
  hideError('contactPerson', 'contactPersonError');
  hideError('userContacts', 'userContactsError');

  const shortDescription = el('shortDescription')?.value.trim() || '';
  const userService = el('userService')?.value.trim() || '';
  const contactPerson = el('contactPerson')?.value.trim() || '';
  const userContacts = el('userContacts')?.value.trim() || '';

  let hasError = false;
  if (!shortDescription) {
    showError('shortDescription', 'shortDescriptionError', 'Заполните краткое описание.');
    hasError = true;
  }
  if (!contactPerson) {
    showError('contactPerson', 'contactPersonError', 'Укажите контактное лицо.');
    hasError = true;
  }
  if (!userContacts) {
    showError('userContacts', 'userContactsError', 'Заполните контакты.');
    hasError = true;
  }
  if (hasError) return;

  const payload = {
    dataId: 'new_service',
    shortDescription,
    service: userService,
    contactPerson,
    contacts: userContacts,
    groupId: selectedServiceGroupId ?? 0
  };

  setLoading(true, 'Отправляем услугу...');
  try {
    tg?.sendData(JSON.stringify(payload));
    setLoading(false);
    tg?.close();
  } catch (e) {
    setLoading(false);
    const box = el('serverError');
    if (box) {
      box.textContent = 'Ошибка отправки: ' + e.message;
      box.classList.remove('hidden');
    }
  }
}

function submitOrganisationForm() {
  hideError('orgName', 'orgNameError');
  hideError('orgAddress', 'orgAddressError');
  hideError('orgContacts', 'orgContactsError');

  const orgName = el('orgName')?.value.trim() || '';
  const orgAddress = el('orgAddress')?.value.trim() || '';
  const orgContacts = el('orgContacts')?.value.trim() || '';

  let hasError = false;
  if (!orgName) {
    showError('orgName', 'orgNameError', 'Укажите название организации.');
    hasError = true;
  }
  if (!orgAddress) {
    showError('orgAddress', 'orgAddressError', 'Добавьте адрес.');
    hasError = true;
  }
  if (!orgContacts) {
    showError('orgContacts', 'orgContactsError', 'Оставьте контакты.');
    hasError = true;
  }
  if (hasError) return;

  const payload = {
    dataId: 'new_organisation',
    name: orgName,
    adress: orgAddress,
    contacts: orgContacts,
    groupId: selectedOrgGroupId ?? 0
  };

  setLoading(true, 'Отправляем организацию...');
  try {
    tg?.sendData(JSON.stringify(payload));
    setLoading(false);
    tg?.close();
  } catch (e) {
    setLoading(false);
    const box = el('serverError');
    if (box) {
      box.textContent = 'Ошибка отправки: ' + e.message;
      box.classList.remove('hidden');
    }
  }
}

function setMode(mode) {
  if (mode !== 'service' && mode !== 'organisation') return;
  activeMode = mode;

  const isOrg = mode === 'organisation';
  const title = el('title');
  if (title) title.textContent = isOrg ? 'Добавить организацию' : 'Добавить услугу';

  const serviceForm = el('serviceForm');
  const orgForm = el('organisationForm');
  if (serviceForm && orgForm) {
    serviceForm.classList.toggle('hidden', isOrg);
    orgForm.classList.toggle('hidden', !isOrg);
  }

  document.querySelectorAll('#modeTabs .mode-tab').forEach((btn) => {
    const current = btn.dataset.mode;
    const active = current === mode;
    btn.className = [
      'mode-tab px-3 py-1.5 rounded-full text-sm font-semibold transition',
      active
        ? 'bg-white dark:bg-slate-900 text-brand shadow-sm border border-brand/30 dark:border-brand/40'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
    ].join(' ');
  });

  hideDropdowns();
  el('serverError')?.classList.add('hidden');

  if (isOrg && !orgGroupsLoaded) fetchOrgGroups();
}

function setupModeTabs() {
  const tabs = document.querySelectorAll('#modeTabs .mode-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      setMode(mode);
    });
  });
  setMode('service');
}

function setupTextAreaBlur() {
  const ta = el('userService');
  if (!ta) return;
  document.addEventListener('click', (evt) => {
    if (document.activeElement === ta && evt.target !== ta) {
      ta.blur();
    }
  });
}

function setupDropdownCloseOnOutside() {
  document.addEventListener('click', (event) => {
    const selects = [el('groupSelect'), el('orgGroupSelect'), el('groupDropdown'), el('orgGroupDropdown')];
    const clickedInside = selects.some((node) => node && node.contains(event.target));
    if (!clickedInside) hideDropdowns();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bootTheme();
  initTelegram();
  setupModeTabs();
  bindEnterBlur('shortDescription');
  bindEnterBlur('contactPerson');
  bindEnterBlur('userContacts');
  bindEnterBlur('orgName');
  bindEnterBlur('orgAddress');
  bindEnterBlur('orgContacts');
  el('themeToggle')?.addEventListener('click', toggleTheme);
  el('groupSelect')?.addEventListener('click', () => toggleDropdown('groupDropdown'));
  el('groupDropdown')?.addEventListener('click', handleServiceGroupClick);
  el('orgGroupSelect')?.addEventListener('click', () => toggleDropdown('orgGroupDropdown'));
  el('orgGroupDropdown')?.addEventListener('click', handleOrgGroupClick);
  el('submitButton')?.addEventListener('click', submitForm);
  setupDropdownCloseOnOutside();
  setupTextAreaBlur();
  fetchGroups();
  fetchOrgGroups();
});
